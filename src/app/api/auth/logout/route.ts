import { destroySessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(): Promise<Response> {
  await destroySessionCookie()
  return Response.json({ success: true })
}
