/**
 * 易支付服务器异步通知 (GET) — 验签 → 幂等入账 → 应答 success
 * 约定: 仅应答纯文本, success=受理成功, fail=拒绝 (网关会重试)
 */
import { db } from '@/lib/db'
import { getOptions, getQuotaPerUnit } from '@/lib/options'
import { epayParamsFromRequest, verifyEpaySign } from '@/lib/epay'
import { quotaToCNY } from '@/lib/quota-display'

export const runtime = 'nodejs'

function text(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

export async function GET(request: Request): Promise<Response> {
  try {
    const params = epayParamsFromRequest(request)
    const options = await getOptions(true)
    const key = (options.PayEpayKey || '').trim()

    if (!key || !verifyEpaySign(params, key)) return text('fail', 400)
    if (params.trade_status !== 'TRADE_SUCCESS') return text('fail', 400)

    const order = await db.topupOrder.findUnique({ where: { orderNo: params.out_trade_no } })
    if (!order) return text('fail', 400)

    // 已处理订单直接应答 success (易支付会多次通知, 必须幂等)
    if (order.status !== 1) return text('success')

    // 金额一致性校验 (容差 1 分)
    const notified = parseFloat(params.money)
    if (!isFinite(notified) || Math.abs(notified - order.money) > 0.01) return text('fail', 400)

    // 幂等抢占 (Task 102 并发修复): 条件更新 status 1→2, 并发重复通知只有一次成功,
    // 抢占失败直接应答 success — 杜绝双入账竞态
    const claim = await db.topupOrder.updateMany({
      where: { id: order.id, status: 1 },
      data: { status: 2, tradeNo: params.trade_no || '', paidAt: new Date() },
    })
    if (claim.count !== 1) return text('success')

    // 入账: 额度 + 充值日志 (抢占成功后才执行)
    await db.user.update({
      where: { id: order.userId },
      data: { quota: { increment: order.amount } },
    })
    const quotaPerUnit = getQuotaPerUnit(options)
    const cny = quotaToCNY(Number(order.amount), quotaPerUnit)
    await db.log.create({
      data: {
        userId: order.userId,
        username: order.username,
        type: 1,
        quota: order.amount,
        content: `在线充值 ¥${cny.toFixed(2)}（订单 ${order.orderNo}，${params.type || order.payType || 'epay'}）`,
      },
    })
    return text('success')
  } catch (err) {
    console.error('[pay/notify]', err)
    return text('fail', 500)
  }
}
