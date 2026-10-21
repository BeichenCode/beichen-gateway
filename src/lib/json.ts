/**
 * BigInt 安全 JSON 响应 (Prisma BigInt 字段自动转 Number)
 */
export function jsonSafe(data: unknown, init?: ResponseInit): Response {
  return Response.json(
    JSON.parse(
      JSON.stringify(data, (_key, value: unknown) =>
        typeof value === 'bigint' ? Number(value) : value
      )
    ),
    init
  )
}
