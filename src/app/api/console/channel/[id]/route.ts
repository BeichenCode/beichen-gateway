import { db } from '@/lib/db'
import { requireAdmin, AuthError } from '@/lib/auth'
import { invalidateChannelCache } from '@/lib/relay/channel-select'
import { jsonSafe } from '@/lib/json'

export const runtime = 'nodejs'

function handleAuthError(err: unknown): Response | null {
  if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
  return null
}

/** PUT /api/console/channel/[id] */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdmin()
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.type !== undefined) data.type = Number(body.type)
    if (body.baseUrl !== undefined) data.baseUrl = String(body.baseUrl)
    if (body.key !== undefined && body.key !== '') data.key = String(body.key)
    if (body.models !== undefined) data.models = String(body.models)
    if (body.groups !== undefined) data.groups = String(body.groups)
    if (body.priority !== undefined) data.priority = Number(body.priority)
    if (body.weight !== undefined) data.weight = Number(body.weight)
    if (body.status !== undefined) data.status = Number(body.status)
    if (body.autoBan !== undefined) data.autoBan = Number(body.autoBan)
    if (body.other !== undefined) data.other = String(body.other)
    if (body.remark !== undefined) data.remark = String(body.remark)

    const channel = await db.channel.update({ where: { id: parseInt(id) }, data })
    invalidateChannelCache()
    return jsonSafe({ success: true, data: channel })
  } catch (err) {
    const e = handleAuthError(err)
    if (e) return e
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** DELETE /api/console/channel/[id] */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdmin()
    const { id } = await params
    await db.channel.delete({ where: { id: parseInt(id) } })
    invalidateChannelCache()
    return Response.json({ success: true })
  } catch (err) {
    const e = handleAuthError(err)
    if (e) return e
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
