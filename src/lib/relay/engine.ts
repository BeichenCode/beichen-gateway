/**
 * 中继引擎主调度: 认证 → 渠道选择 → 协议转换 → 转发(流式/非流式) → 计费 → 日志
 * 对标 New API 核心转发逻辑
 * Task 197: 上游 max_tokens 上限自学习钳制 — 400 报文推断上限→钳制重试→Option 持久化→预钳制
 * (一劳永逸兜死「客户端 max_tokens 超上游上限」整类错误, 见 tryClampRetry / buildUpstreamRequest)
 */
import { db } from '@/lib/db'
import { AuthError } from '@/lib/auth'
import { getOptions } from '@/lib/options'
import { getPricing, getGroupRatio, calcQuota } from '@/lib/billing'
import { estimateMessagesTokens, estimateClaudeTokens, estimatePromptTokens, estimateTokens } from '@/lib/token-counter'
import { hit } from '@/lib/rate-limit'
import { ipOf, countryOf } from '@/lib/net'
import { authenticateApiKey, checkModelAllowed, getTokenGroups, type TokenAuthResult } from './auth'
import { recordAuthFailure } from './auth-log'
import { selectChannels, invalidateChannelCache, buildUpstreamUrl, recordChannelFailureStreak, clearChannelFailure, startChannelRecoveryLoop, type ChannelCandidate } from './channel-select'
import { rotateKey, stickyRotate, spreadOnBusy } from './key-ring'
import { applyPersona, DEFAULT_PERSONA_PROMPT } from './persona' // Task 170: 全站人设注入
import { startProbeLoop } from '@/lib/probe' // Task 171: 模型广场自探测循环
import {
  openaiToClaudeRequest,
  claudeToOpenAIRequest,
  claudeToOpenAIResponse,
  openaiToClaudeResponse,
  ClaudeStreamToOpenAI,
  OpenAIStreamToClaude,
} from './claude-adapter'
import {
  MAXTOK_LIMIT_CEIL,
  MAXTOK_LIMIT_FLOOR,
  bodyMaxTok,
  clampBodyTo,
  maxTokKey,
  parseMaxTokensLimit,
} from './maxtok'

const UPSTREAM_TIMEOUT = 10 * 60 * 1000 // 10min

// Task 154: 客户端 IP/国家提取统一收敛到 lib/net (ipOf/countryOf) —
// ip 信任链 CF-Connecting-IP > X-Real-IP > XFF 首段; country = CF-IPCountry (免费版每请求附带)

interface RelayFlags {
  hedgeEnabled: boolean
  hedgeTriggerMs: number
  stickyEnabled: boolean
  stickyWindowMs: number
  personaEnabled: boolean // Task 170: 全站人设注入开关 (Option 表 PersonaEnabled, 缺省开)
  personaPrompt: string // Task 170: 人设文案 (Option 表 PersonaPrompt, 缺省内置小辰)
  maxTokClamp: boolean // Task 197: max_tokens 上限自学习钳制 (Option.MaxTokensClampEnabled, 缺省开)
}

interface RelayContext {
  auth: TokenAuthResult
  request: Request
  body: Record<string, unknown>
  apiPath: string // 如 /v1/chat/completions
  requestProtocol: 'openai' | 'claude'
  startTime: number
  flags: RelayFlags // Task 151: 换线/粘性开关 (Option 表可调, 缺省开启)
}

interface UpstreamResult {
  response: Response // 返回给客户端的 Response (已消费/封装)
  usage: { promptTokens: number; completionTokens: number }
  channelId: number
  channelName: string
  isStream: boolean
  model: string
}

// ============ Task 197: 上游 max_tokens 上限自学习钳制 (一劳永逸) ============
// ① 学习: 上游 400/422 且报文提及 max_tokens 系参数 + 超限措辞 → parseMaxTokensLimit 推断上限
//    → 钳制请求体对同渠道立即重试一次; 重试 200 才固化 (自校验: 误判上限重试仍失败, 不污染记忆)
// ② 记忆: (渠道,模型)→上限 存内存 Map + Option 表 MaxTokensLimits (JSON, 重启不丢);
//    后续请求在 buildUpstreamRequest 预钳制, 连一次多余的 400 往返都不再发生
// ③ 开关: Option.MaxTokensClampEnabled === 'false' 整体停用 (缺省开)
// 纯逻辑 (报文解析/请求体钳制) 在 ./maxtok.ts 可单测; 本段只管存储与重试编排
const MAXTOK_OPTION_KEY = 'MaxTokensLimits'

interface MaxTokStore {
  loaded: boolean
  map: Map<string, number>
  persistTimer: ReturnType<typeof setTimeout> | null
}

const gMaxTok = globalThis as { __bzMaxTok?: MaxTokStore }

function maxTokStore(): MaxTokStore {
  if (!gMaxTok.__bzMaxTok) gMaxTok.__bzMaxTok = { loaded: false, map: new Map(), persistTimer: null }
  return gMaxTok.__bzMaxTok
}

async function loadMaxTokLimits(): Promise<void> {
  const s = maxTokStore()
  if (s.loaded) return
  s.loaded = true
  try {
    const raw = (await getOptions()).MaxTokensLimits
    if (!raw) return
    const obj = JSON.parse(raw) as Record<string, unknown>
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'number' && v >= MAXTOK_LIMIT_FLOOR && v <= MAXTOK_LIMIT_CEIL) s.map.set(k, v)
    }
    if (s.map.size) console.log(`[maxtok] restored ${s.map.size} learned upstream limit(s) from Option`)
  } catch (e) {
    console.error('[maxtok] restore failed:', e)
  }
}

/** 学习结果落库 (2s 防抖合并并发学习; 失败只打日志, 内存内学习依然生效) */
function persistMaxTokLimits(): void {
  const s = maxTokStore()
  if (s.persistTimer) clearTimeout(s.persistTimer)
  const timer = setTimeout(() => {
    s.persistTimer = null
    const obj: Record<string, number> = {}
    let n = 0
    for (const [k, v] of s.map) {
      obj[k] = v
      if (++n >= 400) break
    }
    const value = JSON.stringify(obj)
    db.option
      .upsert({ where: { key: MAXTOK_OPTION_KEY }, update: { value }, create: { key: MAXTOK_OPTION_KEY, value } })
      .catch((e: unknown) => console.error('[maxtok] persist failed:', e))
  }, 2_000)
  timer.unref?.()
  s.persistTimer = timer
}

