'use client'

/**
 * 实时路由模拟器 — Hero 右侧核心视觉
 * 模拟网关运行态: 请求流滚动 + 渠道负载条 + 关键指标跳动
 * 全部为前端模拟动画, 不产生真实请求
 */
import { useEffect, useRef, useState } from 'react'

interface Req {
  id: number
  path: string
  model: string
  ms: number
  ch: number
}

const REQ_POOL = [
  { path: '/v1/chat/completions', model: 'gpt-4o', ms: [380, 560] },
  { path: '/v1/messages', model: 'claude-sonnet-4-5', ms: [240, 420] },
  { path: '/v1/chat/completions', model: 'deepseek-chat', ms: [540, 780] },
  { path: '/v1/embeddings', model: 'text-embedding-3-small', ms: [70, 140] },
  { path: '/v1/chat/completions', model: 'gemini-2.5-pro', ms: [460, 690] },
  { path: '/v1/chat/completions', model: 'qwen3-max', ms: [300, 520] },
  { path: '/v1/chat/completions', model: 'glm-4.6', ms: [280, 460] },
]

const CHANNELS = [
  { name: 'openai-main', region: 'us-east', w1: 38, w2: 66, dur: 3.4, delay: 0 },
  { name: 'claude-primary', region: 'global', w1: 30, w2: 54, dur: 4.1, delay: 0.6 },
  { name: 'gemini-relay', region: 'eu-west', w1: 22, w2: 44, dur: 3.8, delay: 1.1 },
  { name: 'deepseek-direct', region: 'cn-bj', w1: 16, w2: 38, dur: 4.6, delay: 0.3 },
]

const SEED: Req[] = [
  { id: 1, path: '/v1/chat/completions', model: 'gpt-4o', ms: 412, ch: 0 },
  { id: 2, path: '/v1/messages', model: 'claude-sonnet-4-5', ms: 287, ch: 1 },
  { id: 3, path: '/v1/chat/completions', model: 'deepseek-chat', ms: 655, ch: 3 },
  { id: 4, path: '/v1/chat/completions', model: 'gemini-2.5-pro', ms: 533, ch: 2 },
]

let uid = 100
function rand(a: number, b: number) {
  return Math.round(a + Math.random() * (b - a))
}

export default function Simulator() {
  const [lines, setLines] = useState<Req[]>(SEED)
  const [counts, setCounts] = useState([1284, 967, 731, 548])
  const [rpm, setRpm] = useState(1284)
  const [p50, setP50] = useState(312)
  const [tps, setTps] = useState(48.2)
  const idRef = useRef(100)

  useEffect(() => {
    const timer = setInterval(() => {
      const pool = REQ_POOL[Math.floor(Math.random() * REQ_POOL.length)]
      const ch = Math.floor(Math.random() * CHANNELS.length)
      const req: Req = {
        id: ++idRef.current,
        path: pool.path,
        model: pool.model,
        ms: rand(pool.ms[0], pool.ms[1]),
        ch,
      }
      setLines((prev) => [...prev.slice(-6), req])
      setCounts((prev) => prev.map((c, i) => (i === ch ? c + rand(1, 4) : c)))
      setRpm(() => 1180 + rand(0, 240))
      setP50(() => 280 + rand(0, 90))
      setTps(() => 42 + Math.random() * 18)
    }, 1600)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="overflow-hidden border border-white/10 bg-[#0b0d14] text-left shadow-[0_24px_80px_-24px_rgba(100,103,242,0.35)]">
      {/* 控制台标题栏 */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div className="flex items-center gap-2 font-code text-[11px] text-white/50">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          gateway / live traffic
        </div>
        <span className="font-code text-[10px] text-white/30">uptime 99.98%</span>
      </div>

      {/* 请求流 */}
      <div className="relative h-[196px] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-[#0b0d14] to-transparent" />
        <div className="flex flex-col justify-end gap-[7px] px-4 pb-3 pt-3">
          {lines.map((r) => (
            <div
              key={r.id}
              className="req-line flex items-center gap-2 font-code text-[11px] leading-4"
              style={{ animation: 'req-in .32s cubic-bezier(0.4,0,0.2,1) both' }}
            >
              <span className="shrink-0 border border-[#22b07d]/30 bg-[#22b07d]/10 px-1 text-[9px] font-semibold leading-4 text-[#3fc791]">
                POST
              </span>
              <span className="shrink-0 text-[#c9d1d9]">{r.path}</span>
              <span className="hidden truncate text-white/35 sm:inline">· {r.model}</span>
              <span className="ml-auto shrink-0 tabular-nums text-white/50">
                <span className="text-[#3fc791]">200</span> · {r.ms}ms
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 渠道负载 */}
      <div className="space-y-3 border-t border-white/8 px-4 py-4">
        <div className="font-code text-[10px] uppercase tracking-[0.18em] text-white/30">
          channels · weighted routing
        </div>
        {CHANNELS.map((c, i) => (
          <div key={c.name}>
            <div className="mb-1 flex items-center justify-between font-code text-[10.5px] text-white/55">
              <span>
                {c.name}
                <span className="ml-1.5 text-white/25">{c.region}</span>
              </span>
              <span className="tabular-nums text-white/40">{counts[i].toLocaleString()} reqs</span>
            </div>
            <div className="h-[5px] w-full overflow-hidden bg-white/6">
              <div
                className="h-full bg-gradient-to-r from-[#6467f2]/70 to-[#8a8cf8]/90"
                style={
                  {
                    '--w1': `${c.w1}%`,
                    '--w2': `${c.w2}%`,
                    width: `${c.w1}%`,
                    animation: `ch-load ${c.dur}s ease-in-out ${c.delay}s infinite alternate`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* 指标读数 */}
      <div className="grid grid-cols-3 divide-x divide-white/8 border-t border-white/8">
        {[
          { label: 'RPM', value: rpm.toLocaleString() },
          { label: 'P50', value: `${p50}ms` },
          { label: 'TOKENS/S', value: tps.toFixed(1) },
        ].map((s) => (
          <div key={s.label} className="px-4 py-2.5">
            <div className="font-code text-[9.5px] uppercase tracking-wider text-white/30">{s.label}</div>
            <div className="mt-0.5 font-code text-[15px] font-semibold tabular-nums text-white/85">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
