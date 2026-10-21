'use client'

/**
 * 模板 3 「云服务版」— 大厂云产品页结构推倒重做
 * 调研对标: 阿里云 ECS 产品页(子导航条/四列卖点直排/交替左图右文/产品动态) +
 * 腾讯云 CVM(三层 CTA/规格选型行卡/丝带角标/免责副注) + 火山方舟(快捷信息条) + 火山引擎(服务承诺条)
 * 每一段都是互不相同的叙事结构, 拒绝"标题+卡片堆"模板公式
 */
import Link from 'next/link'
import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  CaretRight,
  Check,
  RefreshCw,
  ShieldCheck,
  Users,
} from '@/components/ph'
import { Reveal } from '../kit'
import { SiteFooter, type TemplateProps } from './shared'

const BRAND = '#2563eb'

/* ─── Hero 四列卖点直排 (阿里云式, 无边框) ─── */
const SELLING = [
  { t: '分钟级开通', d: '注册即可创建令牌，替换 base_url 即完成接入，现有代码零改造。' },
  { t: '99.99% 可用', d: '多渠道秒级故障切换，上游抖动业务无感，支撑生产环境稳定运行。' },
  { t: '弹性并发', d: '并发额度随分组动态伸缩，高峰随时扩容，不必提前囤积算力资源。' },
  { t: '按量计费', d: 'Token 级精确计量，输入输出分别计价，账单明细精确到每一次调用。' },
]

/* ─── 场景选型数据 (腾讯云 CVM 规格行卡同构) ─── */
type PlanRow = {
  name: string
  fit: string
  specs: Array<{ k: string; v: string }>
  points: string[]
  price: string
  unit: string
  ribbon?: string
}

