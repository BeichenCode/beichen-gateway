import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/v1/ping — 网关链路探针 (零鉴权 / 零 DB / 纯内存)
 * 用途: 控制台网关卡与测速页实时延迟采样。放在 /v1 路径空间 = 与 API 同前缀
 * (测得延迟即真实接入路径延迟), 且落在 Cloudflare 对 /v1* 的豁免规则内。
 * 不走 relay 认证/限流, 不产生计费, 不写任何日志。
 */
export async function GET(): Promise<Response> {
  // Task 130: 探针开放 CORS — 测速页可对备用网关 (跨域) 做同口径往返采样
  return NextResponse.json(
    { success: true, data: { pong: true, ts: Date.now() } },
    { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } },
  )
}
