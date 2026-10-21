/**
 * 额度展示汇率 (Task 77)
 *
 * 系统内部额度为无量纲 quota (QuotaPerUnit=500000 quota = $1 计价单位)。
 * 用户侧全面按人民币展示：支付/余额/价格均以 ¥ 呈现。
 * 汇率 = 站点设置 Price (¥ / $1 额度)，由会话接口下发后写入本模块，
 * renderQuota / 商城 / 价格页统一从这里取汇率，保证全站口径一致。
 *
 * 注意: 本模块为纯数据模块 (无 JSX / 无依赖), 可被 store 与组件安全引用。
 */

let displayPrice = 7.3

/** 写入展示汇率 (¥ / $1 额度); 非法值忽略 */
export function setQuotaDisplayPrice(price: number): void {
  if (isFinite(price) && price > 0) displayPrice = price
}

/** 读取当前展示汇率 (¥ / $1 额度) */
export function getQuotaDisplayPrice(): number {
  return displayPrice
}

/** quota → 人民币面值 */
export function quotaToCNY(quota: number, quotaPerUnit: number): number {
  return (quota / quotaPerUnit) * displayPrice
}

/** 人民币面值 → quota (四舍五入) */
export function cnyToQuota(cny: number, quotaPerUnit: number): number {
  return Math.round((cny / displayPrice) * quotaPerUnit)
}

/** 美元数值 → 人民币数值 (模型单价等 USD 语义数据的前端换算) */
export function usdToCNY(usd: number): number {
  return usd * displayPrice
}

/** 价格格式化: USD 语义数值 → 去尾零的人民币字符串 (用于模型单价展示) */
export function fmtCNYPrice(usd: number): string {
  const cny = usdToCNY(usd)
  const s = cny.toFixed(4).replace(/\.?0+$/, '')
  return s === '' || s === '-' ? '0' : s
}
