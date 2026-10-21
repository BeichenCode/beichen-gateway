/**
 * 易支付同步跳转 (浏览器回跳) — 验签后 302 回钱包页
 * 钱包页依据订单号从 API 读取真实状态展示 (此处 result 仅作提示)
 */
import { getOptions } from '@/lib/options'
import { epayParamsFromRequest, verifyEpaySign } from '@/lib/epay'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const params = epayParamsFromRequest(request)
  let result = 'ok'
  try {
    const options = await getOptions(true)
    const key = (options.PayEpayKey || '').trim()
    if (!key || !verifyEpaySign(params, key)) result = 'sign'
    else if (params.trade_status !== 'TRADE_SUCCESS') result = 'fail'
  } catch {
    result = 'fail'
  }
  const order = encodeURIComponent(params.out_trade_no || '')
  const base = new URL(request.url).origin
  return Response.redirect(`${base}/console#/wallet?order=${order}&result=${result}`, 302)
}
