import { db } from '@/lib/db'
import { verifyPassword, createSessionCookie, AuthError } from '@/lib/auth'
import { assertNotLocked, recordLoginFail, clearLoginFails } from '@/lib/login-guard'
import { assertHuman } from '@/lib/antibot'
import { assertCaptchaToken } from '@/lib/captcha'
import { hit } from '@/lib/rate-limit'
import { getIp } from '@/lib/net'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    // 类型收紧 (Task 82 渗透修复: 对象/数组类型混淆导致 500, 应 400 诚实拒绝)
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!username || !password) throw new AuthError(400, '请输入用户名和密码')

    const ip = getIp(request)

    // IP 级登录频率上限 (Task 82): 防同 IP 批量撞库 (换用户名绕过 login-guard 的场景)
    if (!hit(`login-ip|${ip}`, 10 * 60 * 1000, 60)) {
      throw new AuthError(429, '登录尝试过于频繁，请 10 分钟后再试')
    }

    // 无感人机防护 (Task 90): 蜜罐字段 + 驻留时间, 零 UI 零打扰 (取代已移除的验证卡)
    assertHuman(body, 'login')

    // 点击式人机验证 (Task 129): 一次性凭证一券一用 (captcha/confirm 核销后签发)
    assertCaptchaToken(body)

    // 暴力破解防护 (Task 80): 同用户名+IP 15 分钟内失败 ≥10 次锁定
    assertNotLocked(username, ip)

    const user = await db.user.findUnique({ where: { username } })
    if (!user || !verifyPassword(password, user.password)) {
      recordLoginFail(username, ip)
      throw new AuthError(401, '用户名或密码错误')
    }
    if (user.status !== 1) throw new AuthError(403, '用户已被禁用，请联系管理员')

    clearLoginFails(username, ip)
    await db.user.update({ where: { id: user.id }, data: { lastLoginTime: new Date() } })
    const token = await createSessionCookie({
      uid: user.id,
      username: user.username,
      role: user.role,
      ver: user.tokenVersion,
    })
    return Response.json({
      success: true,
      data: { id: user.id, username: user.username, role: user.role, displayName: user.displayName, token },
    })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    const status = (err as { status?: number }).status === 429 ? 429 : 500
    if (status === 429) return Response.json({ message: (err as Error).message }, { status })
    console.error('login error:', err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
