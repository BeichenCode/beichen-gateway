import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { hit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/** POST /api/console/redemption/redeem { key } — 用户兑换额度 (每用户 10 次/分钟, 防遍历爆破) */
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    // Task 82: 兑换码空间是枚举攻击面, 限速 10 次/分钟/用户
    if (!hit(`redeem|${session.uid}`, 60 * 1000, 10)) {
      throw new AuthError(429, '兑换尝试过于频繁，请 1 分钟后再试')
    }
    const body = (await request.json().catch(() => ({}))) as { key?: unknown }
    const key = typeof body.key === 'string' ? body.key.trim() : ''
    if (!key) throw new AuthError(400, '请输入兑换码')

    const r = await db.redemption.findUnique({ where: { key } })
    if (!r) throw new AuthError(400, '兑换码不存在')
    if (r.status === 3) throw new AuthError(400, '该兑换码已被使用')
    if (r.status === 2) throw new AuthError(400, '该兑换码已被禁用')

    await db.$transaction([
      db.redemption.update({
        where: { id: r.id },
        data: { status: 3, userId: session.uid, username: session.username, usedAt: new Date() },
      }),
      db.user.update({
        where: { id: session.uid },
        data: { quota: { increment: r.quota } },
      }),
      db.log.create({
        data: {
          userId: session.uid,
          username: session.username,
          type: 1,
          quota: r.quota,
          content: `兑换码 ${key} 兑换成功`,
        },
      }),
    ])
    return Response.json({ success: true, data: { quota: Number(r.quota) } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
