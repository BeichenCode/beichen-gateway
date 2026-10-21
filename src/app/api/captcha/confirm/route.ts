/**
 * 点击式人机验证 — 核销挑战 (Task 129)
 * 前端点击验证条后携带挑战 id 与感知时长核销 → 签发一次性凭证 (login/register 消费)。
 * IP 限流: 每分钟 40 次。
 */
import { confirmCaptchaClick } from '@/lib/captcha'
import { hit } from '@/lib/rate-limit'
import { getIp } from '@/lib/net'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  const ip = getIp(request)
  if (!hit(`captcha-confirm|${ip}`, 60 * 1000, 40)) {
    return Response.json({ message: '验证请求过于频繁，请稍后再试' }, { status: 429 })
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const duration = typeof body.durationMs === 'number' ? body.durationMs : 0
  if (!id) {
    return Response.json({ success: false, message: '验证数据缺失，请重新验证' })
  }
  const result = confirmCaptchaClick(id, Math.max(0, Math.round(duration)))
  return Response.json(result)
}
