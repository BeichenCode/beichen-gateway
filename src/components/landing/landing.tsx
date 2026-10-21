'use client'

/**
 * 官网壳 — Task 40 起为单一企业版官网 (原 12 套模板系统与切换器已删除)
 * 设计 DNA 来自 DeepSeek / Z.ai / BigModel / Moonshot 官网实拍调研, 见 enterprise.tsx 头注
 * 数据: /api/auth/status (站点名) + /api/public/stats (真实聚合数字), 拉取一次全页共享
 * 网关: page.tsx 服务端直出 gateway (ServerAddress 优先 → 请求头推导), 代码展示窗首帧即真地址
 */
import { useEffect, useState } from 'react'
import EnterpriseSite from './enterprise'
import BootSplash from '@/components/boot-splash'
import { type Stats } from './sections'
import type { PublicModel } from '@/app/api/public/models/route'

const EMPTY_STATS: Stats = { models: 0, channels: 0, requests: 0, users: 0, tokens: 0, modelNames: [] }

export default function Landing({ gateway = '' }: { gateway?: string }) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [modelStats, setModelStats] = useState<PublicModel[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [siteName, setSiteName] = useState('北辰中转站')
  const [cnyRate, setCnyRate] = useState(7.3)

  useEffect(() => {
    // Task 130: 旧版邀请链接 /?aff=CODE 兼容 — 官网首页检测到 aff 参数立即
    // 302 语义替换到注册页 (auth-form 读取 ?aff 自动填写邀请码), 不再落在官网
    const aff = new URLSearchParams(window.location.search).get('aff')
    if (aff) {
      window.location.replace('/register?aff=' + encodeURIComponent(aff))
      return
    }
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = ''
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/status').then((r) => r.json()).then((j) => {
      if (j.data?.systemName) setSiteName(j.data.systemName)
    }).catch(() => {})
    fetch('/api/public/stats').then((r) => r.json()).then((j) => {
      if (j.data) setStats(j.data)
    }).catch(() => {})
    // Task 161: 模型广场实时化 — 首拉后进入 5s 轮询 (数据端为「真实 60s 滚动窗口」);
    // 页面不可见时暂停轮询, 回到前台立即补拉; 开屏动画只看首次 loading
    let modelsAlive = true
    const loadModels = () => {
      fetch('/api/public/models')
        .then((r) => r.json())
        .then((j) => {
          if (!modelsAlive) return
          if (Array.isArray(j.data?.models)) setModelStats(j.data.models)
          // 站点展示汇率 (¥ / $1): 与控制台 quota-display 同源, 保证全站人民币口径一致
          if (j.data?.cnyRate && Number.isFinite(j.data.cnyRate) && j.data.cnyRate > 0) {
            setCnyRate(j.data.cnyRate)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (modelsAlive) setLoadingModels(false)
        })
    }
    loadModels()
    const modelsTimer = setInterval(() => {
      if (document.visibilityState === 'visible') loadModels()
    }, 5000)
    const onDocVisible = () => {
      if (document.visibilityState === 'visible') loadModels()
    }
    document.addEventListener('visibilitychange', onDocVisible)
    return () => {
      modelsAlive = false
      clearInterval(modelsTimer)
      document.removeEventListener('visibilitychange', onDocVisible)
    }
  }, [])

  return (
    <>
      {/* Task 62: 按用户反馈恢复每次进站都播开屏动画 (Task 61 的会话级跳过被否),
          短促节奏由共用 BootSplash 承担 (300ms 展示 + 220ms 淡出 + 700ms 数据上限) */}
      <BootSplash done={!loadingModels} />
      <EnterpriseSite siteName={siteName} stats={stats} modelStats={modelStats} loadingModels={loadingModels} gateway={gateway} cnyRate={cnyRate} />
    </>
  )
}
