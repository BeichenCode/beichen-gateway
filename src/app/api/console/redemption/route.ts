import { db } from '@/lib/db'
import { requireAdmin, AuthError } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { jsonSafe } from '@/lib/json'
import { intParam } from '@/lib/params'

export const runtime = 'nodejs'

/** GET /api/console/redemption */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const page = intParam(searchParams, 'page', 1, 1)
    const size = intParam(searchParams, 'size', 20, 1, 100)
    const [total, items] = await Promise.all([
      db.redemption.count(),
      db.redemption.findMany({ orderBy: { id: 'desc' }, skip: (page - 1) * size, take: size }),
    ])
    return jsonSafe({ success: true, data: { items, total, page, size } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** POST 批量生成兑换码 { name, quota, count } */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin()
    const body = (await request.json()) as Record<string, unknown>
    const name = String(body.name || '').trim()
    const quota = BigInt(Math.max(Number(body.quota) || 0, 0))
    const count = Math.min(Math.max(Number(body.count) || 1, 1), 100)
    if (quota <= 0n) throw new AuthError(400, '兑换额度必须大于 0')

    const items: Array<{ name: string; key: string; quota: bigint; status: number }> = []
    for (let i = 0; i < count; i++) {
      items.push({
        name: count > 1 ? `${name}-${i + 1}` : name,
        key: 'REDEEM-' + randomBytes(16).toString('hex').toUpperCase(),
        quota,
        status: 1,
      })
    }
    await db.redemption.createMany({ data: items })
    return Response.json({ success: true, data: { count } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
