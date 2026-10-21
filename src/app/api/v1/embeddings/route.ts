import { relayRequest } from '@/lib/relay/engine'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: Request): Promise<Response> {
  try {
    return await relayRequest(request, '/v1/embeddings', 'openai')
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: { message: err.message, type: 'new_api_error' } }, { status: err.status })
    }
    console.error('embeddings error:', err)
    return Response.json({ error: { message: '服务器内部错误', type: 'new_api_error' } }, { status: 500 })
  }
}
