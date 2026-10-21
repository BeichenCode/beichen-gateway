'use client'

/**
 * 模板共享层: 品牌标记 / 页脚 / 模板 Props 契约
 * 8 套官网模板共用的基础设施; 页脚支持亮/暗双色板
 */
import Link from 'next/link'
import type { Stats } from '../sections'

export interface TemplateProps {
  siteName: string
  stats: Stats
}

export function LogoMark({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] ${
        dark ? 'bg-white' : 'bg-zinc-950'
      }`}
    >
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
        <circle cx="3.6" cy="12.4" r="1.5" fill={dark ? '#09090b' : '#ffffff'} />
        <path
          d="M3.6 10.9V8.2C3.6 6.4 5 5.4 6.8 5.4h4.1M8.9 3.5l2 1.9-2 1.9"
          stroke={dark ? '#09090b' : '#ffffff'}
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

const FOOTER_COLS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: '产品',
    links: [
      { label: '统一协议', href: '#features' },
      { label: '智能路由', href: '#features' },
      { label: '计费体系', href: '#features' },
    ],
  },
  {
    title: '资源',
    links: [
      { label: '接入文档', href: '/console#/about' },
      { label: '模型价格', href: '/console#/pricing' },
      { label: '部署指南', href: '#deploy' },
    ],
  },
  {
    title: '账号',
    links: [
      { label: '登录', href: '/login' },
      { label: '注册', href: '/register' },
      { label: '进入控制台', href: '/console' },
    ],
  },
]

export function SiteFooter({ siteName, dark = false }: { siteName: string; dark?: boolean }) {
  const line = dark ? 'border-zinc-800' : 'border-zinc-200'
  const lineSoft = dark ? 'border-zinc-800/70' : 'border-zinc-100'
  return (
    <footer className={`border-t ${line} ${dark ? 'bg-zinc-950' : 'bg-white'}`}>
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark dark={dark} />
              <span className={`text-[15px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-zinc-950'}`}>
                {siteName}
              </span>
            </Link>
            <p className={`mt-4 max-w-[280px] text-[13px] leading-[1.8] ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              OpenAI 兼容的多模型网关。一个入口，调用所有大模型。
            </p>
            <p className={`mt-5 flex items-center gap-1.5 font-code text-[11px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              所有系统正常运行
            </p>
          </div>
          {FOOTER_COLS.map((c) => (
            <div key={c.title}>
              <div className={`text-[12.5px] font-medium ${dark ? 'text-white' : 'text-zinc-950'}`}>{c.title}</div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className={`text-[13px] transition-colors duration-200 ${
                        dark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-950'
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className={`mt-12 flex flex-col gap-2 border-t ${lineSoft} pt-6 font-code text-[11px] ${
            dark ? 'text-zinc-500' : 'text-zinc-400'
          } sm:flex-row sm:items-center sm:justify-between`}
        >
          <span>© 2026 {siteName}</span>
          <span>AGPL-3.0 · OpenAI Compatible · Self-hosted</span>
        </div>
      </div>
    </footer>
  )
}
