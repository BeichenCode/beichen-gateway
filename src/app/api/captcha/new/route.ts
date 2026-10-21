/**
 * 点击式人机验证 — 签发挑战 (Task 129)
 * 服务端内存签发一次性挑战 id (5 分钟有效); 前端「点击进行安全验证」时调用。
 * IP 限流: 每分钟 30 次防刷。
 */
import { newCaptchaChallenge } from '@/lib/captcha'
import { hit } from '@/lib/rate-limit'
import { getIp } from '@/lib/net'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  const ip = getIp(request)
  if (!hit(`captcha-new|${ip}`, 60 * 1000, 30)) {
    return Response.json({ message: '验证请求过于频繁，请稍后再试' }, { status: 429 })
  }
  const challenge = newCaptchaChallenge()
  return Response.json({ success: true, data: { type: 'click', enforced: true, ...challenge } })
}
