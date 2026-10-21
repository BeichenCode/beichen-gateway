'use client'

/**
 * 模板 12 「夜航版」— 智谱家族·原创暗色发布会式 (z.ai 气质, 非仿刻)
 * biz-night 深蓝夜空 + 白色大标题一句蓝点亮 + 亮色控制台窗(暗底纵深) + 暗色模型货架 + 品牌渐变 CTA
 */
import Link from 'next/link'
import { ArrowRight, Check, Copy, Coins, Cable, BarChart3, Terminal, Zap } from '@/components/ph'
import { Reveal } from '../kit'
import { ConsoleShot, fmtNum } from '../sections'
import { SiteFooter, type TemplateProps } from './shared'

const SHELF = [
  { model: 'gpt-5', vendor: 'OpenAI', tag: '旗舰推理', in: '¥14.00', out: '¥56.00' },
  { model: 'claude-sonnet-4-5', vendor: 'Anthropic', tag: '编码首选', in: '¥21.00', out: '¥105.00' },
  { model: 'gemini-3-pro', vendor: 'Google', tag: '长上下文', in: '¥10.00', out: '¥40.00' },
  { model: 'deepseek-v3.2', vendor: 'DeepSeek', tag: '高性价比', in: '¥2.00', out: '¥8.00' },
  { model: 'qwen3-max', vendor: '阿里云', tag: '中文增强', in: '¥6.00', out: '¥24.00' },
  { model: 'glm-4.7', vendor: '智谱', tag: 'Agent', in: '¥4.00', out: '¥14.00' },
]

const FEATURES = [
  { icon: Cable, t: '智能路由', d: '优先级与加权随机调度，故障秒级摘除、自动恢复，成功率 99.99%。' },
  { icon: Coins, t: '令牌计费', d: '令牌级额度、限速与模型白名单，按 Token 精确到每一次调用的账单。' },
  { icon: BarChart3, t: '用量看板', d: '请求量、Token 与费用多维透视，按模型与令牌拆解，明细一键导出。' },
  { icon: Zap, t: '流式透传', d: 'SSE 全链路透传不缓冲，首字延迟与直连上游一致，工具调用全兼容。' },
  { icon: Terminal, t: '协议兼容', d: 'OpenAI 协议全量兼容，Claude 原生 /v1/messages 双向适配，SDK 零改造。' },
  { icon: Check, t: '私有部署', d: 'Docker 一键部署，数据与日志全部留在你的服务器，合规无顾虑。' },
]

