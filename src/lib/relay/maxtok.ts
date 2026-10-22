/**
 * Task 197: 上游 max_tokens 输出上限 — 纯函数集 (无副作用, 可单测)
 *
 * 生产实证 (Task 196): Agnes 输出上限 65536, 客户端工具发 max_tokens>65536 → 上游
 * 确定性 400「max_tokens 不能超过 65536」, 重试无意义, 用户侧表现「一直报错」。
 * 一劳永逸策略在 engine.ts (学习→钳制重试→Option 持久化→预钳制), 本文件只放报文
 * 解析与请求体钳制的纯逻辑, 保证这门「读错误报文猜上限」的手艺可以被穷举测试。
 */

/** 上限合理域: <256 视为解析噪声, >1000 万视为解析噪声 */
export const MAXTOK_LIMIT_FLOOR = 256
export const MAXTOK_LIMIT_CEIL = 10_000_000

/** 报文必须提及 max_tokens 系参数名才触发 (避免把「上下文长度超限」误学成输出上限) */
const MAXTOK_ERR_RE = /max_tokens|max_completion_tokens|max_output_tokens|maximum[_ ]output/i

/** 报文必须带超限类措辞 (排除 "max_tokens must be at least 1" 之类反向语义) */
const MAXTOK_OVERSIZE_RE =
  /超过|超出|大于|exceed|too large|too big|too long|maximum|at most|no more than|less than|greater than|upper limit|≤/i

/**
 * 从上游报文推断输出上限。
 * 规则: 报文中所有 ≥256 且 < 请求值 的整数里取最大 —
 *   - 请求值自身 (报文常回显 "max_tokens: 200000 > 65536") 被排除
 *   - 取最大: 真上限通常是报文里仅次于请求值的大数, 小数字多为 request id / 时间戳噪声
 *   - 误判上限只会让钳制重试仍失败 → 不会固化 (自校验在 engine 层)
 * 返回 null = 不适用 (未提及参数名 / 无超限措辞 / 无合理候选)。
 */
export function parseMaxTokensLimit(errText: string, requested: number): number | null {
  if (requested <= 0 || !MAXTOK_ERR_RE.test(errText) || !MAXTOK_OVERSIZE_RE.test(errText)) return null
  // 千分位归一: "65,536" 否则被拆成 65/536 两个噪声候选
  const text = errText.replace(/(\d),(?=\d{3}(\D|$))/g, '$1')
  const cands = new Set<number>()
  for (const m of text.matchAll(/\d{2,10}/g)) {
    const n = parseInt(m[0], 10)
    if (n >= MAXTOK_LIMIT_FLOOR && n <= MAXTOK_LIMIT_CEIL && n < requested) cands.add(n)
  }
  if (cands.size === 0) return null
  return Math.max(...cands)
}

/** 请求体当前生效的输出上限参数值 (max_tokens 优先, 回退 max_completion_tokens), 无则 0 */
export function bodyMaxTok(body: Record<string, unknown>): number {
  const a = body.max_tokens
  const b = body.max_completion_tokens
  const v =
    typeof a === 'number' && Number.isFinite(a)
      ? a
      : typeof b === 'number' && Number.isFinite(b)
        ? b
        : 0
  return v > 0 ? v : 0
}

/** 返回钳制后的请求体副本 (只在超限时替换字段, 不改写原对象 — 换渠道重试时上限可能不同) */
export function clampBodyTo(body: Record<string, unknown>, limit: number): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body }
  if (typeof out.max_tokens === 'number' && out.max_tokens > limit) out.max_tokens = limit
  if (typeof out.max_completion_tokens === 'number' && out.max_completion_tokens > limit)
    out.max_completion_tokens = limit
  return out
}

/** 学习记忆键: 渠道+模型 粒度 (不同模型上限可能不同, 不做渠道级粗粒度) */
export function maxTokKey(channelId: number, model: string): string {
  return `${channelId}|${model}`
}
