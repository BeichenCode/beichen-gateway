import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { jsonSafe } from '@/lib/json'

export const runtime = 'nodejs'

async function getTokenWithPermissionCheck(id: number, session: { uid: number; role: number }) {
  const token = await db.token.findUnique({ where: { id } })
  if (!token) throw new AuthError(404, '令牌不存在')
  if (session.role < 10 && token.userId !== session.uid) throw new AuthError(403, '无权操作他人令牌')
  return token
}

/** PUT /api/console/token/[id] */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const session = await requireSession()
    const { id } = await params
    const token = await getTokenWithPermissionCheck(parseInt(id), session)
    const body = (await request.json()) as Record<string, unknown>

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.status !== undefined) data.status = Number(body.status)
    if (body.quota !== undefined) {
      const quota = BigInt(Math.max(Number(body.quota) || 0, 0))
      // 普通用户只能调低或恢复不超过原值 (Task 102: 落实校验, 原为空操作块)
      if (session.role < 10 && quota > token.quota) {
        throw new AuthError(403, '令牌额度不能调高原值，请联系管理员')
      }
      data.quota = quota
    }
    if (body.unlimitedQuota !== undefined) data.unlimitedQuota = body.unlimitedQuota === true && session.role >= 10
    if (body.expiredTime !== undefined) data.expiredTime = body.expiredTime ? new Date(String(body.expiredTime)) : null
    if (body.models !== undefined) data.models = String(body.models)
    // 分组收紧 (Task 102): 普通用户不可自选分组 (防跨分组路由越权)
    if (body.groups !== undefined) data.groups = session.role >= 10 ? String(body.groups) : ''
    if (body.ipLimit !== undefined) data.ipLimit = String(body.ipLimit)

    const updated = await db.token.update({ where: { id: token.id }, data })
    return jsonSafe({ success: true, data: updated })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** DELETE /api/console/token/[id] */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const session = await requireSession()
    const { id } = await params
    const token = await getTokenWithPermissionCheck(parseInt(id), session)
    await db.token.delete({ where: { id: token.id } })
    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
