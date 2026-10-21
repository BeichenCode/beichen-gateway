'use client'

/**
 * 官网 — Arco Design 组件库全量重构 (Task 47)
 * ─────────────────────────────────────────────────────────────
 * 用户指令: 移除旧版自绘官网, 改用 Arco Design 设计体系重写。
 * 工程说明: 本项目为 Next.js 16 + React 19, 无法直接运行 Vue 版
 * @arco-design/web-vue / Ant-Design-Vue 4.x; 因此采用同一设计体系的
 * 官方 React 版 @arco-design/web-react (字节跳动 Arco Design,
 * 组件视觉规范与 web-vue 一致)。整页导航 / 表格 / 折叠面板 / 步骤条 /
 * 抽屉菜单 / 统计数字全部由 Arco 组件承载, 排版遵循 Arco 企业官网规范:
 * 1200px 容器 / 白与 #F7F8FA 交替分区 / 8px 间距节奏 / 单一主色 #165DFF。
 *
 * Task 42 真实数据纪律 (不可回退):
 *   - 所有数字直出 /api/public/stats 与 /api/public/models, 0 就显示 0
 *   - 吞吐 / 延迟 / 调用列仅当存在真实统计数据时才渲染
 *   - 无编造回落, 无假 KPI, 无假品牌墙, 无假吞吐数据
 */
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fmtNum, type Stats } from './sections'
import { ArrowRight, ArrowUpRight } from '@/components/ph'
import type { PublicModel } from '@/app/api/public/models/route'
import {
  CopyButton,
  IconBoltGW,
  IconLayersGW,
  IconNodesGW,
  OpenAIMark,
  PythonMark,
  useCountUp,
} from './kit'
import {
  BillingSection,
  CtaBand,
  DisclaimerSection,
  FaqSection,
  FeatureSection,
  ModelSquare,
  ModelTicker,
  NetworkBand,
  SiteFooter,
  StepsSection,
} from './enterprise-sections'

/**
 * Task 82 性能重构: 官网不再依赖 @arco-design/web-react —
 * Arco 被 Turbopack 整库拉入客户端包 (~441KB), 9 个组件的用量完全不值得这个代价。
 * Header/Hero 所需的 Menu/Drawer/Button/Tag/Grid/Space/Typography 全部以
 * 站内 Tailwind 体系原地重写, 视觉语言保持一致 (Arco primary #165DFF)。
 */

const NAVS = [
  { key: 'features', label: '产品能力' },
  { key: 'models', label: '模型广场' },
  { key: 'billing', label: '计费方式' },
  { key: 'start', label: '接入指南' },
  { key: 'faq', label: '常见问题' },
]

