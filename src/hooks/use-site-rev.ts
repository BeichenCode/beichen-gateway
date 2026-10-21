'use client'

/**
 * 站点版本看守 — 解决"服务端已更新, 手机端还停留在旧版页面"的问题:
 *  - 记住首次看到的 rev (sessionStorage)
 *  - 页面可见期间每 60s + 回到前台时对比 /api/auth/status 的 rev
 *  - 变化 → toast 提示刷新 (每次变更只提示一次, 不自动 reload 以免打断操作)
 */
import { useEffect } from 'react'
import { toast } from '@/components/naive-message'

const REV_KEY = 'newapi_site_rev'

async function fetchRev(): Promise<string | null> {
  try {
    const r = await fetch('/api/auth/status', { cache: 'no-store' })
    const j = await r.json()
    return j?.data?.rev ?? null
  } catch {
    return null
  }
}

export function useSiteRevGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let checking = false
    async function check(initial = false) {
      if (checking || document.visibilityState !== 'visible') return
      checking = true
      try {
        const rev = await fetchRev()
        if (!rev) return
        const saved = sessionStorage.getItem(REV_KEY)
        if (!saved) {
          sessionStorage.setItem(REV_KEY, rev)
          return
        }
        if (saved !== rev) {
          sessionStorage.setItem(REV_KEY, rev)
          if (!initial) {
            toast.info('系统已更新，请刷新页面查看最新版本', { duration: 8000 })
          }
        }
      } finally {
        checking = false
      }
    }

    void check(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    const timer = setInterval(() => void check(), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      clearInterval(timer)
    }
  }, [enabled])
}