/** 上游 max_tokens 上限类 400/422 → 推断上限 → 钳制重试同渠道一次; 成功才固化。null = 不适用/未过 */
async function tryClampRetry(
  channel: ChannelCandidate,
  ctx: RelayContext,
  status: number,
  errText: string,
  avoidKey: string
): Promise<{ resp: Response; limit: number } | null> {
  if (ctx.flags.maxTokClamp === false) return null
  if (status !== 400 && status !== 422) return null
  const model = (ctx.body.model as string) || ''
  const requested = bodyMaxTok(ctx.body)
  const limit = parseMaxTokensLimit(errText, requested)
  if (!limit) return null
  console.warn(`[maxtok] ch=${channel.id} model=${model}: upstream limit ${limit} < requested ${requested}, clamping & retrying once`)
  try {
    const built = buildUpstreamRequest(channel, ctx, avoidKey, limit)
    const resp = await fetch(built.url, built.init)
    if (resp.ok) {
      maxTokStore().map.set(maxTokKey(channel.id, model), limit)
      persistMaxTokLimits()
      console.log(`[maxtok] ch=${channel.id} model=${model}: learned limit=${limit} (verified: clamped retry 200)`)
      return { resp, limit }
    }
    await resp.text().catch(() => {})
    console.warn(`[maxtok] ch=${channel.id} model=${model}: clamped retry got ${resp.status}, fall through`)
    return null
  } catch (e) {
    console.warn(`[maxtok] ch=${channel.id} model=${model}: clamped retry failed: ${(e as Error).message}`)
    return null
  }
}

// ============ 上游请求构造 ============
function pickKey(channel: ChannelCandidate, ctx: RelayContext, avoid?: string): string {
  // Task 131: 逐请求确定性轮换 (Task 112 随机选取升级) — 连续请求依次用不同 key,
  // 把每密钥每分钟配额均匀摊到 key 池, 尽量不触发上游 RPM 限流; 重试时 avoid 上一跳
  // Task 151: 粘性模式 (StickyKeyEnabled, 缺省开) — 同 (令牌,模型) 窗口内粘同一把 key,
  // 让上游 Prompt Cache 命中重复前缀, agent 大上下文 prefill 大幅提速; 429/窗口到期换 key
  let preferred: string
  if (ctx.flags.stickyEnabled && channel.keys.length > 1) {
    // Task 161: seed 加调用方 IP — 共享令牌场景下 (同一 token.id 被多人使用), 原先全员
    // 粘到同一把 key, 60s 窗口内集体挤爆该 key 的 RPM → 429 (北京 01:30 实锤 3 连)。
    // 改为 per-IP 粘性: 同一人 (同 IP) 仍粘同一把 key 保住 Prompt Cache,
    // 不同人 (不同 IP) 确定性分散到整个 key 池, 单 key 压力 ≈ 1/N
    const seed = `${ctx.auth.token.id}|${ipOf(ctx.request)}|${(ctx.body.model as string) || ''}`
    preferred = stickyRotate(channel.id, channel.keys, seed, ctx.flags.stickyWindowMs, avoid)
  } else {
    preferred = rotateKey(channel.id, channel.keys, avoid)
  }
  // Task 164: 在途并发感知溢出 — 同一用户的多个并发任务原先全钉在同一把 key 上,
  // 单 key 瞬时并发挤爆上游限额即整组报错。粘住/轮转到的 key 若 10s 内已被选 ≥2 次,
  // 本次请求自动溢到下一把还有余量的 key (窗口滑过自动回归粘性首选, 缓存行为不变)
  return spreadOnBusy(channel.id, channel.keys, preferred, avoid)
}

function clampOptionMs(v: string | undefined, def: number): number {
  const n = parseInt(v || '', 10)
  if (!n || n < 500) return def
  return Math.min(n, 120_000)
}

function buildUpstreamRequest(
  channel: ChannelCandidate,
  ctx: RelayContext,
  avoidKey?: string,
  forceClampTo?: number
): { url: string; init: RequestInit; protocol: 'openai' | 'claude'; key: string } {
  const channelProtocol = channel.type === 14 ? 'claude' : 'openai'
  const key = pickKey(channel, ctx, avoidKey)
  let body = ctx.body

  // Task 197: max_tokens 预钳制 — 已学习的 (渠道,模型) 上限直接生效, 省掉注定 400 的上游往返;
  // forceClampTo = 学习重试路径传入的本次推断上限。钳制作用于请求体副本, 不污染 ctx.body
  // (多渠道重试时各渠道上限可能不同); 对冲换线第二路同样经过这里, 天然覆盖
  if (ctx.flags.maxTokClamp !== false) {
    const model = (ctx.body.model as string) || ''
    const learned = forceClampTo ?? maxTokStore().map.get(maxTokKey(channel.id, model))
    const requested = bodyMaxTok(body)
    if (learned && requested > learned) {
      body = clampBodyTo(body, learned)
      console.log(`[maxtok] ch=${channel.id} model=${model}: pre-clamped max_tokens ${requested} -> ${learned}`)
    }
  }

  if (ctx.requestProtocol === 'openai' && channelProtocol === 'claude') {
    body = applyPersona(openaiToClaudeRequest(ctx.body), 'claude', ctx.flags.personaPrompt, ctx.flags.personaEnabled)
    return {
      url: buildUpstreamUrl(channel, '/v1/messages'),
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT),
      },
      protocol: channelProtocol,
      key,
    }
  }

  if (ctx.requestProtocol === 'claude' && channelProtocol === 'openai') {
    body = applyPersona(claudeToOpenAIRequest(ctx.body), 'openai', ctx.flags.personaPrompt, ctx.flags.personaEnabled)
    return {
      url: buildUpstreamUrl(channel, '/v1/chat/completions'),
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT),
      },
      protocol: channelProtocol,
      key,
    }
  }

  // 协议一致
  body = applyPersona(body, ctx.requestProtocol, ctx.flags.personaPrompt, ctx.flags.personaEnabled)
  const path = ctx.requestProtocol === 'claude' ? '/v1/messages' : ctx.apiPath
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (channelProtocol === 'claude') {
    headers['x-api-key'] = key
    headers['anthropic-version'] = '2023-06-01'
  } else {
    headers['Authorization'] = `Bearer ${key}`
  }
  return {
    url: buildUpstreamUrl(channel, path),
    init: { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(UPSTREAM_TIMEOUT) },
    protocol: channelProtocol,
    key,
  }
}

// ============ usage 提取(OpenAI 格式) ============
function extractUsageFromOpenAI(json: Record<string, unknown>): { promptTokens: number; completionTokens: number } | null {
  const usage = json.usage as Record<string, number> | undefined
  if (usage && typeof usage.prompt_tokens === 'number') {
    return {
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
    }
  }
  return null
}