function scrollToKey(key: string) {
  document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ───── 官网本地化基础件 (替代 Arco 同名组件, 仅覆盖官网实际用量) ───── */

/** 主按钮: Arco type=primary 视觉 (primary #165DFF, hover #4080FF) */
function LandingBtn({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  long = false,
  onClick,
  type = 'button',
  ariaLabel,
}: {
  children?: React.ReactNode
  variant?: 'primary' | 'text' | 'secondary'
  loading?: boolean
  disabled?: boolean
  long?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  ariaLabel?: string
}) {
  const base = `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] text-sm transition-all duration-200 ${
    long ? 'h-10 w-full' : 'h-9 px-4'
  } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`
  const look =
    variant === 'primary'
      ? 'bg-[#165DFF] text-white shadow-[0_2px_8px_rgba(22,93,255,0.28)] hover:bg-[#4080FF] active:bg-[#0E42D2]'
      : variant === 'text'
        ? 'text-[#4E5969] hover:bg-[#f2f3f5] hover:text-[#1D2129]'
        : 'border border-[#e5e6eb] bg-white text-[#4E5969] hover:border-[#165DFF]/50 hover:text-[#165DFF]'
  return (
    <button type={type} aria-label={ariaLabel} disabled={disabled} onClick={onClick} className={`${base} ${look}`}>
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}

/** 标签 chip: Arco Tag 视觉 (浅底色签) */
function LandingTag({ color, children }: { color: 'arcoblue' | 'cyan' | 'purple'; children: React.ReactNode }) {
  const map = {
    arcoblue: 'bg-[#165DFF]/10 text-[#165DFF]',
    cyan: 'bg-[#14C9C9]/12 text-[#0AA5A8]',
    purple: 'bg-[#722ED1]/10 text-[#722ED1]',
  } as const
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium ${map[color]}`}>
      {children}
    </span>
  )
}

/** 移动端抽屉: Arco Drawer 视觉 (右滑 280px + 遮罩), unmountOnExit 语义
 *  Task 82: 必须 createPortal 到 body — header 的 backdrop-blur 会把 fixed
 *  劫持为局部定位 (Task 65 已知坑), 抽屉会被裁成 64px 高的小条 */
function LandingDrawer({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!visible || !mounted || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div className="ld-drawer-mask absolute inset-0 bg-[#1D2129]/45" onClick={onClose} />
      <div className="ld-drawer-panel absolute right-0 top-0 flex h-full w-[280px] flex-col bg-white shadow-[-4px_0_24px_rgba(29,33,41,0.1)]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e6eb] px-4">
          {title}
          <button
            type="button"
            aria-label="关闭菜单"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-[#86909C] transition-colors hover:bg-[#f2f3f5] hover:text-[#1D2129]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}

/* ───────────────────────── 顶部导航 ───────────────────────── */

function Header({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#e5e6eb]/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/logo.png"
            alt={`${siteName} logo`}
            width={32}
            height={32}
            priority
            className="h-8 w-8 object-contain"
          />
          <span className="text-[17px] font-semibold tracking-tight text-[#1D2129]">{siteName}</span>
        </Link>

        {/* 桌面导航 (原 Arco Menu horizontal): 纯 nav + 按钮, 高度对齐 h-16 */}
        <nav className="ml-8 hidden flex-1 items-center gap-1 md:flex" aria-label="官网导航">
          {NAVS.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => scrollToKey(n.key)}
              className="cursor-pointer px-3.5 py-2 text-[14px] text-[#4E5969] transition-colors duration-200 hover:text-[#165DFF]"
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 md:flex">
          {/* Task 65: 头部按钮同样纳入兜底脚本 (按压反馈); 不挂帷幕 —
              backdrop-blur-md 会使 fixed 帷幕被裁进头部条内 */}
          <Link href="/login" data-launch>
            <LandingBtn variant="text">登录</LandingBtn>
          </Link>
          <Link href="/console" data-launch>
            <LandingBtn>控制台</LandingBtn>
          </Link>
        </div>

        <div className="ml-auto shrink-0 md:hidden">
          <LandingBtn
            variant="text"
            ariaLabel="打开菜单"
            onClick={() => setOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </LandingBtn>
        </div>
      </div>

      <LandingDrawer
        visible={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="text-[15px] font-semibold">{siteName}</span>
          </span>
        }
      >
        <div className="flex flex-col">
          {NAVS.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => {
                setOpen(false)
                scrollToKey(n.key)
              }}
              className="cursor-pointer rounded px-2 py-3 text-left text-[15px] text-[#4E5969] transition-colors hover:bg-[#f7f8fa] hover:text-[#165DFF]"
            >
              {n.label}
            </button>
          ))}
        </div>
        <div className="my-4 h-px bg-[#e5e6eb]" />
        <div className="flex flex-col gap-3">
          <Link href="/login" data-launch onClick={() => setOpen(false)}>
            <LandingBtn variant="secondary" long>
              登录
            </LandingBtn>
          </Link>
          <Link href="/console" data-launch onClick={() => setOpen(false)}>
            <LandingBtn long>进入控制台</LandingBtn>
          </Link>
        </div>
      </LandingDrawer>
    </header>
  )
}

/* ───────────────────────── Hero ───────────────────────── */

/** 客户端网关地址兑底: SSR 阶段为空, 客户端挂载后回填当前 origin。
 *  正常路径用不到它 — page.tsx 已服务端直出真实网关 (ServerAddress → 请求头推导)
 *  作为 gateway prop 传入, 首帧即真; 本 hook 仅在 prop 为空时兑底。 */
function useOrigin(): string {
  const [origin, setOrigin] = useState('')
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  return origin
}

/** 完整版片段: base_url 用站点真实网关地址 */
const codeSnippet = (baseUrl: string) => `from openai import OpenAI

client = OpenAI(
    api_key="sk-xxxx",
    base_url="${baseUrl}/v1",
)

resp = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "你好"}],
)`

/** 浮层紧凑版: 只保留认证三行, 避免盖过主视觉; 两空格缩进保证窄卡不截断 */
const codeMini = (baseUrl: string) => `from openai import OpenAI

