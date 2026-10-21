/**
 * 登录失败限速器 (Task 80 渗透加固)
 * 内存滑动窗口: 同「用户名+IP」15 分钟内失败 ≥10 次锁定 15 分钟; 登录成功即清零。
 * 单进程内存实现 (与站点部署形态一致), 重启自然清空, 不误伤正常用户。
 */
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILS = 10
const LOCK_MS = 15 * 60 * 1000

interface FailRecord {
  timestamps: number[]
  lockedUntil: number
}

const g = globalThis as unknown as { __loginFails?: Map<string, FailRecord> }
if (!g.__loginFails) g.__loginFails = new Map()

function keyOf(username: string, ip: string): string {
  return `${username.toLowerCase()}|${ip}`
}

/** 登录前检查: 锁定中抛 429 */
export function assertNotLocked(username: string, ip: string): void {
  const rec = g.__loginFails!.get(keyOf(username, ip))
  if (!rec) return
  const now = Date.now()
  if (rec.lockedUntil > now) {
    const mins = Math.ceil((rec.lockedUntil - now) / 60000)
    throw Object.assign(new Error(`失败次数过多，账号已临时锁定，请 ${mins} 分钟后再试`), { status: 429 })
  }
}

/** 记录一次失败: 达阈值即锁定 */
export function recordLoginFail(username: string, ip: string): void {
  const key = keyOf(username, ip)
  const now = Date.now()
  const rec = g.__loginFails!.get(key) || { timestamps: [], lockedUntil: 0 }
  rec.timestamps = rec.timestamps.filter((t) => now - t < WINDOW_MS)
  rec.timestamps.push(now)
  if (rec.timestamps.length >= MAX_FAILS) {
    rec.lockedUntil = now + LOCK_MS
    rec.timestamps = []
  }
  g.__loginFails!.set(key, rec)
}

/** 登录成功: 清除该用户名+IP 的失败记录 */
export function clearLoginFails(username: string, ip: string): void {
  g.__loginFails!.delete(keyOf(username, ip))
}