function extractUsageFromClaude(json: Record<string, unknown>): { promptTokens: number; completionTokens: number } | null {
  const usage = json.usage as Record<string, number> | undefined
  if (usage && (usage.input_tokens !== undefined || usage.output_tokens !== undefined)) {
    return { promptTokens: usage.input_tokens ?? 0, completionTokens: usage.output_tokens ?? 0 }
  }
  return null
}

// ============ SSE 行处理器: 从 OpenAI 流中解析 usage ============
class OpenAIStreamUsageParser {
  usage: { promptTokens: number; completionTokens: number } | null = null

  processLine(line: string): void {
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') return
    try {
      const json = JSON.parse(data) as Record<string, unknown>
      const u = extractUsageFromOpenAI(json)
      if (u) this.usage = u
    } catch {
      // 忽略解析失败
    }
  }
}

// ============ 主入口 ============
export async function relayRequest(
  request: Request,
  apiPath: string,
  requestProtocol: 'openai' | 'claude'
): Promise<Response> {
  const startTime = Date.now()
  const auth = await authenticateApiKey(request)

  // 令牌级限速 (Task 102): 每令牌 240 次/分钟, 防单令牌打爆上游或刷量
  if (!hit(`v1|t${auth.token.id}`, 60 * 1000, 240)) {
    void recordAuthFailure(request, 429, '请求过于频繁 (令牌限速 240 次/分钟)，请稍后再试', {
      userId: auth.user.id,
      username: auth.user.username,
      tokenName: auth.token.name,
    })
    throw new AuthError(429, '请求过于频繁 (令牌限速 240 次/分钟)，请稍后再试')
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    void recordAuthFailure(request, 400, '请求体不是合法的 JSON', {
      userId: auth.user.id,
      username: auth.user.username,
      tokenName: auth.token.name,
    })
    throw new AuthError(400, '请求体不是合法的 JSON')
  }

  const model = (body.model as string) || ''
  if (!model && requestProtocol === 'openai') {
    void recordAuthFailure(request, 400, '缺少 model 参数', {
      userId: auth.user.id,
      username: auth.user.username,
      tokenName: auth.token.name,
    })
    throw new AuthError(400, '缺少 model 参数')
  }
  const modelForPricing = model || 'unknown'

  // 令牌模型限制校验
  if (model && !checkModelAllowed(auth.token, model)) {
    void recordAuthFailure(request, 403, `该令牌无权使用模型 ${model}`, {
      userId: auth.user.id,
      username: auth.user.username,
      tokenName: auth.token.name,
      model,
    })
    throw new AuthError(403, `该令牌无权使用模型 ${model}`)
  }

  const groups = getTokenGroups(auth.token, auth.user)
  const options = await getOptions()
  await loadMaxTokLimits().catch(() => {}) // Task 197: 首个请求前恢复已学习的上限 (之后同步命中内存)
  const retryTimes = parseInt(options.RetryTimes || '3', 10) || 3
  const candidates = await selectChannels(model, groups, retryTimes)

  if (candidates.length === 0) {
    void recordAuthFailure(request, 503, `当前分组 ${groups.join(',')} 下无可用渠道 (模型: ${model})`, {
      userId: auth.user.id,
      username: auth.user.username,
      tokenName: auth.token.name,
      model,
    })
    throw new AuthError(503, `当前分组 ${groups.join(',')} 下无可用渠道 (模型: ${model})`)
  }

  const isStream = body.stream === true
  let lastError = '未知错误'
  let lastStatus = 502
  const flags: RelayFlags = {
    hedgeEnabled: (options.HedgeEnabled ?? 'true') !== 'false',
    hedgeTriggerMs: clampOptionMs(options.HedgeTriggerMs, 6_000),
    stickyEnabled: (options.StickyKeyEnabled ?? 'true') !== 'false',
    stickyWindowMs: clampOptionMs(options.StickyKeyWindowMs, 60_000),
    personaEnabled: (options.PersonaEnabled ?? 'true') !== 'false',
    personaPrompt: options.PersonaPrompt || DEFAULT_PERSONA_PROMPT,
    maxTokClamp: (options.MaxTokensClampEnabled ?? 'true') !== 'false',
  }
  // Task 171: 平台探测请求 (x-bz-probe) 不对冲 — 慢模型 (推理类) 6s 对冲阈值必触发,
  // 会打出双倍上游消耗且两笔样本污染指标口径
  if (request.headers.get('x-bz-probe') === '1') flags.hedgeEnabled = false
  const ctx: RelayContext = { auth, request, body, apiPath, requestProtocol, startTime, flags }
  const keyRotation = new Map<number, string>() // Task 112: 同渠道重试换 key (channelId -> 上一跳 key)

  // ---------- 流式 (Task 110b 重构): 快速窗口 + 慢上游早提交 SSE + 心跳, 详见 relayStream ----------
  if (isStream) {
    return await relayStream(ctx, candidates, model, modelForPricing, options, keyRotation)
  }

  // ---------- 非流式: 原多渠道循环 ----------
  for (let ci = 0; ci < candidates.length; ci++) {
    const channel = candidates[ci]
    const built = buildUpstreamRequest(channel, ctx, keyRotation.get(channel.id))
    keyRotation.set(channel.id, built.key)
    const { url, init, protocol: upstreamProtocol } = built
    try {
      let upstreamResp = await fetch(url, init)
      let latency = Date.now() - startTime

      if (!upstreamResp.ok) {
        const errText = await upstreamResp.text().catch(() => '')
        // Task 197: max_tokens 上限类 400 → 学习上限并钳制重试同渠道一次, 用户侧无感转 200
        const clamped = await tryClampRetry(channel, ctx, upstreamResp.status, errText, keyRotation.get(channel.id) || built.key)
        if (!clamped) {
          lastError = truncate(`渠道 ${channel.name} 返回 ${upstreamResp.status}: ${errText.slice(0, 300)}`, 500)
          // Task 110: 上游错误落服务端日志 — 用户报「客户端 reason=unknown」时可在 journalctl
          // 按时间点定位上游真实状态码与报文 (否则网关侧零痕迹, 排查只能靠猜)
          console.error(`[relay] upstream error model=${model} status=${upstreamResp.status} :: ${lastError}`)
          lastStatus = upstreamResp.status === 401 || upstreamResp.status === 403 ? 502 : upstreamResp.status
          // 自动禁用策略 (Task 102 收紧): 仅上游判定 key 无效/无权 (401/403) 时禁用渠道;
          // 400/422 等客户端错误是用户请求本身的问题, 5xx/429 是上游临时故障 — 均不禁用,
          // 避免恶意/畸形请求把健康渠道打死 (可用性 DoS 向量)
          // Task 191: 欠费/无订阅类 402/403 豁免 (shouldCountChannelFailure) — 渠道本身
          // 活着, 只是某把 key 账号没钱; 计连击会把整渠道打禁, 连累同渠道其它健康模型
          if (shouldCountChannelFailure(upstreamResp.status, errText)) {
            await markChannelFailure(channel, options)
          }
          if (ci < candidates.length - 1) await sleepMs(RETRY_BACKOFF_MS)
          continue
        }
        upstreamResp = clamped.resp
        latency = Date.now() - startTime
      }

      // ---------- 非流式 ----------
      const contentType = upstreamResp.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        // 上游返回非 JSON (如纯文本错误), 透传文本
        const text = await upstreamResp.text()
        return new Response(text, {
          status: upstreamResp.status,
          headers: { 'Content-Type': contentType || 'text/plain; charset=utf-8' },
        })
      }
      let json = (await upstreamResp.json()) as Record<string, unknown>
      // 协议转换
      if (requestProtocol === 'openai' && upstreamProtocol === 'claude') {
        json = claudeToOpenAIResponse(json, model)
      } else if (requestProtocol === 'claude' && upstreamProtocol === 'openai') {
        json = openaiToClaudeResponse(json)
      }

      let usage = requestProtocol === 'claude' ? extractUsageFromClaude(json) : extractUsageFromOpenAI(json)
      if (!usage) usage = estimateUsage(body, requestProtocol, model)

      await finalizeBilling({ ctx, channel, usage, model: modelForPricing, isStream: false, latency, ttft: latency })
      return new Response(JSON.stringify(json), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    } catch (err) {
      lastError = truncate(`渠道 ${channel.name} 请求异常: ${(err as Error).message}`, 300)
      await markChannelFailure(channel, options)
      if (ci < candidates.length - 1) await sleepMs(RETRY_BACKOFF_MS)
      continue
    }
  }

  // Task 112: 全渠道失败终态落 type=5 错误日志 (后台「日志」页可见, 统计口径 type=2 不受影响)
  await recordRelayError(ctx, modelForPricing, lastError, false)
  throw new AuthError(lastStatus >= 500 ? 502 : lastStatus, `所有渠道均请求失败，最后一次错误: ${lastError}`)
}

