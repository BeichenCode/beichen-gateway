'use client'

/**
 * 模板 8 「荧光版」— 参照 Langfuse 官网
 * 灰底白盒首屏 + 内联粗体统计行 + 单词级精细下划高亮 (替代整块马克笔) + kbd 键帽 + 双行 logo 墙
 */
import Link from 'next/link'
import { ArrowRight, BarChart3, Cable, Coins, KeyRound } from '@/components/ph'
import { Reveal } from '../kit'
import { ConsoleShot, fmtNum } from '../sections'
import { SiteFooter, type TemplateProps } from './shared'

/* 单词级黄色下划高亮: 只染文字下半, 精细不廉价 */
function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-[linear-gradient(transparent_58%,rgba(250,204,21,0.6)_58%,rgba(250,204,21,0.6)_92%,transparent_92%)] px-0.5 box-decoration-clone">
      {children}
    </span>
  )
}

/* kbd 键帽 (Langfuse 按钮快捷键签名) */
function Kbd({ k }: { k: string }) {
  return (
    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/25 bg-white/15 px-1 font-code text-[10.5px] leading-none text-white/90">
      {k}
    </span>
  )
}

const FEATURES = [
  { icon: Cable, k: '01', t: '统一接入', d: 'OpenAI 协议一次接入全部厂商，换模型只改一个字段；支持流式、函数调用与多模态。' },
  { icon: KeyRound, k: '02', t: '令牌与额度', d: '为每个用户签发独立令牌，设置额度、限速与模型白名单，超限自动降级。' },
  { icon: Coins, k: '03', t: '成本可算', d: '按模型、渠道、令牌三个维度拆解成本，账单精确到每一次调用，告别糊涂账。' },
  { icon: BarChart3, k: '04', t: '观测回放', d: '每次调用的请求与响应完整留存，支持一键回放与差异对比，调试不再靠猜。' },
]

