import { db } from '@/lib/db'
import { requireAdmin, AuthError } from '@/lib/auth'
import { jsonSafe } from '@/lib/json'

export const runtime = 'nodejs'

/** PUT /api/console/redemption/[id] — 启用/禁用 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdmin()
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.quota !== undefined) data.quota = BigInt(Math.max(Number(body.quota) || 0, 0))
    if (body.status !== undefined) data.status = Number(body.status)
    const r = await db.redemption.update({ where: { id: parseInt(id) }, data })
    return jsonSafe({ success: true, data: r })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** DELETE /api/console/redemption/[id] */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdmin()
    const { id } = await params
    await db.redemption.delete({ where: { id: parseInt(id) } })
    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
