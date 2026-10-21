'use client'

/**
 * 整站启动加载屏 (Task 43, Task 44 纯化) — 用户指定的「竖条依次跳动点亮」动画
 * - Task 44: 按用户要求去掉 logo 与文字, 全屏只留竖条动画本身
 * - 首次打开官网时展示, 数据就绪后淡出
 * - 最短展示 900ms: 即使接口毫秒级返回, 动画也完整可见 (否则闪一下等于没有)
 * - 展示期间锁定页面滚动, 淡出后整体卸载
 */
import { useEffect, useState } from 'react'

const MIN_VISIBLE_MS = 900
const FADE_MS = 450

export default function BootSplash({ done }: { done: boolean }) {
  const [ready, setReady] = useState(false) // 最短展示时间已过
  const [gone, setGone] = useState(false) // 淡出动画结束, 卸载

  const finished = done && ready

  useEffect(() => {
    // 展示期锁滚动; 淡出即解锁 (组件 return null 后仍挂载, 不能依赖卸载 cleanup)
    document.body.style.overflow = finished ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [finished])

  useEffect(() => {
    const t = setTimeout(() => setReady(true), MIN_VISIBLE_MS)
    return () => clearTimeout(t)
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#04060c] transition-opacity ease-out ${finished ? 'pointer-events-none' : ''}`}
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
