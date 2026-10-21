'use client'

/**
 * 全站统一启动加载屏 (Task 43, Task 44 纯化; Task 51 起官网与控制台共用) — 用户指定的「竖条依次跳动点亮」动画
 * - Task 44: 按用户要求去掉 logo 与文字, 全屏只留竖条动画本身
 * - Task 51: 登录成功进入控制台后的启动屏也换成本组件 (替换旧版 logo+旋转环)
 * - Task 52: 按用户要求去掉黑色背景, 改为纯白底 (与浅色官网/控制台色调衔接, 淡出交接无闪变)
 * - Task 60/61 按用户反馈「加载动画时间太长」两级提速: 最短展示 900→420→300ms、
 *   淡出 450→300→220ms; 新增数据等待上限 700ms — 接口再慢开屏也至多 ~1s,
 *   不会拿住整页不放 (落页自身都有加载态); 数据快时仍由 done 提前收场
 * - Task 62: 用户澄清「开屏动画每次都要显示, 只是别太长」→ Task 61 在 landing.tsx
 *   的会话级只播一次逻辑已移除, 每次进站/回站都会播放, 靠上面的短促节奏平衡体验
 * - 展示期间锁定页面滚动, 淡出后整体卸载
 */
import { useEffect, useState } from 'react'

const MIN_VISIBLE_MS = 300
const FADE_MS = 220
const DATA_WAIT_CAP_MS = 700

export default function BootSplash({ done }: { done: boolean }) {
  const [ready, setReady] = useState(false) // 最短展示时间已过
  const [gone, setGone] = useState(false) // 淡出动画结束, 卸载
  const [capped, setCapped] = useState(false) // 数据等待已达上限, 强制放行

  const finished = (done || capped) && ready

  useEffect(() => {
    // 展示期锁滚动; 淡出即解锁 (组件 return null 后仍挂载, 不能依赖卸载 cleanup)
    document.body.style.overflow = finished ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [finished])

  useEffect(() => {
    const t = setTimeout(() => setReady(true), MIN_VISIBLE_MS)
    const c = setTimeout(() => setCapped(true), DATA_WAIT_CAP_MS)
    return () => {
      clearTimeout(t)
      clearTimeout(c)
    }
  }, [])

  useEffect(() => {
    if (!finished) return
    const t = setTimeout(() => setGone(true), FADE_MS + 80)
    return () => clearTimeout(t)
  }, [finished])

  if (gone) return null

  return (
    <div
      role="status"
      aria-label="页面加载中"
      /* Task 63: splash-auto-leave = 纯 CSS 自离开保险 (定义于 globals.css)。
       * 开屏层是 SSR 直出静态节点, 弱网/冷启动时 React 水合前的「无人接管期」里
       * 组件状态机无法运行, 静态开屏会挂到水合完为止 (用户实测 5-6s);
       * 该 CSS 动画让它在 0.5s 后必然自行淡出、1s 整隐藏, 露出 SSR 内容。
       * JS 正常时组件先行收场 (≤0.52s), animation fill 优先级高于内联样式, 两套机制无冲突 */
      className={`splash-auto-leave fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity ease-out ${finished ? 'pointer-events-none' : ''}`}
      style={{ opacity: finished ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="loading-bar" aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
