/**
 * Task 123: 卡片指针丝滑交互引擎 (tilt + spotlight) — 全局事件委托
 *
 * 用户反馈: 卡片间鼠标来回移动的过渡「钝钝的」→ 换成指针跟随的 3D 微倾斜 +
 * 光斑, 交互语言对齐 Linear / Stripe 的「跟手丝滑」质感。
 *
 * 原理: document 级 mousemove 委托, 命中 [data-tilt] 后 rAF 合帧直写 CSS 变量
 * (--t-rx/--t-ry/--t-mx/--t-my), 不经 Vue 响应式 → 60fps 零开销;
 * 卡间移动由 closest 命中切换自动释放旧卡 (mouseleave 不冒泡, 无法委托)。
 * 移动端 / 触屏无 mousemove 天然禁用。prefers-reduced-motion 时 CSS 回退。
 */

const MAX_DEG = 3.2 // 倾斜上限 (克制的微倾斜, 有质感不眩晕)

let raf = 0
let current: HTMLElement | null = null
let px = 0.5 // 归一化指针坐标 (0..1, 相对卡片)
let py = 0.5

function flush(): void {
  raf = 0
  const el = current
  if (!el) return
  el.style.setProperty('--t-rx', ((0.5 - py) * 2 * MAX_DEG).toFixed(2) + 'deg')
  el.style.setProperty('--t-ry', ((px - 0.5) * 2 * MAX_DEG).toFixed(2) + 'deg')
  el.style.setProperty('--t-mx', (px * 100).toFixed(2) + '%')
  el.style.setProperty('--t-my', (py * 100).toFixed(2) + '%')
}

/** 弹性回正: 归零角度变量, transition 550ms 拉着走 → 优雅回落 */
function release(el: HTMLElement | null): void {
  if (!el) return
  el.classList.remove('is-tilting')
  el.style.setProperty('--t-rx', '0deg')
  el.style.setProperty('--t-ry', '0deg')
}

function onMove(e: MouseEvent): void {
  const t = e.target as Element | null
  const el = t && typeof t.closest === 'function' ? (t.closest('[data-tilt]') as HTMLElement | null) : null
  if (el !== current) {
    release(current)
    current = el
    if (el) {
      // 进卡先定位光斑再点亮, 避免光斑从上一张卡的位置飞入
      const r = el.getBoundingClientRect()
      px = r.width > 0 ? (e.clientX - r.left) / r.width : 0.5
      py = r.height > 0 ? (e.clientY - r.top) / r.height : 0.5
      el.classList.add('is-tilting')
      flush()
    }
    return
  }
  if (!el) return
  const r = el.getBoundingClientRect()
  px = r.width > 0 ? (e.clientX - r.left) / r.width : 0.5
  py = r.height > 0 ? (e.clientY - r.top) / r.height : 0.5
  if (!raf) raf = requestAnimationFrame(flush)
}

/** 离开文档 / 窗口失焦: 回正并复位, 避免卡片停在倾斜态 */
function onGone(): void {
  release(current)
  current = null
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

export function attachCardTilt(): void {
  document.addEventListener('mousemove', onMove, { passive: true })
  document.documentElement.addEventListener('mouseleave', onGone)
  window.addEventListener('blur', onGone)
}

export function detachCardTilt(): void {
  document.removeEventListener('mousemove', onMove)
  document.documentElement.removeEventListener('mouseleave', onGone)
  window.removeEventListener('blur', onGone)
  onGone()
}
