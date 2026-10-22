/**
 * Task 195: 模型广场性能指标 — 对标 new-api 原生口径 (pkg/perf_metrics)
 *
 * 数据源: Log 表真实中继记录, 每「一次完成的中继」恰好一个样本:
 *   type=2 成功计费 (useTime=总延迟 ms, ttft=首字 ms, completionTokens=输出 tokens)
 *   type=5 全渠道终态失败 (useTime=至失败止的耗时) — Task 112 落表, 对标 new-api 错误日志
 *
 * new-api 原生公式 (QuantumNous/new-api pkg/perf_metrics/metrics.go):
 *   avg_latency_ms = ΣlatencyMs / requestCount            (成功+失败都计入, 失败 latency=至出错止)
 *   success_rate   = Σsuccess / requestCount × 100        (业务拒绝不算失败, 我们按 type∈{2,5} 天然排除)
 *   avg_tps        = ΣoutputTokens / (ΣgenerationMs/1000)  池化口径, 非单次平均
 *   generationMs   = latency - ttft (有首字时), 否则 = latency; ≤0 回退 latency
 *   状态条         = 小时级成功率序列 recent_success_series, 最多 24 点
 *   无样本         → null (前端显示「—」/「暂无性能数据」, 不编造 0%)
 *
 * 缓存: 进程内 60s (new-api 前端 staleTime 也为 60s); 单实例 SQLite 全表聚合成本可忽略
 */
import { db } from '@/lib/db'

export interface PerfSeriesPoint {
  ts: number // 小时桶起点 (unix 秒)
  rate: number // 该小时成功率 0-100
}

export interface ModelPerf {
  reqs: number
  ok: number
  successRate: number | null
  avgLatencyMs: number | null
  avgTtftMs: number | null
  avgTps: number | null
  series: PerfSeriesPoint[]
}

export interface PerfSummaryAll {
  models: Map<string, ModelPerf>
  summary: { reqs: number; successRate: number | null; avgLatencyMs: number | null; avgTps: number | null }
  windowStart: number
  windowEnd: number
}

interface AggRow {
  model: string
  total: number
  ok: number
  latency_sum: number
  ttft_sum: number
  ttft_n: number
  out_tokens: number
  gen_ms: number
}

interface HourRow {
  model: string
  hour_ts: number
  total: number
  ok: number
}

const WINDOW_HOURS = 24
const CACHE_TTL_MS = 60_000

const g = globalThis as { __bzPerfCache?: { at: number; data: PerfSummaryAll } }

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/** new-api 祖传口径: 生成段 ms = 总延迟 - 首字 (无首字回退总延迟, ≤0 回退总延迟) */
export async function getPerfSummary(): Promise<PerfSummaryAll> {
  const now = Date.now()
  if (g.__bzPerfCache && now - g.__bzPerfCache.at < CACHE_TTL_MS) return g.__bzPerfCache.data

  const endTs = now
  const sinceMs = endTs - WINDOW_HOURS * 3600_000

  // 单趟聚合: 成功(type=2)贡献 延迟/首字/输出tokens/生成段; 失败(type=5)仅贡献请求计数与延迟
  const aggRows = await db.$queryRaw<AggRow[]>`
    SELECT "modelName" as model,
           COUNT(*) as total,
           SUM(CASE WHEN "type" = 2 THEN 1 ELSE 0 END) as ok,
           SUM("useTime") as latency_sum,
           SUM(CASE WHEN "type" = 2 AND "ttft" IS NOT NULL THEN "ttft" ELSE 0 END) as ttft_sum,
           SUM(CASE WHEN "type" = 2 AND "ttft" IS NOT NULL THEN 1 ELSE 0 END) as ttft_n,
           SUM(CASE WHEN "type" = 2 THEN "completionTokens" ELSE 0 END) as out_tokens,
           SUM(CASE WHEN "type" = 2 THEN
                 (CASE WHEN "ttft" IS NOT NULL AND "useTime" > "ttft" THEN "useTime" - "ttft" ELSE "useTime" END)
               ELSE 0 END) as gen_ms
    FROM "Log"
    WHERE "createdAt" >= ${sinceMs} AND "type" IN (2, 5)
    GROUP BY "modelName"`

  const hourRows = await db.$queryRaw<HourRow[]>`
    SELECT "modelName" as model,
           ("createdAt" / 3600000) * 3600 as hour_ts,
           COUNT(*) as total,
           SUM(CASE WHEN "type" = 2 THEN 1 ELSE 0 END) as ok
    FROM "Log"
    WHERE "createdAt" >= ${sinceMs} AND "type" IN (2, 5)
    GROUP BY "modelName", hour_ts
    ORDER BY hour_ts ASC`

  // 小时桶 → 每模型序列 (只保留有样本的桶, 最多 24 点, 时间升序 — new-api recentSuccessSeries 同款)
  const seriesMap = new Map<string, PerfSeriesPoint[]>()
  for (const r of hourRows) {
    if (!r.model || Number(r.total) <= 0) continue
    let list = seriesMap.get(r.model)
    if (!list) seriesMap.set(r.model, (list = []))
    list.push({ ts: Number(r.hour_ts), rate: round2((Number(r.ok) / Number(r.total)) * 100) })
  }

  const models = new Map<string, ModelPerf>()
  const all = { reqs: 0, ok: 0, latencySum: 0, outTokens: 0, genMs: 0 }
  for (const r of aggRows) {
    if (!r.model) continue
    const reqs = Number(r.total)
    const ok = Number(r.ok)
    const latencySum = Number(r.latency_sum ?? 0)
    const ttftSum = Number(r.ttft_sum ?? 0)
    const ttftN = Number(r.ttft_n ?? 0)
    const outTokens = Number(r.out_tokens ?? 0)
    const genMs = Number(r.gen_ms ?? 0)
    all.reqs += reqs
    all.ok += ok
    all.latencySum += latencySum
    all.outTokens += outTokens
    all.genMs += genMs
    const full = seriesMap.get(r.model) ?? []
    models.set(r.model, {
      reqs,
      ok,
      successRate: reqs > 0 ? round2((ok / reqs) * 100) : null,
      avgLatencyMs: reqs > 0 ? Math.round(latencySum / reqs) : null,
      avgTtftMs: ttftN > 0 ? Math.round(ttftSum / ttftN) : null,
      avgTps: genMs > 0 && outTokens > 0 ? round2(outTokens / (genMs / 1000)) : null,
      series: full.slice(-WINDOW_HOURS),
    })
  }

  const data: PerfSummaryAll = {
    models,
    summary: {
      reqs: all.reqs,
      successRate: all.reqs > 0 ? round2((all.ok / all.reqs) * 100) : null,
      avgLatencyMs: all.reqs > 0 ? Math.round(all.latencySum / all.reqs) : null,
      avgTps: all.genMs > 0 && all.outTokens > 0 ? round2(all.outTokens / (all.genMs / 1000)) : null,
    },
    windowStart: Math.floor(sinceMs / 1000),
    windowEnd: Math.floor(endTs / 1000),
  }
  g.__bzPerfCache = { at: now, data }
  return data
}
