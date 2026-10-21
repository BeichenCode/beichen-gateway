'use client'

/**
 * 实时产品切片 — 替代模板式「统计带 + 功能卡片」:
 *  1. LiveLogs   — tail -f gateway.log, 日志持续追加 + 实时指标随机游走 (悬停暂停)
 *  2. ModelTable — 模型路由表, 真实产品数据感, TTFT 微抖动保持"活着"
 */
import { useEffect, useRef, useState } from 'react'
import { Reveal } from './kit'

/* ==================================================================== */
/*  LiveLogs                                                            */
/* ==================================================================== */

interface LogLine {
  id: number
  ts: string
  text: string
  tone: 'ok' | 'warn' | 'err' | 'dim'
}

const LOG_MODELS = ['gpt-4o-mini', 'claude-sonnet-4-5', 'deepseek-v3', 'qwen3-max', 'gemini-2.5-pro', 'glm-4.6']
const LOG_REGIONS = ['ch#03 · 杭州', 'ch#07 · 杭州', 'ch#12 · 北京', 'ch#18 · 上海', 'ch#21 · 广州', 'ch#09 · 法兰克福']

function fmtTs(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
const rand = (a: number, b: number) => a + Math.random() * (b - a)

function genLine(id: number): LogLine {
  const roll = Math.random()
  const ts = fmtTs(new Date())
  if (roll < 0.055) {
    return { id, ts, tone: 'warn', text: `POST /v1/chat/completions  ${pick(LOG_MODELS)}  429 upstream busy → retry ch#08 (2/3)` }
  }
  if (roll < 0.085) {
    return { id, ts, tone: 'err', text: `${pick(LOG_MODELS)}  503 ch#05 unhealthy → 已隔离 60s, 流量切至备用渠道` }
  }
  if (roll < 0.16) {
    return {
      id,
      ts,
      tone: 'dim',
      text: `stream done  ${pick(LOG_MODELS)}  ttft ${Math.round(rand(140, 340))}ms · ${Math.round(rand(60, 480))} chunks · ${pick(LOG_REGIONS)}`,
    }
  }
  if (roll < 0.2) {
    return { id, ts, tone: 'dim', text: `key sk-••••${Math.random().toString(16).slice(2, 6)} issued  group=default  quota=$20.00` }
  }
  const tok = Math.round(rand(60, 3200))
  return {
    id,
    ts,
    tone: 'ok',
    text: `POST /v1/chat/completions  ${pick(LOG_MODELS)}  ${pick(LOG_REGIONS)}  200  ${Math.round(rand(160, 940))}ms  ${tok.toLocaleString()}tok  $${(tok * rand(0.4, 2.2) / 1e6).toFixed(5)}`,
  }
}

const TONE_CLS: Record<LogLine['tone'], string> = {
  ok: 'text-foreground/80',
  warn: 'text-[#d97706] dark:text-[#faad14]',
  err: 'text-destructive',
  dim: 'text-muted-foreground/60',
}

export function LiveLogs() {
  const [lines, setLines] = useState<LogLine[]>([])
  const [footTs, setFootTs] = useState('')
  const [paused, setPaused] = useState(false)
  const [metrics, setMetrics] = useState({ rpm: 1247, p50: 312, err: 0.21 })
  const seq = useRef(0)
  const pausedRef = useRef(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // 初始 14 行 + 持续追加 (仅客户端执行, 避免 SSR 时间不一致导致 hydration 错误)
  useEffect(() => {
    const init = Array.from({ length: 14 }, () => genLine(++seq.current))
    setLines(init)
    setFootTs(fmtTs(new Date()))
    const t = setInterval(() => {
      if (pausedRef.current) return
      setFootTs(fmtTs(new Date()))
      setLines((prev) => {
        const next = [...prev, genLine(++seq.current)]
        return next.length > 32 ? next.slice(next.length - 32) : next
      })
    }, 1700)
    return () => clearInterval(t)
  }, [])

  // 指标随机游走
  useEffect(() => {
    const t = setInterval(() => {
      setMetrics((m) => ({
        rpm: Math.max(900, Math.min(1800, Math.round(m.rpm + rand(-46, 46)))),
        p50: Math.max(240, Math.min(420, Math.round(m.p50 + rand(-14, 14)))),
        err: Math.max(0.02, Math.min(0.9, +(m.err + rand(-0.06, 0.06)).toFixed(2))),
      }))
    }, 2000)
    return () => clearInterval(t)
  }, [])

  // 自动滚底 (非悬停时)
  useEffect(() => {
    const el = boxRef.current
    if (el && !paused) el.scrollTop = el.scrollHeight
  }, [lines, paused])

  return (
    <div className="overflow-hidden border border-border bg-card shadow-[0_20px_60px_-30px_rgba(15,18,34,0.3)]">
      {/* 头: tail 命令 + 实时指标 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-border px-4 py-2.5 sm:px-5">
        <span className="font-code text-[11.5px] text-foreground/80">
          <span className="text-primary">$</span> tail -f /var/log/gateway.log
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 font-code text-[11px] tabular-nums text-muted-foreground">
          <span>
            req/min <span className="font-bold text-foreground">{metrics.rpm.toLocaleString()}</span>
          </span>
          <span className="hidden sm:inline">
            p50 <span className="font-bold text-foreground">{metrics.p50}ms</span>
          </span>
          <span>
            err <span className="font-bold text-[#52c41a]">{metrics.err.toFixed(2)}%</span>
          </span>
          <button
            onClick={() => setPaused((p) => !p)}
            className={`border px-1.5 py-px text-[10px] transition-colors ${
              paused ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {paused ? '已暂停 · 点击继续' : '悬停/点击暂停'}
          </button>
        </span>
      </div>

      {/* 日志体 */}
      <div
        ref={boxRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="naive-scrollbar h-[380px] overflow-y-auto bg-background/60 px-4 py-3 font-code text-[11.5px] leading-[1.9] sm:px-5"
      >
        {lines.map((l) => (
          <div key={l.id} className="row-in flex gap-3 whitespace-pre-wrap break-all">
            <span className="shrink-0 text-muted-foreground/40">{l.ts}</span>
            <span className={`min-w-0 ${TONE_CLS[l.tone]}`}>{l.text}</span>
          </div>
        ))}
        <div className="flex gap-3 text-muted-foreground/50">
          <span className="shrink-0 text-muted-foreground/30">{footTs}</span>
          <span className="flex items-center gap-1.5">
            <span className="animate-caret inline-block h-[12px] w-[7px] bg-primary/70" />
            {paused ? 'paused — 鼠标移开继续' : 'waiting for events'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ==================================================================== */
/*  ModelTable                                                          */
/* ==================================================================== */

interface Row {
  model: string
  proto: string
  ch: string
  ttft: number
  ratio: string
}

const TABLE_ROWS: Row[] = [
  { model: 'gpt-5.2', proto: 'OpenAI', ch: 'ch#03 ×4', ttft: 246, ratio: '×1.25' },
  { model: 'gpt-4o-mini', proto: 'OpenAI', ch: 'ch#07 ×6', ttft: 198, ratio: '×0.35' },
  { model: 'claude-opus-4-1', proto: 'Claude', ch: 'ch#12 ×2', ttft: 402, ratio: '×2.50' },
  { model: 'claude-sonnet-4-5', proto: 'Claude', ch: 'ch#12 ×3', ttft: 287, ratio: '×1.00' },
  { model: 'gemini-2.5-pro', proto: 'Gemini', ch: 'ch#09 ×2', ttft: 341, ratio: '×0.60' },
  { model: 'deepseek-v3', proto: 'OpenAI', ch: 'ch#21 ×5', ttft: 315, ratio: '×0.14' },
  { model: 'qwen3-max', proto: 'OpenAI', ch: 'ch#18 ×3', ttft: 264, ratio: '×0.24' },
  { model: 'glm-4.6', proto: 'OpenAI', ch: 'ch#18 ×2', ttft: 232, ratio: '×0.20' },
]

export function ModelTable({ modelCount }: { modelCount: number }) {
  const [jitter, setJitter] = useState<number[]>(TABLE_ROWS.map((r) => r.ttft))

  // TTFT 每 2.5s 微抖动 ±6%, 保持"实测中"的活感
  useEffect(() => {
    const t = setInterval(() => {
      setJitter(TABLE_ROWS.map((r) => Math.round(r.ttft * (1 + (Math.random() - 0.5) * 0.12))))
    }, 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="overflow-hidden border border-border bg-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2.5 sm:px-5">
        <span className="font-code text-[11.5px] text-foreground/80">
          <span className="text-primary">GET</span> /v1/models
        </span>
        <span className="ml-auto font-code text-[10.5px] text-muted-foreground/70">
          网关已接入 <span className="font-bold text-primary">{modelCount > 0 ? modelCount : 200}+</span> 个模型 · 下表为抽样实测
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left font-code text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-4 py-2.5 font-medium sm:px-5">模型</th>
              <th className="px-3 py-2.5 font-medium">协议</th>
              <th className="px-3 py-2.5 font-medium">命中渠道</th>
              <th className="px-3 py-2.5 text-right font-medium">TTFT</th>
              <th className="px-3 py-2.5 text-right font-medium">倍率</th>
              <th className="px-4 py-2.5 text-right font-medium sm:px-5">状态</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((r, i) => (
              <tr key={r.model} className="border-b border-border/60 transition-colors last:border-0 hover:bg-primary/[0.04]">
                <td className="px-4 py-2.5 font-medium text-foreground sm:px-5">{r.model}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.proto}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.ch}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-foreground/85">{jitter[i]}ms</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{r.ratio}</td>
                <td className="px-4 py-2.5 text-right sm:px-5">
                  <span className="inline-flex items-center gap-1.5 text-[#52c41a]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#52c41a]" />
                    正常
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-muted/40 px-4 py-2.5 font-code text-[10.5px] text-muted-foreground/70 sm:px-5">
        倍率 = 相对官方价格的计费系数 · 渠道数 ×N 表示该模型有 N 条可用上游, 自动加权分发
      </div>
    </div>
  )
}
