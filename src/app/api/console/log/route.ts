import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { intParam, intParamOpt, tsParam } from '@/lib/params'

export const runtime = 'nodejs'

/** GET /api/console/log?type=&modelName=&tokenName=&startTimestamp=&endTimestamp=&page=&size= */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)
    // 分页/过滤参数统一安全解析: 非法值回退默认, 杜绝 NaN 进 Prisma (线上曾致 500)
    const page = intParam(searchParams, 'page', 1, 1)
    const size = intParam(searchParams, 'size', 20, 1, 100)
    const targetUserId = intParamOpt(searchParams, 'userId')

    const where: Record<string, unknown> = {}
    // 普通用户只能看自己的日志
    if (session.role < 10) {
      where.userId = session.uid
    } else if (targetUserId !== undefined) {
      where.userId = targetUserId
    }
    const type = intParamOpt(searchParams, 'type')
    if (type !== undefined) where.type = type
    const modelName = searchParams.get('modelName')
    if (modelName) where.modelName = { contains: modelName }
    const tokenName = searchParams.get('tokenName')
    if (tokenName) where.tokenName = { contains: tokenName }
    const channelName = searchParams.get('channelName')
    if (channelName && session.role >= 10) where.channelName = { contains: channelName }
    const username = searchParams.get('username')
    if (username && session.role >= 10) where.username = { contains: username }
    const start = tsParam(searchParams, 'startTimestamp')
    const end = tsParam(searchParams, 'endTimestamp')
    if (start !== undefined || end !== undefined) {
      where.createdAt = {}
      if (start !== undefined) (where.createdAt as Record<string, unknown>).gte = new Date(start)
      if (end !== undefined) (where.createdAt as Record<string, unknown>).lte = new Date(end)
    }

    const [total, logs] = await Promise.all([
      db.log.count({ where }),
      db.log.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
    ])
    return Response.json({
      success: true,
      data: { items: logs.map((l) => ({ ...l, quota: Number(l.quota) })), total, page, size },
    })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
