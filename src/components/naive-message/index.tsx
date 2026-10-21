'use client'

/**
 * 全局轻提示 (naive-ui n-message 原生视觉)
 *
 * 设计要点:
 *  - 顶部居中堆叠, 内容自适应宽度 (fit-content)
 *  - 语义图标: 实心 glyph 直接着语义色 (naive 原生, 无底圈无高光)
 *  - 悬停暂停计时; 点击消息体或关闭按钮均可立即关闭
 *  - 动画: 0.2s bezierEaseInOut 淡入轻落, 退场高度折叠; 无弹簧/无玻璃/无进度条
 *  - 明暗双主题, prefers-reduced-motion 降级
 *
 * 用法:
 *  import { toast, Toaster } from '@/components/naive-message'
 *  toast.success('已保存')  toast.error('失败')  toast.info('提示')  toast.warning('警告')  toast.loading('加载中')
 *  页面根节点挂一次 <Toaster />
 */
import { useSyncExternalStore } from 'react'

export type MsgType = 'success' | 'error' | 'info' | 'warning' | 'loading' | 'message'

export interface MsgItem {
  id: number
  type: MsgType
  content: string
  closing: boolean
  h?: number
  /** 自动关闭总时长 (ms); 0 = 不自动关闭 */
  duration: number
  /** 悬停暂停中 */
  paused: boolean
  /** 暂停时刻的剩余时长 (ms) */
  remaining: number
  startedAt: number
}

export interface ToastOpts {
  duration?: number
}

/* ---------------- 模块级消息仓库 (悬停暂停计时) ---------------- */

let items: MsgItem[] = []
let seq = 0
const listeners = new Set<() => void>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const EMPTY: MsgItem[] = []

