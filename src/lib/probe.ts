/**
 * Task 171: 模型广场指标自探测 — 吞吐/首字延迟不再依赖用户调用
 *
 * 机制: 定时对所有在线模型经本机中转链路 (127.0.0.1:3080) 发一笔小的流式对话:
 * - 走真实 relay 全链路 (认证→渠道→协议转换→人设→计费→Log) → 60s 滚动窗口 tps/ttft 自动常亮
 * - 探测用独立令牌「系统探测」(自动创建, 无限额度): 日志页一眼可辨; 后台禁用该令牌 = 关闭探测
 * - 广场「近 7 天调用」热度口径排除本令牌 (public/models 路由), 真实用户热度不被灌水
 * - 探测请求带 x-bz-probe 头, 引擎据此关闭对冲 (慢模型 6s 对冲阈值必触发, 避免双倍上游消耗)
 *
 * Option 可调 (15s 缓存, 改库免部署):
 * - ProbeEnabled      缺省 true
 * - ProbeIntervalSec  缺省 60 (钳制 15~600) — 保持 < 60s 窗口才不出现空档
 * - ProbeExclude      逗号分隔模型名单, 命中不探测 (如按 credit 计费的模型想省成本)
 *
 * Task 176: 探测范围收敛到已定价模型 — 未定价模型不上模型广场 (广场只显示 ModelRatio 里有定价的模型),
 * 探测它们没有任何指标收益纯浪费上游; 实测 NIM 免费模型单发 79~302s (免费档排队),
 * 曾把 4 路并发一轮探测整个拖垮, 连带拖慢在线状态刷新, 故只探「启用渠道模型 ∩ 已定价 ∖ ProbeExclude」
 *
 * Task 206: 每轮探测结果不再丢弃 — 捕获 HTTP 状态/首字延迟(TTFT)/失败原因, 喂给
 * model-health 迟滞状态机: 连续坏轮自动下架 (从 /v1/models 与广场隐藏), 连续好轮自动回榜。
 * 已下架模型仍在探测范围内 — 上游恢复后自动重新上架, 全程无需人工介入。
 */
import crypto from 'crypto'
import { db } from '@/lib/db'
import { getOptions } from '@/lib/options'
import { recordProbeOutcome } from '@/lib/model-health' // Task 206: 探测结果驱动模型自动上下架

export const PROBE_TOKEN_NAME = '系统探测'
const PROBE_HEADER = 'x-bz-probe'
const BASE = process.env.PROBE_BASE_URL || 'http://127.0.0.1:3080'
const PROBE_TIMEOUT_MS = 120_000

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** 取/建探测专用令牌; 返回 null = 探测关闭 (令牌被人工禁用且不自动复活) */
async function ensureProbeToken(): Promise<{ key: string } | null> {
  const existing = await db.token.findFirst({ where: { name: PROBE_TOKEN_NAME } })
  if (existing) {
    if (existing.status !== 1) return null // 后台禁用 = 人工关探测, 尊重不复活
    return { key: existing.key }
  }
  const admin =
    (await db.user.findFirst({ where: { role: { gte: 100 }, status: 1 }, orderBy: { id: 'asc' } })) ||
    (await db.user.findFirst({ where: { status: 1 }, orderBy: { id: 'asc' } }))
  if (!admin) return null
  const created = await db.token.create({
    data: {
      name: PROBE_TOKEN_NAME,
      key: crypto.randomBytes(24).toString('hex'),
      userId: admin.id,
      status: 1,
      unlimitedQuota: true,
    },
  })
  console.log(`[probe] token "${PROBE_TOKEN_NAME}" created (userId=${admin.id})`)
  return { key: created.key }
}

