/**
 * 北京时间日界工具 (Task 188): 服务器时区为 UTC, 「今日/按天」口径必须显式按
 * Asia/Shanghai (UTC+8, 无夏令时, 固定偏移) 计算, 不依赖宿主 TZ — 任何环境下行为一致
 */
const BJ_OFFSET_MS = 8 * 3600 * 1000

/** 北京时间当日 00:00 对应的绝对时刻 */
export function shanghaiDayStart(d: Date = new Date()): Date {
  const shifted = new Date(d.getTime() + BJ_OFFSET_MS)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - BJ_OFFSET_MS)
}

/** 北京时间日期键 YYYY-MM-DD */
export function shanghaiDateKey(d: Date): string {
  const shifted = new Date(d.getTime() + BJ_OFFSET_MS)
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
}