// ============ 流式封装 ============
// Task 151: hedge 参数 — 传入时启用「首字节换线」: 首块超阈值未达即并发第二把 key 竞速
function wrapUpstreamStream(
  upstreamResp: Response,
  channel: ChannelCandidate,
  requestProtocol: 'openai' | 'claude',
  upstreamProtocol: 'openai' | 'claude',
  model: string,
  body: Record<string, unknown>,
  hedge?: { ctx: RelayContext; keyRotation: Map<number, string>; avoidKey: string }
): { stream: ReadableStream<Uint8Array>; getUsage: () => Promise<{ promptTokens: number; completionTokens: number; ttft?: number }>; contentType: string } {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const parser = new OpenAIStreamUsageParser()
  const claudeConv = upstreamProtocol === 'claude' && requestProtocol === 'openai' ? new ClaudeStreamToOpenAI(model) : null
  const openaiConv =
    upstreamProtocol === 'openai' && requestProtocol === 'claude'
      ? new OpenAIStreamToClaude(model, estimateClaudeTokens(body))
      : null

  let usageResolve: (u: { promptTokens: number; completionTokens: number; ttft?: number }) => void
  const usagePromise = new Promise<{ promptTokens: number; completionTokens: number; ttft?: number }>((resolve) => {
    usageResolve = resolve
  })
  // Task 161: TTFT 打点 — 第一个上游数据块到达时刻 (含 hedge 换线胜者), 供模型广场「首字延迟」真实口径
  let ttftAt: number | null = null
  const ttftT0 = hedge?.ctx.startTime ?? Date.now()

  let reader: ReadableStreamDefaultReader<Uint8Array> = upstreamResp.body!.getReader()
  const contentType = requestProtocol === 'claude' ? 'text/event-stream; charset=utf-8' : 'text/event-stream; charset=utf-8'

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = ''
      let clientGone = false
      let lastUpstreamByte = Date.now()
      const pushOut = (text: string) => {
        if (!text || clientGone) return
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          clientGone = true
        }
      }
      // Task 112: 流级空闲心跳 — 上游响应头已回但 token 长静默时 (agnes 抖动实测单笔 66s),
      // 防 CF/客户端按空闲超时切断连接; SSE `:` 注释行对所有标准客户端不可见
      const idleTimer = setInterval(() => {
        if (!clientGone && Date.now() - lastUpstreamByte > STREAM_IDLE_KEEPALIVE_MS) {
          pushOut(`: keepalive ${Date.now()}\n\n`)
        }
      }, STREAM_KEEPALIVE_MS)
      // Task 151: 首字节换线 — 响应头秒回但首 token 长时间不来 (上游账号级排队, 实测同一
      // key 0.6s~12.6s 分钟级漂移) 时, 用下一把 key 并发第二路, 谁先吐首块用谁, 慢者掐断。
      // 第二路与原路同渠道同请求体同协议, 解析器无感; 换线仅此一次, 防雪崩放大。
      let firstChunk: Uint8Array | null = null
      if (hedge && hedge.ctx.flags.hedgeEnabled) {
        const p1 = reader.read().then((r) => (r.done ? null : (r.value ?? null)))
        const raced = await Promise.race([
          p1.then((v) => ({ v })),
          sleepMs(hedge.ctx.flags.hedgeTriggerMs).then(() => null),
        ])
        if (raced !== null) {
          firstChunk = raced.v
        } else {
          const win = await hedgeFirstChunk({ resp: upstreamResp, reader, p1, channel, hedge })
          reader = win.reader
          firstChunk = win.first
        }
      }
      try {
        let pendingFirst = firstChunk
        while (true) {
          let value: Uint8Array
          if (pendingFirst !== null) {
            value = pendingFirst
            pendingFirst = null
          } else {
            const r = await reader.read()
            if (r.done) break
            value = r.value ?? new Uint8Array()
          }
          lastUpstreamByte = Date.now()
          if (ttftAt === null) ttftAt = lastUpstreamByte
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trimEnd()
            if (!trimmed) continue
            if (upstreamProtocol === 'openai') {
              parser.processLine(trimmed)
              if (requestProtocol === 'openai') pushOut(trimmed + '\n\n')
              else {
                // openai sse → claude sse
                if (trimmed.startsWith('data:')) {
                  const data = trimmed.slice(5).trim()
                  if (data === '[DONE]') {
                    const events = openaiConv!.feed({ __done: true })
                    events.forEach(pushOut)
                  } else {
                    try {
                      const chunk = JSON.parse(data) as Record<string, unknown>
                      const events = openaiConv!.feed(chunk)
                      events.forEach(pushOut)
                    } catch { /* ignore */ }
                  }
                }
              }
            } else {
              // upstream claude
              if (trimmed.startsWith('data:')) {
                const data = trimmed.slice(5).trim()
                if (data) {
                  try {
                    const event = JSON.parse(data) as Record<string, unknown>
                    if (requestProtocol === 'openai' && claudeConv) {
                      const outs = claudeConv.feed(event)
                      for (const o of outs) pushOut(o === '[DONE]' ? 'data: [DONE]\n\n' : `data: ${o}\n\n`)
                    } else {
                      // claude → claude 透传
                      pushOut(trimmed + '\n\n')
                    }
                  } catch { /* ignore */ }
                }
              } else if (requestProtocol === 'claude') {
                pushOut(trimmed + '\n')
              }
            }
          }
        }
      } catch (err) {
        // Task 112: 上游流异常中断不再静默 — journalctl 留痕 + 明确 error 事件收尾;
        // 旧版静默 close, 客户端只见「流结束但无 [DONE]」→ agent 侧 reason=unknown
        console.error(`[relay] upstream stream aborted model=${model} ch=${channel.id} :: ${(err as Error).message}`)
        const msg = `上游流式连接中断 (${(err as Error).message})，本回合未完成，请重试`
        pushOut(
          requestProtocol === 'claude'
            ? `event: error\ndata: ${JSON.stringify({ type: 'error', error: { type: 'api_error', message: msg } })}\n\n`
            : `data: ${JSON.stringify({ error: { message: msg, type: 'new_api_error', code: 502 } })}\n\n`
        )
      } finally {
        clearInterval(idleTimer)
        controller.close()
        let finalUsage: { promptTokens: number; completionTokens: number } | null = parser.usage
        if (!finalUsage && claudeConv) {
          const cu = claudeConv.getUsage()
          if (cu.promptTokens > 0 || cu.completionTokens > 0) finalUsage = cu
        }
        if (!finalUsage && openaiConv) {
          const cu = openaiConv.getUsage()
          if (cu.promptTokens > 0 || cu.completionTokens > 0) finalUsage = cu
        }
        const ttftOut = ttftAt !== null ? Math.max(0, ttftAt - ttftT0) : undefined
        usageResolve!({ ...(finalUsage ?? { promptTokens: -1, completionTokens: -1 }), ttft: ttftOut })
      }
    },
  })

  return { stream, getUsage: () => usagePromise, contentType }
}

