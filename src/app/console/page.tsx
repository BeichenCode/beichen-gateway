'use client'

/**
 * /console 入口 — 桥接 Vue3 + Naive UI 控制台 (Soybean Admin NaiveUI 版架构)
 *
 * React 侧只负责: 客户端动态加载 Vue 应用并挂载/卸载 (ssr:false, 浏览器独占)。
 * 认证、路由、布局、全部页面均在 Vue 应用内 (see src/vue-console/)。
 */
import { useEffect, useRef, useState } from 'react'
import RouteLoading from '@/components/route-loading'
import { getAuthToken } from '@/lib/api'

/** Task 113: chunk 加载失败自愈 — 旧 HTML 引用已被部署替换的 hash chunk 时 import reject,
 *  动画会永远挂着 (用户实测「一直等一直等」); 带 cb 强刷拿新 HTML 即恢复 */
function hardReloadWithBust() {
  const url = new URL(window.location.href)
  url.searchParams.set('cb', String(Date.now()))
  window.location.replace(url.toString())
}

export default function ConsolePage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false
    let handle: { ready: Promise<void>; unmount: () => void } | null = null
    // Task 105: 会话预取 — /api/auth/me 与 Vue chunk 下载/路由解析并行发出,
    // 砍掉「chunk 下载完 → mount → 再串行请求 me」的最后一跳 RTT (加载动画总时长更短);
    // 预取的 Response 由 stores.refresh() 单次消费 (window.__mePrefetch, 头部与原逻辑逐字一致)
    try {
      const token = getAuthToken()
      ;(window as unknown as { __mePrefetch?: Promise<Response> }).__mePrefetch = fetch('/api/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
    } catch { /* storage 不可用: 降级为 stores 内原串行请求 */ }
    // Task 113: 看门狗 — 网络异常/chunk 死链导致 ready 永不 resolve 时, 25s 后强制自愈刷新
    const watchdog = window.setTimeout(() => {
      if (!disposed) hardReloadWithBust()
    }, 25_000)
    void import('@/vue-console/main')
      .then((m) => {
        if (disposed || !hostRef.current) return
        handle = m.mountConsole(hostRef.current)
        // isReady 语义: 初始路由页面组件解析完成、Vue 实际挂载后才撤加载动画
        void handle.ready.then(() => {
          if (!disposed) {
            window.clearTimeout(watchdog)
            setReady(true)
          }
        })
      })
      .catch(() => {
        // Task 113: chunk 404 (部署后旧 HTML) / 网络失败 — 不再让动画无限挂起
        if (!disposed) hardReloadWithBust()
      })
    return () => {
      disposed = true
      window.clearTimeout(watchdog)
      handle?.unmount()
    }
  }, [])

  return (
    <>
      {/* Vue 挂载宿主 (Vue 应用自行渲染加载态/游客壳/后台壳) */}
      <div ref={hostRef} id="vue-console-root" className="contents" />
      {/* Vue chunk 加载中: 全站统一 5 竖条加载动画 (用户钦定, 不随模板更换) */}
      {!ready && <RouteLoading />}
    </>
  )
}
