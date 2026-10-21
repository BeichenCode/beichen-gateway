import { relayRequest } from '@/lib/relay/engine'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 300

function errorResponse(status: number, message: string): Response {
  return Response.json(
    { error: { message, type: 'new_api_error', code: status === 401 ? 'invalid_api_key' : status } },
    { status }
  )
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await relayRequest(request, '/v1/chat/completions', 'openai')
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.status, err.message)
    console.error('chat/completions error:', err)
    return errorResponse(500, `服务器内部错误: ${(err as Error).message}`)
  }
}
