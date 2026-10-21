/**
 * 计费引擎 (对标 New API):
 * - 按量: quota = (promptTokens × ratio + completionTokens × ratio × completionRatio) × groupRatio
 * - 按次: quota = modelPrice × QuotaPerUnit × groupRatio
 * - ratio 基准: 1.0 = $0.002 / 1K tokens
 */
import { db } from '@/lib/db'
import { getOptions, getQuotaPerUnit, type OptionMap } from '@/lib/options'

export interface PricingInfo {
  modelName: string
  ratio: number
  completionRatio: number
  modelPrice: number // -1 = 不按次计费
  quotaType: number // 0=按量 1=按次
}

export interface UsageInput {
  promptTokens: number
  completionTokens: number
}

/** 读取单个模型定价(表优先, 无记录时 ratio=1) */
export async function getPricing(modelName: string): Promise<PricingInfo> {
  const row = await db.modelRatio.findUnique({ where: { modelName } })
  if (row) {
    return {
      modelName,
      ratio: row.ratio,
      completionRatio: row.completionRatio,
      modelPrice: row.modelPrice,
      quotaType: row.quotaType,
    }
  }
  // 未知模型: 使用默认倍率 1 (可在系统设置扩展)
  return { modelName, ratio: 1, completionRatio: 1, modelPrice: -1, quotaType: 0 }
}

/** 读取分组倍率 TopupGroupRatio JSON, 如 {"default":1,"vip":0.8} */
export function getGroupRatio(options: OptionMap, group: string): number {
  try {
    const map = JSON.parse(options.TopupGroupRatio || '{}') as Record<string, number>
    const v = map[group]
    return typeof v === 'number' && v > 0 ? v : 1
  } catch {
    return 1
  }
}

/**
 * 计算消耗 quota
 */
export function calcQuota(
  pricing: PricingInfo,
  usage: UsageInput,
  groupRatio: number,
  quotaPerUnit: number
): number {
  let quota: number
  if (pricing.quotaType === 1 && pricing.modelPrice >= 0) {
    // 按次计费
    quota = Math.ceil(pricing.modelPrice * quotaPerUnit * groupRatio)
  } else {
    const promptQuota = usage.promptTokens * pricing.ratio
    const completionQuota = usage.completionTokens * pricing.ratio * pricing.completionRatio
    quota = Math.ceil((promptQuota + completionQuota) * groupRatio)
  }
  return Math.max(quota, 1)
}

/** quota → 美元 */
export function quotaToUSD(quota: number, quotaPerUnit: number): number {
  return quota / quotaPerUnit
}

/** 便捷: 一步完成计算 (自动取设置) */
export async function calcQuotaAuto(
  pricing: PricingInfo,
  usage: UsageInput,
  group: string
): Promise<{ quota: number; groupRatio: number; quotaPerUnit: number }> {
  const options = await getOptions()
  const quotaPerUnit = getQuotaPerUnit(options)
  const groupRatio = getGroupRatio(options, group)
  const quota = calcQuota(pricing, usage, groupRatio, quotaPerUnit)
  return { quota, groupRatio, quotaPerUnit }
}
