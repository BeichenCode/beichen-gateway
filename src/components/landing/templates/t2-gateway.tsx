'use client'

/**
 * 模板 2 「网关版」— 参照火山方舟 (volcengine ark) 官网 (大厂企业版)
 * 氛围网格底 + 左侧双行大标题/特性分隔条 + 右侧立体三层产品图 + 底部四栏快捷信息条
 */
import Link from 'next/link'
import { ArrowRight, Cable, Coins, Globe, KeyRound, LayoutDashboard, Monitor, ShieldCheck, Terminal, Zap } from '@/components/ph'
import { Reveal } from '../kit'
import { ConsoleShot, fmtNum } from '../sections'
import { SiteFooter, type TemplateProps } from './shared'

/* 底部四栏快捷信息条 (火山方舟式) */
const QUICK = [
  { tag: '热门', t: '最新模型', d: 'GPT-5 与 Claude Sonnet 4.5 已上线' },
  { tag: null, t: '模型定价', d: '查看各模型价格与计费方式' },
  { tag: null, t: '快速开始', d: '五分钟接入，OpenAI 协议兼容' },
  { tag: null, t: '接入 API', d: '查看官方文档，一行代码接入' },
]

const HERO_POINTS = ['统一 OpenAI 协议，41+ 模型随时切换', '多渠道权重调度，故障秒级自愈', '令牌级额度与按量计费', '数据不出你的服务器']

const ABILITIES = [
  { icon: Cable, t: '统一接入', d: 'OpenAI 协议一次接入，四十一家模型随时切换，业务代码零改造。' },
  { icon: Zap, t: '智能路由', d: '多渠道权重调度与故障自愈，上游抖动业务无感，成功率 99.99%。' },
  { icon: KeyRound, t: '令牌分发', d: '令牌级额度、限速与模型白名单，细粒度管控每一次调用。' },
  { icon: LayoutDashboard, t: '用量观测', d: '请求、Token、费用多维透视，支持导出与审计，运营一目了然。' },
]

