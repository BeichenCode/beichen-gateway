/**
 * 站点版本看守 — 服务端更新后提示旧页面刷新 (与旧 React 版 useSiteRevGuard 同语义)
 * 记住首次 rev (sessionStorage) → 可见期间每 60s 对比 /api/auth/status rev → 变化即提示一次
 */
import './flags'
import { message } from './message'

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

let started = false
// Task 191 顺带修复: 原实现 enabled 是闭包参数 — 启动链 root.ts watch(immediate) 在
// 用户尚未就绪时先以 false 调用一次 (started=true, enabled=false 被永久捕获), 登录后
// 再以 true 调用会被 started 拦截 → 看守自上线起从未真正启用过 (toast 从未出现)。
// 改为「监听只挂一次 + 开关状态可更新」: guardEnabled 跟随最新调用值。
let guardEnabled = false

// Task 191: 版本变化后在下一次路由切换时自动整页刷新。
// 背景 (生产实证): 只弹 8s toast 极易被错过, 部署前打开的标签页会一直跑旧 JS,
// 用户反复反馈「改了没变化/还是老样子」。路由切换本身就会卸载当前页, 此刻整页
// 刷新零额外数据损失 (表单草稿在切走时同样会丢), 且 hash 保持 → 刷新后落在新路由。
// 防循环: 检测到变化时已把新 rev 写回 sessionStorage, reload 后不再判定为陈旧。
let revStale = false

export function startSiteRevGuard(enabled: boolean) {
  if (typeof window === 'undefined') return
  guardEnabled = enabled
  if (started) return
  started = true

  window.addEventListener(
    'hashchange',
    () => {
      if (revStale) {
        revStale = false
        window.location.reload()
      }
    },
    true
  )

  let checking = false
  async function check(initial = false) {
    if (!guardEnabled || checking || document.visibilityState !== 'visible') return
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
        revStale = true
        if (!initial) {
          message.info('系统已更新，即将自动切换到最新版本', { duration: 8000 })
        }
      }
    } catch {
      /* ignore */
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
  window.setInterval(() => void check(), 60_000)
}
