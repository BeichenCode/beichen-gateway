'use client'

/**
 * Tab Lab 共享层 — 真实后台菜单数据 + 页签状态钩子 + 演示窗框架
 * 页签数据 = 后台真实菜单 (menus.ts), 绝无编造
 */
import { useEffect, useRef, useState } from 'react'
import {
  House, Cable, KeyRound, ScrollText, Tags, Users, Settings, X,
} from '@/components/ph'

export type IconComp = React.ComponentType<{ size?: number; className?: string }>

export interface LabTab {
  key: string
  label: string
  Icon: IconComp
  affix?: boolean
}

/** 与后台真实菜单一致的页签序列 (首页 affix 固定, 同 tabs store 行为) */
export const LAB_TABS: LabTab[] = [
  { key: '/dashboard', label: '数据看板', Icon: House, affix: true },
  { key: '/channel', label: '渠道管理', Icon: Cable },
  { key: '/token', label: '令牌管理', Icon: KeyRound },
  { key: '/logs', label: '调用日志', Icon: ScrollText },
  { key: '/pricing', label: '模型价格', Icon: Tags },
  { key: '/users', label: '用户管理', Icon: Users },
  { key: '/settings', label: '系统设置', Icon: Settings },
]

/** 每套方案独立的页签状态: 切换 / 关闭 (关闭激活页签时回退到邻位, 同后台行为) */
export function useLabTabs() {
  const [tabs, setTabs] = useState<LabTab[]>(LAB_TABS)
  const [active, setActive] = useState('/dashboard')

  const switchTo = (key: string) => setActive(key)

  const close = (key: string) => {
    const i = tabs.findIndex((t) => t.key === key)
    if (i < 0 || tabs[i].affix) return
    const next = tabs.filter((t) => t.key !== key)
    setTabs(next)
    if (active === key) {
      const n = next[i] ?? next[i - 1]
      if (n) setActive(n.key)
    }
  }

  const activeLabel = tabs.find((t) => t.key === active)?.label ?? ''
  return { tabs, active, activeLabel, switchTo, close }
}

/** 方案元信息 */
export interface VSpec {
  n: string
  name: string
  from: string
  desc: string
  bar: string
  tab: string
  active: string
  slider?: string
  iconActive?: boolean
  xInvert?: boolean
  /** Task 74 同款滑动白卡: thumb = 白卡类名, track = 凹槽轨道类名 */
  thumb?: string
  track?: string
}

/** 演示窗: 方案元信息 + 迷你窗口 (chrome 条 / 页签条 / 内容区) */
export function VariantCard({ v, activeLabel, children }: { v: VSpec; activeLabel: string; children: React.ReactNode }) {
  return (
    <section className="tl-card space-y-3.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="tl-chip">{v.n}</span>
        <h2 className="text-[15px] font-semibold">{v.name}</h2>
        <span className="tl-from">{v.from}</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--tl-mut)' }}>{v.desc}</p>
      <div className="tl-window">
        <div className="tl-chrome">
          <span className="tl-dot" style={{ background: '#ff5f57' }} />
          <span className="tl-dot" style={{ background: '#febc2e' }} />
          <span className="tl-dot" style={{ background: '#28c840' }} />
          <span className="tl-chrome-title">北辰中转站 · 管理后台</span>
        </div>
        {children}
        <div className="tl-content">
          <span className="tl-content-cap">当前页面</span>
          <span className="tl-content-label">{activeLabel}</span>
        </div>
      </div>
    </section>
  )
}

/** 通用页签渲染器: 7 套方案共用一套交互逻辑, 仅类名不同; 带 thumb 的方案量测驱动滑动白卡 */
export function TabBar({ v }: { v: VSpec }) {
  const { tabs, active, activeLabel, switchTo, close } = useLabTabs()
  const trackRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ left: 0, width: 0, ready: false })

  // 滑动白卡量测 (同后台 Task 74): 切换/增减/首帧/兜底均重量测
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => {
      const t = el.querySelector<HTMLElement>('[data-lab-active]')
      if (t) setThumb({ left: t.offsetLeft, width: t.offsetWidth, ready: true })
    }
    measure()
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure))
    const cal = setTimeout(measure, 420)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(cal)
    }
  }, [active, tabs.length])

  const nodes = tabs.map((t, i) => {
    const on = t.key === active
    const Icon = t.Icon
    return (
      <div
        key={t.key}
        onClick={() => switchTo(t.key)}
        data-lab-active={on ? '' : undefined}
        className={`tl-tab ${v.tab} ${on ? v.active : ''}`}
        style={{ animationDelay: `${i * 26}ms` }}
      >
        {on && v.slider ? <span aria-hidden className={v.slider} /> : null}
        <Icon size={14} className={`shrink-0 ${on && v.iconActive ? 'tl-icon-on' : ''}`} />
        <span>{t.label}</span>
        {!t.affix && (
          <button
            title="关闭"
            aria-label={`关闭 ${t.label}`}
            onClick={(e) => { e.stopPropagation(); close(t.key) }}
            className={`tl-x ${on && v.xInvert ? 'tl-x--onprimary' : ''}`}
          >
            <X size={11} />
          </button>
        )}
      </div>
    )
  })

  return (
    <VariantCard v={v} activeLabel={activeLabel}>
      <div className={`tl-bar ${v.bar}`}>
        {v.thumb ? (
          <div className={v.track} ref={trackRef}>
            {nodes}
            <span
              aria-hidden
              className={`${v.thumb}${thumb.ready ? ` ${v.thumb}--ready` : ''}`}
              style={{ left: thumb.left, width: thumb.width }}
            />
          </div>
        ) : (
          nodes
        )}
      </div>
    </VariantCard>
  )
}
