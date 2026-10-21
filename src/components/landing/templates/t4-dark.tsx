'use client'

/**
 * 模板 4 「暗夜版」— 参照 Vercel / Groq 官网 (高密度暗色)
 * 深蓝夜空底 + 细网格 + 完整请求示例终端(多页签) + 模型价格表 + 暗色特性网格
 */
import Link from 'next/link'
import { ArrowRight, BarChart3, Check, Coins, KeyRound, Zap } from '@/components/ph'
import { Reveal, CopyButton } from '../kit'
import { fmtNum } from '../sections'
import { SiteFooter, type TemplateProps } from './shared'

/* 模型价格表: 真实产品感 */
const PRICES = [
  { m: 'gpt-5', org: 'OpenAI', in: '$1.25', out: '$10.00', speed: '快', hot: true },
  { m: 'claude-sonnet-4-5', org: 'Anthropic', in: '$3.00', out: '$15.00', speed: '快', hot: true },
  { m: 'gemini-3-pro', org: 'Google', in: '$1.25', out: '$10.00', speed: '快', hot: false },
  { m: 'deepseek-v3.2', org: 'DeepSeek', in: '¥2.00', out: '¥8.00', speed: '极快', hot: true },
  { m: 'kimi-k2', org: 'Moonshot', in: '¥4.00', out: '¥16.00', speed: '快', hot: false },
]

const FEATURES = [
  { icon: Zap, t: '智能路由', d: '多渠道加权调度与故障自愈，上游抖动业务无感。', hl: true },
  { icon: KeyRound, t: '令牌分发', d: '额度、限速与模型白名单，细粒度管控每一次调用。', hl: false },
  { icon: Coins, t: '精确计费', d: '按 Token 计价，账单精确到每一次调用与每个渠道。', hl: false },
  { icon: BarChart3, t: '用量观测', d: '请求、费用多维透视，支持导出与审计，一目了然。', hl: false },
]

/* 终端代码行 */
function ReqTab() {
  return (
    <div className="space-y-1.5 px-5 py-4 font-code text-[12px] leading-[1.75]">
      <div className="text-zinc-500"># 除 model 外，其余字段与 OpenAI 完全一致</div>
      <div>
        <span className="text-[#5aa2ff]">$</span> <span className="text-zinc-100">curl https://api.example.com/v1/chat/completions \</span>
      </div>
      <div className="pl-3 text-zinc-300">
        -H <span className="text-emerald-400">&quot;Authorization: Bearer sk-prod-7f2.9d&quot;</span> \
      </div>
      <div className="pl-3 text-zinc-300">
        -d <span className="text-zinc-100">&apos;{"{"}</span> <span className="text-[#5aa2ff]">&quot;model&quot;</span>: <span className="text-emerald-400">&quot;claude-sonnet-4-5&quot;</span>, <span className="text-[#5aa2ff]">&quot;messages&quot;</span>: [...] <span className="text-zinc-100">{"}"}</span>&apos;
      </div>
      <div className="pt-2 text-zinc-500"># 响应 · 412ms · 226 tokens · $0.0042</div>
      <div className="text-zinc-300">{"{"}</div>
      <div className="pl-3">
        <span className="text-[#5aa2ff]">&quot;id&quot;</span>: <span className="text-emerald-400">&quot;chatcmpl-9x2k4&quot;</span>,
      </div>
      <div className="pl-3">
        <span className="text-[#5aa2ff]">&quot;usage&quot;</span>: {"{ "} <span className="text-[#5aa2ff]">&quot;total_tokens&quot;</span>: <span className="text-amber-300">226</span> {"}"}
      </div>
      <div className="text-zinc-300">{"}"}</div>
    </div>
  )
}

