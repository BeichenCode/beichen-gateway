'use client'

/**
 * 模板 5 「卡片版」— 参照 Cal.com 官网
 * 灰底页面 + 巨型白色圆角卡承载首屏 (左文案右产品表单) + 信赖行 + 卡片式功能区
 */
import Link from 'next/link'
import { Check, ChevronLeft, ArrowRight } from '@/components/ph'
import { Reveal } from '../kit'
import { ConsoleShot } from '../sections'
import { LogoMark, SiteFooter, type TemplateProps } from './shared'

const TRUSTED = ['OpenAI', 'Anthropic', 'Gemini', 'DeepSeek', 'Qwen', 'Kimi', 'GLM', 'Grok']

/* 右侧产品表单: 创建令牌 (Cal.com 把预约表单放进首屏, 我们把创建令牌表单放进去) */
function TokenFormCard() {
  return (
    <div className="w-full max-w-[380px] rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.05),0_24px_60px_-28px_rgba(9,9,11,0.25)]">
      <div className="border-b border-zinc-100 px-5 py-3.5">
        <div className="flex items-center gap-2 text-[10.5px] text-zinc-400">
          <ChevronLeft size={12} /> 控制台 / 令牌 / 新建
        </div>
        <div className="mt-1 text-[15px] font-semibold text-zinc-950">创建新令牌</div>
      </div>
      <div className="space-y-4 px-5 py-4">
        <div>
          <div className="text-[11.5px] font-medium text-zinc-600">令牌名称</div>
          <div className="mt-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-[12.5px] text-zinc-900">生产环境</div>
        </div>
        <div>
          <div className="text-[11.5px] font-medium text-zinc-600">额度上限</div>
          <div className="mt-1.5 flex items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-2 text-[12.5px]">
            <span className="text-zinc-900">$500.00</span>
            <span className="text-[10px] text-zinc-400">▾</span>
          </div>
        </div>
        <div>
          <div className="text-[11.5px] font-medium text-zinc-600">可用模型</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {['gpt-5', 'claude-sonnet-4-5', 'gemini-2.5-pro'].map((m) => (
              <span key={m} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-code text-[10.5px] text-blue-700">
                <Check size={10} />
                {m}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 font-code text-[10.5px] text-zinc-400">+12</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-medium text-zinc-600">开启限速</div>
            <div className="text-[10.5px] text-zinc-400">每分钟最多 60 次请求</div>
          </div>
          <span className="flex h-5 w-9 items-center rounded-full bg-zinc-950 p-0.5">
            <span className="ml-auto h-4 w-4 rounded-full bg-white" />
          </span>
        </div>
      </div>
      <div className="border-t border-zinc-100 px-5 py-3.5">
        <div className="sb-press flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 text-[13px] font-medium text-white">
          创建令牌
          <ArrowRight size={14} />
        </div>
        <div className="mt-2.5 text-center font-code text-[10px] text-zinc-400">sk-prod-7f2…9d 将在创建后展示一次</div>
      </div>
    </div>
  )
}

export default function T5Card({ siteName }: TemplateProps) {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 antialiased">
      {/* 导航 (灰底) */}
      <header className="bg-zinc-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-[15px] font-semibold tracking-tight text-zinc-950">{siteName}</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {['产品', '企业版', '定价', '文档'].map((l) => (
              <a key={l} href="#features" className="text-[13.5px] text-zinc-600 transition-colors duration-200 hover:text-zinc-950">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13.5px] text-zinc-600 transition-colors hover:text-zinc-950">
              登录
            </Link>
            <Link
              href="/register"
              className="sb-press inline-flex h-9 items-center rounded-md bg-zinc-950 px-4 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
            >
              免费注册
            </Link>
          </div>
        </div>
      </header>

      {/* 巨型白色圆角卡 Hero */}
      <section className="px-4 pb-10 pt-4 md:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-zinc-200 bg-white px-7 py-12 shadow-[0_1px_2px_rgba(9,9,11,0.04),0_30px_70px_-40px_rgba(9,9,11,0.2)] md:px-14 md:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <Reveal>
              <a
                href="#features"
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12px] text-zinc-600 transition-colors hover:border-zinc-300"
              >
                {siteName} v2.18 现已发布
                <span className="text-zinc-400">›</span>
              </a>
              <h1 className="mt-6 text-[36px] font-bold leading-[1.12] tracking-[-0.03em] text-zinc-950 sm:text-[48px]">
                更可靠的模型调用方式，从这里开始
              </h1>
              <p className="mt-5 max-w-md text-[14.5px] leading-[1.9] text-zinc-600">
                为个人、团队与平台提供统一的模型接入层：签发令牌、设定额度、选择模型，创建过程不到一分钟。
              </p>
              <div className="mt-8 max-w-[340px] space-y-2.5">
                <Link
                  href="/register"
                  className="sb-press flex h-12 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
                >
                  使用 GitHub 继续
                </Link>
                <Link
                  href="/register"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-zinc-100 text-[14px] font-medium text-zinc-800 transition-colors duration-200 hover:bg-zinc-200"
                >
                  使用邮箱注册
                  <ArrowRight size={14} />
                </Link>
              </div>
              <p className="mt-4 text-[12.5px] text-zinc-400">开源免费 · 无需信用卡 · 数据自持</p>
            </Reveal>
            <Reveal delay={140} className="relative flex justify-center lg:justify-end">
              {/* 产品底板背衬: 蓝调面板 + 网格, 给表单卡视觉分量 */}
              <div aria-hidden className="absolute inset-x-2 inset-y-[-18px] rounded-2xl border border-[#2563eb]/15 bg-gradient-to-br from-[#eff5ff] to-[#e7eefc]" />
              <div aria-hidden className="dot-texture pointer-events-none absolute inset-x-2 inset-y-[-18px] rounded-2xl opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
              <div className="relative">
                <TokenFormCard />
                {/* 密钥揭示气泡: 产品感细节 */}
                <div className="absolute -right-5 -top-5 hidden rotate-1 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-[0_12px_32px_-14px_rgba(9,9,11,0.3)] sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="font-code text-[10.5px] text-zinc-600">sk-prod-7f2…9d 已创建</span>
                </div>
              </div>
            </Reveal>
          </div>
          {/* 卡内底部数据行: 填充留白, 增加密度 */}
          <div className="mt-14 grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 pt-8">
            {[
              { n: '41+', l: '已接入模型' },
              { n: '99.99%', l: '服务可用性' },
              { n: '1,200+', l: '生产实例' },
            ].map((s) => (
              <div key={s.l} className="px-4 text-center">
                <div className="text-[22px] font-bold tracking-tight text-zinc-950 tabular-nums">{s.n}</div>
                <div className="mt-1 text-[11.5px] text-zinc-400">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 信赖行 */}
      <section className="px-6 pb-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 py-6">
          <span className="text-[12.5px] text-zinc-400">受快速增长的团队信赖</span>
          <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-2">
            {TRUSTED.map((t) => (
              <span key={t} className="text-[15px] font-semibold tracking-tight text-zinc-400">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 产品大截图 */}
      <section className="px-4 pb-8 pt-8 md:px-6">
        <Reveal className="mx-auto max-w-6xl">
          <ConsoleShot />
        </Reveal>
      </section>

      {/* 卡片式功能区 */}
      <section id="features" className="scroll-mt-16 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-[26px] font-semibold tracking-[-0.02em] text-zinc-950 md:text-[32px]">
            一切就绪，开箱即用
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { t: '渠道即插即用', d: '粘贴上游 Key 即完成接入，自动拉取模型列表与健康探测，支持权重与优先级。' },
              { t: '额度精确可控', d: '令牌级额度、限速与模型白名单；分组倍率与兑换码体系，运营策略全部可配置。' },
              { t: '账单笔笔可查', d: '每一次调用都落库：模型、令牌、渠道、耗时、费用，多维透视并支持导出审计。' },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 70}>
                <div className="h-full rounded-2xl border border-zinc-200 bg-white p-6 transition-shadow duration-200 hover:shadow-[0_20px_50px_-28px_rgba(9,9,11,0.3)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-[12px] font-semibold text-white">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="mt-4 text-[16px] font-semibold text-zinc-950">{c.t}</div>
                  <p className="mt-2 text-[13.5px] leading-[1.85] text-zinc-500">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl rounded-3xl bg-zinc-950 px-8 py-14 text-center">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white md:text-[34px]">现在，接入第一个模型。</h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.9] text-zinc-400">
            克隆仓库、启动容器，五分钟拥有统一的大模型入口。
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/console"
              className="sb-press inline-flex h-11 items-center gap-2 rounded-md bg-white px-7 text-[14px] font-medium text-zinc-950 transition-colors duration-200 hover:bg-zinc-200"
            >
              进入控制台
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <div className="bg-white">
        <SiteFooter siteName={siteName} />
      </div>
    </div>
  )
}
