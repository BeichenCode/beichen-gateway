'use client'

/**
 * 模板 10 「极客版」— 智谱家族·原创开发者优先式
 * 左文右终端首屏 + 接入三步流程 + 亮色模型价格表 + SDK 语言卡行
 */
import Link from 'next/link'
import { ArrowRight, Check, Coins, KeyRound, RocketLaunch, ScrollText, Zap } from '@/components/ph'
import { Reveal } from '../kit'
import { fmtNum } from '../sections'
import { SiteFooter, type TemplateProps } from './shared'

const PRICE_ROWS = [
  { model: 'gpt-5', vendor: 'OpenAI', hot: true, in: '¥14.00', out: '¥56.00' },
  { model: 'claude-sonnet-4-5', vendor: 'Anthropic', hot: true, in: '¥21.00', out: '¥105.00' },
  { model: 'gemini-3-pro', vendor: 'Google', hot: false, in: '¥10.00', out: '¥40.00' },
  { model: 'deepseek-v3.2', vendor: 'DeepSeek', hot: false, in: '¥2.00', out: '¥8.00' },
  { model: 'qwen3-max', vendor: '阿里云', hot: false, in: '¥6.00', out: '¥24.00' },
  { model: 'glm-4.7', vendor: '智谱', hot: false, in: '¥4.00', out: '¥14.00' },
]

const STEPS = [
  { n: '01', t: '创建令牌', cmd: '控制台 → 令牌管理', d: '设定额度、限速与可用模型范围，秒级签发。' },
  { n: '02', t: '替换 base_url', cmd: 'https://your-gateway.com/v1', d: '代码零改造，OpenAI SDK 原地切换，密钥换成网关令牌。' },
  { n: '03', t: '调用任意模型', cmd: 'model: "gpt-5" | "deepseek-v3.2" | …', d: '按模型名路由到最优渠道，失败自动重试与切换。' },
]

const ABILITIES = [
  { icon: Zap, t: '智能路由', d: '优先级与加权随机负载均衡，渠道故障自动禁用、自动恢复，业务侧零感知。' },
  { icon: Coins, t: '精确计费', d: '按分组倍率实时结算，账单精确到每一次调用，明细可导出审计。' },
  { icon: KeyRound, t: '令牌治理', d: '令牌级额度、过期时间、IP 白名单与模型范围，给团队和客户各自发钥匙。' },
  { icon: ScrollText, t: '日志审计', d: '每次请求的模型、耗时、Token 与费用全量落库，实时日志即查即得。' },
]

const SDKS = ['curl', 'Python', 'Node.js', 'Go', 'Java', 'PHP']

