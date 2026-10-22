import { db as prisma } from '@/lib/db'
import { getOptions } from '@/lib/options'
/* Task 176: 统计只认真实用户调用 — 平台自探测令牌「系统探测」的合成流量不参与任何指标 */
import { PROBE_TOKEN_NAME } from '@/lib/probe'
/* Task 206: 前台广场只展示探测健康模型 — 异常模型自动下架, 恢复后自动回榜 */
import { getDelistedSet } from '@/lib/model-health'

export const runtime = 'nodejs'

/**
 * 公开模型明细 (官网模型广场展示用, 无需登录)
 * 全部为真实数据:
 *   online       — 是否被任一启用渠道覆盖 (Channel.models 并集); 接口仅返回在线模型
 *   ── Task 206: 探测健康口径 ──
 *   探测连续异常/首字超阈值的模型已自动下架, 不在本接口返回 (与 /v1/models 同口径);
 *   上游恢复后自动重新上架, 无需人工介入
 *   inputPrice   — 输入价 USD / 1M tokens (ratio × $2; 按次计费时为空)
 *   outputPrice  — 输出价 USD / 1M tokens (ratio × completionRatio × $2)
 *   perCallPrice — 按次计费价 USD (quotaType=1 且 modelPrice>=0)
 *   ── Task 176 口径: 统计只认真实用户调用 ──
 *   以下 tps / avgTtftMs / avgLatencyMs / calls 为同一窗口 (近 24h)、同一样本集
 *   (真实用户调用) 的统计; 平台自探测令牌 (PROBE_TOKEN_NAME「系统探测」) 的合成
 *   流量在聚合前整行剔除, 不再稀释/拉偏指标:
 *   tps          — Σcompletion_tokens ÷ Σgeneration_ms, Math.round(v*100)/100 保留 2 位,
 *                  无封顶无地板 (口径 1:1 对齐 QuantumNous/new-api pkg/perf_metrics:
 *                  avg_tps=Σoutput_tokens/Σgeneration_ms; generation_ms 流式=结束-首包 (useTime-ttft),
 *                  非流式=全程 useTime, ≤0 时退回全程)
 *   avgTtftMs    — 真实用户流式调用首字延迟均值: Σttft ÷ N (仅取 isStream 且 ttft>0 的行,
 *                  ttft = 发出请求 → 收到第一个字); 近 24h 无流式样本时为 null
 *   avgLatencyMs — 平均端到端全程延迟: ΣuseTime ÷ N (整数除法, 与 new-api avg_latency_ms 同义)
 *   calls        — 真实用户调用次数 (与 tps/首字/端到端同窗口、同一样本集)
 *   cnyRate      — 站点展示汇率 (¥ / $1, Option.Price): 前端据此统一人民币展示
 */
export type PublicModel = {
  name: string
  online: boolean
  quotaType: number
  inputPrice: number | null
  outputPrice: number | null
  perCallPrice: number | null
  tps: number | null
  avgTtftMs: number | null
  avgLatencyMs: number | null
  calls: number
}

