import { db } from '@/lib/db'
import { requireAdmin, AuthError } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import { genAffCode } from '@/lib/utils'
import { intParam } from '@/lib/params'
import { shanghaiDayStart } from '@/lib/tz'

export const runtime = 'nodejs'

/** GET /api/console/user?keyword=&page=&size= */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || ''
    const page = intParam(searchParams, 'page', 1, 1)
    const size = intParam(searchParams, 'size', 20, 1, 100)

    const where = keyword ? { OR: [{ username: { contains: keyword } }, { displayName: { contains: keyword } }] } : {}
    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * size,
        take: size,
        select: {
          id: true, username: true, displayName: true, role: true, status: true, email: true,
          quota: true, usedQuota: true, requestCount: true, group: true, affCode: true, affCount: true,
          affHistoryQuota: true, createdAt: true, lastLoginTime: true, inviterId: true,
        },
      }),
    ])

    // Task 130: 列表附带今日调用简略数据 (一次 groupBy 批量聚合, 不逐用户查询)
    // Task 188: 「今日」按北京时间 (UTC+8) 换天, 不依赖服务器 TZ (服务器为 UTC, 本地零点口径已报障)
    const todayStart = shanghaiDayStart()
    const ids = users.map((u) => u.id)
    const todayAgg = ids.length
      ? await db.log.groupBy({
          by: ['userId'],
          where: { userId: { in: ids }, type: 2, createdAt: { gte: todayStart } },
          _count: true,
          _sum: { quota: true, promptTokens: true, completionTokens: true },
        })
      : []
    const aggMap = new Map(
      todayAgg.map((a) => [
        a.userId,
        {
          requests: a._count,
          quota: Number(a._sum.quota ?? 0),
          tokens: (a._sum.promptTokens ?? 0) + (a._sum.completionTokens ?? 0),
        },
      ]),
    )

    return Response.json({
      success: true,
      data: {
        items: users.map((u) => ({
          ...u,
          quota: Number(u.quota),
          usedQuota: Number(u.usedQuota),
          affHistoryQuota: Number(u.affHistoryQuota),
          todayRequests: aggMap.get(u.id)?.requests ?? 0,
          todayQuota: aggMap.get(u.id)?.quota ?? 0,
          todayTokens: aggMap.get(u.id)?.tokens ?? 0,
        })),
        total,
        page,
        size,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** POST 创建用户 */
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireAdmin()
    const body = (await request.json()) as Record<string, unknown>
    const username = String(body.username || '').trim()
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new AuthError(400, '用户名只能包含字母、数字、下划线，长度 3-20 位')
    const password = String(body.password || '')
    if (password.length < 6) throw new AuthError(400, '密码长度至少 6 位')

    const exists = await db.user.findUnique({ where: { username } })
    if (exists) throw new AuthError(400, '用户名已存在')

    const user = await db.user.create({
      data: {
        username,
        password: hashPassword(password),
        displayName: String(body.displayName || username).slice(0, 30),
        role: Number(body.role) || 1,
        status: 1,
        quota: BigInt(body.quota ? Number(body.quota) : 0),
        group: String(body.group || 'default'),
        affCode: genAffCode(),
      },
    })
    console.log(`[console] ${session.username} 创建用户 ${username}`)
    return Response.json({ success: true, data: { id: user.id, username: user.username } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
