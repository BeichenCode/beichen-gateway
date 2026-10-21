/**
 * 通用内存滑动窗口限流器 (Task 82 深度加固)
 * 从 login-guard 的模式泛化: 同一 key 在窗口内超过上限即拒绝。
 * 单进程内存实现 (与站点部署形态一致), 重启自然清空; 定期清扫防泄漏。
 */

interface WindowRecord {
  hits: number[]
  blockedUntil: number
}

const g = globalThis as unknown as { __rateWindows?: Map<string, WindowRecord> }
if (!g.__rateWindows) g.__rateWindows = new Map()

/** 命中一次并判定: true = 放行, false = 超限 */
export function hit(key: string, windowMs: number, max: number, blockMs = windowMs): boolean {
  const now = Date.now()
  const rec = g.__rateWindows!.get(key) || { hits: [], blockedUntil: 0 }
  if (rec.blockedUntil > now) return false
  rec.hits = rec.hits.filter((t) => now - t < windowMs)
  rec.hits.push(now)
  if (rec.hits.length > max) {
    rec.blockedUntil = now + blockMs
    rec.hits = []
    g.__rateWindows!.set(key, rec)
    return false
  }
  g.__rateWindows!.set(key, rec)
  return true
}

/** 仅查询不命中 (用于返回剩余配额提示) */
export function peek(key: string, windowMs: number): number {
  const rec = g.__rateWindows!.get(key)
  if (!rec) return 0
  const now = Date.now()
  if (rec.blockedUntil > now) return Math.ceil((rec.blockedUntil - now) / 1000)
  return rec.hits.filter((t) => now - t < windowMs).length
}

/** 清理过期记录 (路由层低频调用即可, 亦可忽略 — 记录自带滑窗淘汰) */
export function sweep(): void {
  const now = Date.now()
  for (const [k, rec] of g.__rateWindows!) {
    if (rec.blockedUntil < now && (rec.hits.length === 0 || now - rec.hits[rec.hits.length - 1] > 30 * 60 * 1000)) {
      g.__rateWindows!.delete(k)
    }
  }
}