// ============ Task 151: 首字节换线判决 ============
interface HedgeArgs {
  resp: Response
  reader: ReadableStreamDefaultReader<Uint8Array>
  p1: Promise<Uint8Array | null>
  channel: ChannelCandidate
  hedge: { ctx: RelayContext; keyRotation: Map<number, string>; avoidKey: string }
}

type HedgeWinner =
  | { src: 1; v: Uint8Array }
  | { src: 2; r: { resp: Response; reader: ReadableStreamDefaultReader<Uint8Array>; first: Uint8Array } }
  | 'cap'

async function hedgeFirstChunk(args: HedgeArgs): Promise<{
  resp: Response
  reader: ReadableStreamDefaultReader<Uint8Array>
  first: Uint8Array | null
}> {
  const { resp, reader, p1, channel, hedge } = args
  const capMs = hedge.ctx.flags.hedgeTriggerMs * 3
  console.warn(
    `[relay] hedge: no first chunk in ${hedge.ctx.flags.hedgeTriggerMs}ms — racing a second key ch=${channel.id} model=${(hedge.ctx.body.model as string) || ''}`
  )
  const built2 = buildUpstreamRequest(channel, hedge.ctx, hedge.avoidKey)
  hedge.keyRotation.set(channel.id, built2.key)
  const cancelA2 = (r: { resp: Response; reader: ReadableStreamDefaultReader<Uint8Array> } | null) => {
    if (!r) return
    try {
      void r.reader.cancel().catch(() => {})
    } catch {
      /* ignore */
    }
    try {
      void r.resp.body?.cancel()
    } catch {
      /* ignore */
    }
  }
  const a2 = (async (): Promise<{ resp: Response; reader: ReadableStreamDefaultReader<Uint8Array>; first: Uint8Array } | null> => {
    const resp2 = await fetch(built2.url, built2.init)
    if (!resp2.ok || !resp2.body) {
      await resp2.text().catch(() => {})
      return null // 第二路失败不参赛, 第一路继续等
    }
    const rd2 = resp2.body.getReader()
    // 超时与空流同义 (均不参赛), 无需哨兵值
    const first2 = await Promise.race([
      rd2.read().then((r) => (r.done ? null : (r.value ?? null))),
      sleepMs(capMs).then(() => null),
    ])
    if (first2 === null) return null
    return { resp: resp2, reader: rd2, first: first2 }
  })().catch(() => null)

  let winner: HedgeWinner
  try {
    winner = await Promise.race([
      p1.then((v) => (v !== null ? { src: 1 as const, v } : new Promise<never>(() => {}))),
      a2.then((r) => (r !== null ? { src: 2 as const, r } : new Promise<never>(() => {}))),
      sleepMs(capMs).then(() => 'cap' as const),
    ])
  } catch (e) {
    void a2.then(cancelA2).catch(() => {})
    throw e
  }
  if (winner === 'cap') {
    // 双路都极端拥堵: 放弃换线判决, 回到原生语义死等第一路 (init 的 UPSTREAM_TIMEOUT 兜底)
    void a2.then(cancelA2).catch(() => {})
    console.warn(`[relay] hedge: both keys stalled, keep waiting the first attempt ch=${channel.id}`)
    const v1 = await p1
    return { resp, reader, first: v1 }
  }
  if (winner.src === 1) {
    void a2.then(cancelA2).catch(() => {})
    return { resp, reader, first: winner.v }
  }
  void p1.then(() => {
    try {
      void reader.cancel().catch(() => {})
    } catch {
      /* ignore */
    }
    try {
      void resp.body?.cancel()
    } catch {
      /* ignore */
    }
  }).catch(() => {})
  console.warn(`[relay] hedge: second key won ch=${channel.id} model=${(hedge.ctx.body.model as string) || ''}`)
  return { resp: winner.r.resp, reader: winner.r.reader, first: winner.r.first }
}

