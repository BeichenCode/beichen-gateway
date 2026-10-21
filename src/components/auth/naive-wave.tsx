'use client'

import { useEffect } from 'react'

/**
 * n-button 点击波纹 (naive-ui wave 还原: box-shadow 圆环 0→4.5px 扩散 + 淡出)
 * 全局监听 pointerdown, 命中 .n-btn / .sb-icon-btn / 侧边栏 button.sb-menu-item 时注入波纹层,
 * 动画结束自动移除 — 全站可点元素共享同一套按压反馈语言
 */
export default function NaiveWave() {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null
      const btn = target?.closest?.('.n-btn, .sb-icon-btn, button.sb-menu-item') as HTMLElement | null
      if (!btn || (btn as HTMLButtonElement).disabled) return
      const wave = document.createElement('span')
      wave.className = 'n-wave'
      btn.appendChild(wave)
      wave.addEventListener('animationend', () => wave.remove())
      // 兜底: 动画被禁用时也能清掉
      setTimeout(() => wave.remove(), 800)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [])
  return null
}
