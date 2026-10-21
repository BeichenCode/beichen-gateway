'use client'

/**
 * 模板 7 「瓷砖版」— 参照 Helicone 官网
 * 蓝色公告条 + 左文右"模型市场"整齐网格 (替代漂浮便签) + 首屏即产品大截图
 */
import Link from 'next/link'
import { ArrowRight, Check, CircleCheck, Search } from '@/components/ph'
import { Reveal } from '../kit'
import { ConsoleShot, fmtNum } from '../sections'
import { SiteFooter, type TemplateProps } from './shared'

/* 模型市场网格: 品牌色点 + 模型名 + 厂商, 整齐 2×4 */
const MARKET = [
  { m: 'GPT-5', p: 'OpenAI', c: '#10a37f' },
  { m: 'Claude Sonnet 4.5', p: 'Anthropic', c: '#d97757' },
  { m: 'Gemini 3 Pro', p: 'Google', c: '#4285f4' },
  { m: 'DeepSeek V3.2', p: 'DeepSeek', c: '#2563eb' },
  { m: 'Qwen3 Max', p: 'Alibaba', c: '#7c3aed' },
  { m: 'Kimi K2', p: 'Moonshot', c: '#0ea5e9' },
  { m: 'GLM-4.7', p: 'Zhipu', c: '#3b82f6' },
  { m: 'Grok 4', p: 'xAI', c: '#171717' },
]

const FEATURES = [
  { t: '统一网关', d: 'OpenAI 协议一次接入全部厂商，换模型只改一个字段，业务代码零改造。' },
  { t: '智能路由', d: '基于权重与负载的多通道路由，故障自动切换与重试，成功率 99.99%。' },
  { t: '成本中枢', d: '令牌级额度与按量计费，按模型/渠道/令牌多维度拆解成本，账单精确到每一次调用。' },
  { t: '日志回放', d: '每次调用的请求与响应完整留存，支持一键回放与差异对比，调试不再靠猜。' },
]