const PLAN_TABS: Array<{ tab: string; rows: PlanRow[] }> = [
  {
    tab: '轻量入门',
    rows: [
      {
        name: '体验版',
        fit: '个人开发与功能验证',
        specs: [
          { k: '模型额度', v: '100 万 Tokens' },
          { k: '并发请求', v: '5 QPS' },
          { k: '速率限制', v: '60 RPM' },
          { k: '有效期', v: '永久' },
        ],
        points: ['全部模型可用', 'OpenAI 协议兼容'],
        price: '¥9',
        unit: '/ 月',
        ribbon: '新客特惠',
      },
      {
        name: '基础版',
        fit: '小项目与原型开发',
        specs: [
          { k: '模型额度', v: '500 万 Tokens' },
          { k: '并发请求', v: '10 QPS' },
          { k: '速率限制', v: '120 RPM' },
          { k: '有效期', v: '永久' },
        ],
        points: ['全部模型可用', '故障自动切换'],
        price: '¥39',
        unit: '/ 月',
      },
      {
        name: '标准版',
        fit: '个人生产环境',
        specs: [
          { k: '模型额度', v: '2,000 万 Tokens' },
          { k: '并发请求', v: '20 QPS' },
          { k: '速率限制', v: '300 RPM' },
          { k: '有效期', v: '永久' },
        ],
        points: ['全部模型可用', '优先调度队列'],
        price: '¥129',
        unit: '/ 月',
      },
    ],
  },
  {
    tab: '高并发推理',
    rows: [
      {
        name: '推理 · 进阶',
        fit: '在线 C 端业务',
        specs: [
          { k: '模型额度', v: '1 亿 Tokens' },
          { k: '并发请求', v: '50 QPS' },
          { k: '速率限制', v: '1,200 RPM' },
          { k: '有效期', v: '永久' },
        ],
        points: ['并发弹性扩容', '故障秒级切换'],
        price: '¥499',
        unit: '/ 月',
        ribbon: '热销',
      },
      {
        name: '推理 · 旗舰',
        fit: '高流量产品与平台',
        specs: [
          { k: '模型额度', v: '5 亿 Tokens' },
          { k: '并发请求', v: '200 QPS' },
          { k: '速率限制', v: '6,000 RPM' },
          { k: '有效期', v: '永久' },
        ],
        points: ['专属路由策略', '过载限流保护'],
        price: '¥1,999',
        unit: '/ 月',
      },
      {
        name: '推理 · 定制',
        fit: '超大峰值场景',
        specs: [
          { k: '模型额度', v: '20 亿 Tokens 起' },
          { k: '并发请求', v: '1,000 QPS' },
          { k: '速率限制', v: '不限' },
          { k: '有效期', v: '永久' },
        ],
        points: ['独立资源池', '专家护航支持'],
        price: '联系我们',
        unit: '',
      },
    ],
  },
  {
    tab: '离线批处理',
    rows: [
      {
        name: '批处理 · 标准',
        fit: '离线翻译与摘要',
        specs: [
          { k: '模型额度', v: '5,000 万 Tokens' },
          { k: '并发请求', v: '不限' },
          { k: '速率限制', v: '300 RPM' },
          { k: '有效期', v: '90 天' },
        ],
        points: ['错峰折扣计费', '失败自动重跑'],
        price: '¥99',
        unit: '/ 月',
      },
      {
        name: '批处理 · 大额',
        fit: '数据集全量处理',
        specs: [
          { k: '模型额度', v: '3 亿 Tokens' },
          { k: '并发请求', v: '不限' },
          { k: '速率限制', v: '不限' },
          { k: '有效期', v: '180 天' },
        ],
        points: ['错峰折扣计费', '批量任务看板'],
        price: '¥899',
        unit: '/ 月',
        ribbon: '高性价比',
      },
      {
        name: '批处理 · 超大',
        fit: '训练数据生产',
        specs: [
          { k: '模型额度', v: '20 亿 Tokens' },
          { k: '并发请求', v: '不限' },
          { k: '速率限制', v: '不限' },
          { k: '有效期', v: '365 天' },
        ],
        points: ['专属节点隔离', '进度实时回调'],
        price: '¥3,999',
        unit: '/ 月',
      },
    ],
  },
  {
    tab: '教育科研',
    rows: [
      {
        name: '校园版',
        fit: '高校教学与实验',
        specs: [
          { k: '模型额度', v: '200 万 Tokens' },
          { k: '并发请求', v: '5 QPS' },
          { k: '速率限制', v: '60 RPM' },
          { k: '有效期', v: '12 个月' },
        ],
        points: ['高校认证优惠', '全部模型可用'],
        price: '¥19',
        unit: '/ 月',
      },
      {
        name: '科研版',
        fit: '课题组与实验室',
        specs: [
          { k: '模型额度', v: '2,000 万 Tokens' },
          { k: '并发请求', v: '20 QPS' },
          { k: '速率限制', v: '300 RPM' },
          { k: '有效期', v: '12 个月' },
        ],
        points: ['模型评测工具', '用量报表导出'],
        price: '¥99',
        unit: '/ 月',
        ribbon: '公益支持',
      },
      {
        name: '非营利版',
        fit: '开源与非营利组织',
        specs: [
          { k: '模型额度', v: '5,000 万 Tokens' },
          { k: '并发请求', v: '20 QPS' },
          { k: '速率限制', v: '300 RPM' },
          { k: '有效期', v: '12 个月' },
        ],
        points: ['公益价支持', '社区优先审核'],
        price: '联系我们',
        unit: '',
      },
    ],
  },
]

/* ─── 产品动态 (阿里云式新闻流) ─── */
const NEWS = [
  { tag: '全新发布', t: 'GPT-5 与 Claude Sonnet 4.5 全量接入模型市场', date: '2026-10-08' },
  { tag: '产品升级', t: '计费系统 2.0 上线：分组倍率自动结算与账单导出', date: '2026-09-26' },
  { tag: '全新发布', t: '实时日志新增 Token 用量维度筛选与明细导出', date: '2026-09-12' },
  { tag: '功能优化', t: '数据看板支持按渠道健康度着色与异常告警', date: '2026-08-30' },
]

