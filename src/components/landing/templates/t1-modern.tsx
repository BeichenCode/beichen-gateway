'use client'

/**
 * 模板 1 「现代版」— 居中 Hero + 完整产品大截图
 * 参照 Dub / Helicone / Twenty: 黑色主按钮 + 品牌蓝点亮标题第二行 + Langfuse 式统计条
 * 注: 本模板为预留设计稿 (当前官网默认渲染 enterprise.tsx);
 *     早期依赖的 ShotChips/StatStrip/FeatureSection 等组件已随 sections.tsx 精简移除。
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from '@/components/ph'
import { Reveal } from '../kit'
import { type Stats, ConsoleShot } from '../sections'
import { LogoMark, SiteFooter, type TemplateProps } from './shared'

const NAV_LINKS = [
  { href: '#features', label: '产品' },
  { href: '#deploy', label: '部署' },
  { href: '#metrics', label: '数据' },
  { href: '/console#/about', label: '文档' },
]

const UPSTREAMS = [
  'OpenAI', 'Anthropic', 'Google Gemini', 'DeepSeek', '通义千问', 'Moonshot Kimi',
  '智谱 GLM', '字节豆包', 'Azure OpenAI', 'AWS Bedrock', 'xAI Grok', '硅基流动',
]

function Navbar({ siteName }: { siteName: string }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white/85 backdrop-blur-md transition-colors duration-300 ${
        scrolled ? 'border-zinc-200' : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-950">{siteName}</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="nav-link text-[13.5px] text-zinc-500 transition-colors duration-200 hover:text-zinc-950">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="px-2 text-[13.5px] text-zinc-500 transition-colors duration-200 hover:text-zinc-950">
            登录
          </Link>
          <Link
            href="/console"
            className="sb-press inline-flex h-9 items-center rounded-md bg-zinc-950 px-4 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
          >
            进入控制台
          </Link>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-950 transition-colors md:hidden"
        >
          <span className="relative flex h-3.5 w-[18px] flex-col justify-between">
            <span className={`h-[1.5px] w-full rounded-full bg-current transition-all duration-300 ${menuOpen ? 'translate-y-[6px] rotate-45' : ''}`} />
            <span className={`h-[1.5px] w-full rounded-full bg-current transition-all duration-300 ${menuOpen ? 'scale-x-0 opacity-0' : ''}`} />
            <span className={`h-[1.5px] w-full rounded-full bg-current transition-all duration-300 ${menuOpen ? '-translate-y-[6px] -rotate-45' : ''}`} />
          </span>
        </button>
      </div>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden ${
          menuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-zinc-100 bg-white px-6 pb-6 pt-2">
            <nav className="flex flex-col">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="border-b border-zinc-100 py-3.5 text-[14px] text-zinc-600">
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-5 flex items-center justify-between">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="text-[13.5px] text-zinc-600">登录</Link>
              <Link href="/console" onClick={() => setMenuOpen(false)} className="inline-flex h-9 items-center rounded-md bg-zinc-950 px-4 text-[13px] font-medium text-white">
                进入控制台
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function T1Modern({ siteName }: TemplateProps) {
  return (
    <div className="min-h-screen bg-white text-zinc-950 antialiased">
      <div className="bg-zinc-950 text-center">
        <Link
          href="#features"
          className="group inline-flex items-center gap-2 px-4 py-2 text-[12px] text-zinc-300 transition-colors duration-200 hover:text-white"
        >
          <span className="rounded bg-white/10 px-1.5 py-px font-code text-[10px] text-white">v2.18</span>
          现已发布
          <span className="hidden sm:inline">— 支持 Claude Sonnet 4.5 与 DeepSeek V3.2</span>
          <span className="font-medium text-white underline decoration-zinc-600 underline-offset-2 transition-colors group-hover:decoration-white">
            查看更新
          </span>
        </Link>
      </div>
      <Navbar siteName={siteName} />

      <section className="biz-atmo relative overflow-hidden">
        <div aria-hidden className="biz-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-14 text-center md:pb-24 md:pt-20">
          <Reveal>
            <a
              href="#features"
              className="group inline-flex items-center overflow-hidden rounded-full border border-zinc-200 bg-white text-[12.5px] shadow-[0_1px_2px_rgba(9,9,11,0.04)]"
            >
              <span className="px-3.5 py-1.5 text-zinc-700">v2.18 现已发布</span>
              <span className="h-4 w-px bg-zinc-200" aria-hidden />
              <span className="flex items-center gap-1 px-3 py-1.5 text-zinc-500 transition-colors duration-200 group-hover:text-zinc-950">
                查看更新
                <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </a>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-7 max-w-3xl text-[42px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-950 sm:text-[58px] lg:text-[66px]">
              一个网关，
              <br />
              <span className="text-[#2080f0]">调用所有大模型</span>
            </h1>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-6 max-w-[560px] text-[15px] leading-[1.9] text-zinc-600 sm:text-base">
              OpenAI 协议统一接入 GPT、Claude、Gemini 与全部主流模型。内置渠道管理、智能路由、令牌分发与按量计费，单个
              Docker 镜像完成私有化部署。
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/register"
                className="sb-press group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-7 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-zinc-800 sm:w-auto"
              >
                免费开始使用
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/console#/about"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-7 text-[14px] font-medium text-zinc-700 transition-colors duration-200 hover:border-zinc-300 hover:text-zinc-950 sm:w-auto"
              >
                查看接入文档
              </Link>
            </div>
          </Reveal>
          <Reveal delay={280}>
            <div className="mt-7 font-code text-[11.5px] tracking-wide text-zinc-400">
              AGPL-3.0 开源 · Docker 一键部署 · SQLite 开箱即用
            </div>
          </Reveal>
          <Reveal delay={180} className="relative z-10 mt-14 md:mt-16">
            <ConsoleShot />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-3 px-6 py-7">
          <span className="font-code text-[10.5px] tracking-[0.2em] text-zinc-400">已适配上游</span>
          {UPSTREAMS.map((u) => (
            <span key={u} className="text-[13px] font-medium text-zinc-400 transition-colors duration-200 hover:text-zinc-950">
              {u}
            </span>
          ))}
        </div>
      </section>

      <SiteFooter siteName={siteName} />
    </div>
  )
}

export type { Stats }
