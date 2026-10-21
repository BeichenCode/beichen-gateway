/**
 * Task 206: 模型健康自动上下架 — 探测结果驱动的迟滞状态机
 *
 * 背景: Task 171 探测循环每轮 (默认 60s) 对「已定价∩启用渠道」模型经真实 relay 发流式探测,
 * 但结果一直 fire-and-forget 丢弃。本模块把每轮探测结果捕获下来, 按迟滞规则维护模型级健康状态:
 *
 *   下架  连续 HealthFailRounds (默认 3) 轮「坏」结果 → status=0 (从 /v1/models 与前台广场隐藏)
 *   回榜  连续 HealthRecoverRounds (默认 2) 轮「好」结果 → status=1 (自动恢复上架)
 *   坏轮  探测失败 (HTTP 非 200 / 超时 / 空流) 或 成功但首字延迟 > HealthTtftMs (默认 30s)
 *   好轮  探测成功且首字延迟 ≤ 阈值
 *
 * 分层职责: 渠道级熔断/恢复由 Task 152 autoban + Task 205 半开兜底负责; 本模块只在模型层
 * (渠道都活着但该模型上游挂了/特别慢) 做上下架, 两层互补。下架 = 列表隐藏, 不封禁调用
 * (硬闸是 Task 202 遗留待拍板项, 未获用户批准前不做)。
 *
 * 口径更新 (Task 206): /v1/models = 前台广场 = 「已定价 ∩ 启用渠道 ∩ 探测健康」;
 * 探测范围不变 (已定价∩启用渠道) — 已下架模型继续探测, 上游恢复即自动回榜。
 *
 * Option 可调 (15s 缓存, 改库免部署):
 * - HealthEnabled      缺省 true  — false 时冻结状态机 (记录不更新, 列表不受影响)
 * - HealthFailRounds   缺省 3     — 连续坏轮下架阈值 (钳制 1~60)
 * - HealthRecoverRounds 缺省 2    — 连续好轮回榜阈值 (钳制 1~60)
 * - HealthTtftMs       缺省 30000 — 探测首字延迟阈值 ms (钳制 5000~600000)
 *
 * 失败开放原则: ModelHealth 表缺失/查询异常时按「全部健康」处理, 列表口径退回 Task 202,
 * 绝不因健康系统自身故障把模型藏掉。
 */
import { db } from '@/lib/db'
import { getOptions } from '@/lib/options'

export interface ModelHealthView {
  status: number
  lastTtftMs: number | null
  lastOkAt: string | null
  lastFailAt: string | null
  lastFailReason: string
  lastDownAt: string | null
  lastUpAt: string | null
  updatedAt: string | null
}

function clampInt(v: string | undefined, dft: number, lo: number, hi: number): number {
  const n = parseInt(v || '', 10)
  if (isNaN(n)) return dft
  return Math.min(Math.max(n, lo), hi)
}

/** 迟滞参数 (每次评估现读, Option 15s 缓存, 改库免部署) */
async function thresholds(): Promise<{ enabled: boolean; failRounds: number; recoverRounds: number; ttftLimitMs: number }> {
  const options = await getOptions().catch(() => ({}) as Record<string, string>)
  return {
    enabled: (options.HealthEnabled ?? 'true') !== 'false',
    failRounds: clampInt(options.HealthFailRounds, 3, 1, 60),
    recoverRounds: clampInt(options.HealthRecoverRounds, 2, 1, 60),
    ttftLimitMs: clampInt(options.HealthTtftMs, 30_000, 5_000, 600_000),
  }
}

/**
 * 记录一轮探测结果并推进状态机 (probe.ts 每模型每轮调用一次)
 * - ok=false        → 坏轮 (reason 供后台徽章与下架原因展示)
 * - ok=true 且 ttft>阈值 → 坏轮 (high_latency)
 * - ok=true 且 ttft≤阈值 → 好轮
 * 状态迁移带 console.log 观测点 ([health] 前缀, journal 可查)。
 */
export async function recordProbeOutcome(model: string, ok: boolean, ttftMs: number | null, reason: string): Promise<void> {
  const th = await thresholds()
  if (!th.enabled) return
  const healthy = ok && (ttftMs == null || ttftMs <= th.ttftLimitMs)
  const failReason = healthy
    ? ''
    : ok && ttftMs != null
      ? `首字延迟 ${ttftMs}ms 超阈值 ${th.ttftLimitMs}ms`
      : (reason || '探测失败').slice(0, 200)

  let row = await db.modelHealth.findUnique({ where: { modelName: model } })
  if (!row) {
    row = await db.modelHealth
      .create({ data: { modelName: model, status: 1 } })
      .catch(() => db.modelHealth.findUnique({ where: { modelName: model } }))
    if (!row) return
  }

  const failStreak = healthy ? 0 : row.failStreak + 1
  const okStreak = healthy ? row.okStreak + 1 : 0
  let status = row.status
  let lastDownAt = row.lastDownAt
  let lastUpAt = row.lastUpAt

  if (status === 1 && failStreak >= th.failRounds) {
    status = 0
    lastDownAt = new Date()
    console.log(`[health] "${model}" 自动下架: 连续 ${failStreak} 轮探测异常 (${failReason})`)
  }
  if (status === 0 && okStreak >= th.recoverRounds) {
    status = 1
    lastUpAt = new Date()
    console.log(`[health] "${model}" 自动恢复上架: 连续 ${okStreak} 轮探测正常 (首字 ${ttftMs ?? '?'}ms)`)
  }

  await db.modelHealth.update({
    where: { modelName: model },
    data: {
      status,
      failStreak,
      okStreak,
      // 失败轮保留上一次成功首字值 (后台展示「最后一次正常的延迟」比置空更有用)
      lastTtftMs: ttftMs != null ? ttftMs : undefined,
      lastOkAt: healthy ? new Date() : undefined,
      lastFailAt: healthy ? undefined : new Date(),
      lastFailReason: failReason,
      lastDownAt,
      lastUpAt,
      rounds: { increment: 1 },
    },
  })
}

/** 已下架模型集合 — /v1/models 与前台广场据此隐藏; 表缺失/库异常 → 空集 (失败开放) */
export async function getDelistedSet(): Promise<Set<string>> {
  try {
    const rows = await db.modelHealth.findMany({ where: { status: 0 }, select: { modelName: true } })
    return new Set(rows.map((r) => r.modelName))
  } catch {
    return new Set()
  }
}

/** 全量健康视图 (后台商城卡片徽章用), 序列化时间为 ISO 字符串 */
export async function getHealthMap(): Promise<Map<string, ModelHealthView>> {
  const map = new Map<string, ModelHealthView>()
  try {
    const rows = await db.modelHealth.findMany()
    for (const r of rows) {
      map.set(r.modelName, {
        status: r.status,
        lastTtftMs: r.lastTtftMs,
        lastOkAt: r.lastOkAt ? r.lastOkAt.toISOString() : null,
        lastFailAt: r.lastFailAt ? r.lastFailAt.toISOString() : null,
        lastFailReason: r.lastFailReason,
        lastDownAt: r.lastDownAt ? r.lastDownAt.toISOString() : null,
        lastUpAt: r.lastUpAt ? r.lastUpAt.toISOString() : null,
        updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      })
    }
  } catch {
    /* 表未就绪 → 空 map, 前台不显示健康徽章 */
  }
  return map
}
