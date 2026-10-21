'use client'

import { useEffect } from 'react'

/**
 * Task 65: 水合完成标记 — 零渲染客户端组件
 * layout.tsx 的内联兜底脚本据此区分「水合前点击」与「水合后点击」:
 * effect 运行 = React 已完成水合 = 交互事件已可用, 此后 [data-launch]
 * 点击交回 React 侧反馈链 (spinner + 450ms + router.push)。
 */
export default function HydrationMarker() {
  useEffect(() => {
    ;(window as unknown as { __hydrated?: boolean }).__hydrated = true
  }, [])
  return null
}
