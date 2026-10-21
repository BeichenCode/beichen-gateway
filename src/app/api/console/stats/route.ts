import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { getOptions, getQuotaPerUnit } from '@/lib/options'
import { intParam } from '@/lib/params'
import { shanghaiDayStart, shanghaiDateKey } from '@/lib/tz'

export const runtime = 'nodejs'

/**
 * Task 154: 服务器自身出口 IP (模块级缓存, 进程内只探一次)。
 * 背景: 部署冒烟/e2e 脚本从本机发起的真实调用也会落 Log (egress IP 同源),
 * 用户看到「3 个 IP」其中一个其实是网关自己的探测流量 → 在线口径里排除;
 * 探测失败返回 '' (仅排除回环), 不阻塞 stats 响应。
 */
let selfEgress: string | null | undefined
function getSelfEgressIp(): Promise<string> {
  if (selfEgress !== undefined) return Promise.resolve(selfEgress!)
  selfEgress = ''
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2500)
  return fetch('https://api.ipify.org', { signal: ctrl.signal, cache: 'no-store' })
    .then((r) => r.text())
    .then((t) => {
      const ip = t.trim()
      selfEgress = /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip : ''
      return selfEgress
    })
    .catch(() => '')
    .finally(() => clearTimeout(timer))
}

