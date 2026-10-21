import { relayRequest } from '@/lib/relay/engine'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 300

/** Claude 兼容入口: /v1/messages */
export async function POST(request: Request): Promise<Response> {
  try {
    return await relayRequest(request, '/v1/messages', 'claude')
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json(
        { type: 'error', error: { type: 'authentication_error', message: err.message } },
        { status: err.status }
      )
    }
    console.error('messages error:', err)
    return Response.json(
      { type: 'error', error: { type: 'api_error', message: '服务器内部错误' } },
      { status: 500 }
    )
  }
}
