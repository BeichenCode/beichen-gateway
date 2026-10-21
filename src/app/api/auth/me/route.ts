import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getOptions, getQuotaPerUnit } from '@/lib/options'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session) return Response.json({ success: false, data: null }, { status: 401 })
  const user = await db.user.findUnique({ where: { id: session.uid } })
  // Task 82 会话吊销: 禁用/会话版本变更 (改密等) 后旧 JWT 立即视为未登录
  if (!user || user.status !== 1 || user.tokenVersion !== (session.ver ?? 0)) {
    return Response.json({ success: false, data: null }, { status: 401 })
  }
  const options = await getOptions()
  const quotaPerUnit = getQuotaPerUnit(options)
  return Response.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      email: user.email,
      quota: Number(user.quota),
      usedQuota: Number(user.usedQuota),
      requestCount: user.requestCount,
      group: user.group,
      affCode: user.affCode,
      affCount: user.affCount,
      affHistoryQuota: Number(user.affHistoryQuota),
      quotaPerUnit,
      createdAt: user.createdAt,
      announcement: options.Announcement || '',
      systemName: options.SystemName || '北辰中转站',
      footer: options.FooterHTML || '',
      displayInCurrency: options.DisplayInCurrencyEnabled === 'true',
      price: parseFloat(options.Price || '7.3') || 7.3,
    },
  })
}