export default function T4Dark({ siteName, stats }: TemplateProps) {
  const models = stats.models || 41
  return (
    <div className="biz-night min-h-screen text-zinc-100 antialiased">
      {/* 导航 */}
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                <circle cx="3.6" cy="12.4" r="1.5" fill="#09090b" />
                <path d="M3.6 10.9V8.2C3.6 6.4 5 5.4 6.8 5.4h4.1M8.9 3.5l2 1.9-2 1.9" stroke="#09090b" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[15.5px] font-semibold tracking-tight text-white">{siteName}</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {['产品', '模型', '定价', '文档'].map((l) => (
              <a key={l} href="#pricing" className="text-[13.5px] text-zinc-400 transition-colors duration-200 hover:text-white">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-[13.5px] text-zinc-400 transition-colors hover:text-white sm:block">
              登录
            </Link>
            <Link
              href="/console"
              className="sb-press inline-flex h-9 items-center rounded-lg bg-white px-4.5 text-[13px] font-medium text-zinc-950 transition-colors duration-200 hover:bg-zinc-200"
            >
              进入控制台
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: 网格底 + 居中大标题 + 终端 */}
      <section className="relative overflow-hidden">
        <div className="night-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 md:pt-20">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/5 px-3.5 py-1 text-[11.5px] text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5aa2ff]" />
                OPEN SOURCE · v2.18 已发布
              </div>
              <h1 className="mt-7 text-[40px] font-bold leading-[1.24] tracking-[-0.015em] text-white sm:text-[56px]">
                大模型基础设施，
                <span className="block text-[#5aa2ff]">开箱即用。</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.9] text-zinc-400">
                统一接入 GPT、Claude、Gemini 与全部主流模型。一个 Docker 镜像，把网关、计费、观测全部跑在你自己的服务器上。
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                <Link
                  href="/register"
                  className="sb-press inline-flex h-11 items-center gap-2 rounded-lg bg-white px-7 text-[14px] font-medium text-zinc-950 transition-colors duration-200 hover:bg-zinc-200"
                >
                  开始使用
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/console#/about"
                  className="inline-flex h-11 items-center rounded-lg border border-white/15 px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-white/5"
                >
                  阅读文档
                </Link>
              </div>
            </div>
          </Reveal>

          {/* 终端窗口 */}
          <Reveal delay={140}>
            <div className="mx-auto mt-13 max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1c]/90 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
                <span className="ml-2 text-[11px] text-zinc-500">请求示例 — OpenAI 兼容</span>
                <span className="ml-auto flex items-center gap-1.5 font-code text-[10.5px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 200 OK · 412ms
                </span>
              </div>
              <ReqTab />
              {/* 统计行 */}
              <div className="grid grid-cols-2 border-t border-white/8 font-code text-[11px] sm:grid-cols-4">
                {[
                  { n: `${models}+`, l: 'MODELS' },
                  { n: '99.99%', l: 'UPTIME' },
                  { n: '<45ms', l: '网关延迟' },
                  { n: '0', l: '厂商锁定' },
                ].map((s, i) => (
                  <div key={s.l} className={`px-5 py-3.5 ${i > 0 ? 'border-l border-white/8' : ''} ${i > 1 ? 'max-sm:border-t max-sm:border-white/8' : ''}`}>
                    <div className="text-[15px] font-semibold text-white">{s.n}</div>
                    <div className="mt-0.5 text-[10px] tracking-widest text-zinc-500">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 特性网格: 首卡蓝色高亮 */}
      <section className="border-t border-white/8 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={i * 70}>
                <div
                  className={`h-full rounded-2xl border p-6 ${
                    f.hl
                      ? 'border-[#2563eb]/50 bg-gradient-to-b from-[#1d4ed8]/25 to-[#1d4ed8]/8'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.hl ? 'bg-[#2563eb] text-white' : 'bg-white/8 text-zinc-200'}`}>
                    <f.icon size={18} />
                  </span>
                  <div className="mt-5 text-[16px] font-semibold text-white">{f.t}</div>
                  <p className="mt-2 text-[12.5px] leading-[1.85] text-zinc-400">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 模型价格表 */}
      <section id="pricing" className="scroll-mt-16 border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[28px] font-bold tracking-[-0.015em] text-white md:text-[34px]">模型价格，透明到底</h2>
                <p className="mt-3 max-w-lg text-[14px] leading-[1.9] text-zinc-400">
                  与厂商官方价对齐，按 Token 计费，无加价、无最低消费。单位：每百万 Tokens。
                </p>
              </div>
              <a href="/console#/pricing" className="inline-flex items-center gap-1.5 text-[13px] text-[#5aa2ff] hover:underline">
                查看全部 {models}+ 个模型的价格 <ArrowRight size={13} />
              </a>
            </div>
          </Reveal>
          <Reveal delay={110}>
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.04] font-code text-[11px] tracking-wider text-zinc-500">
                    <th className="px-5 py-3.5 font-normal">MODEL</th>
                    <th className="px-5 py-3.5 font-normal">厂商</th>
                    <th className="px-5 py-3.5 text-right font-normal">输入 / 1M</th>
                    <th className="px-5 py-3.5 text-right font-normal">输出 / 1M</th>
                    <th className="hidden px-5 py-3.5 text-right font-normal sm:table-cell">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICES.map((p, i) => (
                    <tr key={p.m} className={`transition-colors duration-150 hover:bg-white/[0.04] ${i > 0 ? 'border-t border-white/6' : ''}`}>
                      <td className="px-5 py-4">
                        <span className="font-code text-zinc-100">{p.m}</span>
                        {p.hot && <span className="ml-2 rounded bg-[#2563eb]/25 px-1.5 py-0.5 font-code text-[10px] text-[#5aa2ff]">HOT</span>}
                      </td>
                      <td className="px-5 py-4 text-zinc-400">{p.org}</td>
                      <td className="px-5 py-4 text-right font-code tabular-nums text-zinc-200">{p.in}</td>
                      <td className="px-5 py-4 text-right font-code tabular-nums text-zinc-200">{p.out}</td>
                      <td className="hidden px-5 py-4 text-right sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {p.speed}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 部署命令条 */}
      <section className="border-t border-white/8 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:flex-row md:items-center md:p-7">
              <div>
                <div className="text-[17px] font-semibold text-white">一键私有化部署</div>
                <div className="mt-1 text-[13px] text-zinc-400">内置 SQLite 开箱即用，支持 MySQL / Redis 生产配置。</div>
              </div>
              <div className="flex w-full max-w-xl items-center gap-3 rounded-xl border border-white/10 bg-[#0a0f1c] py-3 pl-4 pr-2.5">
                <span className="shrink-0 select-none font-code text-[12px] text-emerald-400">$</span>
                <code className="min-w-0 flex-1 truncate font-code text-[12px] text-zinc-200">docker run -d -p 3000:3000 beichen-gateway:latest</code>
                <CopyButton text="docker run -d -p 3000:3000 beichen-gateway:latest" light />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-18 text-center md:py-22">
          <Reveal>
            <h2 className="text-[30px] font-bold tracking-[-0.015em] text-white md:text-[38px]">把网关跑在你自己的服务器上。</h2>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.9] text-zinc-400">AGPL-3.0 开源，无订阅费，无厂商锁定；注册即送体验额度。</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/register"
                className="sb-press inline-flex h-11 items-center gap-2 rounded-lg bg-white px-7 text-[14px] font-medium text-zinc-950 transition-colors duration-200 hover:bg-zinc-200"
              >
                免费开始
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/console#/about"
                className="inline-flex h-11 items-center rounded-lg border border-white/15 px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-white/5"
              >
                部署指南
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-code text-[11px] text-zinc-500">
              {['无需信用卡', 'Docker 一键部署', 'AGPL-3.0'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-400" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter siteName={siteName} dark />
    </div>
  )
}
