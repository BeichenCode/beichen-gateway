'use client'

/**
 * Console chunk 空闲预热 (Task 111) — 用户反馈「后台管理加载动画太长」。
 * 五竖条加载动画的时长 = 控制台 chunk 下载 + Vue 挂载; 在登录页/官网首页浏览器空闲期
 * 预拉控制台依赖图, 用户真正进入 /console 时动画时长从「秒级」降到近零
 * (常见路径: 官网 → 登录 → 控制台, 前两站就把 chunk 预热完)。
 * 防重入: window.__consoleWarmup 标记, 多页面挂载只拉一次。
 */
import { useEffect } from 'react'

export default function ConsoleWarmup() {
  useEffect(() => {
    const w = window as unknown as {
      __consoleWarmup?: boolean
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (w.__consoleWarmup) return
    w.__consoleWarmup = true

    const warm = () => {
      // Task 113: 预热链路补全 — 旧版只拉 main 桥接层; 登录落地页 (dashboard, 含 echarts)
      // 是 mountConsole → whenRouteReady 才懒加载的, 首进控制台仍要现拉最大依赖图。
      // main → dashboard 顺序预拉后, 进入 /console 时 chunk 全部命中缓存, 动画近零。
      void import('@/vue-console/main')
        .then(() => import('@/vue-console/pages/dashboard'))
        .catch(() => {
          /* 预热失败静默: 真实导航时仍会按原流程加载 */
        })
    }

    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm, { timeout: 2500 })
      return () => w.cancelIdleCallback?.(id)
    }
    const t = window.setTimeout(warm, 1200)
    return () => window.clearTimeout(t)
  }, [])

  return null
}
