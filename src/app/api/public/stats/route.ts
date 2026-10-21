import { db as prisma } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * 公开统计 (官网展示用): 模型数 / 启用渠道数 / 累计请求 / 累计用户
 * 仅暴露聚合数字, 不含敏感信息
 */
export async function GET(): Promise<Response> {
  try {
    const [modelCount, channelCount, logCount, userCount, agg, models] = await Promise.all([
      prisma.modelRatio.count(),
      prisma.channel.count({ where: { status: 1 } }),
      prisma.log.count(),
      prisma.user.count(),
      prisma.log.aggregate({ _sum: { promptTokens: true, completionTokens: true } }),
      prisma.modelRatio.findMany({ select: { modelName: true }, take: 48, orderBy: { modelName: 'asc' } }),
    ])
    const totalTokens = Number(agg._sum.promptTokens ?? 0) + Number(agg._sum.completionTokens ?? 0)
    return Response.json({
      success: true,
      data: {
        models: modelCount,
        channels: channelCount,
        requests: logCount,
        users: userCount,
        tokens: totalTokens,
        modelNames: models.map((m) => m.modelName),
      },
    })
  } catch {
    return Response.json({ success: true, data: { models: 0, channels: 0, requests: 0, users: 0, tokens: 0, modelNames: [] } })
  }
}
