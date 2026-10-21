/**
 * 渠道选择: 优先级分层 + 组内加权随机 + 故障自动恢复
 * 对标 New API 的 Ability 机制 (此处直接基于 Channel 表 + 内存缓存)
 */
import { db } from '@/lib/db'
import { isClaudeChannel } from '@/lib/channel-types'

export interface ChannelCandidate {
  id: number
  name: string
  type: number
  baseUrl: string
  keys: string[]
  models: string[]
  groups: string[]
  priority: number
  weight: number
  autoBan: boolean
  status: number
  other: string
}

interface ChannelCache {
  channels: ChannelCandidate[]
  ts: number
}

let cache: ChannelCache | null = null
const TTL = 10 * 1000

function parseKeys(key: string): string[] {
  return key
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function invalidateChannelCache(): void {
  cache = null
}

async function loadChannels(): Promise<ChannelCandidate[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.channels
  const rows = await db.channel.findMany({ where: { status: 1 } })
  const channels: ChannelCandidate[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    baseUrl: c.baseUrl,
    keys: parseKeys(c.key),
    models: c.models.split(',').map((s) => s.trim()).filter(Boolean),
    groups: c.groups.split(',').map((s) => s.trim()).filter(Boolean),
    priority: c.priority,
    weight: c.weight,
    autoBan: c.autoBan === 1,
    status: c.status,
    other: c.other,
  }))
  cache = { channels, ts: Date.now() }
  return channels
}

/**
 * 按优先级从高到低返回候选渠道序列, 同优先级内加权随机打散
 */
export async function selectChannels(
  model: string,
  groups: string[],
  retry: number
): Promise<ChannelCandidate[]> {
  let channels = await loadChannels()
  if (channels.length === 0) {
    // 自动恢复试探: 若无任何启用渠道, 恢复一个"自动禁用"的渠道再试
    const banned = await db.channel.findFirst({ where: { status: 3 }, orderBy: { priority: 'desc' } })
    if (banned) {
      await db.channel.update({ where: { id: banned.id }, data: { status: 1 } })
      invalidateChannelCache()
      channels = await loadChannels()
    }
  }

  const candidates = channels.filter(
    (c) =>
      c.models.includes(model) &&
      c.groups.some((g) => groups.includes(g)) &&
      c.keys.length > 0
  )
  if (candidates.length === 0) {
    // Task 205: 独占模型半开兜底 — 模型仅有的渠道被 autoban 后, 5 分钟探活空窗内
    // 所有请求都 503「无可用渠道」(实锤: 10-19 18:20-18:31 NightRouter 熔断 11 分钟,
    // 用户的编程 Agent 每 5-10s 一发全数失败, 且 CF 会把 5xx 替换成 HTML 错误页观感更差)。
    // 这里把「承载该模型的 banned 渠道」作为一次性半开候选返回: 不改 status (探活循环仍会
    // 按节奏拉正), 上游确已恢复则该请求直接成功 (finalizeBilling 的 clearChannelFailure
    // 清零失败计数); 上游仍挂则走与启用渠道完全相同的失败/重试路径, 风险语义不变。
    const bannedRows = await db.channel.findMany({ where: { status: 3 } })
    const semi = bannedRows
      .filter(
        (c) =>
          parseKeys(c.key).length > 0 &&
          c.models.split(',').map((s) => s.trim()).includes(model) &&
          c.groups.split(',').map((s) => s.trim()).some((g) => groups.includes(g))
      )
      .sort((a, b) => b.priority - a.priority)
      .map<ChannelCandidate>((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        baseUrl: c.baseUrl,
        keys: parseKeys(c.key),
        models: c.models.split(',').map((s) => s.trim()).filter(Boolean),
        groups: c.groups.split(',').map((s) => s.trim()).filter(Boolean),
        priority: c.priority,
        weight: c.weight,
        autoBan: c.autoBan === 1,
        status: c.status,
        other: c.other,
      }))
    if (semi.length === 0) return []
    console.warn(`[semi-open] model ${model}: all enabled channels down, probing banned ch=${semi.map((c) => c.id).join(',')}`)
    const maxRetry = Math.max(retry, 1)
    const out = [...semi]
    while (out.length > 0 && out.length < maxRetry) out.push(...semi)
    return out.slice(0, maxRetry)
  }

  // 按优先级分层
  const tiers = new Map<number, ChannelCandidate[]>()
  for (const c of candidates) {
    const list = tiers.get(c.priority) ?? []
    list.push(c)
    tiers.set(c.priority, list)
  }
  const sortedPriorities = [...tiers.keys()].sort((a, b) => b - a)

  // 每层内部加权随机排序
  const result: ChannelCandidate[] = []
  for (const p of sortedPriorities) {
    result.push(...weightedShuffle(tiers.get(p)!))
  }
  // Task 112: 候选不足重试槽位时同渠道重复填充 (new-api 重试语义) — 当前单渠道场景下
  // 上游间歇性故障 (如实测 agnes 400 embedding 误路由, 6s 后同模型恢复正常) 第二跳即可
  // 命中正常实例; 旧逻辑去重后单渠道只有 1 次机会, 一次失败即终态报给客户端
  const maxRetry = Math.max(retry, 1)
  if (result.length > 0 && result.length < maxRetry) {
    const base = [...result]
    while (result.length < maxRetry) result.push(...base)
  }
  return result.slice(0, maxRetry)
}

