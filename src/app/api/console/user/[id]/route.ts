import { db } from '@/lib/db'
import { requireAdmin, requireRoot, hashPassword, revokeSessions, AuthError } from '@/lib/auth'
import { EMAIL_RE } from '@/lib/email'

export const runtime = 'nodejs'

/** PUT /api/console/user/[id] */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const uid = parseInt(id)
    const target = await db.user.findUnique({ where: { id: uid } })
    if (!target) throw new AuthError(404, '用户不存在')
    // 管理员不能编辑 root, root 才能编辑 root
    if (target.role >= 100 && session.role < 100) throw new AuthError(403, '无权编辑超级管理员')

    const body = (await request.json()) as Record<string, unknown>
    const data: Record<string, unknown> = {}
    if (body.displayName !== undefined) data.displayName = String(body.displayName).slice(0, 30)
    if (body.password !== undefined && String(body.password).length > 0) {
      const pwd = String(body.password)
      if (pwd.length < 6) throw new AuthError(400, '密码长度至少 6 位')
      data.password = hashPassword(pwd)
    }
    // Task 126: Math.round 加固 — 非整数值 (如 123.45) 传给 BigInt 会抛 RangeError 导致 500
    if (body.quota !== undefined) data.quota = BigInt(Math.round(Math.max(Number(body.quota) || 0, 0)))
    // Task 127: 增量余额 — quotaDelta (内部 quota 增量, 可负) 在原值基础上增减而非覆盖;
    // 事务内先校验减后不为负再原子 increment (弹窗打开期间用户仍在消耗也不丢账)
    if (body.quotaDelta !== undefined) {
      const d = Math.round(Number(body.quotaDelta) || 0)
      if (d !== 0) data.quota = { increment: BigInt(d) }
    }
    if (body.usedQuota !== undefined) data.usedQuota = BigInt(Math.round(Math.max(Number(body.usedQuota) || 0, 0)))
    if (body.group !== undefined) data.group = String(body.group)
    if (body.email !== undefined) {
      const em = String(body.email).trim()
      // 邮箱格式校验 (Task 102): 非空时必须是合法邮箱, 防脏数据入库
      if (em && !EMAIL_RE.test(em)) throw new AuthError(400, '邮箱格式不正确')
      data.email = em
    }
    if (body.status !== undefined) data.status = Number(body.status)
    if (body.role !== undefined) {
      const role = Number(body.role)
      // 只有 root 能设置管理员/root
      if (role >= 10 && session.role < 100) throw new AuthError(403, '仅超级管理员可设置管理员权限')
      if (target.role >= 100 && session.role < 100) throw new AuthError(403, '无权修改超级管理员角色')
      data.role = role
    }

    // Task 127: 增量走事务 — 先读当前 quota 校验减后不为负, 再原子 update
    const user = await db.$transaction(async (tx) => {
      const inc = (data.quota as { increment?: bigint } | undefined)?.increment
      if (inc !== undefined) {
        const cur = await tx.user.findUnique({ where: { id: uid }, select: { quota: true } })
        if (!cur) throw new AuthError(404, '用户不存在')
        if (cur.quota + inc < 0n) throw new AuthError(400, '减少的余额超过当前余额')
      }
      return tx.user.update({ where: { id: uid }, data })
    })
    // Task 82 会话吊销: 改密/禁用/降权后该用户全部旧会话立即失效
    if (data.password !== undefined || data.status !== undefined || data.role !== undefined) {
      await revokeSessions(uid)
    }
    return Response.json({ success: true, data: { id: user.id, username: user.username } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** DELETE /api/console/user/[id] — 仅 root */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const session = await requireRoot()
    const { id } = await params
    const uid = parseInt(id)
    if (uid === session.uid) throw new AuthError(400, '不能删除自己')
    const target = await db.user.findUnique({ where: { id: uid } })
    if (!target) throw new AuthError(404, '用户不存在')
    // Task 126: Log 外键无级联 (onDelete 默认 Restrict), 直接删用户会触发 FK 约束 → 500。
    // 事务内先清使用日志/令牌 (Token 虽有 Cascade, 显式删更直观) 再删用户
    await db.$transaction([
      db.log.deleteMany({ where: { userId: uid } }),
      db.token.deleteMany({ where: { userId: uid } }),
      db.user.delete({ where: { id: uid } }),
    ])
    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