export default function T7Tiles({ siteName, stats }: TemplateProps) {
  const models = stats.models || 41
  return (
    <div className="min-h-screen bg-white text-zinc-950 antialiased">
      {/* 蓝色公告条 */}
      <div className="bg-[#2563eb] px-4 py-2 text-center text-[12.5px] font-medium text-white">
        {siteName} 已支持 MCP 工具调用标准
        <a href="/console#/about" className="ml-2 inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-85">
          了解详情 <ArrowRight size={11} />
        </a>
      </div>

      {/* 导航 */}
      <header className="border-b border-zinc-100 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                <circle cx="3.6" cy="12.4" r="1.5" fill="#fff" />
                <path d="M3.6 10.9V8.2C3.6 6.4 5 5.4 6.8 5.4h4.1M8.9 3.5l2 1.9-2 1.9" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[15.5px] font-semibold tracking-tight text-zinc-950">{siteName}</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {['产品', '模型', '定价', '文档'].map((l) => (
              <a key={l} href="#features" className="text-[13.5px] text-zinc-600 transition-colors duration-200 hover:text-zinc-950">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-[13.5px] text-zinc-600 transition-colors hover:text-zinc-950 sm:block">
              登录
            </Link>
            <Link
              href="/console"
              className="sb-press inline-flex h-9 items-center rounded-lg bg-[#2563eb] px-4.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-[#1d4ed8]"
            >
              登录控制台
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: 左文右模型市场网格 */}
      <section className="border-b border-zinc-100 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-[1fr_1.05fr] md:py-20">
          <Reveal>
            <h1 className="text-[40px] font-bold leading-[1.24] tracking-[-0.015em] text-zinc-950 sm:text-[52px]">
              构建可靠的
              <span className="block text-[#2563eb]">AI 应用</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-[1.95] text-zinc-500">
              增长最快的团队都在用 {siteName} 统一路由、调试与分析他们的大模型调用——从第一个请求到十亿级规模。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="sb-press inline-flex h-11 items-center gap-2 rounded-lg bg-[#2563eb] px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-[#1d4ed8]"
              >
                免费试用
                <ArrowRight size={15} />
              </Link>
              <span className="flex items-center gap-1.5 text-[12.5px] text-zinc-500">
                <Check size={14} className="text-emerald-500" />
                无需信用卡 · 7 天全功能
              </span>
            </div>
          </Reveal>
          {/* 模型市场网格 (整齐 2×4, 带搜索框头) */}
          <Reveal delay={140}>
            <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_2px_4px_rgba(9,9,11,0.04),0_28px_70px_-32px_rgba(24,48,110,0.35)]">
              <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-3.5">
                <Search size={14} className="text-zinc-400" />
                <span className="text-[13px] text-zinc-400">搜索 {models}+ 个模型…</span>
                <span className="ml-auto rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">全部可用</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 p-3">
                {MARKET.map((x, i) => (
                  <div
                    key={x.m}
                    className={`group flex cursor-default items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-zinc-50 ${
                      i % 2 === 1 ? 'border-l border-zinc-50 pl-4' : ''
                    }`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[4px]" style={{ backgroundColor: x.c }} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium leading-tight text-zinc-900">{x.m}</span>
                      <span className="block font-code text-[10px] leading-tight text-zinc-400">{x.p}</span>
                    </span>
                    <CircleCheck size={14} className="ml-auto shrink-0 text-emerald-500 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-2.5 text-center text-[11.5px] text-zinc-500">
                另有 Llama / Mistral / 百川 等 <span className="font-semibold text-zinc-800">{models - MARKET.length}+ 个模型</span> 开箱即用
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 产品大截图 (首屏即见) */}
      <section className="bg-zinc-50/80">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_2px_6px_rgba(24,48,110,0.05),0_44px_100px_-44px_rgba(24,48,110,0.35)]">
              <ConsoleShot />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 特性 2×2 */}
      <section id="features" className="scroll-mt-16 border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="text-[28px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[34px]">生产级网关，开箱即用</h2>
            <p className="mt-3 max-w-lg text-[14px] leading-[1.9] text-zinc-500">
              把协议适配、路由容灾与成本核算交给网关，你的团队专注业务本身。
            </p>
          </Reveal>
          <div className="mt-11 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={i * 70}>
                <div className="border-t-2 border-zinc-950 pt-5">
                  <div className="text-[17px] font-semibold text-zinc-950">{f.t}</div>
                  <p className="mt-2.5 text-[13.5px] leading-[1.9] text-zinc-500">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 数字带 */}
      <section className="border-y border-zinc-100 bg-zinc-950">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-13 md:grid-cols-4">
          {[
            { n: `${models}+`, l: '已接入模型' },
            { n: stats.requests ? fmtNum(stats.requests) : '40 亿+', l: '累计处理请求' },
            { n: stats.tokens ? fmtNum(stats.tokens) : '4.2 万亿', l: '累计处理 Tokens' },
            { n: '99.99%', l: '服务可用性 SLA' },
          ].map((i) => (
            <Reveal key={i.l}>
              <div className="text-center">
                <div className="text-[30px] font-bold tracking-tight text-white tabular-nums">{i.n}</div>
                <div className="mt-1.5 text-[12.5px] text-zinc-400">{i.l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-18 text-center md:py-20">
          <Reveal>
            <h2 className="text-[28px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[34px]">准备好统一你的模型调用了吗？</h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.9] text-zinc-500">注册即送体验额度，一个 Docker 镜像完成私有化部署。</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="sb-press inline-flex h-11 items-center gap-2 rounded-lg bg-[#2563eb] px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-[#1d4ed8]"
              >
                免费开始
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/console#/about"
                className="inline-flex h-11 items-center rounded-lg border border-zinc-200 px-7 text-[14px] font-medium text-zinc-900 transition-colors duration-200 hover:bg-zinc-50"
              >
                阅读文档
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter siteName={siteName} />
    </div>
  )
}