export default function T12Night({ siteName, stats }: TemplateProps) {
  const models = stats.models || 41
  return (
    <div className="biz-night min-h-screen text-zinc-100 antialiased">
      {/* 导航 */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                <circle cx="3.6" cy="12.4" r="1.5" fill="#070b14" />
                <path d="M3.6 10.9V8.2C3.6 6.4 5 5.4 6.8 5.4h4.1M8.9 3.5l2 1.9-2 1.9" stroke="#070b14" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[15.5px] font-semibold tracking-tight text-white">{siteName}</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {['模型', '能力', '价格', '文档'].map((l) => (
              <a key={l} href="#shelf" className="text-[13.5px] text-zinc-400 transition-colors duration-200 hover:text-white">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-[13.5px] text-zinc-400 transition-colors hover:text-white sm:block">
              登录
            </Link>
            <Link
              href="/register"
              className="sb-press brand-grad inline-flex h-9 items-center rounded-lg px-4.5 text-[13px] font-medium text-white"
            >
              免费注册
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: 夜空 + 白大标题一句蓝点亮 + 亮色控制台窗 */}
      <section className="relative overflow-hidden pb-16 pt-[68px]">
        <div className="night-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pt-14 text-center md:pt-20">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] font-medium tracking-wide text-zinc-300">
              <Zap size={12} className="text-[#5b8cff]" />
              OpenAI 协议兼容 · 开源自部署
            </span>
            <h1 className="mx-auto mt-7 max-w-3xl text-[33px] font-bold leading-[1.2] tracking-[-0.02em] text-white sm:text-[58px]">
              深夜上线的大模型业务
              <br />
              <span className="text-[#5b8cff]">也需要一个稳定的网关</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[14.5px] leading-[1.95] text-zinc-400">
              统一协议接入 {models}+ 个模型：渠道路由、令牌计费、用量看板一站配齐，故障自动切换，业务不会在半夜被叫醒。
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link href="/register" className="sb-press brand-grad inline-flex h-11 items-center gap-2 rounded-lg px-7 text-[14px] font-semibold text-white">
                免费开始
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/console#/about"
                className="inline-flex h-11 items-center rounded-lg border border-white/20 px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-white/10"
              >
                查看文档
              </Link>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="mt-14 overflow-hidden rounded-2xl border border-white/15 bg-white shadow-[0_50px_120px_-40px_rgba(2,8,40,0.9)]">
              <ConsoleShot />
            </div>
          </Reveal>
          {/* 三个 stat pill */}
          <Reveal delay={200}>
            <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-3">
              {[
                { n: stats.requests ? fmtNum(stats.requests) : '40 亿+', l: '累计请求' },
                { n: stats.tokens ? fmtNum(stats.tokens) : '4.2 万亿', l: '累计 Tokens' },
                { n: '99.99%', l: '可用性 SLA' },
              ].map((s) => (
                <span key={s.l} className="inline-flex items-baseline gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-2 text-[12.5px] text-zinc-400">
                  <span className="text-[15px] font-bold tabular-nums text-white">{s.n}</span>
                  {s.l}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 模型货架: 暗色网格 */}
      <section id="shelf" className="relative scroll-mt-16 border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[28px] font-bold tracking-[-0.015em] text-white md:text-[34px]">模型货架，明码标价</h2>
                <p className="mt-3 text-[14px] leading-[1.9] text-zinc-400">单位：元 / 百万 Tokens，按分组倍率实时结算。</p>
              </div>
              <Link href="/console#/pricing" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-white transition-colors hover:text-[#5b8cff]">
                完整价格表
                <ArrowRight size={14} />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SHELF.map((m, i) => (
              <Reveal key={m.model} delay={i * 60}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all duration-200 hover:border-[#5b8cff]/45 hover:bg-white/[0.07]">
                  <div className="flex items-center justify-between">
                    <span className="font-code text-[13px] font-semibold text-white">{m.model}</span>
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      可用
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11.5px] text-zinc-500">
                    {m.vendor}
                    <span className="rounded bg-white/8 px-1.5 py-px text-[10px] text-zinc-400">{m.tag}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-3.5 font-code text-[11.5px]">
                    <div>
                      <span className="text-zinc-500">输入</span>
                      <div className="mt-0.5 tabular-nums text-zinc-200">{m.in}</div>
                    </div>
                    <div>
                      <span className="text-zinc-500">输出</span>
                      <div className="mt-0.5 tabular-nums text-zinc-200">{m.out}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 特性 3×2 */}
      <section className="relative border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="text-[28px] font-bold tracking-[-0.015em] text-white md:text-[34px]">生产级能力，开箱即用</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={i * 60}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.06]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#8fb0ff]">
                    <f.icon size={17} />
                  </span>
                  <div className="mt-4 text-[15.5px] font-semibold text-white">{f.t}</div>
                  <p className="mt-2 text-[12.5px] leading-[1.85] text-zinc-400">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 部署命令条 */}
      <section className="relative border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-9 text-center">
              <div>
                <div className="text-[20px] font-bold text-white">一条命令，完成部署</div>
                <div className="mt-2 text-[13px] text-zinc-400">Docker 拉起即用，SQLite 零依赖，也支持 MySQL / PostgreSQL。</div>
              </div>
              <div className="flex w-full items-center gap-3 rounded-xl border border-white/12 bg-zinc-950/80 px-4 py-3">
                <span className="select-none font-code text-[12px] text-emerald-400">$</span>
                <code className="min-w-0 flex-1 truncate text-left font-code text-[12px] text-zinc-300">docker run -d -p 3000:3000 -v ./data:/data beichen-gateway:latest</code>
                <button aria-label="复制部署命令" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/10 hover:text-white">
                  <Copy size={13} />
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-zinc-500">
                {['AGPL-3.0 开源', 'SQLite 零依赖', '无订阅费'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 渐变 CTA */}
      <section className="relative px-6 pb-20">
        <Reveal>
          <div className="hero-card-grad relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-14 text-center text-white md:py-16">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10" />
            <div className="relative">
              <h2 className="text-[26px] font-bold tracking-[-0.01em] md:text-[32px]">今晚就接入，明早稳定运行</h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.9] text-white/85">注册即送体验额度，全部数据留在你自己的服务器里。</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                <Link href="/register" className="sb-press inline-flex h-11 items-center gap-2 rounded-lg bg-white px-7 text-[14px] font-semibold text-zinc-950 shadow-lg transition-colors duration-200 hover:bg-white/95">
                  免费开始
                  <ArrowRight size={15} />
                </Link>
                <Link href="/console#/about" className="inline-flex h-11 items-center rounded-lg border border-white/50 px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-white/10">
                  查看接入文档
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter siteName={siteName} dark />
    </div>
  )
}