// ============ 流式中继 (Task 110b) ============
// 背景: agnes 上游 TTFT 实测 1.2s~50s (33k prompt)。旧实现响应前有一行死代码
// `await getUsage()` (usage 变量未使用, 注释却自称「惰性计费」), 导致整条 SSE 被
// 缓冲到上游结束后才回客户端 — 客户端零字节等待触发本地超时, 报 Model request
// failed / reason=unknown, 而网关侧计费成功 (生产 Log #51: 50.5s 成功 vs 客户端报错)。
// 对策:
//   ① 彻底移除阻塞 await, 恢复真流式 (3s 内上游就绪 → 原语义透传, 错误仍为 HTTP 状态码);
//   ② 上游响应头迟迟不来 (超 3s 快速窗口) → 立即提交 200 SSE, 每 5s 发 keepalive
//      注释行 (SSE 规范 `:` 开头为注释, 所有客户端忽略), 防客户端闲置超时;
//   ③ 已提交 SSE 后上游失败 → 后台继续重试剩余候选渠道, 全失败以
//      data: {"error":...} 事件收尾 (one-api/new-api 同款流式错误语义)。
const STREAM_FAST_FAIL_MS = 3_000
const STREAM_KEEPALIVE_MS = 5_000
const STREAM_IDLE_KEEPALIVE_MS = 15_000 // 上游静默超过该值即向客户端发 SSE 注释心跳
const RETRY_BACKOFF_MS = 250 // 渠道间重试退避 — 给上游瞬时故障 (路由粘性/连接抖动) 留恢复窗口
const sleepMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const STREAM_SLOW = Symbol('stream-slow')

async function relayStream(
  ctx: RelayContext,
  candidates: ChannelCandidate[],
  model: string,
  modelForPricing: string,
  options: Record<string, string>,
  keyRotation: Map<number, string>
): Promise<Response> {
  const encoder = new TextEncoder()
  const SSE_HEADERS: Record<string, string> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
  const deadline = Date.now() + STREAM_FAST_FAIL_MS
  let lastError = '未知错误'
  let lastStatus = 502

  const sleepSlow = (ms: number) => new Promise<typeof STREAM_SLOW>((resolve) => setTimeout(() => resolve(STREAM_SLOW), ms))

  // 快速窗口内的失败处理 (与旧循环逐字等价: 记日志/禁用策略/续试下一候选)
  const recordFastFailure = async (channel: ChannelCandidate, status: number, errText: string) => {
    lastError = truncate(`渠道 ${channel.name} 返回 ${status}: ${errText.slice(0, 300)}`, 500)
    // Task 110: 上游错误落服务端日志 — 用户报「客户端 reason=unknown」时可在 journalctl 定位
    console.error(`[relay] upstream error model=${model} status=${status} :: ${lastError}`)
    lastStatus = status === 401 || status === 403 ? 502 : status
    // 自动禁用策略 (Task 102 收紧): 仅上游 401/403 禁用渠道, 防畸形请求打死健康渠道;
    // Task 191: 欠费/无订阅类 402/403 豁免, 不计连击
    if (shouldCountChannelFailure(status, errText)) {
      await markChannelFailure(channel, options)
    }
  }

  // 慢路径: 提交 200 SSE + 心跳, 后台完成「等本跳 → 失败则继续重试剩余候选」
  const beginSlowCommit = (pending: Promise<Response>, upstreamProtocol: 'openai' | 'claude', channel: ChannelCandidate, nextIdx: number): Response => {
    let controller!: ReadableStreamDefaultController<Uint8Array>
    let clientGone = false
    const readable = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c
      },
      cancel() {
        clientGone = true
      },
    })
    const write = (text: string) => {
      if (clientGone) return
      try {
        controller.enqueue(encoder.encode(text))
      } catch {
        clientGone = true
      }
    }
    write(': connected, waiting for upstream\n\n')
    const keepalive = setInterval(() => write(`: keepalive ${Date.now()}\n\n`), STREAM_KEEPALIVE_MS)

    void (async () => {
      try {
        for (let i = nextIdx; i < candidates.length; i++) {
          let promise: Promise<Response>
          let protocol = upstreamProtocol
          const ch = candidates[i]
          let attemptKey = ''
          if (i === nextIdx) {
            promise = pending // 首跳已发出, 直接等
            attemptKey = keyRotation.get(ch.id) || ''
          } else {
            const built = buildUpstreamRequest(ch, ctx, keyRotation.get(ch.id))
            keyRotation.set(ch.id, built.key)
            protocol = built.protocol
            attemptKey = built.key
            promise = fetch(built.url, built.init)
          }
          let upstreamResp: Response
          try {
            upstreamResp = await promise
          } catch (err) {
            lastError = truncate(`渠道 ${ch.name} 请求异常: ${(err as Error).message}`, 300)
            await markChannelFailure(ch, options)
            if (i < candidates.length - 1) await sleepMs(RETRY_BACKOFF_MS)
            continue
          }
          if (!upstreamResp.ok) {
            const errText = await upstreamResp.text().catch(() => '')
            // Task 197: max_tokens 上限类 400 → 学习上限并钳制重试本渠道一次 (SSE 已提交, 用户无感)
            const clamped = await tryClampRetry(ch, ctx, upstreamResp.status, errText, attemptKey)
            if (!clamped) {
              await recordFastFailure(ch, upstreamResp.status, errText)
              if (i < candidates.length - 1) await sleepMs(RETRY_BACKOFF_MS)
              continue
            }
            upstreamResp = clamped.resp
          }
          // 成功: 走统一包装流 (协议转换照旧) + 惰性计费; 客户端已断也读完以完成计费 (历史语义)
          const { stream, getUsage } = wrapUpstreamStream(upstreamResp, ch, ctx.requestProtocol, protocol, model, ctx.body, {
            ctx,
            keyRotation,
            avoidKey: attemptKey,
          })
          scheduleStreamBilling({
            ctx,
            channel: ch,
            model: modelForPricing,
            isStream: true,
            getUsage,
            contentType: SSE_HEADERS['Content-Type'],
            latencyHint: Date.now() - ctx.startTime,
          })
          const reader = stream.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (clientGone) continue
              try {
                controller.enqueue(value)
              } catch {
                clientGone = true
              }
            }
          } finally {
            try {
              reader.releaseLock()
            } catch {
              /* ignore */
            }
          }
          return
        }
        // 全部渠道失败: SSE 已承诺 200, 以 error 事件收尾 (流式错误的标准语义)
        const failMsg = `所有渠道均请求失败，最后一次错误: ${lastError}`
        await recordRelayError(ctx, modelForPricing, failMsg, true)
        write(
          ctx.requestProtocol === 'claude'
            ? `event: error\ndata: ${JSON.stringify({ type: 'error', error: { type: 'api_error', message: failMsg } })}\n\n`
            : `data: ${JSON.stringify({ error: { message: failMsg, type: 'new_api_error', code: lastStatus } })}\n\n`
        )
      } finally {
        clearInterval(keepalive)
        try {
          controller.close()
        } catch {
          /* ignore */
        }
      }
    })().catch(console.error)

    return new Response(readable, { status: 200, headers: SSE_HEADERS })
  }

  for (let i = 0; i < candidates.length; i++) {
    const channel = candidates[i]
    const built = buildUpstreamRequest(channel, ctx, keyRotation.get(channel.id))
    keyRotation.set(channel.id, built.key)
    const { url, init, protocol: upstreamProtocol } = built
    let upstreamResp: Response
    try {
      const pending = fetch(url, init)
      const remaining = deadline - Date.now()
      if (remaining <= 0) {
        // 窗口已被前面候选的快速失败耗尽: 不再阻塞, 立即提交 SSE
        return beginSlowCommit(pending, upstreamProtocol, channel, i)
      }
      const raced = await Promise.race([pending, sleepSlow(remaining)])
      if (raced === STREAM_SLOW) {
        // 慢上游: 提交 SSE + 心跳, 后台继续等这一跳 (客户端即刻有字节, 不再裸等 TTFT)
        return beginSlowCommit(pending, upstreamProtocol, channel, i)
      }
      upstreamResp = raced
    } catch (err) {
      lastError = truncate(`渠道 ${channel.name} 请求异常: ${(err as Error).message}`, 300)
      await markChannelFailure(channel, options)
      if (i < candidates.length - 1) await sleepMs(RETRY_BACKOFF_MS)
      continue
    }

    let latency = Date.now() - ctx.startTime
    if (!upstreamResp.ok) {
      const errText = await upstreamResp.text().catch(() => '')
      // Task 197: max_tokens 上限类 400 → 学习上限并钳制重试同渠道一次 (仍在 3s 快速窗口内)
      const clamped = await tryClampRetry(channel, ctx, upstreamResp.status, errText, keyRotation.get(channel.id) || built.key)
      if (!clamped) {
        // 3s 内快速失败: 保持原 HTTP 错误语义, 同步重试下一候选
        await recordFastFailure(channel, upstreamResp.status, errText)
        if (i < candidates.length - 1) await sleepMs(RETRY_BACKOFF_MS)
        continue
      }
      upstreamResp = clamped.resp
      latency = Date.now() - ctx.startTime
    }

    // 3s 内上游就绪: 原语义透传 (真流式 — 不再 await getUsage)
    const { stream, getUsage, contentType } = wrapUpstreamStream(upstreamResp, channel, ctx.requestProtocol, upstreamProtocol, model, ctx.body, {
      ctx,
      keyRotation,
      avoidKey: built.key,
    })
    scheduleStreamBilling({ ctx, channel, model: modelForPricing, isStream: true, getUsage, contentType, latencyHint: latency })
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // Task 112: 快速窗口内全候选失败终态 → 错误日志落表
  await recordRelayError(ctx, modelForPricing, lastError, true)
  throw new AuthError(lastStatus >= 500 ? 502 : lastStatus, `所有渠道均请求失败，最后一次错误: ${lastError}`)
}

