import { db } from '@/lib/db'
import { requireSession, verifyPassword, hashPassword, revokeSessions, AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

/** PUT /api/console/user/self { displayName, oldPassword, newPassword } */
export async function PUT(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const body = (await request.json()) as Record<string, unknown>
    const user = await db.user.findUnique({ where: { id: session.uid } })
    if (!user) throw new AuthError(404, '用户不存在')

    const data: Record<string, unknown> = {}
    if (body.displayName !== undefined) data.displayName = String(body.displayName).slice(0, 30)
    if (body.password !== undefined) {
      const oldPwd = String(body.oldPassword || '')
      const newPwd = String(body.password)
      if (!verifyPassword(oldPwd, user.password)) throw new AuthError(400, '旧密码错误')
      if (newPwd.length < 6) throw new AuthError(400, '新密码长度至少 6 位')
      data.password = hashPassword(newPwd)
    }
    await db.user.update({ where: { id: session.uid }, data })
    // Task 82 会话吊销: 改密后吊销全部旧会话 (含当前), 前端将跳转登录页
    if (data.password !== undefined) await revokeSessions(session.uid)
    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
