'use client'

/**
 * 模板 6 「字报版」— 参照高质量编辑部 / 报刊排版 (NYT / 卷宗 Wallpaper 式中文报刊)
 * 宋体大标题 + 报刊红 kicker + 发丝线索引行 + 带图注的产品图版 + 衬线大数字
 */
import Link from 'next/link'
import { ArrowUpRight } from '@/components/ph'
import { Reveal } from '../kit'
import { ConsoleShot, fmtNum } from '../sections'
import { SiteFooter, type TemplateProps } from './shared'

const SERIF = { fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif" }

/* 索引行: 编号 + 标题 + 摘要 + 数据角标 */
const INDEX = [
  { no: '01', t: '统一协议', d: 'OpenAI 格式调用全部厂商，换模型只改一个字段。', stat: '41+ 模型' },
  { no: '02', t: '智能路由', d: '多通道加权调度，故障秒级切换，业务永远在线。', stat: '99.99% SLA' },
  { no: '03', t: '令牌计费', d: '令牌级额度与限速，账单精确到每一次调用。', stat: '按量计费' },
  { no: '04', t: '私有部署', d: '单个 Docker 镜像，数据全部留在你的服务器。', stat: 'AGPL-3.0' },
]

export default function T6Editorial({ siteName, stats }: TemplateProps) {
  return (
    <div className="min-h-screen bg-[#fdfcf9] text-zinc-950 antialiased" style={SERIF}>
      {/* 报头 */}
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-[19px] font-bold tracking-[0.02em]">
            {siteName}
            <span className="ml-2.5 align-middle font-sans text-[10.5px] font-normal tracking-[0.18em] text-zinc-400">EST. 2023</span>
          </Link>
          <nav className="hidden items-center gap-8 font-sans md:flex">
            {['产品', '定价', '文档', '控制台'].map((l) => (
              <a key={l} href="#index" className="text-[13px] text-zinc-600 transition-colors duration-200 hover:text-zinc-950">
                {l}
              </a>
            ))}
          </nav>
          <Link
            href="/register"
            className="sb-press border border-zinc-900 bg-zinc-950 px-4 py-1.5 font-sans text-[12.5px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
          >
            免费开始
          </Link>
        </div>
      </header>

      {/* 头版: kicker + 巨号宋体标题 + 导语 */}
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-16 md:pt-20">
        <Reveal>
          <div className="flex items-center gap-3 font-sans text-[12px] tracking-[0.22em] text-[#b42318]">
            <span className="h-px w-8 bg-[#b42318]" />
            开源 · 大模型统一网关
          </div>
          <div className="mt-7 grid items-end gap-10 md:grid-cols-[1.5fr_1fr]">
            <h1 className="text-[52px] font-black leading-[1.18] tracking-[0.005em] sm:text-[76px]">
              所有模型，
              <br />
              一个入口。
            </h1>
            <div className="border-l-2 border-zinc-900 pl-6">
              <p className="text-[15px] leading-[2.1] text-zinc-700">
                {siteName} 把 GPT、Claude、Gemini 与全部主流国产模型装进同一个 OpenAI 兼容入口。统一协议、智能路由、按量计费，一个
                Docker 镜像，跑在你自己的服务器上。
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4 font-sans">
                <Link
                  href="/register"
                  className="sb-press inline-flex items-center gap-2 bg-zinc-950 px-6 py-3 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
                >
                  开始使用
                </Link>
                <a href="#index" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-950 hover:decoration-zinc-950">
                  阅读产品说明
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 头条索引: 发丝线行 + 数据角标 */}
      <section id="index" className="scroll-mt-16 border-y border-zinc-900/80">
        <div className="mx-auto max-w-6xl px-6">
          {INDEX.map((x, i) => (
            <Reveal key={x.no} delay={i * 60}>
              <div className={`group grid cursor-pointer grid-cols-[44px_1fr] items-baseline gap-4 py-6 transition-colors duration-200 hover:bg-white sm:grid-cols-[64px_240px_1fr_120px] ${i > 0 ? 'border-t border-zinc-200' : ''}`}>
                <span className="font-sans text-[12px] tracking-widest text-zinc-400">{x.no}</span>
                <span className="text-[24px] font-bold leading-tight transition-transform duration-300 group-hover:translate-x-1">{x.t}</span>
                <span className="col-span-2 mt-1 font-sans text-[13px] leading-[1.9] text-zinc-500 sm:col-span-1 sm:mt-0">{x.d}</span>
                <span className="col-span-2 mt-1 flex items-center justify-between font-sans text-[11.5px] text-zinc-500 sm:col-span-1 sm:mt-0 sm:justify-end sm:gap-2">
                  {x.stat}
                  <ArrowUpRight size={14} className="text-zinc-300 transition-colors duration-200 group-hover:text-[#b42318]" />
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 图版: 产品大截图 + 报刊图注 */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <Reveal>
          <div className="border border-zinc-900/85 bg-white p-2.5 shadow-[6px_6px_0_0_rgba(9,9,11,0.9)]">
            <div className="overflow-hidden border border-zinc-200">
              <ConsoleShot />
            </div>
          </div>
          <p className="mt-4 flex items-baseline justify-between font-sans text-[11.5px] text-zinc-500">
            <span>
              <b className="font-semibold text-zinc-800">图 1</b> —— {siteName} 控制台：请求趋势、模型调用与最近日志
            </span>
            <span className="hidden sm:inline">数据每 10 秒刷新</span>
          </p>
        </Reveal>
      </section>

      {/* 数据版式: 衬线巨号数字 */}
      <section className="border-y border-zinc-900/80 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-zinc-200 px-0 md:grid-cols-4">
          {[
            { n: `${stats.models || 41}+`, l: '已接入模型' },
            { n: stats.requests ? fmtNum(stats.requests) : '40 亿+', l: '累计处理请求' },
            { n: stats.tokens ? fmtNum(stats.tokens) : '4.2 万亿', l: '累计处理 Tokens' },
            { n: '99.99%', l: '服务可用性' },
          ].map((i) => (
            <Reveal key={i.l}>
              <div className="bg-white px-6 py-10 text-center">
                <div className="text-[34px] font-black tracking-tight tabular-nums">{i.n}</div>
                <div className="mt-2 font-sans text-[11.5px] tracking-[0.14em] text-zinc-500">{i.l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 言论版: 大字引言 */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center md:py-20">
        <Reveal>
          <div className="font-sans text-[11.5px] tracking-[0.24em] text-[#b42318]">本报评论</div>
          <blockquote className="mt-6 text-[26px] font-bold leading-[1.7] tracking-[0.01em] sm:text-[32px]">
            “把模型的选择交给网关，
            <br className="hidden sm:block" />
            把业务的成败留给自己。”
          </blockquote>
          <p className="mt-6 font-sans text-[13px] leading-[1.95] text-zinc-500">
            上游价格、配额与可用性时刻在变。与其把命运押在某一家厂商上，不如让网关替你盯着每一家的水位——哪家用得起、用得稳，流量就去哪。
          </p>
        </Reveal>
      </section>

      {/* 尾版 CTA */}
      <section className="border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-14 md:flex-row md:items-center">
          <div className="text-white">
            <div className="text-[26px] font-bold leading-snug md:text-[30px]">现在，接入第一个模型。</div>
            <p className="mt-2 font-sans text-[13px] text-zinc-400">开源自托管，无订阅费；全部数据留在你自己的服务器里。</p>
          </div>
          <Link
            href="/register"
            className="sb-press inline-flex shrink-0 items-center gap-2 border border-white bg-white px-8 py-3.5 font-sans text-[14px] font-medium text-zinc-950 transition-colors duration-200 hover:bg-zinc-200"
          >
            免费开始
          </Link>
        </div>
      </section>

      <SiteFooter siteName={siteName} />
    </div>
  )
}
