import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

/** GET /api/console/models-available — 系统所有可用模型(启用渠道并集, 仅真实可调用模型) */
export async function GET(): Promise<Response> {
  try {
    await requireSession()
    const channels = await db.channel.findMany({ where: { status: 1 }, select: { models: true } })
    const set = new Set<string>()
    for (const c of channels) {
      for (const m of c.models.split(',').map((s) => s.trim()).filter(Boolean)) set.add(m)
    }
    // 仅渠道并集 — 不再混入计价表全量, 未上线模型不对外展示
    return Response.json({ success: true, data: [...set].sort() })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
