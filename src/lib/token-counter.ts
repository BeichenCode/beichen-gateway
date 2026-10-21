/**
 * Token 计数 (估算实现, 与上游 usage 冲突时优先上游)
 * 规则: 英文 ~4字符/token, 中文 ~1.5字符/token, 每个 message +4
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let cjk = 0
  let other = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code > 0x2e7f) cjk++
    else other++
  }
  return Math.ceil(cjk / 1.5 + other / 4)
}

export interface ChatMessage {
  role?: string
  content?: unknown
}

/** OpenAI messages 估算 */
export function estimateMessagesTokens(messages: ChatMessage[]): number {
  let total = 3
  for (const m of messages) {
    total += 4
    total += estimateTokens(m.role ?? '')
    const content = m.content
    if (typeof content === 'string') {
      total += estimateTokens(content)
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (part && typeof part === 'object') {
          const p = part as Record<string, unknown>
          if (typeof p.text === 'string') total += estimateTokens(p.text)
          if (p.type === 'image_url') total += 800 // 图片粗略估算
        } else if (typeof part === 'string') {
          total += estimateTokens(part)
        }
      }
    } else if (content != null) {
      total += estimateTokens(JSON.stringify(content))
    }
    // tool_calls
    const tc = (m as Record<string, unknown>).tool_calls
    if (Array.isArray(tc)) total += estimateTokens(JSON.stringify(tc))
  }
  return total
}

/** Claude messages 格式估算 */
export function estimateClaudeTokens(body: Record<string, unknown>): number {
  let total = 3
  const system = body.system
  if (typeof system === 'string') total += estimateTokens(system)
  else if (Array.isArray(system)) total += estimateTokens(JSON.stringify(system))
  const messages = body.messages
  if (Array.isArray(messages)) {
    total += estimateMessagesTokens(messages as ChatMessage[])
  }
  const tools = body.tools
  if (Array.isArray(tools)) total += estimateTokens(JSON.stringify(tools))
  return total
}

/** 单条字符串(补全请求) */
export function estimatePromptTokens(prompt: unknown): number {
  if (typeof prompt === 'string') return estimateTokens(prompt)
  if (Array.isArray(prompt)) return prompt.reduce((acc: number, p) => acc + estimateTokens(String(p)), 0)
  return 0
}
