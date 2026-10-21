import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

/** GET /api/console/user/invitees — 我邀请注册的用户列表 (仅基础信息, 本人可见) */
export async function GET(): Promise<Response> {
  try {
    const session = await requireSession()
    const users = await db.user.findMany({
      where: { inviterId: session.uid },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, username: true, displayName: true, status: true, createdAt: true },
    })
    return Response.json({ success: true, data: { items: users, total: users.length } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error('invitees error:', err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