/* 三层产品图: 阶梯级联 (每层内容完整可见, 卡底留白承接上层投影; 移动端退化为纵向堆叠) */
function IsoVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] select-none md:h-[492px]" aria-hidden>
      {/* 应用层 (顶) */}
      <div className="relative z-30 mb-4 w-full rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_2px_4px_rgba(9,9,11,0.04),0_24px_60px_-30px_rgba(24,48,110,0.4)] md:absolute md:left-0 md:top-0 md:mb-0 md:w-[364px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wide text-zinc-400">你的业务</span>
          <span className="font-code text-[9.5px] text-zinc-400">3 apps</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {[
            { icon: Globe, t: '网页应用' },
            { icon: Monitor, t: '后端服务' },
            { icon: Terminal, t: '脚本任务' },
          ].map((a) => (
            <div key={a.t} className="rounded-lg border border-zinc-100 bg-zinc-50/90 px-1 py-2.5 text-center">
              <span className="mx-auto flex h-6.5 w-6.5 items-center justify-center rounded-md bg-white shadow-[0_1px_3px_rgba(9,9,11,0.08)]">
                <a.icon size={12} className="text-zinc-700" />
              </span>
              <div className="mt-1 text-[10px] font-medium text-zinc-700">{a.t}</div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 rounded-lg border border-zinc-100 bg-white px-2.5 py-1.5 font-code text-[9.5px] text-zinc-500">
          base_url <span className="text-[#2563eb]">→ console.example.com/v1</span>
        </div>
      </div>
      {/* 网关层 (中, 黑色主体) */}
      <div className="relative z-20 mb-4 w-full rounded-2xl bg-zinc-950 p-4 shadow-[0_30px_70px_-28px_rgba(9,9,11,0.65)] md:absolute md:left-[88px] md:top-[172px] md:mb-0 md:w-[364px]">
        <div className="flex items-center gap-2">
          <span className="flex h-6.5 w-6.5 items-center justify-center rounded-md bg-white">
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
              <circle cx="3.6" cy="12.4" r="1.5" fill="#09090b" />
              <path d="M3.6 10.9V8.2C3.6 6.4 5 5.4 6.8 5.4h4.1M8.9 3.5l2 1.9-2 1.9" stroke="#09090b" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[13px] font-semibold tracking-wide text-white">NEW API 网关</span>
          <span className="ml-auto rounded bg-emerald-500/15 px-1.5 py-0.5 font-code text-[9px] text-emerald-400">LIVE</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {['协议归一', '智能路由', '用量观测', '访问治理'].map((c, i) => (
            <div
              key={c}
              className={`rounded-md px-2.5 py-2 text-[11px] font-medium ${i === 1 ? 'bg-[#2563eb] text-white' : 'bg-white/8 text-zinc-300'}`}
            >
              {c}
            </div>
          ))}
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-[#3b82f6]" />
        </div>
      </div>
      {/* 模型层 (底) */}
      <div className="relative z-10 w-full rounded-2xl border border-[#2563eb]/25 bg-gradient-to-br from-[#eef4ff] to-[#e2ebff] p-4 shadow-[0_24px_60px_-30px_rgba(24,48,110,0.45)] md:absolute md:left-[176px] md:top-[344px] md:w-[364px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wide text-zinc-500">上游模型厂商</span>
          <span className="font-code text-[9.5px] text-zinc-400">41+ models</span>
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {['GPT-5', 'Claude', 'Gemini', 'DeepSeek', 'Qwen', 'Kimi', 'GLM', 'Grok'].map((m, i) => (
            <div
              key={m}
              className={`rounded-md py-1.5 text-center text-[10px] font-medium ${
                i === 0 ? 'bg-[#2563eb] text-white shadow-[0_6px_14px_-6px_rgba(37,99,235,0.6)]' : 'bg-white/95 text-zinc-700'
              }`}
            >
              {m}
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
          <ShieldCheck size={11} />
          全链路 HTTPS · 密钥加密存储
        </div>
      </div>
    </div>
  )
}

export default function T2Gateway({ siteName, stats }: TemplateProps) {
  const models = stats.models || 41
  return (
    <div className="min-h-screen bg-white text-zinc-950 antialiased">
      {/* 导航 */}
      <header className="border-b border-zinc-100 bg-white/85 backdrop-blur">
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
            {['大模型', '产品', '定价', '文档'].map((l) => (
              <a key={l} href="#abilities" className="text-[13.5px] text-zinc-600 transition-colors duration-200 hover:text-zinc-950">
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
              className="brand-grad sb-press inline-flex h-9 items-center rounded-lg px-4.5 text-[13px] font-medium text-white"
            >
              立即体验
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: 氛围网格底 + 左文右立体图 (火山方舟构图) */}
      <section className="biz-atmo relative overflow-hidden">
        <div className="biz-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-14 md:grid-cols-[1.02fr_1fr] md:pb-20 md:pt-20">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/85 py-1 pl-1 pr-3 text-[12.5px] text-zinc-700 shadow-[0_1px_3px_rgba(24,48,110,0.08)]">
              <span className="brand-grad rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white">NEW</span>
              GPT-5 与 Claude Sonnet 4.5 全部上线
              <ArrowRight size={13} className="text-zinc-400" />
            </div>
            <h1 className="mt-6 text-[42px] font-bold leading-[1.22] tracking-[-0.015em] sm:text-[54px]">
              <span className="text-[#2563eb]">{siteName}</span>
              <span className="block text-zinc-950">一站式大模型网关平台</span>
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13.5px] text-zinc-500">
              {HERO_POINTS.map((p, i) => (
                <span key={p} className="flex items-center gap-3">
                  {i > 0 && <span className="h-3.5 w-px bg-zinc-200" aria-hidden />}
                  {p}
                </span>
              ))}
            </div>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="brand-grad sb-press inline-flex h-12 items-center gap-2 rounded-lg px-8 text-[15px] font-medium text-white"
              >
                立即体验
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/console"
                className="inline-flex h-12 items-center rounded-lg border border-zinc-200 bg-white px-8 text-[15px] font-medium text-zinc-900 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors duration-200 hover:border-zinc-300 hover:bg-zinc-50"
              >
                进入控制台
              </Link>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <IsoVisual />
          </Reveal>
        </div>

        {/* 底部四栏快捷信息条 */}
        <div className="relative mx-auto max-w-6xl px-6 pb-14">
          <Reveal delay={200}>
            <div className="grid overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04),0_20px_50px_-30px_rgba(24,48,110,0.25)] sm:grid-cols-2 lg:grid-cols-4">
              {QUICK.map((q, i) => (
                <a
                  key={q.t}
                  href="#quick-start"
                  className={`group px-6 py-5 transition-colors duration-200 hover:bg-zinc-50/80 ${
                    i > 0 ? 'border-zinc-100 max-lg:border-t lg:border-l' : ''
                  } ${i === 2 ? 'max-lg:border-t sm:max-lg:border-l-0 sm:max-lg:border-t lg:border-t-0' : ''}`}
                >
                  <div className="flex items-center gap-2 text-[14.5px] font-semibold text-zinc-950">
                    {q.tag && <span className="rounded bg-rose-500 px-1 py-px text-[10px] font-medium text-white">{q.tag}</span>}
                    {q.t}
                    <ArrowRight size={13} className="text-zinc-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#2563eb]" />
                  </div>
                  <div className="mt-1.5 text-[12.5px] text-zinc-500">{q.d}</div>
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 快速开始: 三页签命令条 */}
      <section id="quick-start" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="grid gap-8 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-7 md:grid-cols-[0.9fr_1.1fr] md:p-9">
              <div>
                <h2 className="text-[24px] font-bold tracking-[-0.01em] text-zinc-950">三行命令，完成部署</h2>
                <p className="mt-3 text-[13.5px] leading-[1.9] text-zinc-500">
                  单个 Docker 镜像完成私有化部署，内置 SQLite 开箱即用；也支持 MySQL 与 Redis 的生产配置。
                </p>
                <div className="mt-5 space-y-2.5">
                  {['内置用量观测与审计日志', '支持 MySQL / Redis 生产配置', 'AGPL-3.0 开源，可自由修改'].map((t) => (
                    <div key={t} className="flex items-center gap-2.5 text-[13px] text-zinc-600">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#2563eb]/10 text-[#2563eb]">
                        <Cable size={10} />
                      </span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-950 p-1.5 shadow-inner">
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 font-code text-[10.5px] text-zinc-500">deploy.sh</span>
                </div>
                <div className="space-y-2 px-3.5 pb-4 pt-1 font-code text-[12px] leading-relaxed">
                  <div className="text-zinc-500"># 拉取并启动</div>
                  <div>
                    <span className="text-emerald-400">$</span> <span className="text-zinc-100">docker run -d -p 3000:3000 \</span>
                  </div>
                  <div className="pl-4 text-zinc-100">beichen-gateway:latest</div>
                  <div className="pt-1 text-zinc-500"># 查看启动日志</div>
                  <div>
                    <span className="text-emerald-400">$</span> <span className="text-zinc-100">docker logs -f beichen-gateway</span>
                  </div>
                  <div className="text-emerald-400">✓ beichen-gateway started on :3000</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 能力四卡 */}
      <section id="abilities" className="scroll-mt-16 border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="text-center text-[28px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[34px]">为生产环境而生的能力底座</h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[14px] leading-[1.9] text-zinc-500">
              从协议归一到计费观测，网关层把脏活累活全部接管。
            </p>
          </Reveal>
          <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ABILITIES.map((a, i) => (
              <Reveal key={a.t} delay={i * 70}>
                <div className="group h-full rounded-2xl border border-zinc-200/80 bg-white p-6 transition-all duration-200 hover:border-[#2563eb]/35 hover:shadow-[0_18px_44px_-22px_rgba(37,99,235,0.35)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563eb]/10 text-[#2563eb]">
                    <a.icon size={19} />
                  </span>
                  <div className="mt-5 text-[17px] font-semibold text-zinc-950">{a.t}</div>
                  <p className="mt-2.5 text-[13px] leading-[1.85] text-zinc-500">{a.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 控制台大截图 */}
      <section className="border-t border-zinc-100 bg-zinc-50/70">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="text-center">
              <h2 className="text-[28px] font-bold tracking-[-0.015em] text-zinc-950 md:text-[34px]">运营驾驶舱，一眼看清全局</h2>
              <p className="mx-auto mt-3 max-w-lg text-[14px] leading-[1.9] text-zinc-500">
                请求量、Token 消耗与费用曲线实时更新，渠道健康度与额度水位尽在掌握。
              </p>
            </div>
          </Reveal>
          <Reveal delay={130}>
            <div className="mt-12 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_2px_6px_rgba(24,48,110,0.05),0_44px_100px_-44px_rgba(24,48,110,0.35)]">
              <ConsoleShot />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 数字带 */}
      <section className="border-t border-zinc-100 bg-white">
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

      {/* 蓝色 CTA 通栏 */}
      <section className="px-6 pb-20">
        <div className="brand-grad relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-13 text-white md:py-14">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-white/10" />
          <div className="relative flex flex-col items-center justify-between gap-7 md:flex-row">
            <div className="text-center md:text-left">
              <div className="text-[23px] font-bold md:text-[27px]">现在开通，三分钟接入第一个模型</div>
              <p className="mt-2 text-[13.5px] text-white/80">开源自部署，无订阅费；全部数据留在你自己的服务器里。</p>
            </div>
            <Link
              href="/register"
              className="sb-press inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-white px-8 text-[14.5px] font-semibold text-[#1d4ed8] shadow-lg transition-transform duration-200 hover:bg-white/95"
            >
              免费开始
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter siteName={siteName} />
    </div>
  )
}