async function probeAll(): Promise<void> {
  const options = await getOptions().catch(() => ({}) as Record<string, string>)
  if ((options.ProbeEnabled ?? 'true') === 'false') return
  const exclude = new Set(
    (options.ProbeExclude || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  const tok = await ensureProbeToken()
  if (!tok) return
  const channels = await db.channel.findMany({ where: { status: 1 }, select: { models: true } })
  const models = new Set<string>()
  for (const c of channels) {
    for (const m of c.models.split(',').map((s) => s.trim()).filter(Boolean)) models.add(m)
  }
  // Task 176: 只探已定价模型 — 未定价模型不上模型广场 (探测无收益), 且 NIM 免费模型单发 79~302s
  // (免费档排队) 会拖垮整轮探测, 故取「启用渠道模型 ∩ ModelRatio 已定价」交集
  const pricedSet = new Set(
    (await db.modelRatio.findMany({ select: { modelName: true } })).map((r) => r.modelName)
  )
  // Task 171b: 有界并发 4 路 — 串行时慢模型 (glm-5.1 首字 33s / agnes 23s / glm-5.3 68s) 会把一轮拖到 130s+;
  // 4 路并发把轮时长压到 ~2 波最慢模型, 配合指标窗口放宽 (LiveWindowSec 缺省 120s) 保证常亮
  const list = [...models].filter((m) => pricedSet.has(m) && !exclude.has(m))
  const CONCURRENCY = 4
  let cursor = 0
  const worker = async (): Promise<void> => {
    while (cursor < list.length) {
      const model = list[cursor++]
      // Task 206: 捕获本轮结果 — ok=拿到首个数据块, ttft=发出请求→首块到达, reason=失败原因
      let ok = false
      let ttftMs: number | null = null
      let reason = ''
      try {
        const t0 = Date.now()
        // 流式小调用: TTFT 口径真实 (Task 161), 读完整流让网关完成计费落账
        const resp = await fetch(`${BASE}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tok.key}`,
            [PROBE_HEADER]: '1',
          },
          body: JSON.stringify({
            model,
            stream: true,
            max_tokens: 256,
            // Task 173: 样本加肥 — 旧「回复：ok」只回 2~17 token, 生成段毫秒级, 吞吐测量被微样本支配;
            // 改为 ~50 字自述, 真流式上游生成段有真实长度, 口径稳定性大幅提升
            messages: [{ role: 'user', content: '用一两句话简单介绍你自己，50字左右' }],
          }),
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        })
        if (resp.status !== 200) {
          // 非 200: 上游/渠道层失败 (503 无可用渠道 / 429 / 5xx...), 读一小段错误体供下架原因展示
          const body = (await resp.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 180)
          reason = `HTTP ${resp.status}${body ? ' ' + body : ''}`
        } else if (!resp.body) {
          reason = 'HTTP 200 空响应体'
        } else {
          // 手动读流: 首块到达时刻即 TTFT; 读完整流保证网关计费落账 (与旧 arrayBuffer 排水等价)
          const reader = resp.body.getReader()
          for (;;) {
            const { done, value } = await reader.read()
            if (value && value.length > 0 && ttftMs == null) ttftMs = Date.now() - t0
            if (done) break
          }
          ok = ttftMs != null
          if (!ok) reason = 'HTTP 200 但流中无数据块'
        }
      } catch (e) {
        // 超时/网络异常 — 120s 拿不到首块 = 坏轮 (模型挂起也会在这里被捕捉)
        reason =
          e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')
            ? `探测超时 (${PROBE_TIMEOUT_MS / 1000}s 无响应)`
            : String(e instanceof Error ? e.message : e).slice(0, 180)
      }
      try {
        await recordProbeOutcome(model, ok, ttftMs, reason)
      } catch {
        /* 健康评估异常不影响探测循环与其余模型 */
      }
      await sleep(300)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker))
}

/** 单例探测循环 — setTimeout 链: 每轮结束按 ProbeIntervalSec 排下一轮 */
export function startProbeLoop(): void {
  const g = globalThis as { __bzProbeLoop?: boolean }
  if (g.__bzProbeLoop) return
  g.__bzProbeLoop = true
  console.log('[probe] loop started (interval=ProbeIntervalSec, default 60s); health watchdog active (Task 206)')
  const tick = async (): Promise<void> => {
    try {
      const t0 = Date.now()
      await probeAll()
      const options = await getOptions().catch(() => ({}) as Record<string, string>)
      const n = parseInt(options.ProbeIntervalSec || '', 10)
      const intervalSec = Math.min(Math.max(isNaN(n) ? 60 : n, 15), 600)
      const wait = Math.max(intervalSec * 1000 - (Date.now() - t0), 5_000)
      setTimeout(() => void tick(), wait).unref?.()
    } catch (e) {
      console.error('[probe] round failed:', e)
      setTimeout(() => void tick(), 60_000).unref?.()
    }
  }
  setTimeout(() => void tick(), 15_000).unref?.() // 起服 15s 后开跑第一轮
}