function emit() {
  items = [...items]
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

function clearTimer(id: number) {
  const t = timers.get(id)
  if (t) {
    clearTimeout(t)
    timers.delete(id)
  }
}

function schedule(id: number, ms: number) {
  clearTimer(id)
  timers.set(
    id,
    setTimeout(() => close(id), Math.max(0, ms)),
  )
}

function close(id: number) {
  const it = items.find((m) => m.id === id)
  if (!it || it.closing) return
  clearTimer(id)
  it.closing = true
  emit()
  setTimeout(() => {
    items = items.filter((m) => m.id !== id)
    emit()
  }, 300)
}

function push(type: MsgType, content: string, duration = 3000): number {
  // 同文案去重 (Task 91): 已有同 type+content 且未关闭的消息时不再堆叠新条,
  // 仅刷新其剩余时长 — 狂点触发同一提示时页面只保留一条, 杜绝 toast 堆积卡顿
  const exist = items.find((m) => !m.closing && m.type === type && m.content === content)
  if (exist) {
    exist.startedAt = Date.now()
    exist.remaining = duration
    exist.paused = false
    emit()
    if (duration > 0) schedule(exist.id, duration)
    return exist.id
  }
  const id = ++seq
  items = [
    ...items,
    { id, type, content, closing: false, duration, paused: false, remaining: duration, startedAt: Date.now() },
  ]
  emit()
  if (duration > 0) schedule(id, duration)
  return id
}

/* 悬停暂停 / 离开续走: 进度条 play-state 与剩余 timeout 严格同步 */
function pause(id: number) {
  const it = items.find((m) => m.id === id)
  if (!it || it.closing || it.paused || it.duration <= 0) return
  clearTimer(id)
  it.remaining = Math.max(0, it.remaining - (Date.now() - it.startedAt))
  it.paused = true
  emit()
}

function resume(id: number) {
  const it = items.find((m) => m.id === id)
  if (!it || it.closing || !it.paused || it.duration <= 0) return
  it.paused = false
  it.startedAt = Date.now()
  emit()
  schedule(id, it.remaining)
}

/* ---------------- 兼容既有调用面 ---------------- */

export const toast = {
  success: (content: string, opts?: ToastOpts) => push('success', content, opts?.duration),
  error: (content: string, opts?: ToastOpts) => push('error', content, opts?.duration),
  info: (content: string, opts?: ToastOpts) => push('info', content, opts?.duration),
  warning: (content: string, opts?: ToastOpts) => push('warning', content, opts?.duration),
  loading: (content: string, opts?: ToastOpts) => push('loading', content, opts?.duration),
  message: (content: string, opts?: ToastOpts) => push('message', content, opts?.duration),
  dismiss: (id?: number) => {
    if (id) close(id)
    else items.forEach((m) => close(m.id))
  },
}

/* ---------------- 语义图标 (白色 glyph) ---------------- */

function TypeIcon({ type }: { type: MsgType }) {
  if (type === 'success') {
    return (
      <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden>
        <path d="M24,4 C35.045695,4 44,12.954305 44,24 C44,35.045695 35.045695,44 24,44 C12.954305,44 4,35.045695 4,24 C4,12.954305 12.954305,4 24,4 Z M32.6338835,17.6161165 C32.1782718,17.1605048 31.4584514,17.1301307 30.9676119,17.5249942 L30.8661165,17.6161165 L20.75,27.732233 L17.1338835,24.1161165 C16.6457281,23.6279612 15.8542719,23.6279612 15.3661165,24.1161165 C14.9105048,24.5717282 14.8801307,25.2915486 15.2749942,25.7823881 L15.3661165,25.8838835 L19.8661165,30.3838835 C20.3217282,30.8394952 21.0415486,30.8698693 21.5323881,30.4750058 L21.6338835,30.3838835 L32.6338835,19.3838835 C33.1220388,18.8957281 33.1220388,18.1042719 32.6338835,17.6161165 Z" />
      </svg>
    )
  }
  if (type === 'error') {
    return (
      <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden>
        <path d="M24,4 C35.045695,4 44,12.954305 44,24 C44,35.045695 35.045695,44 24,44 C12.954305,44 4,35.045695 4,24 C4,12.954305 12.954305,4 24,4 Z M17.8838835,16.1161165 L17.7823881,16.0249942 C17.3266086,15.6583353 16.6733914,15.6583353 16.2176119,16.0249942 L16.1161165,16.1161165 L16.0249942,16.2176119 C15.6583353,16.6733914 15.6583353,17.3266086 16.0249942,17.7823881 L16.1161165,17.8838835 L22.233,24 L16.1161165,30.1161165 L16.0249942,30.2176119 C15.6583353,30.6733914 15.6583353,31.3266086 16.0249942,31.7823881 L16.1161165,31.8838835 L16.2176119,31.9750058 C16.6733914,32.3416647 17.3266086,32.3416647 17.7823881,31.9750058 L17.8838835,31.8838835 L24,25.767 L30.1161165,31.8838835 L30.2176119,31.9750058 C30.6733914,32.3416647 31.3266086,32.3416647 31.7823881,31.9750058 L31.8838835,31.8838835 L31.9750058,31.7823881 C32.3416647,31.3266086 32.3416647,30.6733914 31.9750058,30.2176119 L31.8838835,30.1161165 L25.767,24 L31.8838835,17.8838835 L31.9750058,17.7823881 C32.3416647,17.3266086 32.3416647,16.6733914 31.9750058,16.2176119 L31.8838835,16.1161165 L31.7823881,16.0249942 C31.3266086,15.6583353 30.6733914,15.6583353 30.2176119,16.0249942 L30.1161165,16.1161165 L24,22.233 L17.8838835,16.1161165 Z" />
      </svg>
    )
  }
  if (type === 'warning') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12,2 C17.523,2 22,6.478 22,12 C22,17.522 17.523,22 12,22 C6.477,22 2,17.522 2,12 C2,6.478 6.477,2 12,2 Z M12.0018002,15.0037242 C11.450254,15.0037242 11.0031376,15.4508407 11.0031376,16.0023869 C11.0031376,16.553933 11.450254,17.0010495 12.0018002,17.0010495 C12.5533463,17.0010495 13.0004628,16.553933 13.0004628,16.0023869 C13.0004628,15.4508407 12.5533463,15.0037242 12.0018002,15.0037242 Z M11.99964,7 C11.4868042,7.00018474 11.0642719,7.38637706 11.0066858,7.8837365 L11,8.00036004 L11.0018003,13.0012393 L11.00857,13.117858 C11.0665141,13.6151758 11.4893244,14.0010638 12.0021602,14.0008793 C12.514996,14.0006946 12.9375283,13.6145023 12.9951144,13.1171428 L13.0018002,13.0005193 L13,7.99964009 L12.9932303,7.8830214 C12.9352861,7.38570354 12.5124758,6.99981552 11.99964,7 Z" />
      </svg>
    )
  }
  if (type === 'info') {
    return (
      <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden>
        <path d="M14,2 C20.6274,2 26,7.37258 26,14 C26,20.6274 20.6274,26 14,26 C7.37258,26 2,20.6274 2,14 C2,7.37258 7.37258,2 14,2 Z M14,11 C13.4477,11 13,11.4477 13,12 L13,20 C13,20.5523 13.4477,21 14,21 C14.5523,21 15,20.5523 15,20 L15,12 C15,11.4477 14.5523,11 14,11 Z M14,6.75 C13.3096,6.75 12.75,7.30964 12.75,8 C12.75,8.69036 13.3096,9.25 14,9.25 C14.6904,9.25 15.25,8.69036 15.25,8 C15.25,7.30964 14.6904,6.75 14,6.75 Z" />
      </svg>
    )
  }
  if (type === 'loading') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="44 16" />
      </svg>
    )
  }
  return null
}

/* ---------------- Toaster 挂载组件 ---------------- */

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY)

  return (
    <div className="naive-message-container" role="status" aria-live="polite">
      {list.map((m) => (
        <div
          key={m.id}
          ref={(el) => {
            if (el && !m.h) {
              m.h = el.offsetHeight
              emit()
            }
          }}
          className={`naive-msg-wrapper ${m.closing ? 'naive-msg-closing' : ''}`}
          style={{
            height: m.closing ? 0 : m.h ? `${m.h}px` : 'auto',
            marginBottom: m.closing ? 0 : 10,
            opacity: m.closing ? 0 : 1,
            transform: m.closing ? 'scale(0.9) translateY(-10px)' : 'scale(1)',
          }}
        >
          <div
            className="naive-message"
            data-type={m.type}
            onMouseEnter={() => pause(m.id)}
            onMouseLeave={() => resume(m.id)}
            onClick={() => close(m.id)}
          >
            <span className={`naive-msg-icon ${m.type}-type`}>
              <TypeIcon type={m.type} />
            </span>
            <span className="naive-msg-content">{m.content}</span>
            <button
              type="button"
              className="naive-msg-close"
              aria-label="关闭"
              onClick={(e) => {
                e.stopPropagation()
                close(m.id)
              }}
            >
              <svg viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2.5 2.5l7 7m0-7l-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