function weightedShuffle(items: ChannelCandidate[]): ChannelCandidate[] {
  const pool = [...items]
  const out: ChannelCandidate[] = []
  while (pool.length > 0) {
    const totalWeight = pool.reduce((sum, c) => sum + Math.max(c.weight, 0), 0)
    let r = Math.random() * (totalWeight || pool.length)
    let idx = 0
    for (let i = 0; i < pool.length; i++) {
      const w = pool[i].weight > 0 ? pool[i].weight : 1
      r -= w
      if (r <= 0) {
        idx = i
        break
      }
    }
    out.push(pool[idx])
    pool.splice(idx, 1)
  }
  return out
}

/** 更新渠道统计与状态 */
export async function recordChannelResult(channelId: number, ok: boolean, responseTimeMs: number): Promise<void> {
  if (ok) {
    await db.channel.update({
      where: { id: channelId },
      data: { responseTime: Math.round(responseTimeMs), testTime: new Date() },
    }).catch(() => {})
  }
}

/** 失败自动禁用 */
export async function autoBanChannelIfNeeded(channelId: number, enabled: boolean, autoBan: boolean): Promise<void> {
  if (!enabled || !autoBan) return
  await db.channel.update({ where: { id: channelId }, data: { status: 3 } }).catch(() => {})
  invalidateChannelCache()
}

// ============ Task 152: 连续失败计数 + 自动恢复探活 ============
// 用户反馈「渠道只是失败这一小会儿就被禁了」— 单渠道站一次误禁 = 全站瘫痪:
// ① 一次失败只计数, 连续 ≥ AutoBanThreshold (Option, 缺省 3) 次才真禁用;
//    中间任何一笔成功计费即清零 (engine.finalizeBilling 调 clearChannelFailure)
// ② 被禁渠道每 5 分钟自动探活 GET /v1/models, 200/429 (活着) 即自动恢复启用
const failureStreak = new Map<number, { count: number; at: number }>()

/** 记一次失败; 返回 true = 已达阈值并真正禁用 (供 journal 观测) */
export async function recordChannelFailureStreak(
  channelId: number,
  options: Record<string, string>,
  autoBan: boolean
): Promise<boolean> {
  const s = failureStreak.get(channelId) ?? { count: 0, at: 0 }
  s.count += 1
  s.at = Date.now()
  failureStreak.set(channelId, s)
  // 内存有界: 超过 64 渠道清理 10 分钟无活动的计数
  if (failureStreak.size > 64) {
    for (const [k, v] of failureStreak) if (Date.now() - v.at > 600_000) failureStreak.delete(k)
  }
  const threshold = Math.max(1, parseInt(options.AutoBanThreshold || '', 10) || 3)
  if (options.AutomaticDisableChannelEnabled !== 'true' || !autoBan || s.count < threshold) return false
  try {
    await db.channel.update({ where: { id: channelId }, data: { status: 3, testTime: new Date() } })
    invalidateChannelCache()
    console.error(`[autoban] channel ${channelId} disabled after ${s.count} consecutive failures`)
  } catch { /* ignore */ }
  return true
}

/** 成功即清零 — 偶发失败后的任何一笔成功都重置计数 */
export function clearChannelFailure(channelId: number): void {
  failureStreak.delete(channelId)
}

/** 探活并自动恢复: status=3 渠道 GET {base}/v1/models — 200/429 均视为上游活着 (429=限流但服务在) */
export async function probeAndRecoverChannels(): Promise<void> {
  const banned = await db.channel.findMany({ where: { status: 3 } })
  for (const c of banned) {
    const key = parseKeys(c.key)[0]
    if (!key || !c.baseUrl) continue
    const url = buildUpstreamUrl({ id: c.id, name: c.name, type: c.type, baseUrl: c.baseUrl } as ChannelCandidate, '/v1/models')
    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (resp.status === 200 || resp.status === 429) {
        await db.channel.update({ where: { id: c.id }, data: { status: 1 } })
        invalidateChannelCache()
        console.log(`[autoban] channel ${c.id} (${c.name}) auto-recovered via probe (status=${resp.status})`)
      }
    } catch { /* 探活失败保持禁用, 下轮再试 */ }
  }
}

/** 单例恢复循环 — globalThis 防模块多次加载重复起 */
export function startChannelRecoveryLoop(): void {
  const g = globalThis as { __bzRecoveryLoop?: boolean }
  if (g.__bzRecoveryLoop) return
  g.__bzRecoveryLoop = true
  const t = setInterval(() => { probeAndRecoverChannels().catch(() => {}) }, 5 * 60_000)
  t.unref?.()
}

export function channelProtocol(type: number): 'openai' | 'claude' {
  return isClaudeChannel(type) ? 'claude' : 'openai'
}

// ============ 上游 URL 构造 ============
export function buildUpstreamUrl(channel: ChannelCandidate, apiPath: string): string {
  let base = (channel.baseUrl || '').replace(/\/+$/, '')
  // Gemini 渠道: 自动使用 OpenAI 兼容端点
  if (channel.type === 24 && !base.includes('/openai')) {
    if (!base) base = 'https://generativelanguage.googleapis.com/v1beta/openai'
    else if (!base.includes('/v1beta')) base = base + '/v1beta/openai'
    return base + apiPath.replace(/^\/v1/, '')
  }
  if (!base) {
    base = 'https://api.openai.com'
  }
  // base 以 /v1 或常见版本路径结尾 → 追加去掉 /v1 的路径
  if (/\/v\d+$/.test(base) || /compatible-mode$/.test(base) || /\/paas$/.test(base) || /\/api$/.test(base) || /\/api\/v\d+$/.test(base)) {
    return base + apiPath.replace(/^\/v1/, '')
  }
  return base + apiPath
}
