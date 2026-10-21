'use client'

/**
 * 官网公共组件: 滚动渐显 / 拷贝按钮
 */
import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from '@/components/ph'
import { copyText } from '@/lib/utils'

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      // rootMargin 底部外扩 120px: 元素尚未完全进入视口即开始入场, 动画衔接更从容
      { threshold: 0.1, rootMargin: '0px 0px 120px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-7 opacity-0'} ${className}`}
    >
      {children}
    </div>
  )
}

export function CopyButton({
  text,
  light = false,
  className = '',
}: {
  text: string
  light?: boolean
  className?: string
}) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={() => {
        void copyText(text).then(() => {
          setOk(true)
          setTimeout(() => setOk(false), 1600)
        })
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-sm transition-colors ${
        light
          ? 'text-white/40 hover:bg-white/10 hover:text-white'
          : 'border border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
      } ${className}`}
      aria-label="复制代码"
    >
      {ok ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  )
}

/**
 * 数字滚动 (Task 55): ease-out cubic 计数动画, 目标值变化时重新计数。
 * 真实数据纪律: 仅做「真实数值」的呈现动画, 不改变数值本身, 0 就滚动到 0。
 * prefers-reduced-motion 用户直接显示终值, 不做动画。
 */
export function useCountUp(target: number, duration = 950): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (target === 0) {
      setV(0)
      return
    }
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setV(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      // clamp: rAF 帧时间戳可能早于 t0 (vsync 起点), 负 p 会产生负数帧
      const p = Math.max(0, Math.min(1, (t - t0) / duration))
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return v
}

/* ── 官网共享线性图标 (Task 58) ─────────────────────────────────────
 * 替代 Arco IconApps / IconCloud / IconThunderbolt (用户反馈「不好看」):
 * Lucide 风格自绘 SVG, 统一 1.8 描边 + 圆角端点 + currentColor,
 * 在渐变芯片上白色线性笔触比 fill 图标更精致现代。
 * 默认 '1em' 与 Arco 图标尺寸行为一致, 可用 size 覆盖。 */

export function IconLayersGW({ size = '1em' }: { size?: number | string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* 模型库: 三层叠片 */}
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 17 10 5 10-5" />
    </svg>
  )
}

export function IconNodesGW({ size = '1em' }: { size?: number | string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* 渠道路由: 三节点两连线 */}
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4" />
      <path d="M15.4 6.5l-6.8 4" />
    </svg>
  )
}

export function IconBoltGW({ size = '1em' }: { size?: number | string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* 请求吞吐: 闪电 */}
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

/* ── 品牌标 (Task 58): 代码卡头栏双 logo ───────────────────────────
 * Python 官方双色标简化版 (蓝上蛇 + 黄下蛇) / OpenAI 花结单色标。 */

export function PythonMark({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#3776AB"
        d="M12 2c-5.4 0-4.5 2.4-4.5 2.4v2.4h4.6v.9H5.6S2 7.3 2 12.1c0 4.8 3.1 4.6 3.1 4.6h1.9v-2.4s-.1-3.1 3-3.1h4.7s2.9 0 2.9-2.9V5s.4-3-4.6-3zM9.6 3.5a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z"
      />
      <path
        fill="#FFD43B"
        d="M12.1 22c5.4 0 4.5-2.4 4.5-2.4v-2.4H12v-.9h6.9s3.6.4 3.6-4.4-3.1-4.6-3.1-4.6h-1.9v2.4s.1 3.1-3 3.1H9.8s-2.9 0-2.9 2.9v3.3s-.4 3 4.6 3h.6zm2.4-1.5a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8z"
      />
    </svg>
  )
}

export function OpenAIMark({ size = 13, color = '#165DFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill={color}
        d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.911 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.998-2.9 6.056 6.056 0 0 0-.748-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.877-1.041l.142-.08 4.778-2.758a.795.795 0 0 0 .393-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.354-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zM8.307 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.5 4.5 0 0 1 7.376-3.454l-.142.08L8.704 5.46a.795.795 0 0 0-.393.68zm1.098-2.366 2.602-1.5 2.607 1.5v3l-2.598 1.5-2.607-1.5z"
      />
    </svg>
  )
}
