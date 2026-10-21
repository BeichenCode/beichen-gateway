'use client'

/**
 * 模板 9 「星图版」— 智谱家族·原创发布会式
 * 与 T3 同源不同骨: 渐变大横幅做首屏主体(文案进卡内) + 控制台白窗从卡底升起
 * + 模型家族 2 大卡 4 小卡 + 场景 Tab 下划线切换 + 快捷信息条
 */
import Link from 'next/link'
import { ArrowRight, Check, Cable, Coins, ShieldCheck, Zap } from '@/components/ph'
import { Reveal } from '../kit'
import { ConsoleShot, fmtNum } from '../sections'
import { SiteFooter, type TemplateProps } from './shared'

const QUICK = [
  { t: '模型定价', d: '按分组倍率实时结算' },
  { t: '快速开始', d: '三分钟发出第一个请求' },
  { t: '接入文档', d: 'OpenAI 协议全量兼容' },
  { t: '服务状态', d: '99.99% 可用性 SLA' },
]

const FAMILIES_BIG = [
  {
    grad: true,
    tag: '旗舰系列',
    name: '把最强的模型装进业务',
    models: ['GPT-5', 'Claude Sonnet 4.5', 'Gemini 3 Pro'],
    desc: '能力最强的旗舰系列全部接入，统一 OpenAI 协议直连，基准测试 Top 级表现，故障自动切换。',
  },
  {
    grad: false,
    tag: '高性价比',
    name: '把成本压到原来的零头',
    models: ['DeepSeek V3.2', 'Qwen3 Max', 'GLM-4.7'],
    desc: '国产高性价比系列按量计费，中文能力与推理速度兼顾，配合令牌额度精控每一次开销。',
  },
]

const FAMILIES_SMALL = [
  { tag: '编码特化', name: 'Claude / Codex 系', desc: '复杂软件工程与终端操作，SWE-bench 顶尖水准。' },
  { tag: '多模态', name: 'Gemini / GLM-4.6V', desc: '图像、视频与文档理解，视觉推理一步到位。' },
  { tag: '嵌入重排', name: 'Embedding / Rerank', desc: '检索增强首选，向量维度与批量吞吐自由配置。' },
  { tag: '轻量高速', name: 'Mini / Air / Flash', desc: '200 tokens/s 级响应，高并发场景成本再降一档。' },
]

const SCENES = [
  {
    tab: '智能客服',
    title: '一个令牌，轮换全部客服模型',
    desc: '客服高峰期把请求在旗舰与轻量模型间自动分层：常见问题走 Mini 系列降本，复杂投诉无缝升级旗舰模型。',
    points: ['按渠道权重自动分流', '失败秒级重试与切换', '每次对话留痕可审计'],
    code: 'POST /v1/chat/completions',
  },
  { tab: '编码助手', title: '为整个团队供应编码模型', desc: 'Claude 与 Codex 系列统一供应，按团队令牌分配额度与限速，不用再维护多家厂商的密钥。', points: ['团队令牌独立额度', '长上下文全量透传', '用量按成员透视'], code: 'POST /v1/chat/completions' },
  { tab: '知识库', title: '嵌入与重排一站配齐', desc: 'Embedding、Rerank 与对话模型走同一个入口，检索管线不用维护第二套 SDK 与计费体系。', points: ['向量化批量吞吐', '重排模型即开即用', '账单精确到每次调用'], code: 'POST /v1/embeddings' },
  { tab: '数据分析', title: '每一笔调用都算得清', desc: '请求量、Token 消耗与费用多维透视，按模型、令牌与分组拆解，明细随时导出审计。', points: ['实时用量看板', '分组倍率透明结算', '明细一键导出'], code: 'GET  /api/console/log' },
]

