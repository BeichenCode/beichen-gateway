'use client'

/**
 * 收尾两幕 — 终端语言贯穿到底, 拒绝「深色 CTA 横幅 + 大按钮」公式:
 *  1. QuickStart  — 两段可复制配置, 任何 OpenAI SDK 改两行即用
 *  2. TerminalCTA — 一台会自动敲出 signup --free 的终端, 整块可点, 通向 /register
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Reveal, CopyButton } from './kit'

/* ==================================================================== */
/*  QuickStart                                                          */
/* ==================================================================== */

const SHELL_CODE = `# 任何 OpenAI SDK / 第三方客户端, 只需改两行配置
export OPENAI_BASE_URL="https://你的域名/v1"
export OPENAI_API_KEY="sk-在控制台-令牌页签发"`

const PY_CODE = `from openai import OpenAI

client = OpenAI()   # 自动读取上面两个环境变量

resp = client.chat.completions.create(
    model="claude-sonnet-4-5",   # 任意已接入模型, 即换即用
    messages=[{"role": "user", "content": "你好"}],
)
print(resp.choices[0].message.content)`

const CLIENTS = ['Cursor', 'LobeChat', 'Dify', 'ChatBox', 'Open WebUI', 'Cline']

export function QuickStart() {
  return (
    <Reveal>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        {/* 左: 说明 */}
        <div>
          <div className="flex items-center gap-3 font-code text-[11px]">
            <span className="font-bold text-primary">/03</span>
            <span className="text-muted-foreground/80">quickstart</span>
            <span className="h-px flex-1 bg-border" />
            <span className="text-muted-foreground/60">~30s</span>
          </div>
          <h2 className="mt-4 text-[1.6rem] font-bold leading-snug tracking-tight sm:text-[2rem]">
            接入不需要「阅读文档」，
            <br />
            只需要<span className="text-primary">改两行配置</span>。
          </h2>
          <p className="mt-3.5 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
            协议 100% 兼容 OpenAI, 所以所有现成的 SDK 和客户端都能直接用。签发令牌、填两个环境变量 ——
            你的业务代码一行都不用动, 换模型也只是换个字符串。
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {CLIENTS.map((c) => (
              <span key={c} className="border border-border bg-card px-2.5 py-1.5 font-code text-[11px] text-muted-foreground">
                {c}
              </span>
            ))}
            <span className="px-1.5 py-1.5 text-[11px] text-muted-foreground/60">…填同样两个值即可</span>
          </div>
        </div>

        {/* 右: 两段代码 */}
        <div className="space-y-4">
          <div className="overflow-hidden border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
              <span className="font-code text-[11px] text-muted-foreground">
                <span className="font-bold text-primary">01</span> · shell
              </span>
              <CopyButton text={SHELL_CODE} />
            </div>
            <pre className="naive-scrollbar overflow-x-auto px-4 py-3.5 font-code text-[12px] leading-[1.8] text-foreground/85">
              {SHELL_CODE}
            </pre>
          </div>
          <div className="overflow-hidden border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
              <span className="font-code text-[11px] text-muted-foreground">
                <span className="font-bold text-primary">02</span> · python — 业务代码原样跑
              </span>
              <CopyButton text={PY_CODE} />
            </div>
            <pre className="naive-scrollbar overflow-x-auto px-4 py-3.5 font-code text-[12px] leading-[1.8] text-foreground/85">
              {PY_CODE}
            </pre>
          </div>
        </div>
      </div>
    </Reveal>
  )
}

/* ==================================================================== */
/*  TerminalCTA                                                         */
/* ==================================================================== */

const TYPE_LINES: { text: string; cls: string; pause: number }[] = [
  { text: '$ signup --free', cls: 'text-white/90', pause: 500 },
  { text: '→ 校验通过, 正在准备账号环境 …', cls: 'text-white/45', pause: 700 },
  { text: '✓ 体验额度已到账, 无需绑卡', cls: 'text-[#63e225]', pause: 420 },
  { text: '✓ 令牌签发通道已就绪', cls: 'text-[#63e225]', pause: 360 },
  { text: '→ 打开 /register , 30 秒后见 _', cls: 'text-[#4aa3fd]', pause: 0 },
]

export function TerminalCTA() {
  const [lines, setLines] = useState<string[]>([])
  const [cur, setCur] = useState('')
  const hostRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started.current) return
        started.current = true
        io.disconnect()
        let li = 0
        const typeNext = () => {
          if (li >= TYPE_LINES.length) return
          const target = TYPE_LINES[li]
          const chars = Array.from(target.text)
          let ci = 0
          const tick = () => {
            if (ci < chars.length) {
              setCur((p) => p + chars[ci])
              ci++
              setTimeout(tick, target.text.startsWith('$') ? 55 : 16)
            } else {
              setLines((p) => [...p, target.text])
              setCur('')
              li++
              setTimeout(typeNext, target.pause)
            }
          }
          tick()
        }
        typeNext()
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="relative overflow-hidden bg-[#0b0d14]">
      <div className="grid-bg-dark absolute inset-0 opacity-60" />
      <div
        ref={hostRef}
        className="relative mx-auto max-w-6xl px-6 py-24 sm:py-28"
      >
        <Reveal>
          <div className="flex items-center gap-3 font-code text-[11px] text-white/35">
            <span className="font-bold text-[#4aa3fd]">/04</span>
            <span>signup.yours</span>
            <span className="h-px w-10 bg-white/15" />
          </div>
          <h2 className="mt-5 max-w-2xl text-[2rem] font-bold leading-tight tracking-tight text-white sm:text-[2.7rem]">
            上面看爽了？
            <br />
            换成<span className="text-[#4aa3fd]">真的</span>只要 30 秒。
          </h2>
        </Reveal>

        {/* 可点击终端 */}
        <Reveal delay={120}>
          <Link
            href="/register"
            className="group mt-9 block max-w-2xl overflow-hidden border border-white/12 bg-black/60 shadow-[0_32px_80px_-30px_rgba(24,160,88,0.45)] outline-none transition-all hover:border-[#4aa3fd]/50 focus-visible:ring-2 focus-visible:ring-[#4aa3fd]/60"
          >
            <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
              <span className="h-2 w-2 bg-white/15 transition-colors group-hover:bg-[#63e225]/70" />
              <span className="font-code text-[11px] text-white/40">gateway — signup</span>
              <span className="ml-auto font-code text-[10px] text-white/25 transition-colors group-hover:text-white/60">
                点击整块终端 → /register
              </span>
            </div>
            <div className="min-h-[148px] px-4 py-4 font-code text-[12.5px] leading-[2] sm:px-5">
              {lines.map((l, i) => (
                <div key={i} className={TYPE_LINES[i]?.cls ?? 'text-white/80'}>
                  {l}
                </div>
              ))}
              {cur && <div className={TYPE_LINES[lines.length]?.cls ?? 'text-white/80'}>{cur}</div>}
              {lines.length >= TYPE_LINES.length && (
                <span className="animate-caret inline-block h-[13px] w-[7px] translate-y-[2px] bg-[#4aa3fd]" />
              )}
            </div>
          </Link>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 font-code text-[11px] text-white/35">
            <span>无需绑卡</span>
            <span className="h-3 w-px bg-white/15" />
            <span>注册即赠体验额度</span>
            <span className="h-3 w-px bg-white/15" />
            <Link href="/login" className="transition-colors hover:text-white/80">
              已有账号? 直接登录 →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
