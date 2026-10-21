/**
 * Claude 协议适配器: OpenAI ↔ Claude 双向转换 (含流式)
 * 支持: 消息/系统提示/多模态图片/工具调用
 */

// ================= Claude 请求 → OpenAI 请求 =================
interface ClaudeBlock {
  type?: string
  text?: string
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: unknown
  source?: { type?: string; media_type?: string; data?: string; url?: string }
}

export function claudeToOpenAIRequest(body: Record<string, unknown>): Record<string, unknown> {
  const messages: OpenAIMessage[] = []
  const system = body.system
  if (typeof system === 'string' && system) messages.push({ role: 'system', content: system })
  else if (Array.isArray(system)) {
    const text = (system as ClaudeBlock[]).map((b) => b.text || '').join('\n')
    if (text) messages.push({ role: 'system', content: text })
  }

  for (const m of (body.messages as Array<Record<string, unknown>>) || []) {
    const role = m.role as string
    const content = m.content
    if (role === 'user' || role === 'assistant') {
      if (typeof content === 'string') {
        messages.push({ role, content })
        continue
      }
      const blocks = (content as ClaudeBlock[]) || []
      const toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> = []
      const parts: Array<Record<string, unknown>> = []
      for (const b of blocks) {
        if (b.type === 'text') parts.push({ type: 'text', text: b.text || '' })
        else if (b.type === 'image') {
          const src = b.source || {}
          if (src.type === 'base64') {
            parts.push({ type: 'image_url', image_url: { url: `data:${src.media_type};base64,${src.data}` } })
          } else if (src.url) {
            parts.push({ type: 'image_url', image_url: { url: src.url } })
          }
        } else if (b.type === 'tool_use') {
          toolCalls.push({ id: b.id || '', type: 'function', function: { name: b.name || '', arguments: JSON.stringify(b.input ?? {}) } })
        } else if (b.type === 'tool_result') {
          // tool_result 单独作为 tool 消息
          messages.push({ role: 'tool', tool_call_id: b.tool_use_id || '', content: contentToText(b.content) })
        }
      }
      if (toolCalls.length > 0) {
        messages.push({ role: 'assistant', content: parts.length > 0 ? (parts[0].text as string) || null : null, tool_calls: toolCalls })
      } else if (parts.length > 0) {
        messages.push({ role, content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts })
      }
    }
  }

  const openai: Record<string, unknown> = { model: body.model, messages }
  if (body.max_tokens !== undefined) openai.max_tokens = body.max_tokens
  if (body.temperature !== undefined) openai.temperature = body.temperature
  if (body.top_p !== undefined) openai.top_p = body.top_p
  if (Array.isArray(body.stop_sequences)) openai.stop = body.stop_sequences
  if (body.stream === true) openai.stream = true

  const tools = body.tools as Array<Record<string, unknown>>
  if (Array.isArray(tools) && tools.length > 0) {
    openai.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description || '', parameters: t.input_schema || { type: 'object', properties: {} } },
    }))
  }
  const tc = body.tool_choice as Record<string, unknown>
  if (tc?.type === 'auto') openai.tool_choice = 'auto'
  else if (tc?.type === 'any') openai.tool_choice = 'required'
  else if (tc?.type === 'tool') openai.tool_choice = { type: 'function', function: { name: tc.name } }
  return openai
}

// ================= OpenAI 请求 → Claude 请求 =================
interface OpenAIMessage {
  role: string
  content: unknown
  tool_calls?: Array<{ id: string; type?: string; function?: { name: string; arguments: string } }>
  name?: string
  tool_call_id?: string
}

interface OpenAITool {
  type: string
  function?: { name: string; description?: string; parameters?: unknown }
}

