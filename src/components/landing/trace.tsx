'use client'

/**
 * Trace 瀑布图 — Hero 核心视觉
 * 一次调用的 span 分解: auth → route → adapt → upstream → settle
 * span 条按序生长, upstream 带流光; 每 9s 重放; 点击任意 span 跳到对应章节
 * 纯前端模拟, 不产生真实请求
 */
import { useEffect, useState } from 'react'

interface Span {
  id: string
  label: string
  zh: string
  ms: number
  w: number
  tone: 'dim' | 'primary' | 'green'
  href: string
  note: string
}

const SPANS: Span[] = [
  { id: 'auth', label: 'gateway.auth', zh: '鉴权', ms: 3, w: 2.4, tone: 'dim', href: '#s-auth', note: '额度 · 白名单 · IP · 过期' },
  { id: 'route', label: 'route.select', zh: '路由', ms: 2, w: 1.9, tone: 'dim', href: '#s-route', note: '加权选中 claude-primary' },
  { id: 'adapt', label: 'protocol.adapt', zh: '转换', ms: 1, w: 1.5, tone: 'dim', href: '#s-adapt', note: 'openai → claude 字段映射' },
  { id: 'call', label: 'upstream.call', zh: '上游', ms: 680, w: 82, tone: 'primary', href: '#s-models', note: 'claude-sonnet-4-5 · SSE · 214 chunks' },
  { id: 'settle', label: 'billing.settle', zh: '计费', ms: 4, w: 2.8, tone: 'green', href: '#s-billing', note: '7,412 tok · $0.0213' },
]

const BAR_TONE: Record<Span['tone'], string> = {
  dim: 'bg-white/25',
  primary: 'bg-gradient-to-r from-[#6467f2]/80 to-[#8a8cf8]',
  green: 'bg-[#22b07d]/80',
}

const MS_TONE: Record<Span['tone'], string> = {
  dim: 'text-white/40',
  primary: 'text-[#8a8cf8]',
  green: 'text-[#3fc791]',
}

export default function TraceWaterfall() {
  // 每 9s 重放一次 trace 生长动画, 保持"活着"的感觉
  const [run, setRun] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setRun((r) => r + 1), 9000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="overflow-hidden border border-white/10 bg-[#0b0d14] text-left shadow-[0_32px_90px_-30px_rgba(100,103,242,0.4)]">
      {/* 面板头: 请求摘要 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/8 px-4 py-3 sm:px-5">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span className="font-code text-[12px] text-white/85">POST /v1/chat/completions</span>
        <span className="hidden border border-white/15 px-1.5 py-px font-code text-[10px] text-white/50 sm:inline">
          claude-sonnet-4-5
        </span>
        <span className="ml-auto font-code text-[11px] text-white/50">
          <span className="text-[#3fc791]">200 OK</span> · 712 ms
        </span>
      </div>

      {/* span 瀑布 */}
      <div key={run} className="px-4 py-4 sm:px-5">
        {SPANS.map((s, i) => (
          <a
            key={s.id}
            href={s.href}
            className="group -mx-2 flex items-center gap-2 rounded-sm px-2 py-[7px] transition-colors hover:bg-white/[0.04] sm:gap-3"
          >
            {/* 树形符号 + label */}
            <span className="hidden w-4 shrink-0 font-code text-[10px] text-white/20 sm:inline">
              {i === SPANS.length - 1 ? '└' : '├'}
            </span>
            <span className="w-[118px] shrink-0 truncate font-code text-[11px] text-white/70 transition-colors group-hover:text-white sm:w-[150px]">
              {s.label}
              <span className="ml-1.5 hidden text-white/30 lg:inline">{s.zh}</span>
            </span>

            {/* bar */}
            <span className="relative h-[14px] min-w-0 flex-1">
              <span
                className={`absolute inset-y-0 left-0 ${BAR_TONE[s.tone]} ${s.tone === 'primary' ? '' : 'opacity-80'}`}
                style={
                  {
                    '--w': `${s.w}%`,
                    width: `${s.w}%`,
                    minWidth: '5px',
                    animation: `span-grow .9s cubic-bezier(.22,1,.36,1) ${i * 130}ms both`,
                  } as React.CSSProperties
                }
              >
                {s.tone === 'primary' && (
                  <span className="stream-shimmer absolute inset-0 block" />
                )}
              </span>
            </span>

            {/* note + 耗时 */}
            <span className="hidden w-[210px] shrink-0 truncate text-right font-code text-[10px] text-white/30 xl:inline">
              {s.note}
            </span>
            <span className={`w-[52px] shrink-0 text-right font-code text-[11px] tabular-nums ${MS_TONE[s.tone]}`}>
              {s.ms}ms
            </span>
          </a>
        ))}
      </div>

      {/* 面板脚 */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/8 px-4 py-2.5 font-code text-[10px] text-white/30 sm:px-5">
        <span>trace 7f3a9c · weighted routing · retries ≤ 3</span>
        <span className="hidden text-white/25 md:inline">点击任意 span，展开该阶段 ↓</span>
      </div>
    </div>
  )
}
