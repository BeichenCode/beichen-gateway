'use client'

/**
 * Hero 交互式网关模拟器 — 「官网即网关」概念的核心
 * 访客输入一句话 → 当场走完 auth → route → adapt → upstream → billing 全链路
 * 响应流式打字机输出, 带真实感耗时/计费数据
 * 纯前端模拟, 不产生真实请求; runId 守卫支持随时重跑/清空
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { RotateCcw, CornerDownLeft } from '@/components/ph'

/* ================= 模型配置 ================= */

interface ModelCfg {
  ch: string
  w: number
  ttft: [number, number]
  pin: number // $ / 1M input tok
  pout: number
}

const MODELS: Record<string, ModelCfg> = {
  'gpt-4o-mini': { ch: 'ch#07 · 华东-杭州', w: 62, ttft: [170, 280], pin: 0.15, pout: 0.6 },
  'claude-sonnet-4-5': { ch: 'ch#12 · 华北-北京', w: 27, ttft: [210, 340], pin: 1.8, pout: 9.0 },
  'deepseek-v3': { ch: 'ch#21 · 华南-广州', w: 11, ttft: [230, 400], pin: 0.27, pout: 1.1 },
}
type ModelKey = keyof typeof MODELS

const PRESETS = ['写一句官网 slogan', '用一句话解释什么是 LLM 网关', '用 Python 写个快排']

/* ================= 模拟响应文案 ================= */

function buildReply(q: string, model: string): string {
  if (q.includes('slogan')) {
    return [
      '1. 「把一千个模型，接成一根网线。」',
      '2. 「流量往哪走，你说了算。」',
      '3. 「一次鉴权，通吃所有大模型。」',
      '',
      '以上 3 选 1 —— 在真实环境里，这段话由上游模型流式生成，网关只负责把它安全、计量地送到你眼前。',
    ].join('\n')
  }
  if (q.includes('解释') || q.includes('什么是')) {
    return [
      'LLM 网关 = 大模型的「机场调度台」。',
      '',
      '你的应用只对网关说话（一套 OpenAI 兼容 API），网关负责三件事:',
      '① 鉴权 —— 令牌、额度、模型白名单，越界直接拦下',
      '② 路由 —— 按权重/负载把请求分给最合适的上游渠道',
      '③ 计费 —— 按 token 精确结算，谁用掉多少，一目了然',
      '',
      '于是「接入新模型」= 在网关加一个渠道，业务代码零改动。',
    ].join('\n')
  }
  if (q.includes('快排') || q.includes('quicksort') || q.includes('Python')) {
    return [
      'def quicksort(arr):',
      '    if len(arr) <= 1:',
      '        return arr',
      '    pivot = arr[len(arr) // 2]',
      '    left  = [x for x in arr if x < pivot]',
      '    mid   = [x for x in arr if x == pivot]',
      '    right = [x for x in arr if x > pivot]',
      '    return quicksort(left) + mid + quicksort(right)',
      '',
      'print(quicksort([3, 6, 1, 8, 2, 9, 4]))',
      "# → [1, 2, 3, 4, 6, 8, 9]",
    ].join('\n')
  }
  const trimmed = q.length > 24 ? q.slice(0, 24) + '…' : q
  return [
    `收到：「${trimmed}」`,
    '',
    '这是演示环境的模拟响应 —— 真实网关里，这段话会由 ' + model + ' 流式生成，ttft 约 0.2s，token 用量实时计入你的账户。',
    '',
    '想玩真的？注册后在「令牌」页签发 key，把 base_url 指过来就行。',
  ].join('\n')
}

/* ================= 步骤定义 ================= */