export function openaiToClaudeRequest(body: Record<string, unknown>): Record<string, unknown> {
  const messages = (body.messages as OpenAIMessage[]) || []
  const systemParts: string[] = []
  const claudeMessages: Array<Record<string, unknown>> = []

  for (const m of messages) {
    if (m.role === 'system' || m.role === 'developer') {
      systemParts.push(contentToText(m.content))
      continue
    }
    if (m.role === 'tool') {
      // tool 结果 → user 消息里的 tool_result block
      claudeMessages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: m.tool_call_id || '',
            content: contentToText(m.content),
          },
        ],
      })
      continue
    }
    const role = m.role === 'assistant' ? 'assistant' : 'user'
    const blocks: Array<Record<string, unknown>> = []

    // tool_calls (assistant)
    if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      for (const tc of m.tool_calls) {
        let input: unknown = {}
        try {
          input = JSON.parse(tc.function?.arguments || '{}')
        } catch {
          input = {}
        }
        blocks.push({ type: 'tool_use', id: tc.id || `toolu_${Math.random().toString(36).slice(2, 10)}`, name: tc.function?.name || '', input })
      }
    }

    // content
    if (typeof m.content === 'string') {
      if (m.content) blocks.push({ type: 'text', text: m.content })
    } else if (Array.isArray(m.content)) {
      for (const part of m.content as Array<Record<string, unknown>>) {
        if (part.type === 'text' && typeof part.text === 'string') {
          blocks.push({ type: 'text', text: part.text })
        } else if (part.type === 'image_url') {
          const url = (part.image_url as { url?: string })?.url || ''
          const match = /^data:([^;]+);base64,(.*)$/s.exec(url)
          if (match) {
            blocks.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } })
          } else if (url) {
            blocks.push({ type: 'image', source: { type: 'url', url } })
          }
        }
      }
    }

    if (blocks.length > 0) {
      // 合并连续同角色消息 (Claude 要求交替)
      const prev = claudeMessages[claudeMessages.length - 1]
      if (prev && prev.role === role) {
        prev.content = [...(prev.content as Array<Record<string, unknown>>), ...blocks]
      } else {
        claudeMessages.push({ role, content: blocks })
      }
    }
  }

  const claude: Record<string, unknown> = {
    model: body.model,
    messages: claudeMessages,
    max_tokens: (body.max_tokens as number) || (body.max_completion_tokens as number) || 4096,
  }
  if (systemParts.length > 0) claude.system = systemParts.join('\n')
  if (body.temperature !== undefined) claude.temperature = body.temperature
  if (body.top_p !== undefined) claude.top_p = body.top_p
  if (typeof body.stop === 'string') claude.stop_sequences = [body.stop]
  else if (Array.isArray(body.stop)) claude.stop_sequences = body.stop
  if (body.stream === true) claude.stream = true

  // tools
  const tools = body.tools as OpenAITool[]
  if (Array.isArray(tools) && tools.length > 0) {
    const claudeTools = tools
      .filter((t) => t.type === 'function' && t.function)
      .map((t) => ({
        name: t.function!.name,
        description: t.function!.description || '',
        input_schema: t.function!.parameters || { type: 'object', properties: {} },
      }))
    if (claudeTools.length > 0) claude.tools = claudeTools
    const toolChoice = body.tool_choice as Record<string, unknown> | string | undefined
    if (toolChoice === 'auto') claude.tool_choice = { type: 'auto' }
    else if (toolChoice === 'none') {
      delete claude.tools
    } else if (toolChoice === 'required') claude.tool_choice = { type: 'any' }
    else if (toolChoice && typeof toolChoice === 'object' && (toolChoice as { type?: string }).type === 'function') {
      const fn = (toolChoice as { function?: { name?: string } }).function
      claude.tool_choice = { type: 'tool', name: fn?.name || '' }
    }
  }
  return claude
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((p) => (p && typeof p === 'object' && (p as { text?: string }).text) || '')
      .join('')
  }
  return content == null ? '' : String(content)
}