export default function T8Marker({ siteName, stats }: TemplateProps) {
  const models = stats.models || 41
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 antialiased">
      {/* 导航 */}
      <header className="border-b border-zinc-200/70 bg-zinc-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                <circle cx="3.6" cy="12.4" r="1.5" fill="#fff" />
                <path d="M3.6 10.9V8.2C3.6 6.4 5 5.4 6.8 5.4h4.1M8.9 3.5l2 1.9-2 1.9" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[15.5px] font-semibold tracking-tight text-zinc-950">{siteName}</span>
            <span className="hidden text-[12px] text-zinc-400 sm:inline">开源自托管</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {['产品', '资源', '客户', '定价', '文档'].map((l) => (
              <a key={l} href="#features" className="text-[13.5px] text-zinc-600 transition-colors duration-200 hover:text-zinc-950">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              href="/register"
              className="sb-press inline-flex h-9 items-center rounded-lg bg-zinc-950 pl-4 pr-2.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
            >
              免费开始
              <Kbd k="S" />
            </Link>
            <Link
              href="/console#/about"
              className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white pl-4 pr-2.5 text-[13px] font-medium text-zinc-800 transition-colors duration-200 hover:bg-zinc-50"
            >
              文档
              <Kbd k="D" />
            </Link>
          </div>
        </div>
      </header>

      {/* 首屏白盒 */}
      <section className="px-4 pb-6 pt-5 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-200/80 bg-white px-6 py-14 shadow-[0_1px_2px_rgba(9,9,11,0.04)] sm:px-12 md:py-18">
          {/* 内联粗体统计行 (Langfuse 签名) */}
          <Reveal>
            <p className="text-center text-[13px] leading-relaxed text-zinc-500">
              已被 <b className="font-semibold text-zinc-900">1,200+</b> 实例采用
              <span className="mx-2.5 text-zinc-300">·</span>每月处理 <b className="font-semibold text-zinc-900">40 亿+</b> 请求
              <span className="mx-2.5 text-zinc-300">·</span>
              <b className="font-semibold text-zinc-900">100,000+</b> 开发者在用
            </p>
          </Reveal>
          <div className="my-10 border-t border-zinc-100" />
          <Reveal delay={90}>
            <h1 className="mx-auto max-w-3xl text-center text-[36px] font-bold leading-[1.32] tracking-[-0.015em] text-zinc-950 sm:text-[52px]">
              开源的大模型网关
              <br />
              与<Hi>运营平台</Hi>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-center text-[14.5px] leading-[1.95] text-zinc-500">
              用生产数据理解你的每一次模型调用：统一接入、智能路由、令牌计费，一站式开源平台，以更低的成本交付更好的质量。
            </p>
          </Reveal>
          <Reveal delay={170}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/register"
                className="sb-press inline-flex h-11 items-center rounded-lg bg-zinc-950 pl-5 pr-3.5 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
              >
                免费开始
                <Kbd k="S" />
              </Link>
              <Link
                href="/console#/about"
                className="inline-flex h-11 items-center rounded-lg border border-zinc-200 bg-white pl-5 pr-3.5 text-[14px] font-medium text-zinc-800 transition-colors duration-200 hover:bg-zinc-50"
              >
                自托管部署
                <Kbd k="D" />
              </Link>
            </div>
          </Reveal>
          {/* 双行 logo 墙: 上行深色 / 下行灰色 (Langfuse 式) */}
          <Reveal delay={230}>
            <div className="mt-14 border-t border-zinc-100 pt-9">
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {['OpenAI', 'Anthropic', 'Gemini', 'DeepSeek', 'Qwen', 'Kimi', 'GLM', 'Grok'].map((b) => (
                  <span key={b} className="text-[16px] font-semibold tracking-tight text-zinc-800">
                    {b}
                  </span>
                ))}
              </div>
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
                {['Llama', 'Mistral', '豆包', '混元', '文心', 'Bedrock', 'Azure', 'SiliconFlow'].map((b) => (
                  <span key={b} className="text-[14px] font-medium tracking-tight text-zinc-400">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 产品大截图 */}
      <section className="px-4 pb-6 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_2px_6px_rgba(9,9,11,0.05),0_40px_90px_-44px_rgba(9,9,11,0.3)]">
            <ConsoleShot />
          </div>
        </Reveal>
      </section>

      {/* 特性 2×2 */}
      <section id="features" className="scroll-mt-16 px-4 pb-6 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-200/80 bg-white px-6 py-14 shadow-[0_1px_2px_rgba(9,9,11,0.04)] sm:px-12 md:py-16">
          <Reveal>
            <h2 className="text-[26px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[32px]">
              大模型应用的<Hi>完整运营闭环</Hi>
            </h2>
            <p className="mt-3 max-w-lg text-[14px] leading-[1.9] text-zinc-500">
              从协议归一到成本核算，网关层接管全部杂务，你的团队专注业务本身。
            </p>
          </Reveal>
          <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={i * 70}>
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700">
                    <f.icon size={17} />
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15.5px] font-semibold text-zinc-950">{f.t}</span>
                      <span className="font-code text-[10.5px] text-zinc-300">{f.k}</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.85] text-zinc-500">{f.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 数字带 */}
      <section className="px-4 pb-6 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-200/80 shadow-[0_1px_2px_rgba(9,9,11,0.04)] md:grid-cols-4">
          {[
            { n: `${models}+`, l: '已接入模型' },
            { n: stats.requests ? fmtNum(stats.requests) : '40 亿+', l: '累计处理请求' },
            { n: stats.tokens ? fmtNum(stats.tokens) : '4.2 万亿', l: '累计处理 Tokens' },
            { n: '99.99%', l: '服务可用性 SLA' },
          ].map((i) => (
            <div key={i.l} className="bg-white px-4 py-9 text-center">
              <div className="text-[28px] font-bold tracking-tight text-zinc-950 tabular-nums">{i.n}</div>
              <div className="mt-1.5 text-[12px] text-zinc-500">{i.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA 白盒 */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-200/80 bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(9,9,11,0.04)] sm:px-12">
          <Reveal>
            <h2 className="text-[26px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[32px]">
              现在，<Hi>三分钟</Hi>接入第一个模型
            </h2>
            <p className="mx-auto mt-3.5 max-w-md text-[14px] leading-[1.9] text-zinc-500">
              开源自托管，无订阅费；注册即送体验额度，数据全部留在你自己的服务器。
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/register"
                className="sb-press inline-flex h-11 items-center rounded-lg bg-zinc-950 pl-5 pr-3.5 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
              >
                免费开始
                <Kbd k="S" />
              </Link>
              <Link
                href="/console#/about"
                className="inline-flex h-11 items-center rounded-lg border border-zinc-200 bg-white pl-5 pr-3.5 text-[14px] font-medium text-zinc-800 transition-colors duration-200 hover:bg-zinc-50"
              >
                查看文档
                <Kbd k="D" />
              </Link>
            </div>
            <div className="mx-auto mt-7 inline-flex max-w-full items-center gap-3 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-code text-[12px] text-zinc-600">
              <span className="shrink-0 select-none text-zinc-400">$</span>
              <span className="shrink-0">docker run -d -p 3000:3000 beichen-gateway:latest</span>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter siteName={siteName} />
    </div>
  )
}
