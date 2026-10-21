import { db } from '@/lib/db'
import { requireAdmin, AuthError } from '@/lib/auth'
import { invalidateChannelCache } from '@/lib/relay/channel-select'
import { jsonSafe } from '@/lib/json'
import { intParam } from '@/lib/params'

export const runtime = 'nodejs'

function handleAuthError(err: unknown): Response | null {
  if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
  return null
}

/** GET /api/console/channel?keyword=&page=&size= */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || ''
    const page = intParam(searchParams, 'page', 1, 1)
    const size = intParam(searchParams, 'size', 20, 1, 100)

    const where = keyword ? { OR: [{ name: { contains: keyword } }, { models: { contains: keyword } }] } : {}
    const [total, channels] = await Promise.all([
      db.channel.count({ where }),
      db.channel.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * size,
        take: size,
      }),
    ])
    return jsonSafe({
      success: true,
      data: {
        items: channels,
        total,
        page,
        size,
      },
    })
  } catch (err) {
    const e = handleAuthError(err)
    if (e) return e
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** POST 创建渠道 */
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireAdmin()
    const body = (await request.json()) as Record<string, unknown>
    const name = String(body.name || '').trim()
    if (!name) throw new AuthError(400, '渠道名称不能为空')
    if (!body.key) throw new AuthError(400, '密钥不能为空')

    const channel = await db.channel.create({
      data: {
        name,
        type: Number(body.type) || 1,
        baseUrl: String(body.baseUrl || ''),
        key: String(body.key),
        models: String(body.models || ''),
        groups: String(body.groups || 'default'),
        priority: Number(body.priority) || 0,
        weight: Number(body.weight) || 0,
        status: body.status === undefined ? 1 : Number(body.status),
        autoBan: body.autoBan === undefined ? 1 : Number(body.autoBan),
        other: String(body.other || ''),
        remark: String(body.remark || ''),
      },
    })
    invalidateChannelCache()
    console.log(`[console] ${session.username} 创建渠道 ${channel.name}`)
    return jsonSafe({ success: true, data: channel })
  } catch (err) {
    const e = handleAuthError(err)
    if (e) return e
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
