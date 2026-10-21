import { db } from '@/lib/db'
import { requireAdmin, requireSession, AuthError } from '@/lib/auth'
import { getOptions, invalidateOptionCache } from '@/lib/options'

export const runtime = 'nodejs'

const PUBLIC_KEYS = ['SystemName', 'Logo', 'ServerAddress', 'FooterHTML', 'Announcement', 'About', 'RegisterEnabled', 'QuotaPerUnit', 'DisplayInCurrencyEnabled', 'TopupGroupRatio', 'AffInviteEnabled', 'AffQuota', 'QuotaForNewUser', 'EnableOnlineTopUp', 'Price', 'MinTopUp']

/** GET /api/console/option — 管理员返回全部, 用户返回公开项 */
export async function GET(): Promise<Response> {
  try {
    const session = await requireSession()
    const options = await getOptions(true)
    if (session.role >= 10) {
      return Response.json({ success: true, data: options })
    }
    const pub: Record<string, string> = {}
    for (const k of PUBLIC_KEYS) pub[k] = options[k] ?? ''
    return Response.json({ success: true, data: pub })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** PUT /api/console/option { key, value } 或 { data: {k:v,...} } */
export async function PUT(request: Request): Promise<Response> {
  try {
    await requireAdmin()
    const body = (await request.json()) as Record<string, unknown>
    const updates: Array<[string, string]> = []
    if (body.data && typeof body.data === 'object') {
      for (const [k, v] of Object.entries(body.data as Record<string, unknown>)) {
        updates.push([k, String(v)])
      }
    } else if (body.key) {
      updates.push([String(body.key), String(body.value ?? '')])
    }
    if (updates.length === 0) throw new AuthError(400, '缺少更新内容')

    for (const [key, value] of updates) {
      await db.option.upsert({ where: { key }, update: { value }, create: { key, value } })
    }
    invalidateOptionCache()
    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