client = OpenAI(
  api_key="sk-xxxx",
  base_url="${baseUrl}/v1",
)`

/* ── Task 57: 代码窗重设计 — 浅色玻璃代码卡 ─────────────────────────────
 * 用户反馈深色代码窗在全站浅色 Arco 风格中割裂感强 (黑块压插画、
 * macOS 红绿灯装饰老套且彩点游离于蓝/青/紫色板之外)。重做为与
 * 统计带/读数卡同一设计语言:
 *   · 浅色玻璃卡 (白→浅蓝渐变底 + 发丝描边 + 品牌蓝调柔影)
 *   · 顶部三色渐变发丝线, 与读数卡 .ld-card-hairline 同语言
 *   · 渐变语言徽章 (PY 芯片) 替代红绿灯, 复制按钮改白底芯片
 *   · 代码高亮换 Arco 浅底色板 (蓝/紫/绿/橙, 与全站六色体系同源)
 *   · 桌面端「托盘式」居中悬挂于配图卡下缘, 不再遮挡插画主体
 * 静态片段不引第三方高亮库, 单条正则分词即可。 */
const PY_TOKEN_RE =
  /("(?:[^"\\]|\\.)*")|\b(from|import)\b|\b(OpenAI)\b|\b(api_key|base_url|model|messages|role|content)\b|([=()[\]{},:.])|([A-Za-z_][A-Za-z0-9_.]*)/g
const TOK_COLOR: Record<number, string> = {
  1: '#009A29', // 字符串 → 绿 (Arco green-7, 白底对比达标)
  2: '#722ED1', // from/import → 紫 (Arco purple-6)
  3: '#165DFF', // OpenAI 类名 → 品牌蓝 (Arco arcoblue-6)
  4: '#D25F00', // 参数名 → 橙 (Arco orange-7)
  5: '#86909C', // 标点/操作符 → 灰 (Arco gray-6)
}

function highlightPy(code: string): React.ReactNode[][] {
  return code.split('\n').map((line) => {
    const out: React.ReactNode[] = []
    let last = 0
    let i = 0
    PY_TOKEN_RE.lastIndex = 0
    for (let m = PY_TOKEN_RE.exec(line); m; m = PY_TOKEN_RE.exec(line)) {
      if (m.index > last) {
        out.push(
          <span key={`p${i++}`}>{line.slice(last, m.index)}</span>,
        )
      }
      let color: string | undefined
      for (let g = 1; g <= 5; g++) {
        if (m[g] !== undefined) {
          color = TOK_COLOR[g]
          break
        }
      }
      out.push(
        <span key={`t${i++}`} style={color ? { color } : undefined}>
          {m[0]}
        </span>,
      )
      last = m.index + m[0].length
    }
    if (last < line.length) {
      out.push(<span key={`p${i++}`}>{line.slice(last)}</span>)
    }
    return out
  })
}

function HeroCode({ compact = false, gateway = '' }: { compact?: boolean; gateway?: string }) {
  const origin = useOrigin()
  // 优先级: 服务端直出的真实网关 > 客户端 origin > 中性占位 (三者均非编造域名)
  const gwBase = gateway || origin || 'https://your-gateway.example.com'
  const code = compact ? codeMini(gwBase) : codeSnippet(gwBase)
  const lines = useMemo(() => highlightPy(code), [code])
  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e6eb] bg-[linear-gradient(180deg,#FFFFFF,#F3F7FF)] shadow-[0_30px_70px_-28px_rgba(22,93,255,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_84px_-28px_rgba(22,93,255,0.4)]">
      {/* 顶部三色渐变发丝线 (与读数卡发丝线同语言) */}
      <div
        aria-hidden
        className="h-[2px] w-full bg-[linear-gradient(90deg,#165DFF_0%,#14C9C9_52%,#722ED1_100%)] opacity-75"
      />
      <div className="flex h-11 items-center gap-2.5 border-b border-[#eef1f7] bg-white/70 px-3.5">
        {/* Task 58: Python × OpenAI 双品牌标替代字母徽章 */}
        <span className="flex items-center gap-1" aria-hidden>
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-[#e5e6eb] bg-white shadow-[0_2px_6px_-2px_rgba(29,33,41,0.14)]">
            <PythonMark size={13} />
          </span>
          <span className="text-[10px] leading-none text-[#C9CDD4]">×</span>
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-[#e5e6eb] bg-white shadow-[0_2px_6px_-2px_rgba(29,33,41,0.14)]">
            <OpenAIMark size={13} />
          </span>
        </span>
        <span className="text-[12px] font-medium text-[#4E5969]">Python · OpenAI 兼容</span>
        <span className="ml-auto">
          <CopyButton
            text={code}
            className="rounded-md border-[#dfe3ee] bg-white/80 text-[#86909C] shadow-[0_2px_6px_-2px_rgba(29,33,41,0.14)] hover:border-[#165DFF]/40 hover:text-[#165DFF]"
          />
        </span>
      </div>
      {/* text-size-adjust: 夹克浏览器 (夸克/UC 等) 对宽块强字体会膨胀到 ~14px 导致长行截断, 此处显式关掉 */}
      <div
        className="overflow-x-auto py-3"
        style={{ WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' } as React.CSSProperties}
      >
        {lines.map((toks, idx) => (
          <div key={idx} className="flex items-start whitespace-pre font-mono">
            {/* Task 56: 字号用内联 style — Arco 未分层 reset (code,kbd,samp{1em} + body 14px)
                会压过 Tailwind layered utilities, 类名字号从未生效过 */}
            <span
              aria-hidden
              className="w-[30px] shrink-0 select-none pl-3 pr-2 text-right tabular-nums text-[#C9CDD4] lg:w-[44px] lg:pl-4 lg:pr-3"
              style={{ fontSize: compact ? 9 : 10.5, lineHeight: compact ? 1.9 : 1.95 }}
            >
              {idx + 1}
            </span>
            <code
              className="pr-4 text-[#1D2129]"
              style={{ fontSize: compact ? 10 : 12.5, lineHeight: compact ? 1.9 : 1.95 }}
            >
              {toks.length ? toks : '\u00a0'}
            </code>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Hero 右侧视觉: 网关 3D 配图为主体 + 浮层真实数据徽章 + 浮层代码窗,
 * 分层错位构图营造深度 (配图为 Task 48 新增, 数据徽章仍直出真实接口)。
 */
function HeroVisual({ stats, gateway = '' }: { stats: Stats; gateway?: string }) {
  return (
    <div className="relative">
      {/* Task 54: 配图卡背后三色光晕 (蓝/青/紫), 打破白底单调 */}
      <div aria-hidden className="ld-hero-glow pointer-events-none absolute -inset-9 z-0 rounded-[36px]" />
      {/* 主视觉: 等距插画配图 (Task 52 由 AI 重新生成) */}
      <div className="relative z-10 overflow-hidden rounded-2xl border border-[#e5e6eb] bg-white shadow-[0_48px_90px_-46px_rgba(29,33,41,0.4)]">
        <Image
          src="/images/landing/team-board.png"
          alt="统一大模型网关：团队围绕看板管理渠道与模型"
          width={508}
          height={381}
          priority
          className="h-auto w-full"
        />
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/60" aria-hidden />
      </div>
      {/* 浮层: 真实数据徽章 (预置计价数直出接口) */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 shadow-[0_10px_28px_-10px_rgba(29,33,41,0.35)] backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00b42a] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00b42a]" />
        </span>
        <span className="text-[12.5px] font-medium text-[#1D2129]">已预置 {stats.models} 款模型计价</span>
      </div>
      {/* 浮层: 代码卡 — Task 57 托盘式构图: 桌面端居中悬挂于配图卡下缘 (水平超出插画作层叠,
          不遮挡插画主体), 移动端独立成块置于图下 */}
      <div className="relative z-20 mx-auto mt-5 w-full lg:absolute lg:-bottom-12 lg:left-1/2 lg:mt-0 lg:w-[440px] lg:-translate-x-1/2">
        <HeroCode compact gateway={gateway} />
      </div>
    </div>
  )
}

/**
 * Hero 统计带 (Task 55 重设计):
 * 玻璃质感横向卡片 + 渐变图标芯片 + 渐变数字 + 渐隐分隔线, 等宽三列彻底对齐;
 * 数字带 ease-out 滚动入场。真实数据纪律: 41/0/0 直出接口, 滚动只是呈现动画。
 */
function HeroStatBand({ stats }: { stats: Stats }) {
  const models = useCountUp(stats.models)
  const channels = useCountUp(stats.channels)
  const requests = useCountUp(stats.requests)
  const items = [
    {
      label: '预置计价模型',
      display: models.toLocaleString(),
      icon: <IconLayersGW size={20} />, c1: '#4080FF', c2: '#165DFF',
    },
    {
      label: '启用渠道',
      display: channels.toLocaleString(),
      icon: <IconNodesGW size={20} />, c1: '#3FD1CE', c2: '#0FB8B8',
    },
    {
      label: '累计请求',
      display: fmtNum(requests),
      icon: <IconBoltGW size={20} />, c1: '#A871E3', c2: '#722ED1',
    },
  ]
  return (
    <div className="ld-statband mt-14" role="list" aria-label="平台实时统计">
      {items.map((it) => (
        <div
          key={it.label}
          role="listitem"
          className="ld-statcell"
          style={{ '--c1': it.c1, '--c2': it.c2 } as React.CSSProperties}
        >
          <span className="ld-stat-ico" aria-hidden>
            {it.icon}
          </span>
          <span className="ld-stat-meta">
            <b className="ld-stat-num">{it.display}</b>
            <i className="ld-stat-label">{it.label}</i>
          </span>
        </div>
      ))}
    </div>
  )
}

function Hero({ stats, gateway = '' }: { stats: Stats; gateway?: string }) {
  // Task 58/59: 点击后按钮进入 Arco 自带 loading (旋转图标) + 文案切换
  // Task 64: 路由提速后切换仅 ~64ms, 按钮动画一闪而过形同没有 (用户反馈「点击没动画」)。
  // 改为点击后先播 450ms 可感知的反馈动画, 期间 router.prefetch 预热目标路由,
  // 动画播完再 push — 反馈看得见, 跳转依旧秒达 (450ms 远短于开屏的节奏, 不显拖沓)
  const router = useRouter()
  const [pending, setPending] = useState<'start' | 'docs' | null>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const go = (key: 'start' | 'docs', href: string) => {
    if (pending) return
    setPending(key)
    router.prefetch(href) // 点击瞬间预热 RSC (dev 为 no-op, 由路由骨架兜底); 动画窗口掩盖传输
    setTimeout(() => {
      if (alive.current) router.push(href) // 动画期内用户改点其他链接则放弃本次跳转
    }, 450)
  }
  return (
    <section className="relative overflow-hidden border-b border-[#e5e6eb]/60 bg-white">
      {/* Task 54 去单调: 三色极光柔光团 + 渐隐网格纹理 (企业级克制剂量) */}
      <div aria-hidden className="ld-aurora pointer-events-none absolute inset-0" />
      <div aria-hidden className="ld-grid-tex pointer-events-none absolute inset-0" />
      {/* 原 Arco Row/Col gutter=56 (xs 上下堆叠, lg 13:11 分栏) → CSS Grid 等价实现 */}
      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-6 py-16 md:py-24 lg:grid-cols-[13fr_11fr] lg:gap-14">
        <div className="relative">
          <div className="flex flex-wrap gap-2">
            <LandingTag color="arcoblue">OpenAI 协议兼容</LandingTag>
            <LandingTag color="cyan">多渠道路由</LandingTag>
            <LandingTag color="purple">精细计费审计</LandingTag>
          </div>
          <h1
            style={{
              fontSize: 46,
              lineHeight: 1.28,
              letterSpacing: '-0.02em',
              marginTop: 20,
              marginBottom: 0,
              textWrap: 'balance',
            }}
          >
            一个网关，
            <span className="ld-grad-text">统一接入</span>
            <br className="hidden lg:inline" aria-hidden />
            所有大模型
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.9, color: '#4E5969', marginTop: 18, marginBottom: 0, maxWidth: 560 }}>
            统一 OpenAI / Claude / Gemini 协议接入，多渠道路由与负载均衡，令牌分发与额度管控，
            按 Token / 按次精细计费，全量调用日志可审计。
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {/* Task 64/65: Link 保留 (生产视口预取)。点击反馈双层制 —
                水合后: React go() 先播 450ms spinner 再跳转 (Task 64);
                水合前: layout 内联脚本兜底, 按压+帷幕 450ms 后原生跳转 (Task 65)。
                data-launch = 兜底脚本锚点; cta-veil-ok = 允许挂全屏帷幕
                (Header 内有 backdrop-blur 会劫持 fixed, 故头部按钮不挂帷幕) */}
            <Link
              href="/register"
              data-launch
              className="cta-veil-ok"
              onClick={(e) => {
                e.preventDefault()
                go('start', '/register')
              }}
            >
              <LandingBtn
                loading={pending === 'start'}
                disabled={pending !== null && pending !== 'start'}
              >
                {pending === 'start' ? '正在进入…' : '免费开始'}
                <ArrowRight size={15} />
              </LandingBtn>
            </Link>
            <Link
              href="/console#/about"
              data-launch
              className="cta-veil-ok"
              onClick={(e) => {
                e.preventDefault()
                go('docs', '/console#/about')
              }}
            >
              <LandingBtn
                variant="secondary"
                loading={pending === 'docs'}
                disabled={pending !== null && pending !== 'docs'}
              >
                {pending === 'docs' ? '正在打开…' : '查看接入文档'}
                <ArrowUpRight size={15} />
              </LandingBtn>
            </Link>
          </div>
          <HeroStatBand stats={stats} />
        </div>
        <div className="relative mt-12 lg:mt-2">
          <HeroVisual stats={stats} gateway={gateway} />
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── 页面组装 ───────────────────────── */

export default function EnterpriseSite({
  siteName,
  stats,
  modelStats,
  loadingModels,
  gateway = '',
  cnyRate = 7.3,
}: {
  siteName: string
  stats: Stats
  modelStats: PublicModel[]
  loadingModels: boolean
  gateway?: string
  cnyRate?: number
}) {
  return (
    <div
      className="min-h-screen bg-white text-[#1D2129]"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      <Header siteName={siteName} />
      {/* Task 204: overflow-x-clip 消 arco Row 负 margin 溢出 (gutter 半宽负 margin 在 xs 单列下仍生效, body 曾被撑到 383px) */}
      <main className="overflow-x-clip">
        <Hero stats={stats} gateway={gateway} />
        <ModelTicker models={modelStats} />
        <FeatureSection />
        <NetworkBand stats={stats} />
        <ModelSquare stats={stats} modelStats={modelStats} loadingModels={loadingModels} cnyRate={cnyRate} />
        <BillingSection />
        <StepsSection />
        <FaqSection />
        <DisclaimerSection />
        <CtaBand />
      </main>
      <SiteFooter siteName={siteName} />
    </div>
  )
}