export default function T10Geek({ siteName, stats }: TemplateProps) {
  const models = stats.models || 41
  return (
    <div className="min-h-screen bg-white text-zinc-950 antialiased">
      {/* 导航 */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-6 px-6">
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
            {['快速开始', '模型', '价格', '文档'].map((l) => (
              <a key={l} href="#quickstart" className="text-[13.5px] text-zinc-600 transition-colors duration-200 hover:text-zinc-950">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-[13.5px] text-zinc-600 transition-colors hover:text-zinc-950 sm:block">
              登录
            </Link>
            <Link
              href="/register"
              className="sb-press inline-flex h-9 items-center rounded-lg bg-zinc-950 px-4.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
            >
              进入控制台
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: 左文右终端 */}
      <section className="biz-atmo relative overflow-hidden">
        <div className="biz-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-[130px] lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-[150px]">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white px-3 py-1 text-[11.5px] font-medium text-zinc-600 shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
              <RocketLaunch size={12} className="text-[#2563eb]" />
              OpenAI 协议全量兼容
            </span>
            <h1 className="mt-6 text-[38px] font-bold leading-[1.18] tracking-[-0.02em] text-zinc-950 sm:text-[56px]">
              换一个 base_url
              <br />
              <span className="text-[#2563eb]">调用所有大模型</span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-[1.95] text-zinc-500">
              统一协议接入 {models}+ 个模型：改一行代码就能在 GPT、Claude、Gemini 与国产模型之间自由切换，渠道路由与计费全部交给网关。
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link href="/register" className="sb-press brand-grad inline-flex h-11 items-center gap-2 rounded-lg px-7 text-[14px] font-semibold text-white">
                免费开始
                <ArrowRight size={15} />
              </Link>
              <Link href="#quickstart" className="sb-press inline-flex h-11 items-center rounded-lg border border-zinc-300 bg-white px-7 text-[14px] font-medium text-zinc-950 transition-colors duration-200 hover:border-zinc-400">
                查看快速开始
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-zinc-500">
              {['流式输出', '工具调用', '视觉理解', 'JSON Mode'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check size={13} className="text-[#2563eb]" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={130}>
            <div className="overflow-hidden rounded-2xl bg-zinc-950 shadow-[0_40px_90px_-36px_rgba(9,9,11,0.55)]">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-code text-[11px] text-zinc-500">terminal — bash</span>
              </div>
              <pre className="overflow-x-auto p-5 font-code text-[12px] leading-[1.95]">
                <code>
                  <span className="text-zinc-500"># 原来调用 OpenAI 的代码, 只改两处</span>
                  {'\n'}<span className="text-zinc-400">curl</span> <span className="text-sky-300">https://your-gateway.com/v1/chat/completions</span> <span className="text-zinc-400">\</span>
                  {'\n'}  <span className="text-zinc-300">-H</span> <span className="text-emerald-300">&quot;Authorization: Bearer sk-网关令牌&quot;</span> <span className="text-zinc-400">\</span>
                  {'\n'}  <span className="text-zinc-300">-d</span> <span className="text-zinc-500">&apos;</span><span className="text-emerald-300">&#123; &quot;model&quot;: &quot;claude-sonnet-4-5&quot;,</span>
                  {'\n'}         <span className="text-emerald-300">&quot;messages&quot;: [&#123;&quot;role&quot;:&quot;user&quot;,&quot;content&quot;:&quot;写一个快排&quot;&#125;] &#125;</span><span className="text-zinc-500">&apos;</span>
                  {'\n\n'}<span className="text-zinc-500"># ← 同一段代码, 把 model 换成 &quot;deepseek-v3.2&quot; 即切换供应商</span>
                  {'\n'}<span className="text-zinc-300">&#123;</span> <span className="text-sky-300">&quot;id&quot;</span><span className="text-zinc-400">:</span> <span className="text-emerald-300">&quot;chatcmpl-a81x&quot;</span><span className="text-zinc-400">,</span> <span className="text-sky-300">&quot;model&quot;</span><span className="text-zinc-400">:</span> <span className="text-emerald-300">&quot;claude-sonnet-4-5&quot;</span><span className="text-zinc-400">,</span>
                  {'\n'}  <span className="text-sky-300">&quot;choices&quot;</span><span className="text-zinc-400">:</span> <span className="text-zinc-300">[…]</span><span className="text-zinc-400">,</span> <span className="text-sky-300">&quot;usage&quot;</span><span className="text-zinc-400">:</span> <span className="text-zinc-300">&#123;</span> <span className="text-sky-300">&quot;total_tokens&quot;</span><span className="text-zinc-400">:</span> <span className="text-amber-300">412</span> <span className="text-zinc-300">&#125;</span> <span className="text-zinc-300">&#125;</span>
                </code>
              </pre>
              <div className="grid grid-cols-3 border-t border-white/10 font-code text-[11px]">
                {[
                  { k: '状态', v: '200 OK', c: 'text-emerald-400' },
                  { k: '延迟', v: '312 ms', c: 'text-sky-300' },
                  { k: '计费', v: '¥0.041', c: 'text-amber-300' },
                ].map((s) => (
                  <div key={s.k} className="border-r border-white/10 px-4 py-3 last:border-r-0">
                    <div className="text-zinc-500">{s.k}</div>
                    <div className={`mt-0.5 ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 接入三步 */}
      <section id="quickstart" className="scroll-mt-16 border-y border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="text-[28px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[34px]">三步接入，代码零改造</h2>
            <p className="mt-3 max-w-lg text-[14px] leading-[1.9] text-zinc-500">所有 OpenAI 官方 SDK 与框架（LangChain、LlamaIndex、Dify…）无需适配直接可用。</p>
          </Reveal>
          <div className="relative mt-12 grid gap-5 md:grid-cols-3">
            <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-[52px] hidden border-t border-dashed border-zinc-200 md:block" />
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="relative h-full rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
                  <div className="flex items-center gap-3">
                    <span className="font-code text-[13px] font-semibold text-[#2563eb]">{s.n}</span>
                    <span className="text-[17px] font-bold text-zinc-950">{s.t}</span>
                  </div>
                  <code className="mt-4 block truncate rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-code text-[11.5px] text-zinc-600">{s.cmd}</code>
                  <p className="mt-4 text-[13px] leading-[1.85] text-zinc-500">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 模型价格表 */}
      <section className="biz-atmo relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[28px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[34px]">透明定价，按量计费</h2>
                <p className="mt-3 text-[14px] leading-[1.9] text-zinc-500">单位：元 / 百万 Tokens，与上游厂商同价，按分组倍率实时结算。</p>
              </div>
              <Link href="/console#/pricing" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-zinc-950 transition-colors hover:text-[#2563eb]">
                完整价格表
                <ArrowRight size={14} />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={110}>
            <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04),0_24px_60px_-30px_rgba(24,48,110,0.25)]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[12px] text-zinc-500">
                    <th className="px-6 py-3.5 font-medium">模型</th>
                    <th className="hidden px-6 py-3.5 font-medium sm:table-cell">厂商</th>
                    <th className="px-6 py-3.5 text-right font-medium">输入</th>
                    <th className="px-6 py-3.5 text-right font-medium">输出</th>
                    <th className="hidden px-6 py-3.5 text-right font-medium md:table-cell">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICE_ROWS.map((r) => (
                    <tr key={r.model} className="border-b border-zinc-50 text-[13.5px] transition-colors last:border-b-0 hover:bg-[#f6f9ff]">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 font-code text-[12.5px] text-zinc-950">
                          {r.model}
                          {r.hot && <span className="rounded bg-[#fff1e8] px-1.5 py-px text-[10px] font-semibold text-[#d9560b]">HOT</span>}
                        </span>
                      </td>
                      <td className="hidden px-6 py-4 text-zinc-500 sm:table-cell">{r.vendor}</td>
                      <td className="px-6 py-4 text-right font-code text-[12.5px] tabular-nums text-zinc-700">{r.in}</td>
                      <td className="px-6 py-4 text-right font-code text-[12.5px] tabular-nums text-zinc-700">{r.out}</td>
                      <td className="hidden px-6 py-4 text-right md:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          可用
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

      {/* 能力 2×2 */}
      <section className="border-y border-zinc-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-16 sm:grid-cols-2 md:py-20">
          {ABILITIES.map((a, i) => (
            <Reveal key={a.t} delay={i * 70}>
              <div className="group h-full rounded-2xl border border-zinc-200/80 bg-white p-7 transition-all duration-200 hover:border-[#2563eb]/35 hover:shadow-[0_18px_44px_-22px_rgba(37,99,235,0.35)]">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
                    <a.icon size={17} />
                  </span>
                  <span className="text-[17px] font-semibold text-zinc-950">{a.t}</span>
                </div>
                <p className="mt-4 text-[13.5px] leading-[1.9] text-zinc-500">{a.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SDK 语言卡行 */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-[28px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[34px]">熟悉的 SDK，直接用</h2>
              <p className="text-[13.5px] text-zinc-500">官方 SDK 换两个参数即可接入，框架生态全部兼容。</p>
            </div>
          </Reveal>
          <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SDKS.map((s, i) => (
              <Reveal key={s} delay={i * 50}>
                <div className="flex h-[86px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white transition-all duration-200 hover:border-[#2563eb]/40 hover:shadow-[0_14px_36px_-18px_rgba(37,99,235,0.4)]">
                  <span className="font-code text-[13.5px] font-semibold text-zinc-900">{s}</span>
                  <span className="text-[10.5px] text-zinc-400">兼容</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 深色 CTA */}
      <section className="px-6 pb-20">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-zinc-950 px-8 py-16 text-center text-white md:py-20">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2563eb]/25 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#0ea5e9]/15 blur-3xl" />
            <div className="relative">
              <h2 className="text-[26px] font-bold tracking-[-0.01em] md:text-[34px]">把密钥管理交给网关，把时间还给业务</h2>
              <p className="mx-auto mt-4 max-w-lg text-[14px] leading-[1.9] text-zinc-400">
                开源自部署，注册即送体验额度；累计已处理 {stats.requests ? fmtNum(stats.requests) : '40 亿+'} 次请求。
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
                <Link href="/register" className="sb-press brand-grad inline-flex h-11 items-center gap-2 rounded-lg px-7 text-[14px] font-semibold text-white">
                  免费创建令牌
                  <ArrowRight size={15} />
                </Link>
                <Link href="/console#/about" className="inline-flex h-11 items-center rounded-lg border border-white/25 px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-white/10">
                  阅读文档
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter siteName={siteName} />
    </div>
  )
}
