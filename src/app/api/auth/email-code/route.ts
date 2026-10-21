import { randomInt } from 'crypto'
import { db } from '@/lib/db'
import { AuthError } from '@/lib/auth'
import { getOptions } from '@/lib/options'
import { parseMailConfig, sendVerificationMail, hashCodeEmailCode, EMAIL_RE } from '@/lib/email'
import { isWellKnownEmail, EMAIL_DOMAIN_HINT } from '@/lib/email-policy'
import { assertHuman } from '@/lib/antibot'
import { getIp } from '@/lib/net'

export const runtime = 'nodejs'

const CODE_TTL_MS = 5 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_PER_EMAIL_PER_HOUR = 5
const MAX_PER_IP_PER_HOUR = 10

/** POST /api/auth/email-code { email } — 发送注册验证码 (公开接口, 无感防护 + 三重限流防刷) */
export async function POST(request: Request): Promise<Response> {
  try {
    const options = await getOptions()
    if (options.EmailVerificationEnabled !== 'true') {
      throw new AuthError(400, '站点未启用邮箱验证')
    }
    const ip = getIp(request)

    const body = (await request.json().catch(() => ({}))) as { email?: string; hp?: unknown; dwellMs?: unknown }

    // 无感人机防护 (Task 90): 蜜罐字段 + 驻留时间, 零 UI 零打扰 (取代已移除的验证卡, 防批量刷码第一道门)
    assertHuman(body, 'email-code')

    const mail = parseMailConfig(options)
    if (!mail) throw new AuthError(500, '管理员尚未配置邮件服务，请联系管理员')

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email) || email.length > 100) throw new AuthError(400, '请输入正确的邮箱地址')
    // Task 95-⑥: 域名白名单 — 仅向主流知名邮箱发码 (防临时邮箱批量注册, 后端为准)
    if (!isWellKnownEmail(email)) throw new AuthError(400, `暂仅支持主流邮箱注册（${EMAIL_DOMAIN_HINT}）`)

    // 诚实校验邮箱占用 (已注册邮箱不发码)
    const taken = await db.user.findFirst({ where: { email } })
    if (taken) throw new AuthError(400, '该邮箱已被注册')

    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // 限流 1: 同邮箱 60s 冷却 (防轰炸单人)
    const latest = await db.emailCode.findFirst({
      where: { email, purpose: 'register' },
      orderBy: { id: 'desc' },
    })
    if (latest && now.getTime() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now.getTime() - latest.createdAt.getTime())) / 1000)
      throw new AuthError(429, `发送过于频繁，请 ${wait} 秒后再试`)
    }
    // 限流 2: 同邮箱每小时 5 封
    const perEmail = await db.emailCode.count({ where: { email, purpose: 'register', createdAt: { gte: hourAgo } } })
    if (perEmail >= MAX_PER_EMAIL_PER_HOUR) throw new AuthError(429, '该邮箱发送次数已达上限，请一小时后再试')
    // 限流 3: 同 IP 每小时 10 封 (防批量刷接口)
    const perIp = await db.emailCode.count({ where: { ip, createdAt: { gte: hourAgo } } })
    if (perIp >= MAX_PER_IP_PER_HOUR) throw new AuthError(429, '当前网络发送次数已达上限，请一小时后再试')

    // 6 位数字验证码: randomInt 密码学安全, HMAC 入库
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    await db.emailCode.create({
      data: {
        email,
        codeHash: hashCodeEmailCode(code),
        purpose: 'register',
        ip,
        expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      },
    })

    try {
      await sendVerificationMail(mail, email, code)
    } catch (err) {
      console.error('mail send error:', err)
      throw new AuthError(500, '验证码邮件发送失败，请稍后重试或联系管理员')
    }

    return Response.json({ success: true, data: { expire: CODE_TTL_MS / 1000, cooldown: RESEND_COOLDOWN_MS / 1000 } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error('email-code error:', err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
