import { db } from '@/lib/db'
import { requireSession, requireAdmin, AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

/** GET /api/console/pricing — 模型定价(所有登录用户可见, 仅展示有启用渠道承载的在线模型) */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireSession()
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || ''
    // 仅返回真实可用模型 (启用中渠道的 models 并集): 未上线模型不对外展示
    const channels = await db.channel.findMany({ where: { status: 1 }, select: { models: true } })
    const online = new Set<string>()
    for (const c of channels) {
      for (const m of c.models.split(',').map((s) => s.trim()).filter(Boolean)) online.add(m)
    }
    const where = {
      modelName: {
        ...(keyword ? { contains: keyword } : {}),
        in: [...online],
      },
    }
    const items = await db.modelRatio.findMany({ where, orderBy: { modelName: 'asc' } })
    return Response.json({ success: true, data: { items } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** POST 新增/更新模型定价 (upsert by modelName) */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin()
    const body = (await request.json()) as Record<string, unknown>
    const modelName = String(body.modelName || '').trim()
    if (!modelName) throw new AuthError(400, '模型名不能为空')
    const ratio = Math.max(Number(body.ratio) || 0, 0)
    const completionRatio = Math.max(Number(body.completionRatio) || 0, 0)
    const modelPrice = Number(body.modelPrice)
    const quotaType = Number(body.quotaType) || (modelPrice >= 0 ? 1 : 0)

    const row = await db.modelRatio.upsert({
      where: { modelName },
      update: { ratio, completionRatio, modelPrice, quotaType, description: String(body.description || ''), enableGroup: String(body.enableGroup || '') },
      create: {
        modelName,
        ratio,
        completionRatio,
        modelPrice: isNaN(modelPrice) ? -1 : modelPrice,
        quotaType,
        description: String(body.description || ''),
        enableGroup: String(body.enableGroup || ''),
      },
    })
    return Response.json({ success: true, data: row })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    console.error(err)
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

/** DELETE /api/console/pricing?id=1 */
export async function DELETE(request: Request): Promise<Response> {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) throw new AuthError(400, '缺少 id')
    await db.modelRatio.delete({ where: { id: parseInt(id) } })
    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
