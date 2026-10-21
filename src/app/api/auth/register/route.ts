import { db } from '@/lib/db'
import { hashPassword, createSessionCookie, AuthError } from '@/lib/auth'
import { getBoolOption, getOption, getOptions } from '@/lib/options'
import { genAffCode } from '@/lib/utils'
import { verifyEmailCode, EMAIL_RE } from '@/lib/email'
import { isWellKnownEmail, EMAIL_DOMAIN_HINT } from '@/lib/email-policy'
import { assertHuman } from '@/lib/antibot'
import { assertCaptchaToken } from '@/lib/captcha'
import { hit } from '@/lib/rate-limit'
import { getIp } from '@/lib/net'

export const runtime = 'nodejs'

/** 保留用户名 (Task 95-⑤): 站点身份/管理员惯例名, 不允许注册占用 (大小写不敏感) */
const RESERVED_USERNAMES = new Set(['beichen', 'root', 'admin'])

export async function POST(request: Request): Promise<Response> {
  try {
    const registerEnabled = await getBoolOption('RegisterEnabled', true)
    if (!registerEnabled) throw new AuthError(403, '管理员关闭了新用户注册')

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const ip = getIp(request)

    // IP 级注册频率上限 (Task 82): 同 IP 每小时最多 5 个新账号, 防批量注册
    if (!hit(`register-ip|${ip}`, 60 * 60 * 1000, 5, 30 * 60 * 1000)) {
      throw new AuthError(429, '注册过于频繁，请稍后再试')
    }

    // 无感人机防护 (Task 90): 蜜罐字段 + 驻留时间, 零 UI 零打扰 (取代已移除的验证卡)
    assertHuman(body, 'register')

    // 点击式人机验证 (Task 129): 一次性凭证一券一用 (captcha/confirm 核销后签发)
    assertCaptchaToken(body)

    // 类型收紧 (Task 82: 对象类型混淆导致 500, 应 400 诚实拒绝)
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    // Task 95-⑤: 放宽为支持中文 (汉字+字母+数字+下划线), 最短 2 位; 保留名占用拒绝
    if (!/^[\p{Script=Han}a-zA-Z0-9_]{2,20}$/u.test(username)) {
      throw new AuthError(400, '用户名支持中文、字母、数字、下划线，长度 2-20 位')
    }
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      throw new AuthError(400, '该用户名为保留名称，请更换一个')
    }
    if (password.length < 6) throw new AuthError(400, '密码长度至少 6 位')
    if (body.password2 !== undefined && password !== body.password2) {
      throw new AuthError(400, '两次输入的密码不一致')
    }

    // 邮箱验证码校验 (Task 80): EmailVerificationEnabled 开启后强制, 消费一次性验证码
    const options = await getOptions()
    let email = ''
    if (options.EmailVerificationEnabled === 'true') {
      email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      const code = typeof body.emailCode === 'string' ? body.emailCode.trim() : ''
      if (!EMAIL_RE.test(email)) throw new AuthError(400, '请输入正确的邮箱地址')
      // Task 95-⑥: 域名白名单 (后端为准) — 仅放行主流知名邮箱
      if (!isWellKnownEmail(email)) throw new AuthError(400, `暂仅支持主流邮箱注册（${EMAIL_DOMAIN_HINT}）`)
      if (!code) throw new AuthError(400, '请输入邮箱验证码')
      const rec = await db.emailCode.findFirst({
        where: { email, purpose: 'register', usedAt: null },
        orderBy: { id: 'desc' },
      })
      if (!rec) throw new AuthError(400, '请先获取邮箱验证码')
      if (rec.attempts >= 5) throw new AuthError(400, '验证码错误次数过多，请重新获取')
      if (rec.expiresAt < new Date()) throw new AuthError(400, '验证码已过期，请重新获取')
      if (!verifyEmailCode(code, rec.codeHash)) {
        await db.emailCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } })
        throw new AuthError(400, '验证码错误')
      }
      const emailTaken = await db.user.findFirst({ where: { email } })
      if (emailTaken) throw new AuthError(400, '该邮箱已被注册')
      // 消费验证码 (一次性): 与后续 create 同事务语义不强求, 先标记防重放
      await db.emailCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } })
    }

    const exists = await db.user.findUnique({ where: { username } })
    if (exists) throw new AuthError(400, '用户名已存在')

    // 邀请码处理
    let inviterId: number | null = null
    if (typeof body.affCode === 'string' && body.affCode) {
      const inviter = await db.user.findUnique({ where: { affCode: body.affCode.trim() } })
      if (inviter && inviter.status === 1) {
        inviterId = inviter.id
      }
    }

    // 新用户默认额度 (Task 77: 设置为人民币面值语义, 按当前充值汇率折算为内部额度)
    const price = parseFloat((await getOption('Price', '7.3')) || '7.3') || 7.3
    const quotaPerUnit = parseFloat((await getOption('QuotaPerUnit', '500000')) || '500000') || 500000
    const giftCNY = parseFloat((await getOption('QuotaForNewUser', '0')) || '0') || 0
    const defaultQuota = Math.max(Math.round((giftCNY / price) * quotaPerUnit), 0)

    const user = await db.user.create({
      data: {
        username,
        password: hashPassword(password),
        displayName: (typeof body.displayName === 'string' && body.displayName ? body.displayName : username).slice(0, 30),
        email,
        role: 1,
        status: 1,
        quota: BigInt(defaultQuota),
        group: 'default',
        affCode: genAffCode(),
        inviterId,
      },
    })

    // 新用户赠送流水 (诚实记账): 与邀请奖励同走 type 1 (充值/入账), 日志页可见
    if (defaultQuota > 0) {
      await db.log.create({
        data: {
          userId: user.id,
          type: 1,
          quota: BigInt(defaultQuota),
          content: `新用户注册赠送（¥${giftCNY.toFixed(2)}）`,
        },
      })
    }

    if (inviterId) {
      // 邀请奖励 (人民币面值语义): AffQuota=1 即邀请人获 ¥1 面值额度, 实时按汇率折算
      const affCNY = parseFloat((await getOption('AffQuota', '1')) || '1') || 0
      const affQuota = Math.max(Math.round((affCNY / price) * quotaPerUnit), 0)
      if (affQuota > 0) {
        await db.user.update({
          where: { id: inviterId },
          data: { affCount: { increment: 1 }, affHistoryQuota: { increment: BigInt(affQuota) }, quota: { increment: BigInt(affQuota) } },
        })
        await db.log.create({
          data: {
            userId: inviterId,
            type: 1,
            quota: BigInt(affQuota),
            content: `邀请用户 ${username} 注册奖励（¥${affCNY.toFixed(2)}）`,
          },
        })
      } else {
        await db.user.update({ where: { id: inviterId }, data: { affCount: { increment: 1 } } })
      }
    }

    const token = await createSessionCookie({
      uid: user.id,
      username: user.username,
      role: user.role,
      ver: user.tokenVersion,
    })
    return Response.json({ success: true, data: { id: user.id, username: user.username, role: user.role, token } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error('register error:', err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
