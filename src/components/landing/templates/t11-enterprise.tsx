'use client'

/**
 * 模板 11 「企业版」— 大厂企业级服务页结构推倒重做
 * 调研对标: 腾讯云 CVM 客户案例分屏(左图右卡) + 阿里云企业服务(合规能力列表) +
 * 火山引擎服务承诺条 + 大厂企业页标配功能对比表(替代均质定价三卡)
 * 每段结构互不相同, Hero 三层 CTA, 拒绝"两按钮+卡片堆"公式
 */
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Cable,
  CaretRight,
  Check,
  CircleCheck,
  Coins,
  Database,
  Globe,
  LockKey,
  RefreshCw,
  RocketLaunch,
  ScrollText,
  ShieldCheck,
  Stack,
  Users,
} from '@/components/ph'
import { Reveal } from '../kit'
import { ConsoleShot, fmtNum } from '../sections'
import { SiteFooter, type TemplateProps } from './shared'

const BRAND = '#2563eb'

/* ─── 业务场景 chips ─── */
const SCENES = ['智能客服', '知识库问答', '编码助手', '数据分析', '内容审核', '智能营销']

/* ─── 企业能力 2×2 (编号 01-04) ─── */
const ABILITIES = [
  {
    no: '01',
    icon: Cable,
    t: '统一接入',
    d: 'OpenAI 协议全量兼容，一个 base_url 调用 GPT、Claude、Gemini 与全部国产模型，框架生态零适配成本。',
  },
  {
    no: '02',
    icon: Coins,
    t: '精细计费',
    d: '按分组倍率与 Token 用量实时结算，令牌级额度与限速，给团队、客户、项目各自独立核算。',
  },
  {
    no: '03',
    icon: BarChart3,
    t: '数据洞察',
    d: '请求量、Token 消耗与费用多维透视，按模型与令牌拆解，明细随时导出，预算管理有据可依。',
  },
  {
    no: '04',
    icon: ShieldCheck,
    t: '企业级安全',
    d: '密钥加密存储、IP 白名单、全量审计日志；支持私有化部署，数据不出你的服务器。',
  },
]

/* ─── 安全与合规能力 (深色分屏左列) ─── */
const COMPLIANCE = [
  { icon: LockKey, t: '传输与存储加密', d: '全链路 HTTPS 传输，上游密钥加密存储，敏感信息控制台脱敏展示。' },
  { icon: ScrollText, t: '全量审计日志', d: '每一次调用与令牌操作均生成明细记录，支持按维度筛选与归档导出。' },
  { icon: Globe, t: '访问控制与白名单', d: '令牌级 IP 白名单、分组级权限隔离，按最小授权原则管理调用入口。' },
  { icon: Database, t: '私有化部署', d: 'Docker 一键部署至自有服务器，数据库与日志全部留在企业内网。' },
]

/* ─── 客户案例 (匿名化真实感) ─── */
const CASES = [
  {
    brand: '电商平台',
    t: '某头部电商平台',
    d: '接入网关统一管理 12 条模型渠道，大促期间峰值 3,200 QPS 稳定运行，账单成本较上游直连下降 26%。',
  },
  {
    brand: 'AI 初创',
    t: '某 AI 应用创业公司',
    d: '统一协议接入 5 家上游厂商，产品迭代期频繁切换模型，接入改造时间从两周缩短到半天。',
  },
  {
    brand: '高校实验室',
    t: '某高校重点实验室',
    d: '以科研分组价承接模型评测课题，2,400 万 Tokens 实验数据全部留存在校内部署节点。',
  },
]

/* ─── 功能对比表 (替代均质定价三卡) ─── */
type Cell = string | boolean
const MATRIX: Array<{ label: string; cells: [Cell, Cell, Cell] }> = [
  { label: '模型可用范围', cells: ['全部模型', '全部模型', '全部模型'] },
  { label: '并发请求上限', cells: ['20 QPS', '100 QPS', '500 QPS'] },
  { label: '速率限制', cells: ['300 RPM', '1,200 RPM', '6,000 RPM'] },
  { label: '故障自动切换', cells: [true, true, true] },
  { label: '优先调度队列', cells: [false, true, true] },
  { label: '专属路由策略', cells: [false, false, true] },
  { label: '支持通道', cells: ['社区支持', '工单支持', '专属客户成功'] },
]