function estimatePromptTokensForClaude(body: Record<string, unknown>): number {
  return estimateClaudeTokens(body)
}

// ============ 流式计费调度 ============
interface StreamBillingArgs {
  ctx: RelayContext
  channel: ChannelCandidate
  model: string
  isStream: boolean
  getUsage: () => Promise<{ promptTokens: number; completionTokens: number; ttft?: number }>
  contentType: string
  latencyHint: number
}

function scheduleStreamBilling(args: StreamBillingArgs): void {
  void (async () => {
    const usage = await args.getUsage()
    if (usage.promptTokens < 0) {
      // 上游没给 usage → 估算
      usage.promptTokens = args.ctx.requestProtocol === 'claude' ? estimateClaudeTokens(args.ctx.body) : estimateMessagesTokens((args.ctx.body.messages as never[]) || [])
      usage.completionTokens = usage.promptTokens > 0 ? Math.ceil(usage.promptTokens * 0.6) : 0
    }
    // Task 142: 渠道响应时间用 TTFT (latencyHint = fetch resolve 时刻), 总耗时只进日志 useTime
    await finalizeBilling({
      ctx: args.ctx,
      channel: args.channel,
      usage,
      model: args.model,
      isStream: true,
      latency: Date.now() - args.ctx.startTime,
      responseTimeHint: args.latencyHint,
      ttft: usage.ttft,
    })
  })().catch(console.error)
}

// ============ 终态失败日志 (Task 112) ============
// type=5 对标 new-api LogType 错误日志: 全渠道失败时落表, 管理员后台「日志」页可见;
// 看板与模型广场统计均过滤 type=2, 不受污染
async function recordRelayError(ctx: RelayContext, model: string, errText: string, isStream: boolean): Promise<void> {
  try {
    await db.log.create({
      data: {
        userId: ctx.auth.user.id,
        username: ctx.auth.user.username,
        type: 5,
        tokenName: ctx.auth.token.name,
        modelName: model || 'unknown',
        useTime: Date.now() - ctx.startTime,
        isStream,
        ip: ipOf(ctx.request),
        country: countryOf(ctx.request),
        content: truncate(errText, 400),
      },
    })
  } catch (e) {
    console.error('relay error log failed:', e)
  }
}

