import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

/** GET /api/console/log/models — 调用日志页「模型筛选」下拉数据源
 *  选项 = 当前已有日志的模型（带调用条数，按次数降序，最多 500 个）；
 *  管理员及以上看全站，普通用户只看自己的日志。 */
export async function GET(): Promise<Response> {
  try {
    const session = await requireSession()
    const where: { modelName: { not: string }; userId?: number } = { modelName: { not: '' } }
    if (session.role < 10) where.userId = session.uid

    const rows = await db.log.groupBy({ by: ['modelName'], where, _count: { _all: true } })
    const data = rows
      .map((r) => ({ modelName: r.modelName, count: r._count._all }))
      .sort((a, b) => b.count - a.count || a.modelName.localeCompare(b.modelName))
      .slice(0, 500)

    return Response.json({ success: true, data })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
