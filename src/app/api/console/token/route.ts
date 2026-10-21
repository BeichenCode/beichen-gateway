import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { jsonSafe } from '@/lib/json'
import { intParam } from '@/lib/params'

export const runtime = 'nodejs'

function genTokenKey(): string {
  // 库中存裸 key, 展示时补 sk- 前缀
  return randomBytes(32).toString('hex')
}

/** GET /api/console/token — 普通用户看自己的, 管理员可查全部 */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || ''
    const page = intParam(searchParams, 'page', 1, 1)
    const size = intParam(searchParams, 'size', 20, 1, 100)
    const all = searchParams.get('all') === '1' && session.role >= 10

    const where: Record<string, unknown> = all ? {} : { userId: session.uid }
    if (keyword) where.name = { contains: keyword }

    const [total, tokens] = await Promise.all([
      db.token.count({ where }),
      db.token.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
    ])
    // Task 130: 两段查询取属主用户名 — include user 在出现孤儿令牌 (历史数据
    // userId 指向已删用户) 时会因必需关系物化为 null 直接抛 500, 改为手动合并
    // 容错: 属主缺失时显示「已注销」, 列表永不因脏数据整页挂掉
    const ownerIds = [...new Set(tokens.map((t) => t.userId))]
    const owners = ownerIds.length
      ? await db.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, username: true } })
      : []
    const ownerMap = new Map(owners.map((u) => [u.id, u.username]))
    return jsonSafe({
      success: true,
      data: {
        items: tokens.map((t) => ({
          ...t,
          quota: Number(t.quota),
          usedQuota: Number(t.usedQuota),
          username: ownerMap.get(t.userId) ?? '已注销',
          key: t.key.startsWith('sk-') ? t.key : `sk-${t.key}`,
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

/** POST 创建令牌 */
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const body = (await request.json()) as Record<string, unknown>
    const name = String(body.name || '').trim() || `token-${Date.now()}`

    const user = await db.user.findUnique({ where: { id: session.uid } })
    if (!user) throw new AuthError(401, '用户不存在')

    // 令牌数量上限 (Task 102): 普通用户 50 个 / 管理员 500 个, 防滥建膨胀
    const tokenCount = await db.token.count({ where: { userId: session.uid } })
    const maxTokens = session.role >= 10 ? 500 : 50
    if (tokenCount >= maxTokens) throw new AuthError(400, `令牌数量已达上限 (${maxTokens} 个)`)

    // 检查用户额度限制: 非管理员令牌额度不能超过用户剩余
    let quota = BigInt(Math.max(Number(body.quota) || 0, 0))
    const unlimited = body.unlimitedQuota === true && session.role >= 10
    if (!unlimited && quota <= 0n) throw new AuthError(400, '令牌额度必须大于 0')

    const expiredTime = body.expiredTime ? new Date(String(body.expiredTime)) : null

    // 分组收紧 (Task 102): 分组只影响路由选择, 普通用户自选分组 = 跨分组用优质渠道的路由越权,
    // 强制忽略 (跟随用户分组); 管理员可自设
    const groups = session.role >= 10 ? String(body.groups || '') : ''

    const token = await db.token.create({
      data: {
        name,
        key: genTokenKey(),
        userId: session.uid,
        status: 1,
        quota,
        unlimitedQuota: unlimited,
        expiredTime,
        models: String(body.models || ''),
        groups,
        ipLimit: String(body.ipLimit || ''),
      },
    })
    // Task 95-③: 创建响应补 sk- 前缀 (库中仍存裸 key, 展示层统一 sk- 形态; 存量令牌不受影响)
    return jsonSafe({ success: true, data: { ...token, key: `sk-${token.key}` } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