// ================= Claude 响应 → OpenAI 响应 =================
export function claudeToOpenAIResponse(claudeResp: Record<string, unknown>, model: string): Record<string, unknown> {
  const content = (claudeResp.content as Array<Record<string, unknown>>) || []
  let text = ''
  const toolCalls: Array<Record<string, unknown>> = []
  for (const block of content) {
    if (block.type === 'text') text += block.text ?? ''
    else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id || `call_${Math.random().toString(36).slice(2, 10)}`,
        type: 'function',
        function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
      })
    }
  }
  const stopReason = claudeResp.stop_reason
  const finishReason =
    stopReason === 'max_tokens' ? 'length' : stopReason === 'tool_use' ? 'tool_calls' : 'stop'
  const usage = (claudeResp.usage as Record<string, number>) || {}
  const message: Record<string, unknown> = { role: 'assistant', content: text || null }
  if (toolCalls.length > 0) message.tool_calls = toolCalls
  return {
    id: `chatcmpl-${claudeResp.id || Math.random().toString(36).slice(2)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message, finish_reason: finishReason }],
    usage: {
      prompt_tokens: usage.input_tokens ?? 0,
      completion_tokens: usage.output_tokens ?? 0,
      total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
    },
  }
}

// ================= OpenAI 响应 → Claude 响应 =================
export function openaiToClaudeResponse(openaiResp: Record<string, unknown>): Record<string, unknown> {
  const choice = (openaiResp.choices as Array<Record<string, unknown>>)?.[0] || {}
  const message = (choice.message as Record<string, unknown>) || {}
  const usage = (openaiResp.usage as Record<string, number>) || {}
  const blocks: Array<Record<string, unknown>> = []
  if (typeof message.content === 'string' && message.content) {
    blocks.push({ type: 'text', text: message.content })
  }
  if (Array.isArray(message.tool_calls)) {
    for (const tc of message.tool_calls as Array<{ id?: string; function?: { name?: string; arguments?: string } }>) {
      let input: unknown = {}
      try {
        input = JSON.parse(tc.function?.arguments || '{}')
      } catch { /* ignore */ }
      blocks.push({ type: 'tool_use', id: tc.id || `toolu_${Math.random().toString(36).slice(2, 10)}`, name: tc.function?.name, input })
    }
  }
  const finish = choice.finish_reason
  const stopReason = finish === 'length' ? 'max_tokens' : Array.isArray(message.tool_calls) && message.tool_calls.length > 0 ? 'tool_use' : 'end_turn'
  return {
    id: `msg_${(openaiResp.id as string) || Math.random().toString(36).slice(2)}`,
    type: 'message',
    role: 'assistant',
    model: openaiResp.model || 'claude',
    content: blocks,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: usage.prompt_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? 0,
    },
  }
}

// ================= 流式: Claude SSE → OpenAI chunk 解析器 =================
export class ClaudeStreamToOpenAI {
  private id: string
  private model: string
  private inputTokens = 0
  private outputTokens = 0
  private started = false
  private toolIndex = -1

  constructor(model: string) {
    this.model = model
    this.id = `chatcmpl-${Math.random().toString(36).slice(2)}`
  }

  /** 处理一条 Claude SSE data JSON, 返回若干 OpenAI chunk JSON 行 */
  feed(event: Record<string, unknown>): string[] {
    const out: string[] = []
    const type = event.type as string
    const makeChunk = (delta: Record<string, unknown>, finish: string | null): string => {
      const chunk: Record<string, unknown> = {
        id: this.id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: this.model,
        choices: [{ index: 0, delta, finish_reason: finish }],
      }
      if (this.outputTokens > 0 && finish) {
        chunk.usage = {
          prompt_tokens: this.inputTokens,
          completion_tokens: this.outputTokens,
          total_tokens: this.inputTokens + this.outputTokens,
        }
      }
      return JSON.stringify(chunk)
    }

    if (type === 'message_start') {
      const msg = (event.message as Record<string, unknown>) || {}
      const usage = (msg.usage as Record<string, number>) || {}
      this.inputTokens = usage.input_tokens ?? 0
      this.outputTokens = usage.output_tokens ?? 0
      this.started = true
      out.push(makeChunk({ role: 'assistant', content: '' }, null))
    } else if (type === 'content_block_start') {
      const block = (event.content_block as Record<string, unknown>) || {}
      if (block.type === 'tool_use') {
        this.toolIndex++
        out.push(
          makeChunk(
            {
              tool_calls: [
                {
                  index: this.toolIndex,
                  id: block.id,
                  type: 'function',
                  function: { name: block.name, arguments: '' },
                },
              ],
            },
            null
          )
        )
      }
    } else if (type === 'content_block_delta') {
      const delta = (event.delta as Record<string, unknown>) || {}
      if (delta.type === 'text_delta' && typeof delta.text === 'string') {
        out.push(makeChunk({ content: delta.text }, null))
      } else if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
        out.push(
          makeChunk(
            { tool_calls: [{ index: this.toolIndex, function: { arguments: delta.partial_json } }] },
            null
          )
        )
      }
    } else if (type === 'message_delta') {
      const delta = (event.delta as Record<string, unknown>) || {}
      const usage = (event.usage as Record<string, number>) || {}
      if (usage.output_tokens) this.outputTokens = usage.output_tokens
      const stopReason = delta.stop_reason
      const finish = stopReason === 'max_tokens' ? 'length' : stopReason === 'tool_use' ? 'tool_calls' : 'stop'
      out.push(makeChunk({}, finish))
    } else if (type === 'message_stop') {
      out.push('[DONE]')
    }
    return out
  }

  /** 获取累计 usage */
  getUsage(): { promptTokens: number; completionTokens: number } {
    return { promptTokens: this.inputTokens, completionTokens: this.outputTokens }
  }
}

// ================= 流式: OpenAI chunk → Claude SSE =================
export class OpenAIStreamToClaude {
  private model: string
  private messageId: string
  private inputTokens = 0
  private outputTokens = 0
  private blockStarted = false
  private toolBlocks = new Map<number, { id: string; name: string }>()

  constructor(model: string, inputTokens: number) {
    this.model = model
    this.messageId = `msg_${Math.random().toString(36).slice(2)}`
    this.inputTokens = inputTokens
  }

  sse(event: Record<string, unknown>): string {
    return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
  }

  /** 返回若干条 Claude SSE 事件 */
  feed(chunk: Record<string, unknown>): string[] {
    const out: string[] = []
    const choice = (chunk.choices as Array<Record<string, unknown>>)?.[0]
    const usage = chunk.usage as Record<string, number> | undefined

    if (!this.blockStarted) {
      this.blockStarted = true
      out.push(
        this.sse({
          type: 'message_start',
          message: {
            id: this.messageId,
            type: 'message',
            role: 'assistant',
            model: this.model,
            content: [],
            stop_reason: null,
            usage: { input_tokens: this.inputTokens, output_tokens: 1 },
          },
        })
      )
      out.push(this.sse({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }))
    }

    if (choice) {
      const delta = (choice.delta as Record<string, unknown>) || {}
      if (typeof delta.content === 'string' && delta.content) {
        out.push(this.sse({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: delta.content } }))
      }
      const toolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined
      if (Array.isArray(toolCalls)) {
        for (const tc of toolCalls) {
          const idx = (tc.index as number) ?? 0
          const fn = (tc.function as Record<string, unknown>) || {}
          let block = this.toolBlocks.get(idx)
          if (!block && fn.name) {
            block = { id: (tc.id as string) || `toolu_${Math.random().toString(36).slice(2, 10)}`, name: fn.name as string }
            this.toolBlocks.set(idx, block)
            out.push(this.sse({ type: 'content_block_stop', index: 0 }))
            out.push(
              this.sse({
                type: 'content_block_start',
                index: idx + 1,
                content_block: { type: 'tool_use', id: block.id, name: block.name, input: {} },
              })
            )
          }
          if (fn.arguments) {
            out.push(
              this.sse({
                type: 'content_block_delta',
                index: idx + 1,
                delta: { type: 'input_json_delta', partial_json: fn.arguments as string },
              })
            )
          }
        }
      }
      const finish = choice.finish_reason as string | null
      if (finish) {
        out.push(this.sse({ type: 'content_block_stop', index: Array.from(this.toolBlocks.keys()).length }))
        out.push(
          this.sse({
            type: 'message_delta',
            delta: { stop_reason: finish === 'length' ? 'max_tokens' : finish === 'tool_calls' ? 'tool_use' : 'end_turn', stop_sequence: null },
            usage: { output_tokens: this.outputTokens },
          })
        )
      }
    }

    if (usage) {
      this.inputTokens = usage.prompt_tokens ?? this.inputTokens
      this.outputTokens = usage.completion_tokens ?? this.outputTokens
    }

    if (chunk.__done) {
      out.push(this.sse({ type: 'message_stop' }))
    }
    return out
  }

  getUsage(): { promptTokens: number; completionTokens: number } {
    return { promptTokens: this.inputTokens, completionTokens: this.outputTokens }
  }
}