interface Step {
  no: string
  key: string
  label: string
  runDetail: string
  doneDetail: string
  ms: number
  state: 'active' | 'done'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Meta {
  ttft: number
  total: number
  inTok: number
  outTok: number
  cost: string
}

/* ================= 组件 ================= */

export default function Playground() {
  const [model, setModel] = useState<ModelKey>('gpt-4o-mini')
  const [input, setInput] = useState('')
  const [steps, setSteps] = useState<Step[]>([])
  const [out, setOut] = useState('')
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [hint, setHint] = useState(false)
  const runId = useRef(0)
  const outBoxRef = useRef<HTMLDivElement>(null)

  // 响应区自动滚底
  useEffect(() => {
    const el = outBoxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [out])

  async function stream(text: string, alive: () => boolean) {
    const chars = Array.from(text)
    for (let i = 0; i < chars.length; i++) {
      if (!alive()) return
      setOut((p) => p + chars[i] + (chars[i + 1] ?? ''))
      i++
      await sleep(16 + Math.random() * 26)
    }
  }

  async function run(qRaw?: string) {
    const q = (qRaw ?? input).trim()
    if (!q) {
      setHint(true)
      setTimeout(() => setHint(false), 2200)
      return
    }
    if (phase === 'running') return
    const my = ++runId.current
    const alive = () => runId.current === my
    const cfg = MODELS[model]
    const ttft = Math.round(cfg.ttft[0] + Math.random() * (cfg.ttft[1] - cfg.ttft[0]))
    const t0 = performance.now()

    setPhase('running')
    setSteps([])
    setOut('')
    setMeta(null)
    setInput(q)

    const push = (s: Omit<Step, 'state' | 'no' | 'ms'>) =>
      setSteps((prev) => [...prev, { ...s, no: String(prev.length + 1).padStart(2, '0'), state: 'active', ms: 0 }])

    // ① auth
    push({ key: 'auth', label: 'auth 鉴权', runDetail: 'sk-demo-•••• 校验中 …', doneDetail: '' })
    await sleep(160)
    if (!alive()) return
    setSteps((prev) =>
      prev.map((s) => (s.key === 'auth' ? { ...s, state: 'done', ms: 1, doneDetail: '额度 $500.00 · 白名单 ✓ · 未过期' } : s)),
    )

    // ② route
    push({ key: 'route', label: 'route 路由', runDetail: '在 3 个候选渠道间加权挑选 …', doneDetail: '' })
    await sleep(220)
    if (!alive()) return
    setSteps((prev) =>
      prev.map((s) =>
        s.key === 'route'
          ? { ...s, state: 'done', ms: 2, doneDetail: `命中 ${cfg.ch} · 权重 ${cfg.w}% · 备选 ch#08` }
          : s,
      ),
    )

    // ③ adapt
    push({ key: 'adapt', label: 'adapt 转换', runDetail: '比对协议差异 …', doneDetail: '' })
    await sleep(140)
    if (!alive()) return
    setSteps((prev) =>
      prev.map((s) => (s.key === 'adapt' ? { ...s, state: 'done', ms: 0, doneDetail: 'OpenAI 协议 → 透传 · 零转换损耗' } : s)),
    )

    // ④ upstream
    push({ key: 'upstream', label: 'upstream 上游', runDetail: 'SSE 连接上游 …', doneDetail: '' })
    await sleep(ttft)
    if (!alive()) return
    const reply = buildReply(q, model)
    const outTok = Math.ceil(Array.from(reply).length * 0.62)
    const inTok = Math.ceil(Array.from(q).length / 2) + 9
    await stream(reply, alive)
    if (!alive()) return
    setSteps((prev) =>
      prev.map((s) =>
        s.key === 'upstream' ? { ...s, state: 'done', ms: ttft, doneDetail: `200 OK · ttft ${ttft}ms · ${outTok} tok 流式返回` } : s,
      ),
    )

    // ⑤ billing
    push({ key: 'billing', label: 'billing 计费', runDetail: '按模型倍率结算 …', doneDetail: '' })
    await sleep(180)
    if (!alive()) return
    const cost = ((inTok * cfg.pin) / 1e6 + (outTok * cfg.pout) / 1e6).toFixed(6)
    setSteps((prev) =>
      prev.map((s) =>
        s.key === 'billing' ? { ...s, state: 'done', ms: 3, doneDetail: `${inTok} + ${outTok} tok · $${cost}` } : s,
      ),
    )

    setMeta({ ttft, total: Math.round(performance.now() - t0), inTok, outTok, cost })
    setPhase('done')
  }

  function reset() {
    runId.current++
    setPhase('idle')
    setSteps([])
    setOut('')
    setMeta(null)
    setInput('')
  }

  const running = phase === 'running'
  const streaming = running && steps.some((s) => s.key === 'upstream' && s.state === 'active')

  return (
    <div className="overflow-hidden border border-border bg-card shadow-[0_24px_70px_-32px_rgba(15,18,34,0.35)]">
      {/* 面板头 */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5 sm:px-5">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="truncate font-code text-[11.5px] text-foreground/80">POST /v1/chat/completions</span>
        <span className="hidden shrink-0 border border-border px-1.5 py-px font-code text-[10px] leading-4 text-muted-foreground sm:inline">
          sk-demo
        </span>
        <span className="ml-auto hidden shrink-0 font-code text-[10px] tracking-wider text-muted-foreground/50 md:inline">
          SIMULATED · 纯前端模拟
        </span>
        {phase !== 'idle' && (
          <button
            onClick={reset}
            className="flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-1 font-code text-[10.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCcw size={11} />
            重置
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[5fr_7fr] lg:divide-x lg:divide-border">
        {/* ============ 左: 请求编辑区 ============ */}
        <div className="flex flex-col p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-code text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">model</span>
            <span className="font-code text-[10.5px] text-muted-foreground/50">3 candidates</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(MODELS) as ModelKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setModel(k)}
                className={`border px-2.5 py-1.5 font-code text-[11px] transition-all ${
                  model === k
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="font-code text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">messages</span>
            <span className={`font-code text-[10.5px] transition-opacity ${hint ? 'text-destructive opacity-100' : 'opacity-0'}`}>
              先输入点什么，或点下面的示例
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                run()
              }
            }}
            rows={4}
            placeholder="随便说点什么，发往网关 …"
            className={`mt-2 w-full resize-none border bg-background px-3.5 py-3 font-code text-[12.5px] leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15 ${
              hint ? 'border-destructive' : 'border-input'
            }`}
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => run(p)}
                disabled={running}
                className="border border-dashed border-border px-2.5 py-1.5 text-[11.5px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => run()}
            disabled={running}
            className={`mt-4 flex h-11 shrink-0 items-center justify-center gap-2 font-medium transition-all ${
              running
                ? 'cursor-wait bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90'
            }`}
          >
            {running ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                网关处理中 …
              </>
            ) : (
              <>
                <CornerDownLeft size={15} />
                发送到网关
                <span className="ml-1 hidden border border-white/25 px-1 font-code text-[10px] leading-4 opacity-70 sm:inline">⏎</span>
              </>
            )}
          </button>
        </div>

        {/* ============ 右: 链路 + 响应 ============ */}
        <div className="flex min-w-0 flex-col border-t border-border lg:border-t-0">
          {/* pipeline */}
          <div className="min-h-[132px] border-b border-border p-4 sm:p-5">
            <div className="font-code text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">pipeline</div>
            <div className="mt-2.5 space-y-[7px]">
              {steps.length === 0 && (
                <div className="py-6 text-center font-code text-[11px] text-muted-foreground/40">
                  —— 等待请求，链路步骤将在此逐个点亮 ——
                </div>
              )}
              {steps.map((s) => (
                <div key={s.key} className="row-in flex items-center gap-2.5 font-code text-[11.5px]">
                  <span className="w-5 shrink-0 text-muted-foreground/40">{s.no}</span>
                  <span className={`w-[112px] shrink-0 truncate ${s.state === 'active' ? 'text-primary' : 'text-foreground/85'}`}>
                    {s.label}
                  </span>
                  <span className={`min-w-0 flex-1 truncate ${s.state === 'active' ? 'text-primary/70' : 'text-muted-foreground'}`}>
                    {s.state === 'active' ? s.runDetail : s.doneDetail}
                  </span>
                  {s.state === 'active' ? (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  ) : (
                    <span className="shrink-0 text-[#52c41a]">✓</span>
                  )}
                  <span className="w-[46px] shrink-0 text-right tabular-nums text-muted-foreground/70">
                    {s.state === 'done' ? `${s.ms}ms` : '···'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* response */}
          <div className="flex min-h-[220px] flex-1 flex-col p-4 sm:p-5" ref={outBoxRef}>
            <div className="flex items-center justify-between">
              <span className="font-code text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">response</span>
              {streaming && <span className="font-code text-[10.5px] text-[#52c41a]">streaming …</span>}
            </div>
            <div className="naive-scrollbar mt-2 max-h-[280px] min-h-[120px] flex-1 overflow-y-auto">
              {out ? (
                <pre className="whitespace-pre-wrap break-words font-code text-[12.5px] leading-[1.75] text-foreground/90">
                  {out}
                  {(streaming || (running && !out)) && (
                    <span className="animate-caret ml-0.5 inline-block h-[13px] w-[7px] translate-y-[2px] bg-primary" />
                  )}
                </pre>
              ) : (
                <div className="flex h-full min-h-[100px] items-center justify-center font-code text-[11px] text-muted-foreground/40">
                  {running ? '建立上游连接中 …' : '—— 响应将在此流式打出 ——'}
                </div>
              )}
            </div>
            {meta && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2.5 font-code text-[11px] text-muted-foreground">
                <span>
                  ttft <span className="text-foreground">{meta.ttft}ms</span>
                </span>
                <span>
                  total <span className="text-foreground">{meta.total}ms</span>
                </span>
                <span>
                  tok <span className="text-foreground">{meta.inTok}+{meta.outTok}</span>
                </span>
                <span>
                  cost <span className="text-[#52c41a]">${meta.cost}</span>
                </span>
                <span className="ml-auto text-[#52c41a]">200 OK</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 面板脚 */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-muted/40 px-4 py-2.5 font-code text-[10.5px] text-muted-foreground/70 sm:px-5">
        <span>region cn-hz-2 · retries ≤ 3 · weighted routing</span>
        <span className="hidden sm:inline">Enter 发送 · Shift+Enter 换行</span>
      </div>
    </div>
  )
}