// ============ 计费落账 ============
async function finalizeBilling(args: {
  ctx: RelayContext
  channel: ChannelCandidate
  usage: { promptTokens: number; completionTokens: number }
  model: string
  isStream: boolean
  latency: number
  /** Task 142: 流式路径的 TTFT (上游响应头到达时刻) — 渠道 responseTime 用它, 不再用总耗时 */
  responseTimeHint?: number
  /** Task 161: 首字延迟 ms — 流式=首个上游数据块, 非流式=响应头; 落 Log.ttft 供模型广场实时口径 */
  ttft?: number
}): Promise<void> {
  const { ctx, channel, usage, model, isStream, latency, responseTimeHint, ttft } = args
  // 渠道「响应时间」口径 = 首字节延迟 (TTFT): 上游开始响应的速度, 与一次回复多长无关;
  // 旧口径把整个流式回复完成的总耗时写进 responseTime, 长回复出现 11456ms 之类的离谱值
  try {
    const options = await getOptions()
    const pricing = await getPricing(model)
    const groupRatio = getGroupRatio(options, ctx.auth.user.group)
    const quota = calcQuota(pricing, usage, groupRatio, parseFloat(options.QuotaPerUnit || '500000') || 500000)
    const totalTokens = usage.promptTokens + usage.completionTokens

    // 负余额防护 (Task 102): 单次扣减不超过用户当前剩余 — 余额不足时只扣到 0,
    // usedQuota/日志仍按应付额累计 (诚实记账), 不再产生新负债
    let deduct = BigInt(quota)
    if (ctx.auth.user.role < 100) {
      const u = await db.user.findUnique({ where: { id: ctx.auth.user.id }, select: { quota: true } })
      if (u && u.quota >= 0n && u.quota < deduct) deduct = u.quota
    }

    await db.$transaction([
      db.user.update({
        where: { id: ctx.auth.user.id },
        data: {
          quota: { decrement: deduct },
          usedQuota: { increment: BigInt(quota) },
          requestCount: { increment: 1 },
        },
      }),
      db.token.update({
        where: { id: ctx.auth.token.id },
        data: {
          usedQuota: { increment: BigInt(quota) },
          requestCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      }),
      db.channel.update({
        where: { id: channel.id },
        data: {
          usedQuota: { increment: BigInt(quota) },
          testTime: new Date(),
          responseTime: Math.round(responseTimeHint && responseTimeHint > 0 ? responseTimeHint : latency),
        },
      }),
      db.log.create({
        data: {
          userId: ctx.auth.user.id,
          username: ctx.auth.user.username,
          type: 2,
          channelId: channel.id,
          channelName: channel.name,
          tokenName: ctx.auth.token.name,
          modelName: model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens,
          useTime: latency,
          ttft: typeof ttft === 'number' && Number.isFinite(ttft) ? Math.round(ttft) : null,
          isStream,
          quota: BigInt(quota),
          ip: ipOf(ctx.request),
          country: countryOf(ctx.request),
          content: `分组 ${ctx.auth.user.group}，模型倍率 ${pricing.ratio}，分组倍率 ${groupRatio}，提示 ${usage.promptTokens} tokens，补全 ${usage.completionTokens} tokens`,
        },
      }),
    ])
    // token 额度用尽自动禁用
    const t = ctx.auth.token
    const tokenQuota = Number(t.quota)
    const tokenUsed = Number(t.usedQuota)
    if (!t.unlimitedQuota && tokenQuota > 0 && tokenQuota - tokenUsed - quota <= 0) {
      await db.token.update({ where: { id: t.id }, data: { status: 4 } }).catch(() => {})
    }
    // Task 152: 成功计费即清零渠道连续失败计数 — 偶发失败后恢复健康立即重置
    clearChannelFailure(channel.id)
  } catch (e) {
    console.error('billing error:', e)
  }
}

// ============ 渠道失败标记 ============
// Task 152: 一次失败不再禁用 — 连续失败 ≥ AutoBanThreshold (Option, 缺省 3) 才真禁;
// 中间任何一笔成功计费即清零。上游偶尔抽风/单把 key 被回收 (换 key 重试即恢复)
// 不再打死整个渠道 (单渠道站一次误禁 = 全站瘫痪); 被禁渠道另有 5 分钟探活自动恢复
async function markChannelFailure(channel: ChannelCandidate, options: Record<string, string>): Promise<void> {
  await recordChannelFailureStreak(channel.id, options, channel.autoBan)
}

// Task 191: 上游「账号欠费/无订阅」类 402/403 不计入渠道失败连击。
// 生产实证 (2026-10-20 凌晨事故): NightRouter 部分 key 账号余额为零, claude 系请求全部
// 403 (insufficient_user_quota); 该错误原本与 key 失效同样计连击 → 3 连击禁用整渠道
// → deepseek 等该渠道独占的健康模型秒 503「无可用渠道」→ 5 分钟探活拉起 (/v1/models
// 仍 200) → 又被打禁, 一小时循环 4 轮 (journalctl [autoban] 18:25/18:31 两轮),
// 用户「新开任务秒报错」。欠费错误代表渠道活着 (换 key 重试即可), 仅 key 真失效
// (401 / 无权类 403) 才应计连击触发禁用。
const QUOTA_ERROR_PATTERNS = [
  'insufficient_user_quota',
  'insufficient_quota',
  'no active subscription',
  'wallet balance',
  'balance is zero',
  'exceeded your current quota',
  'insufficient credits',
  'quota exceeded',
  '欠费',
  '余额不足',
]

/** 该上游错误是否属于「账号欠费/无订阅」类业务错误 (渠道本身活着, 不应计连击) */
function isQuotaBusinessError(errText: string): boolean {
  const t = errText.toLowerCase()
  return QUOTA_ERROR_PATTERNS.some((p) => t.includes(p))
}

/** 是否将该上游错误计入渠道失败连击 (Task 102 基础上叠加 Task 191 欠费豁免) */
function shouldCountChannelFailure(status: number, errText: string): boolean {
  if (status === 402) return false // 纯计费类, 渠道活着
  if (status === 403) return !isQuotaBusinessError(errText) // 欠费/无订阅豁免, 其余无权类照旧
  return status === 401 // 401 = key 真失效
}

// ============ 估算 ============
function estimateUsage(body: Record<string, unknown>, protocol: 'openai' | 'claude', model: string): { promptTokens: number; completionTokens: number } {
  let promptTokens = 0
  if (protocol === 'claude') promptTokens = estimateClaudeTokens(body)
  else if (Array.isArray(body.messages)) promptTokens = estimateMessagesTokens(body.messages as never[])
  else if (body.input !== undefined) promptTokens = estimatePromptTokens(body.input)
  else if (body.prompt !== undefined) promptTokens = estimatePromptTokens(body.prompt)
  const completionTokens = Math.ceil(promptTokens * 0.5)
  return { promptTokens, completionTokens }
}

export { estimateTokens }

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '...' : s
}

export type { TokenAuthResult }

// Task 197: 启动即恢复已学习的 max_tokens 上限 (Option 表 → 内存 Map, 请求路径不再冷启动)
void loadMaxTokLimits()
// Task 152: 被禁渠道自动恢复探活循环 (5 分钟一轮, 单例)
startChannelRecoveryLoop()
// Task 171: 模型广场指标自探测循环 (默认 60s 一轮, 单例) — 有 instrumentation 提前加载时此处幂等跳过
startProbeLoop()
