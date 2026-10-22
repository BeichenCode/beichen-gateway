/**
 * 易支付 (Epay) 协议库 — 对标 New API 的 epay 集成
 * 网关地址 / 商户 ID / 商户密钥 (PayAddress / PayEpayId / PayEpayKey) 均由商户后台
 * 获取, 在控制台「系统设置 → 支付」里配置, 存数据库, 不落代码
 *
 * 签名规则 (标准易支付 MD5):
 *   1. 剔除 sign / sign_type 及空值参数
 *   2. 按参数名 ASCII 升序排序
 *   3. 以 k=v& 拼接 (值不做 urlencode)
 *   4. 末尾直接拼接商户密钥 (不加 &)
 *   5. md5 小写
 */

import { createHash } from 'crypto'

export function epaySign(params: Record<string, string>, key: string): string {
  const filtered = Object.entries(params).filter(
    ([k, v]) => k !== 'sign' && k !== 'sign_type' && v !== '' && v !== undefined && v !== null,
  )
  filtered.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  const qs = filtered.map(([k, v]) => `${k}=${v}`).join('&')
  return createHash('md5').update(`${qs}${key}`, 'utf8').digest('hex')
}

export function verifyEpaySign(params: Record<string, string>, key: string): boolean {
  if (!params.sign) return false
  return epaySign(params, key) === params.sign.toLowerCase()
}

export interface EpaySubmitArgs {
  gateway: string // 商户网关地址 (系统设置 PayAddress)
  pid: string // 商户 ID
  key: string // 商户密钥
  type: string // alipay / wxpay / qqpay
  outTradeNo: string // 平台订单号
  notifyUrl: string // 服务器异步通知地址
  returnUrl: string // 支付完成跳转地址
  name: string // 商品名称
  money: string // 金额, 保留两位小数
  sitename?: string // 站点名 (可选)
}

/** 构造支付提交 URL (GET 跳转到收银台, 值需 urlencode) */
export function buildEpayUrl(args: EpaySubmitArgs): string {
  const gateway = args.gateway.replace(/\/+$/, '')
  const params: Record<string, string> = {
    pid: args.pid,
    type: args.type,
    out_trade_no: args.outTradeNo,
    notify_url: args.notifyUrl,
    return_url: args.returnUrl,
    name: args.name,
    money: args.money,
  }
  if (args.sitename) params.sitename = args.sitename
  params.sign_type = 'MD5'
  params.sign = epaySign(params, args.key)
  const search = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return `${gateway}/submit.php?${search}`
}

/** 归一化回调参数 (GET query → Record) */
export function epayParamsFromRequest(request: Request): Record<string, string> {
  const url = new URL(request.url)
  const params: Record<string, string> = {}
  url.searchParams.forEach((v, k) => {
    params[k] = v
  })
  return params
}