/* ─── 服务承诺 (火山引擎式四列) ─── */
const PROMISES = [
  { icon: Users, t: '专属客服', d: '企业客户配备专属成功经理，一对一对接接入与扩容' },
  { icon: Activity, t: '极速工单响应', d: '工单 15 分钟内响应，故障处理全程同步进展' },
  { icon: ShieldCheck, t: '全方位安全', d: '传输加密与密钥托管，支持私有化部署数据不出域' },
  { icon: RefreshCw, t: '数据可携带', d: '日志与账单随时导出，无供应商锁定，迁移自由' },
]

/* Hero 右侧迷你调用监控卡 */
function UsageCard() {
  const bars = [38, 52, 44, 61, 49, 70, 58, 64, 82, 74, 90, 78, 96, 84, 70, 88, 62, 74, 56, 68, 48, 58, 42, 50]
  return (
    <div className="relative">
      <div aria-hidden className="hero-card-grad absolute -right-3 -top-3 hidden h-full w-full rounded-2xl sm:block" />
      <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_2px_4px_rgba(24,48,110,0.04),0_28px_70px_-28px_rgba(24,48,110,0.28)]">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-semibold text-zinc-950">今日调用概览</div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            LIVE
          </span>
        </div>
        <div className="mt-5 flex items-center gap-6">
          {/* 成功率圆环 */}
          <svg width="118" height="118" viewBox="0 0 118 118" className="shrink-0">
            <circle cx="59" cy="59" r="50" fill="none" stroke="#eff2f7" strokeWidth="10" />
            <circle
              cx="59"
              cy="59"
              r="50"
              fill="none"
              stroke={BRAND}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="312.6 314.2"
              transform="rotate(-90 59 59)"
            />
            <text x="59" y="57" textAnchor="middle" className="fill-zinc-950" style={{ fontSize: 19, fontWeight: 700 }}>
              99.98%
            </text>
            <text x="59" y="75" textAnchor="middle" className="fill-zinc-400" style={{ fontSize: 10.5 }}>
              请求成功率
            </text>
          </svg>
          <div className="min-w-0 flex-1 space-y-3">
            {[
              { k: '请求数', v: '1,284,392' },
              { k: 'Tokens', v: '84.5 M' },
              { k: '平均延迟', v: '213 ms' },
            ].map((s) => (
              <div key={s.k} className="flex items-baseline justify-between gap-3 border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                <span className="text-[12px] text-zinc-500">{s.k}</span>
                <span className="font-code text-[14px] font-semibold tabular-nums text-zinc-950">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
        {/* 24h 迷你柱状 */}
        <div className="mt-5 border-t border-zinc-100 pt-4">
          <div className="flex h-14 items-end gap-[3px]">
            {bars.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${i === 12 ? 'bg-[#2563eb]' : 'bg-[#2563eb]/25'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-400">
            <span>00:00</span>
            <span>12:00</span>
            <span>24:00</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function T3Cloud({ siteName, stats }: TemplateProps) {
  const models = stats.models || 41
  const [tab, setTab] = useState(0)
  const rows = PLAN_TABS[tab].rows

  return (
    <div className="min-h-screen bg-white text-zinc-950 antialiased">
      {/* ─── 主导航 (static) ─── */}
      <header className="bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                <circle cx="3.6" cy="12.4" r="1.5" fill="#fff" />
                <path d="M3.6 10.9V8.2C3.6 6.4 5 5.4 6.8 5.4h4.1M8.9 3.5l2 1.9-2 1.9" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[15.5px] font-semibold tracking-tight">{siteName}</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {['产品', '定价', '文档'].map((l) => (
              <a key={l} href="#features" className="text-[13.5px] text-zinc-600 transition-colors hover:text-zinc-950">
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
              className="sb-press inline-flex h-9 items-center rounded-lg bg-[#2563eb] px-4.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1d4fd8]"
            >
              注册
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 产品子导航条 (sticky, 阿里云 ECS 式) ─── */}
      <div className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-5 px-6">
          <span className="hidden text-[13.5px] font-semibold text-zinc-950 sm:block">模型云服务</span>
          <span className="hidden h-4 w-px bg-zinc-200 sm:block" aria-hidden />
          <nav className="flex flex-1 items-center gap-6 overflow-x-auto">
            {[
              { l: '产品概述', h: '#overview' },
              { l: '产品功能', h: '#features' },
              { l: '选型与定价', h: '#plans' },
              { l: '产品动态', h: '#news' },
            ].map((t, i) => (
              <a
                key={t.l}
                href={t.h}
                className={`whitespace-nowrap border-b-2 py-2.5 text-[13px] transition-colors ${
                  i === 0 ? 'border-[#2563eb] font-medium text-[#2563eb]' : 'border-transparent text-zinc-600 hover:text-zinc-950'
                }`}
              >
                {t.l}
              </a>
            ))}
          </nav>
          <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
            <Link
              href="/console#/about"
              className="inline-flex h-7.5 items-center rounded-md border border-zinc-300 px-3 text-[12px] text-zinc-700 transition-colors hover:border-zinc-400"
            >
              接入文档
            </Link>
            <Link
              href="/console"
              className="inline-flex h-7.5 items-center rounded-md bg-[#2563eb] px-3 text-[12px] font-medium text-white transition-colors hover:bg-[#1d4fd8]"
            >
              进入控制台
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Hero: 左文右图 + 三层 CTA (腾讯云 CVM 式) ─── */}
      <section id="overview" className="biz-atmo relative scroll-mt-24 overflow-hidden">
        <div className="biz-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-14 md:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
            <Reveal>
              <div>
                {/* 公告 pill */}
                <a
                  href="#news"
                  className="inline-flex items-center gap-2 rounded-full bg-white/80 py-1 pl-1.5 pr-3 text-[12.5px] text-zinc-700 shadow-[0_1px_2px_rgba(24,48,110,0.06)] ring-1 ring-zinc-200/80 backdrop-blur transition-colors hover:text-zinc-950"
                >
                  <span className="rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">HOT</span>
                  模型市场秋季特惠：新客首月 5 折
                  <CaretRight size={11} className="text-zinc-400" />
                </a>
                <h1 className="mt-5 text-[38px] font-bold leading-[1.22] tracking-[-0.015em] sm:text-[52px]">
                  弹性可靠的
                  <br />
                  <span className="text-[#2563eb]">大模型云服务</span>
                </h1>
                <p className="mt-5 max-w-xl text-[14.5px] leading-[2] text-zinc-600">
                  统一网关接入 {models}+ 个主流模型，智能路由、令牌计费、数据看板一站配齐。
                  按量计费，分钟级开通，业务高峰期并发额度随时弹性扩容，像使用水、电一样使用大模型算力。
                </p>
                {/* 三层 CTA: 主按钮 + 次按钮 + 纯文字链接 (腾讯云式) */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <Link
                    href="/register"
                    className="sb-press inline-flex h-11 items-center gap-2 rounded-lg bg-[#2563eb] px-7 text-[14px] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(37,99,235,0.55)] transition-colors hover:bg-[#1d4fd8]"
                  >
                    立即选购
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/console#/about"
                    className="inline-flex h-11 items-center rounded-lg border border-zinc-300 bg-white/70 px-7 text-[14px] font-medium text-zinc-950 backdrop-blur transition-colors hover:border-zinc-400"
                  >
                    接入文档
                  </Link>
                  <div className="flex items-center gap-5">
                    <a href="#plans" className="group inline-flex items-center gap-1 text-[13.5px] font-medium text-[#2563eb]">
                      价格计算器
                      <CaretRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </a>
                    <a href="#advantage" className="group inline-flex items-center gap-1 text-[13.5px] font-medium text-[#2563eb]">
                      产品优势
                      <CaretRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={130}>
              <UsageCard />
            </Reveal>
          </div>

          {/* 四列卖点直排 (阿里云式无边框) */}
          <Reveal delay={80}>
            <div className="mt-14 grid gap-x-8 gap-y-6 border-t border-zinc-200/70 pt-9 sm:grid-cols-2 lg:grid-cols-4">
              {SELLING.map((s) => (
                <div key={s.t}>
                  <div className="text-[16.5px] font-semibold text-[#2563eb]">{s.t}</div>
                  <p className="mt-2 text-[12.5px] leading-[1.85] text-zinc-500">{s.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── 场景选型区: 下划线 Tab + 规格行卡 (腾讯云 CVM 式, 真交互) ─── */}
      <section id="plans" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="text-center">
              <h2 className="text-[28px] font-bold tracking-[-0.015em] md:text-[34px]">选一套适合业务场景的配置</h2>
              <p className="mx-auto mt-3 max-w-xl text-[13px] leading-[1.9] text-zinc-500">
                以下价格按标准倍率估算，实际费用因模型与用量而异，请在控制台账单中查看消费明细。
              </p>
            </div>
          </Reveal>
          {/* 下划线 Tab */}
          <Reveal delay={70}>
            <div className="mt-9 flex justify-start gap-8 overflow-x-auto border-b border-zinc-200 md:justify-center">
              {PLAN_TABS.map((p, i) => (
                <button
                  key={p.tab}
                  onClick={() => setTab(i)}
                  className={`relative whitespace-nowrap pb-3.5 text-[14.5px] transition-colors ${
                    i === tab ? 'font-semibold text-[#2563eb]' : 'text-zinc-500 hover:text-zinc-950'
                  }`}
                >
                  {p.tab}
                  {i === tab && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#2563eb]" />}
                </button>
              ))}
            </div>
          </Reveal>
          {/* 规格行卡 ×3 */}
          <div className="mt-8 space-y-4">
            {rows.map((r, i) => (
              <Reveal key={`${PLAN_TABS[tab].tab}-${r.name}`} delay={i * 70}>
                <div className="relative grid gap-0 overflow-visible rounded-xl border border-zinc-200/85 shadow-[0_1px_2px_rgba(9,9,11,0.03)] transition-shadow duration-200 hover:shadow-[0_18px_44px_-24px_rgba(24,48,110,0.28)] lg:grid-cols-[210px_1fr_190px]">
                  {r.ribbon && (
                    <span className="absolute -top-2 right-5 z-10 rounded-md bg-gradient-to-r from-[#f97316] to-[#ea580c] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(234,88,12,0.6)]">
                      {r.ribbon}
                    </span>
                  )}
                  {/* 左: 套餐名 */}
                  <div className="rounded-t-xl bg-gradient-to-b from-[#f0f6ff] to-[#f8fbff] p-5 lg:rounded-l-xl lg:rounded-tr-none">
                    <div className="text-[17px] font-bold text-zinc-950">{r.name}</div>
                    <div className="mt-1.5 text-[12px] text-zinc-500">{r.fit}</div>
                  </div>
                  {/* 中: 四格规格 + 勾选点 */}
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                      {r.specs.map((s) => (
                        <div key={s.k} className="rounded-lg bg-zinc-50 px-3 py-2.5 ring-1 ring-inset ring-zinc-100">
                          <div className="text-[10.5px] text-zinc-400">{s.k}</div>
                          <div className="mt-1 truncate font-code text-[12.5px] font-semibold tabular-nums text-zinc-900" title={s.v}>
                            {s.v}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                      {r.points.map((p) => (
                        <span key={p} className="flex items-center gap-1.5 text-[12px] text-zinc-600">
                          <Check size={12} className="text-[#2563eb]" />
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* 右: 价格 + 购买 */}
                  <div className="flex items-center justify-between gap-4 border-t border-zinc-100 p-5 lg:flex-col lg:items-end lg:justify-center lg:border-l lg:border-t-0">
                    <div className="leading-none">
                      <span className={`text-[26px] font-bold tabular-nums ${r.price === '联系我们' ? 'text-[18px]' : 'text-[#ea580c]'}`}>
                        {r.price}
                      </span>
                      <span className="ml-1 text-[11.5px] text-zinc-400">{r.unit}</span>
                    </div>
                    <Link
                      href="/register"
                      className="sb-press inline-flex h-9.5 shrink-0 items-center justify-center rounded-lg bg-[#2563eb] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#1d4fd8]"
                    >
                      立即选购
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={100}>
            <p className="mt-5 text-center text-[11.5px] text-zinc-400">
              所有不限制套餐均支持模型白名单与令牌级限速 · 额度用尽自动降级为按量计费，不会中断业务
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── 产品优势: 交替左图右文 (阿里云式, 真实数据可视化) ─── */}
      <section id="advantage" className="scroll-mt-24 border-y border-zinc-100 bg-[#fafbfc]">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="text-center">
              <h2 className="text-[28px] font-bold tracking-[-0.015em] md:text-[34px]">产品优势</h2>
              <p className="mx-auto mt-3 max-w-lg text-[13.5px] leading-[1.9] text-zinc-500">
                网关聚合多家上游渠道，以平台级工程能力保障调用连续性与成本可控。
              </p>
            </div>
          </Reveal>

          {/* 优势 1: SLA 圆环 (图左文右) */}
          <Reveal delay={80}>
            <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-[#e8f0fe] via-[#dbe9fe] to-[#cfe0fd] p-8 md:p-10">
                <div className="rounded-xl bg-white/90 p-6 shadow-[0_18px_44px_-26px_rgba(24,48,110,0.4)] backdrop-blur">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { n: '99.90%', l: '单渠道直连', ring: '#93b4f5' },
                      { n: '99.99%', l: '网关多路聚合', ring: BRAND },
                    ].map((r) => (
                      <div key={r.l} className="rounded-lg border border-zinc-100 p-4 text-center">
                        <svg width="96" height="96" viewBox="0 0 96 96" className="mx-auto">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="#eef2f7" strokeWidth="8" />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            fill="none"
                            stroke={r.ring}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="250.2 251.3"
                            transform="rotate(-90 48 48)"
                          />
                          <text x="48" y="53" textAnchor="middle" className="fill-zinc-950" style={{ fontSize: 14.5, fontWeight: 700 }}>
                            {r.n}
                          </text>
                        </svg>
                        <div className="mt-2 text-[11.5px] text-zinc-500">{r.l}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-[11px] text-zinc-400">近 30 天滚动统计 · 数据来源：平台公开状态页</p>
                </div>
              </div>
              <div>
                <h3 className="text-[22px] font-bold tracking-[-0.01em] md:text-[26px]">多渠道聚合，保障业务连续性</h3>
                <p className="mt-4 max-w-lg text-[13.5px] leading-[2] text-zinc-600">
                  同一模型自动配置多条上游渠道，权重调度、健康探测、故障切换全部在网关侧完成。
                  任一渠道异常时请求秒级迁移至备用渠道，你的业务不感知、不中断、不丢数据。
                </p>
                <a href="#plans" className="group mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#2563eb]">
                  查看更多
                  <CaretRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </Reveal>

          {/* 优势 2: 成本对比条 (文左图右) */}
          <Reveal delay={80}>
            <div className="mt-16 grid items-center gap-10 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <h3 className="text-[22px] font-bold tracking-[-0.01em] md:text-[26px]">智能路由与分组倍率，成本持续下降</h3>
                <p className="mt-4 max-w-lg text-[13.5px] leading-[2] text-zinc-600">
                  网关按价格、速度与可用性自动选择上游路径，并按分组倍率逐级下调费率。
                  业务规模越大、承诺用量越多，实际成本相对上游直连直连越低，账单全程透明可审计。
                </p>
                <a href="#plans" className="group mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#2563eb]">
                  查看更多
                  <CaretRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
              <div className="order-1 lg:order-2">
                <div className="rounded-2xl bg-gradient-to-br from-white to-[#e8f0fe] p-8 ring-1 ring-zinc-100 md:p-10">
                  <div className="rounded-xl bg-white p-6 shadow-[0_18px_44px_-26px_rgba(24,48,110,0.35)]">
                    <div className="text-[13px] font-semibold text-zinc-950">相对上游直连的调用成本</div>
                    <div className="mt-5 space-y-5">
                      {[
                        { l: '上游直连基线', v: 100, w: '100%', cls: 'bg-zinc-300', price: '¥100.0' },
                        { l: '网关智能路由', v: 86, w: '86%', cls: 'bg-[#7ea6f4]', price: '¥86.0' },
                        { l: '叠加分组倍率', v: 74, w: '74%', cls: 'bg-[#2563eb]', price: '¥74.0' },
                      ].map((b) => (
                        <div key={b.l}>
                          <div className="mb-1.5 flex items-center justify-between text-[12px]">
                            <span className="text-zinc-600">{b.l}</span>
                            <span className="font-code font-semibold tabular-nums text-zinc-950">{b.price}</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                            <div className={`h-full rounded-full ${b.cls}`} style={{ width: b.w }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-[11px] text-zinc-400">以旗舰模型每百万 Tokens 混合用量估算 · 仅为示意</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── 产品动态 (阿里云式新闻流) ─── */}
      <section id="news" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-[28px] font-bold tracking-[-0.015em] md:text-[34px]">产品动态</h2>
              <a href="/console#/about" className="group flex items-center gap-1 text-[13px] text-zinc-500 transition-colors hover:text-zinc-950">
                查看全部
                <CaretRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </Reveal>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {NEWS.map((n, i) => (
              <Reveal key={n.t} delay={i * 60}>
                <a
                  href="/console#/about"
                  className="group flex h-full flex-col rounded-xl border border-zinc-200/85 p-6 transition-all duration-200 hover:border-[#2563eb]/40 hover:shadow-[0_18px_40px_-26px_rgba(24,48,110,0.35)]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="rounded bg-[#eaf1fe] px-1.5 py-0.5 text-[11px] font-medium text-[#2563eb]">{n.tag}</span>
                    <span className="font-code text-[11px] text-zinc-400">{n.date}</span>
                  </div>
                  <div className="mt-3.5 flex-1 text-[15.5px] font-semibold leading-[1.6] text-zinc-950 transition-colors group-hover:text-[#2563eb]">
                    {n.t}
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[12px] text-zinc-400 transition-colors group-hover:text-[#2563eb]">
                    阅读详情
                    <CaretRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 服务承诺 (火山引擎式四列) ─── */}
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

      {/* ─── CTA 渐变通栏 ─── */}
      <section className="bg-white px-6 pb-20 pt-16">
        <Reveal>
          <div className="hero-card-grad relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-14 text-center text-white md:py-16">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-zinc-950/15" />
            <div className="relative">
              <h2 className="text-[26px] font-bold tracking-[-0.01em] md:text-[32px]">现在开始，三分钟完成第一次调用</h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.9] text-white/85">
                注册即送体验额度，替换 base_url 即完成接入；开源自部署，全部数据留在你自己的服务器里。
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                <Link
                  href="/register"
                  className="sb-press inline-flex h-11 items-center gap-2 rounded-lg bg-white px-7 text-[14px] font-semibold text-zinc-950 shadow-lg transition-colors hover:bg-white/95"
                >
                  免费开始
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/console#/about"
                  className="inline-flex h-11 items-center rounded-lg border border-white/50 px-7 text-[14px] font-medium text-white transition-colors hover:bg-white/10"
                >
                  查看接入文档
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-white/75">
                {['无需信用卡', 'Docker 一键部署', 'AGPL-3.0 开源'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check size={13} />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter siteName={siteName} />
    </div>
  )
}