export async function GET(): Promise<Response> {
  try {
    // 口径 1:1 对齐 QuantumNous/new-api pkg/perf_metrics — 统计窗口固定近 24 小时
    // (同 new-api 前端模型卡 getPerfMetrics(model, 24) 的查询窗口)
    const since24h = new Date(Date.now() - 24 * 3600 * 1000)
    const opts = await getOptions()
    const [channels, ratios, logs, cnyRateRaw, delisted] = await Promise.all([
      prisma.channel.findMany({ where: { status: 1 }, select: { models: true } }),
      prisma.modelRatio.findMany({
        select: { modelName: true, ratio: true, completionRatio: true, modelPrice: true, quotaType: true },
        take: 200,
        orderBy: { modelName: 'asc' },
      }),
      // 口径 1:1 对齐 QuantumNous/new-api pkg/perf_metrics — 取原始日志行, 逐行采样后按模型聚合
      // Task 176: select 增加 tokenName, 聚合时整行剔除平台自探测令牌的合成流量 (SQL 侧不过滤,
      // 避免对 NULL tokenName 的历史真实行产生误伤)
      prisma.log.findMany({
        where: { type: 2, createdAt: { gte: since24h } },
        select: {
          modelName: true,
          tokenName: true,
          completionTokens: true,
          useTime: true,
          ttft: true,
          isStream: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50000,
      }),
      opts.Price || '7.3',
      getDelistedSet(),
    ])
    const cnyRate = parseFloat(cnyRateRaw || '7.3') || 7.3

    // 在线集合: 启用渠道的 models 字段并集
    const onlineSet = new Set<string>()
    for (const c of channels) {
      for (const m of c.models.split(',').map((s) => s.trim()).filter(Boolean)) onlineSet.add(m)
    }

    // 口径 1:1 对齐 QuantumNous/new-api pkg/perf_metrics (RecordRelayResult 采样 + SummarizeModels 聚合):
    //   Task 176: tokenName === PROBE_TOKEN_NAME 的行整行跳过 — 只有真实用户调用参与统计,
    //             平台探测的合成流量不再稀释 TPS / 拉偏延迟 / 灌水调用量
    //   hasTtft   = isStream && ttft 非空且 > 0      — 仅流式才有首包时刻
    //   latencyMs = useTime                          — 端到端全程
    //   genMs     = hasTtft ? useTime - ttft : useTime — 流式=结束-首包, 非流式=全程
    //               genMs <= 0 时退回 latencyMs        — 同 new-api generationMs 兜底
    //   首字采样   hasTtft 的行额外累加 ttftSum/ttftN — 真实用户流式调用的「发出请求 → 收到第一个字」
    //   逐行累加   tokSum += completionTokens; latSum += useTime; genSum += genMs; calls += 1
    // 无地板/封顶/P50/分母下限等任何修饰 — 全部取全体样本均值
    const acc = new Map<
      string,
      { calls: number; tokSum: number; latSum: number; genSum: number; ttftSum: number; ttftN: number }
    >()
    for (const r of logs) {
      if (r.tokenName === PROBE_TOKEN_NAME) continue // 平台自探测 = 合成流量, 不算真实调用
      const useMs = Number(r.useTime ?? 0)
      const ttftMs =
        r.isStream === true && r.ttft != null && Number(r.ttft) > 0 ? Number(r.ttft) : null
      const latencyMs = useMs
      let genMs = ttftMs != null ? useMs - ttftMs : useMs
      if (genMs <= 0) genMs = latencyMs
      let a = acc.get(r.modelName)
      if (!a) {
        a = { calls: 0, tokSum: 0, latSum: 0, genSum: 0, ttftSum: 0, ttftN: 0 }
        acc.set(r.modelName, a)
      }
      a.tokSum += Number(r.completionTokens ?? 0)
      a.latSum += latencyMs
      a.genSum += genMs
      if (ttftMs != null) {
        a.ttftSum += ttftMs
        a.ttftN += 1
      }
      a.calls += 1
    }

    // 仅展示真实可用模型 (启用中渠道的 models 并集), 未上线模型不再对外露出;
    // Task 206: 探测异常已下架的模型同样不露出 (恢复后自动回榜)
    const models: PublicModel[] = ratios
      .filter((r) => onlineSet.has(r.modelName) && !delisted.has(r.modelName))
      .map((r) => {
        const a = acc.get(r.modelName)
        const byCall = r.quotaType === 1 && Number(r.modelPrice) >= 0
        // 口径 1:1 对齐 QuantumNous/new-api pkg/perf_metrics:
        //   tps          = Σtok ÷ Σ生成秒, Math.round(v*100)/100 保留 2 位, 无封顶无地板 (AvgTps 同式)
        //   avgTtftMs    = Σttft ÷ N 流式首字均值 (Task 176 新增); 无流式样本为 null
        //   avgLatencyMs = Σ全程ms ÷ N 整数除法 (avg_latency_ms 同义); 无样本为 null
        const tps = a && a.genSum > 0 && a.tokSum > 0 ? Math.round((a.tokSum / (a.genSum / 1000)) * 100) / 100 : 0
        const avgTtftMs: number | null = a && a.ttftN > 0 ? Math.round(a.ttftSum / a.ttftN) : null
        const avgLatencyMs: number | null = a && a.calls > 0 ? Math.round(a.latSum / a.calls) : null
        return {
          name: r.modelName,
          online: onlineSet.has(r.modelName),
          quotaType: r.quotaType,
          // 6 位小数: 保证 ¥0.01/M 级小价在 ×7.3 换算后不失真 (3 位会退化成 ¥0.0073)
          inputPrice: byCall ? null : Math.round(Number(r.ratio) * 2 * 1e6) / 1e6,
          outputPrice: byCall ? null : Math.round(Number(r.ratio) * Number(r.completionRatio) * 2 * 1e6) / 1e6,
          perCallPrice: byCall ? Number(r.modelPrice) : null,
          tps,
          avgTtftMs,
          avgLatencyMs,
          calls: a?.calls ?? 0,
        }
      })

    // 有调用的排前, 同量按名排 (近 24h 真实用户调用量定序)
    models.sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name))

    return Response.json({ success: true, data: { models: models.slice(0, 64), cnyRate } })
  } catch {
    return Response.json({ success: true, data: { models: [], cnyRate: 7.3 } })
  }
}
