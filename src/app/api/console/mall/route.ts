import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { getPerfSummary, type ModelPerf } from '@/lib/perf-metrics'
import { getHealthMap, type ModelHealthView } from '@/lib/model-health'

export const runtime = 'nodejs'

/** GET /api/console/mall — 模型商城数据
 * Task 139: 返回全部计价模型, 附每模型实时状态与真实吞吐量 —
 *   status: online  = 至少 1 条启用渠道 (status=1) 覆盖该模型 → 「在线」
 *           offline = 无启用渠道但存在覆盖该模型的渠道记录 (手动/自动禁用) → 「掉线」
 *           none    = 渠道表从未配置该模型 → 「未接入」
 *   live:   近 5 分钟 type=2 消费日志按模型聚合 { reqs, tokens } — 全部真实数据,
 *           无调用即 0, 不编造。吞吐量展示口径 = tokens/5min → tok/分。
 * Task 195: 附 new-api 原生口径 24h 性能指标 perf (状态=成功率+小时条 / 延迟 / 吞吐),
 *   数据源 Log type=2/5 真实中继样本 (探测流量含在内, 同走真实 relay 全链路), 无样本为 null 不编造。
 * Task 206: 附探测健康 health (status/lastTtftMs/lastFailReason/lastDownAt/lastUpAt) —
 *   status=0 为探测异常已自动下架 (前台广场与 /v1/models 已隐藏, 恢复后自动回榜);
 *   data.delistedCount = 当前已下架模型数。
 */
export async function GET(): Promise<Response> {
  try {
    await requireSession()
    const [priced, channels, perf, healthMap] = await Promise.all([
      db.modelRatio.findMany({ orderBy: [{ quotaType: 'asc' }, { modelName: 'asc' }] }),
      db.channel.findMany({ select: { models: true, status: true } }),
      getPerfSummary(),
      getHealthMap(),
    ])
    const enabled = new Set<string>()
    const everConfigured = new Set<string>()
    for (const c of channels) {
      for (const m of c.models.split(',').map((s) => s.trim()).filter(Boolean)) {
        everConfigured.add(m)
        if (c.status === 1) enabled.add(m)
      }
    }
    // 近 5 分钟每模型真实调用: 次数 + tokens (groupBy 轻量聚合)
    const recent = await db.log.groupBy({
      by: ['modelName'],
      where: { type: 2, createdAt: { gte: new Date(Date.now() - 5 * 60_000) } },
      _sum: { totalTokens: true },
      _count: true,
    })
    const liveMap = new Map(recent.map((r) => [r.modelName, { reqs: r._count, tokens: Number(r._sum.totalTokens ?? 0) }]))

    const items = priced.map((p) => {
      const live = liveMap.get(p.modelName)
      const pf: ModelPerf | undefined = perf.models.get(p.modelName)
      return {
        id: p.id,
        modelName: p.modelName,
        ratio: p.ratio,
        completionRatio: p.completionRatio,
        modelPrice: p.modelPrice,
        quotaType: p.quotaType,
        description: p.description,
        enableGroup: p.enableGroup,
        available: enabled.has(p.modelName),
        status: enabled.has(p.modelName) ? 'online' : everConfigured.has(p.modelName) ? 'offline' : 'none',
        live: { reqs: live?.reqs ?? 0, tokens: live?.tokens ?? 0 },
        health: healthMap.get(p.modelName) ?? null,
        perf: pf
          ? {
              successRate: pf.successRate,
              avgLatencyMs: pf.avgLatencyMs,
              avgTps: pf.avgTps,
              series: pf.series,
            }
          : null,
      }
    })
    const availableCount = items.filter((i) => i.available).length
    const delistedCount = items.filter((i) => i.health?.status === 0).length
    return Response.json({
      success: true,
      data: { items, total: items.length, availableCount, delistedCount, summary: perf.summary, windowStart: perf.windowStart, windowEnd: perf.windowEnd },
    })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error('mall error:', err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
