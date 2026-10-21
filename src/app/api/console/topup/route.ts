import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { getOptions, getQuotaPerUnit } from '@/lib/options'
import { buildEpayUrl } from '@/lib/epay'
import { intParam } from '@/lib/params'

export const runtime = 'nodejs'

function genOrderNo(): string {
  const d = new Date()
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')
  return `${ts}${rand}`
}

/** GET /api/console/topup — 当前用户充值订单; 管理员 ?scope=all 查看全部 */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)
    const page = intParam(searchParams, 'page', 1, 1)
    const size = intParam(searchParams, 'size', 10, 1, 50)
    const scopeAll = searchParams.get('scope') === 'all' && session.role >= 10
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (!scopeAll) where.userId = session.uid
    else if (searchParams.get('username')) where.username = { contains: searchParams.get('username') }
    if (status) where.status = parseInt(status)

    const [total, items] = await Promise.all([
      db.topupOrder.count({ where }),
      db.topupOrder.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
    ])

    // 管理端统计 (全量口径, 不受筛选影响)
    let stats: { total: number; paid: number; paidMoney: number; paidQuota: number } | undefined
    if (scopeAll && searchParams.get('stats') === '1') {
      const [allCount, paidAgg] = await Promise.all([
        db.topupOrder.count(),
        db.topupOrder.aggregate({ where: { status: 2 }, _count: true, _sum: { money: true, amount: true } }),
      ])
      stats = {
        total: allCount,
        paid: paidAgg._count,
        paidMoney: Math.round((paidAgg._sum.money ?? 0) * 100) / 100,
        paidQuota: Number(paidAgg._sum.amount ?? 0),
      }
    }

    return Response.json({
      success: true,
      data: {
        items: items.map((o) => ({ ...o, amount: Number(o.amount) })),
        total,
        page,
        size,
        stats,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** POST /api/console/topup { amount: 人民币实付金额(¥), type: alipay|wxpay } — 创建订单并返回收银台跳转地址
 *  Task 77: 用户侧人民币计价 — amount 即实付人民币; 到账额度 = amount / (单价×分组折扣) × QuotaPerUnit */
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const body = (await request.json()) as Record<string, unknown>
    const amount = Number(body.amount)
    const payType = String(body.type || 'alipay')

    if (!['alipay', 'wxpay', 'qqpay'].includes(payType)) throw new AuthError(400, '不支持的支付方式')
    if (!isFinite(amount) || amount <= 0) throw new AuthError(400, '充值金额不合法')

    const options = await getOptions(true)
    if (options.EnableOnlineTopUp !== 'true') throw new AuthError(400, '在线充值暂未开启，请使用兑换码兑换')

    const min = Math.max(parseFloat(options.MinTopUp || '0.01'), 0.01)
    if (amount < min) throw new AuthError(400, `最低充值金额为 ¥${min}`)
    if (amount > 100000) throw new AuthError(400, '单笔充值金额超出限制')

    const price = parseFloat(options.Price || '7.3')
    if (!isFinite(price) || price <= 0) throw new AuthError(400, '站点充值单价未配置，请联系管理员')
    const quotaPerUnit = getQuotaPerUnit(options)

    // 分组折扣 (TopupGroupRatio: {"default":1,"vip":0.8})
    let groupRatio = 1
    try {
      const ratios = JSON.parse(options.TopupGroupRatio || '{}') as Record<string, number>
      const u = await db.user.findUnique({ where: { id: session.uid }, select: { group: true } })
      const r = u ? ratios[u.group] : undefined
      if (typeof r === 'number' && r > 0 && r <= 1) groupRatio = r
    } catch {
      /* 分组倍率解析失败按 1 计 */
    }

    // 实付人民币 = 用户输入; 到账额度 = 实付 / (单价×分组折扣) × QuotaPerUnit (折扣组花同样的钱得更多额度)
    const money = Math.round(amount * 100) / 100
    const quota = Math.round((amount / (price * groupRatio)) * quotaPerUnit)
    if (quota < 1) throw new AuthError(400, '充值金额过低，请调整后再试')
    const orderNo = genOrderNo()

    const user = await db.user.findUnique({
      where: { id: session.uid },
      select: { username: true },
    })
    if (!user) throw new AuthError(401, '用户不存在')

    await db.topupOrder.create({
      data: {
        orderNo,
        userId: session.uid,
        username: user.username,
        amount: BigInt(quota),
        money,
        payType,
        status: 1,
      },
    })

    const gateway = (options.PayAddress || '').trim()
    const pid = (options.PayEpayId || '').trim()
    const key = (options.PayEpayKey || '').trim()
    if (!gateway || !pid || !key) throw new AuthError(400, '支付网关未配置，请联系管理员')

    // 回调基准地址: 优先 ServerAddress, 否则取当前请求 origin
    const base = (options.ServerAddress || new URL(request.url).origin).replace(/\/+$/, '')
    const siteName = options.SystemName || '北辰中转站'

    const payUrl = buildEpayUrl({
      gateway,
      pid,
      key,
      type: payType,
      outTradeNo: orderNo,
      notifyUrl: `${base}/api/pay/notify`,
      returnUrl: `${base}/console#/wallet?order=${orderNo}`,
      name: `${siteName}-额度充值`,
      money: fmtMoney(money),
      sitename: siteName,
    })

    return Response.json({ success: true, data: { orderNo, money, quota, payUrl } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

function fmtMoney(n: number): string {
  return n.toFixed(2)
}
