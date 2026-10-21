/**
 * 系统设置 (Option 表) 带缓存读取
 */
import { db } from '@/lib/db'

export type OptionMap = Record<string, string>

let cache: { data: OptionMap; ts: number } | null = null
const TTL = 15 * 1000

export async function getOptions(force = false): Promise<OptionMap> {
  if (!force && cache && Date.now() - cache.ts < TTL) return cache.data
  const rows = await db.option.findMany()
  const map: OptionMap = {}
  for (const r of rows) map[r.key] = r.value
  cache = { data: map, ts: Date.now() }
  return map
}

export function invalidateOptionCache(): void {
  cache = null
}

export async function getOption(key: string, fallback = ''): Promise<string> {
  const map = await getOptions()
  return map[key] ?? fallback
}

export async function getBoolOption(key: string, fallback = false): Promise<boolean> {
  const v = await getOption(key)
  if (v === '') return fallback
  return v === 'true'
}

export async function getNumberOption(key: string, fallback = 0): Promise<number> {
  const v = await getOption(key)
  const n = parseFloat(v)
  return isNaN(n) ? fallback : n
}

export function getQuotaPerUnit(options: OptionMap): number {
  const n = parseFloat(options.QuotaPerUnit || '500000')
  return isNaN(n) || n <= 0 ? 500000 : n
}
