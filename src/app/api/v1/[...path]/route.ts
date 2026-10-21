export const runtime = 'nodejs'

/* Task 128: /v1 未知子路径兜底 — 之前拼错端点 (如 /v1/chat/completion) 会落到
 * Next 默认 HTML 404 页, 客户端难以解析; 现按 OpenAI 风格返回 JSON 404。
 * 具体端点 (chat/completions 等) 为静态路由, 优先级高于 catch-all, 不受影响。 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

const KNOWN = '/v1/chat/completions, /v1/completions, /v1/embeddings, /v1/models, /v1/messages, /v1/ping'

async function notFound(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url)
  return Response.json(
    {
      error: {
        message: `无效的 API 路径: ${request.method} ${pathname}。可用端点: ${KNOWN}`,
        type: 'invalid_request_error',
        code: 'not_found',
      },
    },
    { status: 404, headers: CORS },
  )
}

export const GET = notFound
export const POST = notFound
export const PUT = notFound
export const DELETE = notFound

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS })
}