/** GET /api/console/stats — 数据看板 */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const options = await getOptions()
    const quotaPerUnit = getQuotaPerUnit(options)
    const { searchParams } = new URL(request.url)
    const days = intParam(searchParams, 'days', 7, 1, 90)
    const isAdmin = session.role >= 10

    const now = new Date()
    // Task 188: 「今日/按天」口径按北京时间 (UTC+8) 换天 — 服务器 TZ 为 UTC, 若用本地零点
    // UTC 的「今天」要到北京早上 8 点才开始, 北京零点后看板仍聚合昨日数据 (用户已报障)
    const todayStart = shanghaiDayStart(now)
    // 北京无夏令时, 北京日界间隔恒 24h, 直接按毫秒回推 N-1 天安全
    const rangeStart = new Date(todayStart.getTime() - (days - 1) * 24 * 3600 * 1000)

    const userFilter = isAdmin ? {} : { userId: session.uid }

    // Task 133→152: 实时在线 (全站聚合, 所有登录用户可见) — 改按「独立 IP」口径:
    // 近 15 分钟有调用记录的去重客户端 IP (活跃) / 近 5 分钟调用 IP 数 (正在调用);
    // ip 由中继引擎从 CF-Connecting-IP 等头提取落库, 历史旧日志 ip='' 已过滤不计
    // Task 154: ① 排除回环 (127.0.0.1/::1, 部署冒烟) 与服务器自身出口 (自测脚本) —
    //              「对话一次多一个 IP」的错觉主要来自这类自测流量混入计数;
    //           ② 附 ips15List 明细 (IP+国家+次数+最近活跃), 看板卡片可展开自证真实性
    const selfIp = await getSelfEgressIp()
    const online15Raw = await db.log.findMany({
      where: { type: 2, ip: { notIn: ['', '127.0.0.1', '::1'] }, createdAt: { gte: new Date(now.getTime() - 15 * 60_000) } },
      select: { ip: true, country: true, createdAt: true },
      orderBy: { id: 'desc' },
    })
    const online15 = online15Raw.filter((l) => l.ip !== selfIp)
    const online15Map = new Map<string, { ip: string; country: string; reqs: number; lastAt: number }>()
    for (const l of online15) {
      const cur = online15Map.get(l.ip)
      if (cur) {
        cur.reqs += 1
        if (!cur.country && l.country) cur.country = l.country
      } else {
        online15Map.set(l.ip, { ip: l.ip, country: l.country || '', reqs: 1, lastAt: l.createdAt.getTime() })
      }
    }
    const ips15 = online15Map.size
    const fiveMinCut = now.getTime() - 5 * 60_000
    const ips5 = [...online15Map.values()].filter((v) => v.lastAt >= fiveMinCut).length
    const ips15List = [...online15Map.values()].sort((a, b) => b.lastAt - a.lastAt).slice(0, 50)

    // 今日统计
    const [todayLogs, totalLogs] = await Promise.all([
      db.log.findMany({ where: { ...userFilter, type: 2, createdAt: { gte: todayStart } }, select: { quota: true, promptTokens: true, completionTokens: true } }),
      db.log.aggregate({
        where: { ...userFilter, type: 2 },
        _sum: { quota: true, promptTokens: true, completionTokens: true },
        _count: true,
      }),
    ])
    const todayQuota = todayLogs.reduce((s, l) => s + Number(l.quota), 0)
    const todayTokens = todayLogs.reduce((s, l) => s + l.promptTokens + l.completionTokens, 0)

    // 每日趋势 (最近 N 天, 按北京时间日界分桶)
    const trendLogs = await db.log.findMany({
      where: { ...userFilter, type: 2, createdAt: { gte: rangeStart } },
      select: { quota: true, createdAt: true, promptTokens: true, completionTokens: true },
    })
    const trendMap = new Map<string, { quota: number; tokens: number; count: number; promptTokens: number; completionTokens: number }>()
    for (let i = 0; i < days; i++) {
      const key = shanghaiDateKey(new Date(rangeStart.getTime() + i * 24 * 3600 * 1000))
      trendMap.set(key, { quota: 0, tokens: 0, count: 0, promptTokens: 0, completionTokens: 0 })
    }
    for (const l of trendLogs) {
      const key = shanghaiDateKey(l.createdAt)
      const item = trendMap.get(key)
      if (item) {
        item.quota += Number(l.quota)
        item.tokens += l.promptTokens + l.completionTokens
        item.count += 1
        item.promptTokens += l.promptTokens
        item.completionTokens += l.completionTokens
      }
    }
    const trend = [...trendMap.entries()].map(([date, v]) => ({ date, ...v }))

    // 模型分布 (最近 N 天)
    const modelLogs = await db.log.groupBy({
      by: ['modelName'],
      where: { ...userFilter, type: 2, createdAt: { gte: rangeStart } },
      _sum: { quota: true },
      _count: true,
      orderBy: { _sum: { quota: 'desc' } },
      take: 10,
    })
    const modelDist = modelLogs.map((m) => ({
      model: m.modelName || 'unknown',
      quota: Number(m._sum.quota ?? 0),
      count: m._count,
    }))

    let channelCount = 0
    let channelEnabled = 0
    let userCount = 0
    if (isAdmin) {
      const [tc, te, tu] = await Promise.all([
        db.channel.count(),
        db.channel.count({ where: { status: 1 } }),
        db.user.count(),
      ])
      channelCount = tc
      channelEnabled = te
      userCount = tu
    }

    // Task 130: 管理员视角追加「我的数据」— 当前账号自己的用量与全站数据分列展示
    let mine: {
      today: { quota: number; requests: number; tokens: number }
      total: { quota: number; requests: number }
    } | null = null
    if (isAdmin) {
      const myWhere = { userId: session.uid, type: 2 }
      const [myTodayLogs, myTotalAgg] = await Promise.all([
        db.log.findMany({ where: { ...myWhere, createdAt: { gte: todayStart } }, select: { quota: true, promptTokens: true, completionTokens: true } }),
        db.log.aggregate({ where: myWhere, _sum: { quota: true }, _count: true }),
      ])
      mine = {
        today: {
          quota: myTodayLogs.reduce((s, l) => s + Number(l.quota), 0),
          requests: myTodayLogs.length,
          tokens: myTodayLogs.reduce((s, l) => s + l.promptTokens + l.completionTokens, 0),
        },
        total: {
          quota: Number(myTotalAgg._sum.quota ?? 0),
          requests: myTotalAgg._count,
        },
      }
    }

    const me = await db.user.findUnique({ where: { id: session.uid } })

    // Task 111: 看板 10s 轮询拉取 — 显式禁缓存, 保证任何代理层都不回陈旧数据
    return Response.json(
      {
        success: true,
        data: {
        isAdmin,
        quotaPerUnit,
        today: {
          quota: todayQuota,
          requests: todayLogs.length,
          tokens: todayTokens,
        },
        total: {
          quota: Number(totalLogs._sum.quota ?? 0),
          requests: totalLogs._count,
          promptTokens: totalLogs._sum.promptTokens ?? 0,
          completionTokens: totalLogs._sum.completionTokens ?? 0,
        },
        myQuota: Number(me?.quota ?? 0),
        myUsedQuota: Number(me?.usedQuota ?? 0),
        mine,
        channels: { total: channelCount, enabled: channelEnabled },
        userCount,
        online: { ips15, ips5, selfIp, ips15List },
        trend,
        modelDist,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