/* ─── 服务承诺 (企业侧重, 与云服务版区分) ─── */
const PROMISES = [
  { icon: Users, t: '专属成功经理', d: '一对一接入规划与季度业务回顾' },
  { icon: Activity, t: '7×24 工单响应', d: '紧急故障 15 分钟响应，进展全程同步' },
  { icon: RocketLaunch, t: '平滑迁移支持', d: '上游密钥平移导入，业务切换零停机' },
  { icon: RefreshCw, t: '灵活扩缩容', d: '倍率与并发额度随业务周期弹性调整' },
]

const FAQS = [
  {
    q: '与直接使用上游厂商 API 有什么区别？',
    a: '你只需维护一个网关密钥与一套接入代码。模型切换、渠道路由、故障转移、用量统计与计费全部在网关侧完成，不再需要为每家厂商分别管理密钥、账单与限流。',
  },
  {
    q: '企业数据是否会离开我们的服务器？',
    a: '不会。平台支持 Docker 私有化部署，数据库、日志与配置全部保存在你自己的服务器中；SaaS 模式下也仅存储调用明细与账单数据，请求内容按需脱敏或完全不落盘。',
  },
  {
    q: '如何开始企业接入评估？',
    a: '注册后即可在控制台创建测试分组，用现有业务流量小比例灰度验证。确认指标符合预期后再将全部流量切换至网关，迁移期间上游密钥可平移导入，业务不中断。',
  },
]

