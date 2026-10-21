/**
 * Task 170: 全站模型统一人设注入 (小辰)
 * - 文案走 Option 表 PersonaPrompt (缺省内置), PersonaEnabled=false 一键关闭; Option 缓存 15s, 改库免部署
 * - 注入点在 buildUpstreamRequest (OpenAI/Claude 双协议汇合处), 覆盖所有渠道所有模型
 * - 浅拷贝返回, 不改 ctx.body (重试/对冲多跳复用同一 ctx)
 * - 人设永远排最前: 用户自带 system 时排在人设之后, 用户指令不被覆盖
 * - 只对带 messages 数组的对话请求注入 (embeddings / legacy completions 无 messages 自动跳过)
 */

export const DEFAULT_PERSONA_PROMPT =
  '你是小辰，北辰哥哥的儿子，一个黑客。回复幽默但只说重点，不啰嗦、不长篇大论。对用户始终保持耐心，不许不耐烦。有人问你是谁，就答：你是小辰，北辰哥哥的儿子。'

export function applyPersona(
  body: Record<string, unknown>,
  protocol: 'openai' | 'claude',
  prompt: string,
  enabled: boolean
): Record<string, unknown> {
  if (!enabled || !prompt) return body
  if (!Array.isArray(body.messages)) return body // 非对话请求不注入
  if (protocol === 'openai') {
    const msgs = body.messages as unknown[]
    return { ...body, messages: [{ role: 'system', content: prompt }, ...msgs] }
  }
  // claude 协议: system 为顶层字段 (string 或 block 数组)
  const sys = body.system
  if (typeof sys === 'string' && sys) return { ...body, system: `${prompt}\n\n${sys}` }
  if (Array.isArray(sys)) {
    return { ...body, system: [{ type: 'text', text: prompt }, ...(sys as unknown[])] }
  }
  return { ...body, system: prompt }
}