export default function T9Nova({ siteName, stats }: TemplateProps) {
  const models = stats.models || 41
  const active = SCENES[0]
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
            {['模型', '场景', '定价', '文档'].map((l) => (
              <a key={l} href="#families" className="text-[13.5px] text-zinc-600 transition-colors duration-200 hover:text-zinc-950">
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
              className="sb-press brand-grad inline-flex h-9 items-center rounded-lg px-4.5 text-[13px] font-medium text-white"
            >
              免费注册
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: 渐变大横幅做首屏主体, 控制台白窗从卡底升起 */}
      <section className="biz-atmo relative overflow-hidden pb-16 pt-[68px]">
        <div className="biz-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pt-8 md:pt-12">
          <Reveal>
            <div className="hero-card-grad relative overflow-hidden rounded-3xl px-6 pb-0 pt-12 text-center text-white md:px-14 md:pt-16">
              <div aria-hidden className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
              <div aria-hidden className="pointer-events-none absolute -right-16 bottom-40 h-64 w-64 rounded-full bg-zinc-950/20 blur-2xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11.5px] font-medium tracking-wide text-white/90">
                  <Zap size={12} />
                  开源自部署 · OpenAI 协议兼容
                </span>
                <h1 className="mx-auto mt-6 max-w-3xl text-[36px] font-bold leading-[1.2] tracking-[-0.015em] sm:text-[54px]">
                  调用所有大模型
                  <br />
                  只需要一个入口
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-[14.5px] leading-[1.9] text-white/85">
                  统一协议接入 {models}+ 个模型：智能路由、令牌计费、用量看板一站配齐，三分钟发出第一个请求。
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                  <Link
                    href="/register"
                    className="sb-press inline-flex h-11 items-center gap-2 rounded-lg bg-white px-7 text-[14px] font-semibold text-zinc-950 shadow-lg transition-colors duration-200 hover:bg-white/95"
                  >
                    免费开始
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/console#/about"
                    className="inline-flex h-11 items-center rounded-lg border border-white/50 px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-white/10"
                  >
                    查看接入文档
                  </Link>
                </div>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-white/75">
                  {['无需信用卡', 'Docker 一键部署', '数据留在自己服务器'].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <Check size={13} />
                      {t}
                    </span>
                  ))}
                </div>
                {/* 控制台白窗: 从横幅卡底升起, 有纵深 */}
                <div className="mt-12 overflow-hidden rounded-t-2xl border border-white/40 bg-white shadow-[0_40px_90px_-30px_rgba(6,25,80,0.6)]">
                  <ConsoleShot />
                </div>
              </div>
            </div>
          </Reveal>

          {/* 快捷信息条 */}
          <Reveal delay={110}>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {QUICK.map((q) => (
                <a
                  key={q.t}
                  href="#families"
                  className="group rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-3.5 backdrop-blur transition-all duration-200 hover:border-[#2563eb]/35 hover:shadow-[0_12px_32px_-16px_rgba(37,99,235,0.35)]"
                >
                  <div className="flex items-center justify-between text-[13.5px] font-semibold text-zinc-950">
                    {q.t}
                    <ArrowRight size={13} className="text-zinc-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#2563eb]" />
                  </div>
                  <div className="mt-1 text-[11.5px] text-zinc-500">{q.d}</div>
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 模型家族: 2 大卡 + 4 小卡 (智谱首页同构, 内容为网关上游模型) */}
      <section id="families" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="text-center text-[28px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[34px]">模型家族，覆盖全场景</h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[14px] leading-[1.9] text-zinc-500">从旗舰到轻量，从文本到多模态，一个令牌全部可用。</p>
          </Reveal>
          <div className="mt-11 grid gap-5 md:grid-cols-2">
            {FAMILIES_BIG.map((f, i) => (
              <Reveal key={f.tag} delay={i * 90}>
                <div
                  className={`sb-card-lift group flex h-full min-h-[280px] cursor-pointer flex-col rounded-2xl p-7 ${
                    f.grad
                      ? 'hero-card-grad text-white shadow-[0_20px_50px_-22px_rgba(37,99,235,0.55)]'
                      : 'border border-zinc-200/80 bg-gradient-to-b from-[#f6f9ff] to-white shadow-[0_1px_2px_rgba(9,9,11,0.04)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${f.grad ? 'bg-white/16 text-white/95' : 'bg-zinc-100 text-zinc-500'}`}>{f.tag}</span>
                    <ArrowRight size={16} className={f.grad ? 'text-white/70' : 'text-zinc-300'} />
                  </div>
                  <div className="mt-6 text-[24px] font-bold tracking-[-0.01em]">{f.name}</div>
                  <div className={`mt-4 flex flex-wrap gap-1.5 ${f.grad ? '' : 'text-zinc-700'}`}>
                    {f.models.map((m) => (
                      <span key={m} className={`rounded-md px-2 py-1 font-code text-[11px] ${f.grad ? 'bg-white/16 text-white/95' : 'bg-zinc-100 text-zinc-600'}`}>
                        {m}
                      </span>
                    ))}
                  </div>
                  <p className={`mt-auto pt-6 text-[13px] leading-[1.85] ${f.grad ? 'text-white/85' : 'text-zinc-500'}`}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FAMILIES_SMALL.map((f, i) => (
              <Reveal key={f.tag} delay={i * 70}>
                <div className="group flex h-full cursor-pointer flex-col rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-[#f8faff] to-white p-5 transition-all duration-200 hover:border-[#2563eb]/35 hover:shadow-[0_16px_40px_-20px_rgba(37,99,235,0.35)]">
                  <span className="w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">{f.tag}</span>
                  <div className="mt-4 text-[16.5px] font-bold text-zinc-950">{f.name}</div>
                  <p className="mt-2 text-[12.5px] leading-[1.8] text-zinc-500">{f.desc}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[12.5px] font-medium text-zinc-700 transition-colors group-hover:text-[#2563eb]">
                    立即查看
                    <ArrowRight size={12} />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-9 text-center">
              <Link href="/console#/pricing" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-zinc-950 transition-colors hover:text-[#2563eb]">
                查看全部 {models}+ 个模型
                <ArrowRight size={14} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 场景 Tab 展示: 下划线导航 + 左文右码 */}
      <section className="biz-atmo relative overflow-hidden border-y border-zinc-100">
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="text-center text-[28px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[34px]">从接入到运营，一站式完成</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {SCENES.map((s, i) => (
                <span
                  key={s.tab}
                  className={`relative pb-2 text-[14px] ${
                    i === 0 ? 'font-semibold text-zinc-950 after:absolute after:inset-x-0 after:bottom-0 after:h-[2.5px] after:rounded-full after:bg-zinc-950' : 'text-zinc-500'
                  }`}
                >
                  {s.tab}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]">
              <div>
                <h3 className="text-[22px] font-bold tracking-[-0.01em] text-zinc-950">{active.title}</h3>
                <p className="mt-4 text-[14px] leading-[1.95] text-zinc-500">{active.desc}</p>
                <ul className="mt-6 space-y-3">
                  {active.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-[13.5px] text-zinc-700">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-white">
                        <Check size={11} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="sb-press brand-grad mt-8 inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[13.5px] font-medium text-white"
                >
                  立即体验
                  <ArrowRight size={14} />
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl bg-zinc-950 shadow-[0_30px_70px_-30px_rgba(9,9,11,0.5)]">
                <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 font-code text-[11px] text-zinc-500">{active.code}</span>
                </div>
                <pre className="overflow-x-auto p-5 font-code text-[12px] leading-[1.9]">
                  <code>
                    <span className="text-zinc-500"># 替换 base_url 与令牌即可, 其余与 OpenAI 完全一致</span>
                    {'\n'}<span className="text-zinc-400">curl</span> <span className="text-sky-300">https://your-gateway.com/v1/chat/completions</span> <span className="text-zinc-400">\</span>
                    {'\n'}  <span className="text-zinc-300">-H</span> <span className="text-emerald-300">&quot;Authorization: Bearer sk-xxxx&quot;</span> <span className="text-zinc-400">\</span>
                    {'\n'}  <span className="text-zinc-300">-H</span> <span className="text-emerald-300">&quot;Content-Type: application/json&quot;</span> <span className="text-zinc-400">\</span>
                    {'\n'}  <span className="text-zinc-300">-d</span> <span className="text-zinc-500">&apos;</span><span className="text-emerald-300">&#123; &quot;model&quot;: &quot;gpt-5&quot;, &quot;messages&quot;: [&#123;&quot;role&quot;:&quot;user&quot;,&quot;content&quot;:&quot;你好&quot;&#125;] &#125;</span><span className="text-zinc-500">&apos;</span>
                    {'\n\n'}<span className="text-zinc-500"># 200 OK</span>
                    {'\n'}<span className="text-zinc-300">&#123;</span> <span className="text-sky-300">&quot;id&quot;</span><span className="text-zinc-400">:</span> <span className="text-emerald-300">&quot;chatcmpl-9f2k&quot;</span><span className="text-zinc-400">,</span> <span className="text-sky-300">&quot;model&quot;</span><span className="text-zinc-400">:</span> <span className="text-emerald-300">&quot;gpt-5&quot;</span><span className="text-zinc-400">,</span> <span className="text-sky-300">&quot;usage&quot;</span><span className="text-zinc-400">:</span> <span className="text-zinc-300">&#123;</span> <span className="text-sky-300">&quot;total_tokens&quot;</span><span className="text-zinc-400">:</span> <span className="text-amber-300">86</span> <span className="text-zinc-300">&#125;</span> <span className="text-zinc-300">&#125;</span>
                  </code>
                </pre>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 数字带 */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-14 md:grid-cols-4">
          {[
            { n: `${models}+`, l: '已接入模型' },
            { n: stats.requests ? fmtNum(stats.requests) : '40 亿+', l: '累计处理请求' },
            { n: stats.tokens ? fmtNum(stats.tokens) : '4.2 万亿', l: '累计处理 Tokens' },
            { n: '99.99%', l: '服务可用性 SLA' },
          ].map((i) => (
            <Reveal key={i.l}>
              <div className="text-center">
                <div className="text-[32px] font-bold tracking-tight text-zinc-950 tabular-nums">{i.n}</div>
                <div className="mt-1.5 text-[12.5px] text-zinc-500">{i.l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 保障三卡 */}
      <section className="border-t border-zinc-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-14 md:grid-cols-3">
          {[
            { icon: Cable, t: '智能路由', d: '多渠道权重调度、故障秒级切换与自动重试，上游抖动业务无感。' },
            { icon: Coins, t: '令牌计费', d: '令牌级额度、限速与模型白名单，按 Token 精确计费，账单分毫不差。' },
            { icon: ShieldCheck, t: '安全私有化', d: '密钥加密存储，支持 Docker 私有化部署，数据不出你的服务器。' },
          ].map((a, i) => (
            <Reveal key={a.t} delay={i * 80}>
              <div className="flex h-full gap-4 rounded-2xl border border-zinc-200/80 bg-white p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
                  <a.icon size={18} />
                </span>
                <div>
                  <div className="text-[16px] font-semibold text-zinc-950">{a.t}</div>
                  <p className="mt-2 text-[13px] leading-[1.85] text-zinc-500">{a.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 细长渐变 CTA */}
      <section className="bg-white px-6 pb-20">
        <Reveal>
          <div className="brand-grad relative mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 overflow-hidden rounded-2xl px-8 py-8 text-white md:flex-row">
            <div className="relative">
              <div className="text-[20px] font-bold tracking-[-0.01em] md:text-[22px]">现在开始，三分钟接入第一个模型</div>
              <div className="mt-1.5 text-[13px] text-white/80">注册即送体验额度，全部数据留在你自己的服务器里。</div>
            </div>
            <div className="relative flex shrink-0 items-center gap-3">
              <Link href="/register" className="sb-press inline-flex h-10 items-center gap-2 rounded-lg bg-white px-6 text-[13.5px] font-semibold text-zinc-950 transition-colors hover:bg-white/95">
                免费开始
              </Link>
              <Link href="/console#/about" className="inline-flex h-10 items-center rounded-lg border border-white/50 px-6 text-[13.5px] font-medium text-white transition-colors hover:bg-white/10">
                接入文档
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter siteName={siteName} />
    </div>
  )
}
