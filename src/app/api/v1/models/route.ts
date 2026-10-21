import { db } from '@/lib/db'
import { authenticateApiKey, getTokenGroups } from '@/lib/relay/auth'
import { AuthError } from '@/lib/auth'
import { getDelistedSet } from '@/lib/model-health'

export const runtime = 'nodejs'

/** GET /api/v1/models — 返回令牌可用的模型列表
 * Task 202: 口径与模型广场对齐 — 只返回「已定价 ∩ 启用渠道」模型（与广场卡片、Task 176 探测范围同款交集）。
 * 未定价模型不对客售卖：计费引擎对无定价记录的模型走默认 1 倍率（全站最贵档），
 * 列表放出会诱导客户端撞上未定价模型，故不再出现在可调用列表。
 * 上架一个模型 = 定价表加一行，它即同时出现在广场与 /v1/models；下架反之，两端口永不脱节。
 * Task 206: 再叠加探测健康口径 — 探测连续异常/首字超阈值的模型自动下架（列表隐藏，
 * 调用不封禁），上游恢复后自动回榜；表缺失/库异常时失败开放，口径退回 Task 202。
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await authenticateApiKey(request)
    const [channels, pricedRows, delisted] = await Promise.all([
      db.channel.findMany({ where: { status: 1 } }),
      db.modelRatio.findMany({ select: { modelName: true } }),
      getDelistedSet(),
    ])
    const pricedSet = new Set(pricedRows.map((r) => r.modelName))
    const groups = getTokenGroups(auth.token, auth.user)

    const modelSet = new Set<string>()
    for (const c of channels) {
      const cGroups = c.groups.split(',').map((s) => s.trim())
      if (!cGroups.some((g) => groups.includes(g))) continue
      for (const m of c.models.split(',').map((s) => s.trim()).filter(Boolean)) {
        // Task 202: 未定价模型不上列表（已定价∩启用渠道）
        if (!pricedSet.has(m)) continue
        // Task 206: 探测异常已自动下架的模型不上列表（恢复后自动回榜）
        if (delisted.has(m)) continue
        // 令牌模型限制
        if (auth.token.models) {
          const allowed = auth.token.models.split(',').map((s) => s.trim())
          if (!allowed.includes(m)) continue
        }
        modelSet.add(m)
      }
    }
    const data = [...modelSet].sort().map((id) => ({
      id,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'beichen-gateway',
    }))
    return Response.json({ object: 'list', data })
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: { message: err.message, type: 'new_api_error' } }, { status: err.status })
    }
    return Response.json({ error: { message: '服务器内部错误', type: 'new_api_error' } }, { status: 500 })
  }
}