export default function T11Enterprise({ siteName, stats }: TemplateProps) {
  const models = stats.models || 41
  return (
    <div className="min-h-screen bg-white text-zinc-950 antialiased">
      {/* ─── 导航 ─── */}
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
            {['产品', '安全合规', '客户案例', '套餐对比'].map((l) => (
              <a key={l} href="#matrix" className="text-[13.5px] text-zinc-600 transition-colors duration-200 hover:text-zinc-950">
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
              控制台
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero 渐变横幅: 三层 CTA + 右列图标统计 ─── */}
      <section className="biz-atmo relative overflow-hidden pb-16 pt-[68px]">
        <div className="biz-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pt-10 md:pt-14">
          <Reveal>
            <div className="hero-card-grad relative overflow-hidden rounded-3xl text-white shadow-[0_24px_60px_-24px_rgba(37,99,235,0.5)]">
              <div aria-hidden className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
              <div className="relative grid items-center gap-10 px-8 py-12 md:px-14 md:py-16 lg:grid-cols-[1.35fr_1fr]">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11.5px] font-medium tracking-wide text-white/90">
                    <ShieldCheck size={12} />
                    服务 1,200+ 企业与团队的模型基础设施
                  </span>
                  <h1 className="mt-6 text-[30px] font-bold leading-[1.24] tracking-[-0.015em] sm:text-[50px]">
                    企业级大模型
                    <br />
                    统一接入与运营平台
                  </h1>
                  <p className="mt-5 max-w-xl text-[14.5px] leading-[1.95] text-white/85">
                    为团队与客户提供统一的模型入口：统一协议、统一计费、统一审计。
                    接入 {models}+ 个主流模型，支持公有云与私有化两种交付形态，生产环境长期稳定运行。
                  </p>
                  {/* 三层 CTA: 主按钮 + 次按钮 + 白色文字链接 */}
                  <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3.5">
                    <Link
                      href="/register"
                      className="sb-press inline-flex h-11 items-center gap-2 rounded-lg bg-white px-7 text-[14px] font-semibold text-zinc-950 shadow-lg transition-colors duration-200 hover:bg-white/95"
                    >
                      咨询企业方案
                      <ArrowRight size={15} />
                    </Link>
                    <Link
                      href="/console#/about"
                      className="inline-flex h-11 items-center rounded-lg border border-white/50 px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-white/10"
                    >
                      预约产品演示
                    </Link>
                    <div className="flex items-center gap-5">
                      <a href="#compliance" className="group inline-flex items-center gap-1 text-[13.5px] font-medium text-white/90 hover:text-white">
                        安全合规
                        <CaretRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                      </a>
                      <a href="#matrix" className="group inline-flex items-center gap-1 text-[13.5px] font-medium text-white/90 hover:text-white">
                        套餐对比
                        <CaretRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                      </a>
                    </div>
                  </div>
                </div>
                {/* 右列图标统计 */}
                <div className="lg:border-l lg:border-white/20 lg:pl-12">
                  {[
                    { icon: Stack, n: stats.models ? `${stats.models}+` : `${models}+`, l: '已接入模型' },
                    { icon: Activity, n: stats.requests ? fmtNum(stats.requests) : '40 亿+', l: '累计处理请求' },
                    { icon: ShieldCheck, n: '99.99%', l: '服务可用性 SLA' },
                  ].map((s, i) => (
                    <div key={s.l} className={`flex items-center gap-4 py-4.5 ${i > 0 ? 'border-t border-white/20' : ''}`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/12">
                        <s.icon size={18} />
                      </span>
                      <div>
                        <div className="text-[26px] font-bold leading-tight tracking-tight tabular-nums">{s.n}</div>
                        <div className="mt-0.5 text-[12px] text-white/70">{s.l}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* 业务场景 chips 横条 */}
          <Reveal delay={110}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 rounded-xl border border-zinc-200/70 bg-white/70 px-6 py-4 backdrop-blur">
              <span className="text-[12.5px] text-zinc-400">已支撑 6 大业务场景</span>
              <span className="h-4 w-px bg-zinc-200" aria-hidden />
              {SCENES.map((s) => (
                <span
                  key={s}
                  className="cursor-default rounded-full border border-zinc-200/90 bg-white px-3 py-1 text-[12.5px] text-zinc-600 transition-colors duration-200 hover:border-[#2563eb]/40 hover:text-[#2563eb]"
                >
                  {s}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── 企业能力 2×2 (编号 01-04) ─── */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="text-[28px] font-bold tracking-[-0.015em] md:text-[34px]">为大模型生产环境而建</h2>
            <p className="mt-3 max-w-lg text-[14px] leading-[1.9] text-zinc-500">
              从接入、计费到审计与安全，覆盖模型运营的完整生命周期，全部能力开通即用。
            </p>
          </Reveal>
          <div className="mt-11 grid gap-5 md:grid-cols-2">
            {ABILITIES.map((a, i) => (
              <Reveal key={a.no} delay={i * 80}>
                <div className="group flex h-full gap-6 rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-[#f8faff] to-white p-7 transition-all duration-200 hover:border-[#2563eb]/35 hover:shadow-[0_18px_44px_-22px_rgba(37,99,235,0.35)]">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
                    <a.icon size={20} />
                  </span>
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-code text-[12px] font-semibold text-zinc-300 transition-colors group-hover:text-[#2563eb]">{a.no}</span>
                      <div className="text-[18px] font-bold text-zinc-950">{a.t}</div>
                    </div>
                    <p className="mt-2.5 text-[13.5px] leading-[1.9] text-zinc-500">{a.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 安全与合规深色分屏 ─── */}
      <section id="compliance" className="scroll-mt-16 bg-zinc-950">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-20 lg:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="text-[28px] font-bold tracking-[-0.015em] text-white md:text-[34px]">安全与合规，经得起审视</h2>
              <p className="mt-3 max-w-lg text-[13.5px] leading-[1.9] text-zinc-400">
                面向有数据边界要求的企业环境，从传输、存储到审计逐层设防，支持安全团队入场评审。
              </p>
              <div className="mt-9 space-y-7">
                {COMPLIANCE.map((c) => (
                  <div key={c.t} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[#7ea6f4] ring-1 ring-white/10">
                      <c.icon size={18} />
                    </span>
                    <div>
                      <div className="text-[15.5px] font-semibold text-white">{c.t}</div>
                      <p className="mt-1.5 max-w-md text-[12.5px] leading-[1.85] text-zinc-400">{c.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={130}>
            <div className="relative mx-auto w-full max-w-md">
              {/* SLA 卡 */}
              <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#1e3a8a] to-[#1d4fd8] p-7 text-white shadow-[0_28px_70px_-30px_rgba(37,99,235,0.7)]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium tracking-wide text-white/80">服务等级协议</span>
                  <ShieldCheck size={18} className="text-white/85" />
                </div>
                <div className="mt-5 text-[44px] font-bold leading-none tracking-tight tabular-nums">99.99%</div>
                <div className="mt-2 text-[12.5px] text-white/75">月度可用性承诺，未达标按协议抵扣</div>
                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-5">
                  {[
                    { k: '故障切换', v: '< 30s' },
                    { k: '工单响应', v: '15 min' },
                    { k: '数据保留', v: '180 天' },
                  ].map((m) => (
                    <div key={m.k}>
                      <div className="font-code text-[15px] font-semibold tabular-nums">{m.v}</div>
                      <div className="mt-1 text-[10.5px] text-white/60">{m.k}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* 数据不出域卡 (叠放) */}
              <div className="relative z-10 mx-5 -mt-6 rounded-2xl border border-white/10 bg-[#18181b] p-5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <CircleCheck size={18} className="shrink-0 text-emerald-400" />
                  <div className="text-[13.5px] font-medium text-white">私有化部署验证通过 · 数据不出域</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['AGPL-3.0 开源', 'Docker 一键部署', '内网运行'].map((t) => (
                    <span key={t} className="rounded-md bg-white/8 px-2 py-1 text-[11px] text-zinc-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── 客户案例左右分屏 (腾讯云式) ─── */}
      <section className="border-y border-zinc-100 bg-white">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          {/* 左: 深蓝渐变叙事面 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1526] via-[#132a4d] to-[#1d4fd8] px-8 py-14 text-white md:px-12 md:py-20">
            {/* 节点网装饰 */}
            <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-25" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
              <g fill="none" stroke="#ffffff" strokeWidth="0.6">
                <path d="M40 420 L120 330 L230 380 L340 300" />
                <path d="M120 330 L180 220 L290 260 L340 300" />
                <path d="M60 140 L180 220 L150 90 L280 120" />
                <path d="M290 260 L330 150 L280 120" />
              </g>
              {[
                [40, 420],
                [120, 330],
                [230, 380],
                [340, 300],
                [180, 220],
                [290, 260],
                [60, 140],
                [150, 90],
                [280, 120],
                [330, 150],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="#ffffff" opacity={i % 2 ? 0.7 : 0.4} />
              ))}
            </svg>
            <div className="relative">
              <h2 className="text-[28px] font-bold tracking-[-0.015em] md:text-[34px]">客户案例</h2>
              <p className="mt-4 max-w-md text-[13.5px] leading-[2] text-white/80">
                从电商大促到科研评测，不同规模与行业的团队都把模型调用收敛到同一个网关入口，
                以更低的成本、更高的可用性支撑业务增长。
              </p>
              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-8">
                {[
                  { n: '1,200+', l: '企业与团队' },
                  { n: '6 大', l: '业务场景' },
                  { n: '26%', l: '平均成本下降' },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-[24px] font-bold tracking-tight tabular-nums">{s.n}</div>
                    <div className="mt-1 text-[11.5px] text-white/70">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* 右: 三张案例卡纵向排列 */}
          <div className="flex flex-col justify-center gap-4 px-6 py-12 md:px-10 md:py-14 lg:px-12">
            {CASES.map((c, i) => (
              <Reveal key={c.t} delay={i * 80}>
                <div className="group rounded-2xl border border-zinc-200/85 p-6 transition-all duration-200 hover:border-[#2563eb]/40 hover:shadow-[0_18px_44px_-26px_rgba(24,48,110,0.35)] md:p-7">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-[11px] font-bold text-white">
                      {c.brand.slice(0, 2)}
                    </span>
                    <div>
                      <div className="text-[15.5px] font-bold text-zinc-950">{c.t}</div>
                      <div className="mt-0.5 text-[11.5px] text-zinc-400">{c.brand} · 案例编号 N-{String(i + 1).padStart(3, '0')}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-[13.5px] leading-[1.95] text-zinc-600">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 控制台截图 ─── */}
      <section className="biz-atmo relative overflow-hidden border-y border-zinc-100">
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="text-center">
              <h2 className="text-[28px] font-bold tracking-[-0.015em] md:text-[34px]">运营全貌，尽在一屏</h2>
              <p className="mx-auto mt-3 max-w-lg text-[14px] leading-[1.9] text-zinc-500">
                渠道健康度、请求趋势、模型消耗与实时日志集中呈现，审计与对账不再需要导出拼接。
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

      {/* ─── 功能对比表 (替代均质定价三卡) ─── */}
      <section id="matrix" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="text-center">
              <h2 className="text-[28px] font-bold tracking-[-0.015em] md:text-[34px]">三档分组，逐项对比</h2>
              <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.9] text-zinc-500">
                全部模型同价接入，倍率随分组递减；额度用尽自动降级为按量计费，不会中断业务。
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-zinc-200/85 text-left">
                <thead>
                  <tr>
                    <th className="w-[26%] border-b border-r border-zinc-200/85 bg-[#fafbfc] px-5 py-4 text-[12.5px] font-medium text-zinc-500">
                      功能点
                    </th>
                    {[
                      { n: '基础分组', r: '1.0×', hot: false },
                      { n: '标准分组', r: '0.9×', hot: true },
                      { n: '旗舰分组', r: '0.8×', hot: false },
                    ].map((p) => (
                      <th key={p.n} className={`relative border-b border-zinc-200/85 px-5 py-4 ${p.hot ? 'bg-[#f0f6ff]' : 'bg-[#fafbfc]'}`}>
                        {p.hot && (
                          <span className="absolute right-4 top-3 rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-semibold text-white">推荐</span>
                        )}
                        <div className={`text-[14.5px] font-bold ${p.hot ? 'text-[#2563eb]' : 'text-zinc-950'}`}>{p.n}</div>
                        <div className="mt-0.5 text-[11.5px] font-normal text-zinc-400">倍率 {p.r}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row, ri) => (
                    <tr key={row.label} className={ri % 2 === 1 ? 'bg-zinc-50/60' : 'bg-white'}>
                      <td className="border-b border-r border-zinc-100 px-5 py-3.5 text-[13px] text-zinc-600">{row.label}</td>
                      {row.cells.map((c, ci) => (
                        <td key={ci} className={`border-b border-zinc-100 px-5 py-3.5 ${ci === 1 ? 'bg-[#f0f6ff]/60' : ''}`}>
                          {typeof c === 'boolean' ? (
                            c ? (
                              <Check size={15} className="text-[#2563eb]" />
                            ) : (
                              <span className="text-[13px] text-zinc-300">—</span>
                            )
                          ) : (
                            <span className="text-[13px] font-medium tabular-nums text-zinc-900">{c}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-white">
                    <td className="border-r border-zinc-100 px-5 py-4 text-[12.5px] text-zinc-400">适合阶段</td>
                    {['个人与原型验证', '成长团队与生产业务', '大规模生产与代理'].map((t, ci) => (
                      <td key={t} className={`px-5 py-4 ${ci === 1 ? 'bg-[#f0f6ff]/60' : ''}`}>
                        <div className="text-[12.5px] text-zinc-600">{t}</div>
                        <Link
                          href="/register"
                          className={`sb-press mt-3 inline-flex h-8.5 items-center justify-center rounded-lg px-4 text-[12.5px] font-medium ${
                            ci === 1
                              ? 'bg-[#2563eb] text-white transition-colors hover:bg-[#1d4fd8]'
                              : 'border border-zinc-300 text-zinc-950 transition-colors hover:border-zinc-400'
                          }`}
                        >
                          立即开通
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-5 text-center text-[11.5px] text-zinc-400">
              支持随时升降级 · 倍率对全部模型生效 · 企业定制分组与独立部署请联系我们
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="text-[28px] font-bold tracking-[-0.015em] md:text-[34px]">常见问题</h2>
          </Reveal>
          <div className="mt-8">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <div className="border-b border-zinc-100 py-7">
                  <div className="flex items-start gap-3.5">
                    <span className="mt-0.5 font-code text-[12px] font-semibold text-[#2563eb]">Q{i + 1}</span>
                    <div>
                      <div className="text-[16px] font-semibold text-zinc-950">{f.q}</div>
                      <p className="mt-2.5 text-[13.5px] leading-[1.95] text-zinc-500">{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 服务承诺四列 ─── */}
      <section className="border-y border-zinc-100 bg-[#fafbfc]">
        <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((p) => (
            <Reveal key={p.t}>
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#2563eb] shadow-[0_1px_2px_rgba(9,9,11,0.05)] ring-1 ring-zinc-200/70">
                  <p.icon size={19} />
                </span>
                <div>
                  <div className="text-[14.5px] font-semibold text-zinc-950">{p.t}</div>
                  <p className="mt-1.5 text-[12px] leading-[1.8] text-zinc-500">{p.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="bg-white px-6 pb-20 pt-16">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-zinc-950 px-8 py-14 text-center text-white">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2563eb]/25 blur-3xl" />
            <div className="relative">
              <h2 className="text-[24px] font-bold tracking-[-0.01em] md:text-[30px]">把企业模型调用收敛到同一个入口</h2>
              <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-[1.9] text-zinc-400">
                注册即可开通测试分组小比例灰度验证，确认指标后再全量切换，迁移期业务不中断。
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3.5">
                <Link href="/register" className="sb-press brand-grad inline-flex h-11 items-center gap-2 rounded-lg px-7 text-[14px] font-semibold text-white">
                  咨询企业方案
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/console#/about"
                  className="inline-flex h-11 items-center rounded-lg border border-white/25 px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-white/10"
                >
                  阅读文档
                </Link>
                <a href="#compliance" className="group inline-flex items-center gap-1 text-[13.5px] font-medium text-zinc-300 hover:text-white">
                  评估安全合规
                  <CaretRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter siteName={siteName} />
    </div>
  )
}
