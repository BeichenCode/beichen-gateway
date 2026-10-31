import { db } from '@/lib/db'
import { requireAdmin, AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

function handleAuthError(err: unknown): Response | null {
  if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
  return null
}

interface TestResult {
  success: boolean
  channelName: string
  message: string
  time: number
}

/** POST /api/console/channel/test — 渠道连通性测试
 *  body: { id } 测单个渠道 | { all: true } 测全部启用渠道（无 body 同效）
 *  用渠道模型列表的第一个（或指定的 model）向上游发一条 16 token 的 "ping" 补全，
 *  按 HTTP 状态判定连通性，并把响应时间回写渠道（responseTime / testTime）。 */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin()

    let id: number | null = null
    let model: string | null = null
    try {
      const body = (await request.json()) as { id?: unknown; model?: unknown }
      if (body && body.id != null) id = Number(body.id)
      if (body && body.model) model = String(body.model)
    } catch {
      // 无 body 视为测试全部启用渠道
    }

    let chans
    if (id != null && Number.isFinite(id)) {
      const one = await db.channel.findUnique({ where: { id } })
      if (!one) throw new AuthError(404, '渠道不存在')
      chans = [one]
    } else {
      chans = await db.channel.findMany({ where: { status: 1 }, orderBy: { id: 'asc' } })
    }

    const results: TestResult[] = []
    for (const c of chans) {
      const models = String(c.models || '')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
      const m = model && models.includes(model) ? model : models[0]
      if (!m) {
        results.push({ success: false, channelName: c.name, message: '渠道未配置可用模型', time: 0 })
        continue
      }

      const start = Date.now()
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 15000)
      let r: TestResult
      try {
        const base = String(c.baseUrl || '').replace(/\/+$/, '')
        const up = await fetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.key}` },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 16,
            stream: false,
          }),
          signal: ctrl.signal,
        })
        const time = Date.now() - start
        if (up.ok) {
          r = { success: true, channelName: c.name, message: '连接成功', time }
        } else {
          let msg = `HTTP ${up.status}`
          try {
            const j = (await up.json()) as { error?: { message?: string; code?: string } }
            const em = j?.error
            msg = (em && (em.message || em.code)) || msg
          } catch {
            // 上游非 JSON 报文，保留 HTTP 状态码
          }
          r = { success: false, channelName: c.name, message: msg, time }
        }
      } catch (err) {
        const e = err as { name?: string; message?: string }
        r = {
          success: false,
          channelName: c.name,
          message: e?.name === 'AbortError' ? '请求超时(15s)' : String(e?.message || e),
          time: Date.now() - start,
        }
      } finally {
        clearTimeout(timer)
      }
      results.push(r)

      // 回写最近测试响应时间（失败也记录，供渠道列表显示延迟）
      try {
        await db.channel.update({ where: { id: c.id }, data: { responseTime: r.time, testTime: new Date() } })
      } catch {
        // 回写失败不影响测试结果返回
      }
    }

    return Response.json({ success: true, data: results })
  } catch (err) {
    const authRes = handleAuthError(err)
    if (authRes) return authRes
    return Response.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
