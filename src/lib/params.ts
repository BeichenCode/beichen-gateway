/**
 * 查询参数安全解析工具
 *
 * 背景: 2026-10-18 20:55 (UTC+8) 线上发生 PrismaClientValidationError —
 * /api/console/log 收到 page/size 非法值, parseInt → NaN, Math.max(NaN,1) → NaN
 * 直接传入 prisma.log.findMany({ skip: NaN, take: NaN }) 导致 500。
 * 全站 10 个 console route 存在同款写法, 统一收敛到本工具根治。
 */

/** 安全解析整数查询参数: 缺失/空串/非数字一律回退默认值, 再 clamp 到 [min,max] */
export function intParam(sp: URLSearchParams, name: string, def: number, min?: number, max?: number): number {
  const raw = sp.get(name)
  if (raw === null || raw.trim() === '') return def
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return def
  let v = n
  if (min !== undefined) v = Math.max(v, min)
  if (max !== undefined) v = Math.min(v, max)
  return v
}

/** 可选整数参数: 合法时返回数值, 缺失/空串/非法时返回 undefined (用于过滤条件缺省语义) */
export function intParamOpt(sp: URLSearchParams, name: string): number | undefined {
  const raw = sp.get(name)
  if (raw === null || raw.trim() === '') return undefined
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : undefined
}

/** 安全解析毫秒时间戳参数: 缺失/非法返回 undefined (避免 new Date(NaN) → Invalid Date 进 Prisma) */
export function tsParam(sp: URLSearchParams, name: string): number | undefined {
  const raw = sp.get(name)
  if (raw === null || raw.trim() === '') return undefined
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
}
