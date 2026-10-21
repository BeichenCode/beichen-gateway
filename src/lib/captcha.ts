/**
 * 点击式人机验证 (Task 129) — 一键验证条 · 服务端一次性凭证
 *
 * 交互 (对齐 yz.013.ltd 验证平台「智能验证条/一键无感」形态):
 *   前端点击验证条 → POST /api/captcha/new 领取挑战 (服务端签发 id, 5 分钟有效)
 *   → 感知节奏停顿 (≥900ms, 前端动画 + 服务端时长门槛双保险)
 *   → POST /api/captcha/confirm { id, durationMs } 核销挑战 → 签发一次性凭证 (10 分钟, 一券一用)
 *   → login/register 携带 captchaId, assertCaptchaToken 校验并消费
 *
 * Task 120 照片拼图 (yz 拼图作答) 已整体下线 (用户拍板: 缺口拼图太难看, 改点击式)。
 * 挑战与凭证均为本站内存表 (单实例部署, 与历史行为一致); 无上游依赖, 不再需要熔断降级。
 * 保留防线: IP 限流 (路由层) + durationMs 节奏门槛 + 一次性凭证 + 蜜罐/驻留 (login/register 内)。
 */
import { randomUUID } from 'crypto'
import { AuthError } from '@/lib/auth'

/** 已签发未核销的挑战: id → 签发时刻 */
const CHALLENGE_TTL = 5 * 60 * 1000
const pending = new Map<string, number>()

/** verify 成功后签发的凭证: id → 状态 (10 分钟 TTL, 一券一用) */
interface CaptchaCredential {
  verifiedAt: number
  consumed: boolean
}
const CREDENTIAL_TTL = 10 * 60 * 1000
const credentials = new Map<string, CaptchaCredential>()

/** confirm 最低节奏门槛: 快于此值视为脚本瞬击 (前端动画本身 ≥900ms, 真人无感) */
const MIN_DURATION_MS = 600

function sweep() {
  const now = Date.now()
  for (const [k, t] of pending) if (now - t > CHALLENGE_TTL) pending.delete(k)
  for (const [k, v] of credentials) if (now - v.verifiedAt > CREDENTIAL_TTL) credentials.delete(k)
}

/** 签发新挑战 */
export function newCaptchaChallenge(): { id: string; expiresIn: number } {
  sweep()
  const id = randomUUID()
  pending.set(id, Date.now())
  return { id, expiresIn: Math.floor(CHALLENGE_TTL / 1000) }
}

/** 核销挑战 (点击式): 校验存在性/TTL/节奏门槛 → 签发一次性凭证 */
export function confirmCaptchaClick(
  id: string,
  durationMs: number
): { success: boolean; message: string } {
  sweep()
  const issuedAt = pending.get(id)
  if (issuedAt === undefined) {
    return { success: false, message: '验证已过期，请重新点击验证' }
  }
  if (Date.now() - issuedAt > CHALLENGE_TTL) {
    pending.delete(id)
    return { success: false, message: '验证已过期，请重新点击验证' }
  }
  if (durationMs < MIN_DURATION_MS) {
    return { success: false, message: '验证节奏异常，请重新点击验证' }
  }
  pending.delete(id)
  credentials.set(id, { verifiedAt: Date.now(), consumed: false })
  return { success: true, message: '验证成功' }
}

/**
 * login/register 强制校验: 凭证必须已 verify 且未消费 (一券一用)。
 * 点击式验证无上游依赖, 恒为强制 (历史上游熔断降级随 yz 拼图一并下线)。
 */
export function assertCaptchaToken(body: Record<string, unknown>): void {
  const id = typeof body.captchaId === 'string' ? body.captchaId.trim() : ''
  if (!id) {
    throw new AuthError(403, '请先完成安全验证')
  }
  const cred = credentials.get(id)
  if (!cred || cred.consumed || Date.now() - cred.verifiedAt > CREDENTIAL_TTL) {
    throw new AuthError(403, '安全验证已失效，请重新验证')
  }
  cred.consumed = true
}
