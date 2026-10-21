export const runtime = 'nodejs'

/* Task 128: GET /v1 网关自述 — 用户把 https://域名/v1 这样的网关地址直接贴进浏览器
 * 或客户端校验连通性时, 之前落到 Next 默认 404 页, 看起来像「网关挂了」。
 * 现返回网关信息 JSON, 直观确认服务在线、协议与可用端点。 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function GET(request: Request): Promise<Response> {
  const host = request.headers.get('host') || 'bz.013.ltd'
  const insecure = host.includes('localhost') || host.startsWith('127.') || host.startsWith('192.168.')
  const base = `${insecure ? 'http' : 'https'}://${host}`
  return Response.json(
    {
      service: '北辰中转站 API 网关',
      status: 'running',
      protocol: 'OpenAI 兼容',
      base_url: `${base}/v1`,
      endpoints: ['/v1/chat/completions', '/v1/completions', '/v1/embeddings', '/v1/models', '/v1/messages'],
      usage: '请求头携带 Authorization: Bearer sk-您的令牌 即可调用; 令牌在控制台「令牌管理」创建',
      docs: `${base}/about`,
      time: new Date().toISOString(),
    },
    { headers: CORS },
  )
}

export async function POST(): Promise<Response> {
  return Response.json(
    {
      error: {
        message: 'POST /v1 不是有效端点，请调用 /v1/chat/completions 等具体接口；GET /v1 可查看网关信息',
        type: 'invalid_request_error',
        code: 'method_not_allowed',
      },
    },
    { status: 405, headers: CORS },
  )
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS })
}
