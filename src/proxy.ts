import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 proxy 约定 (原 middleware) — 两道全局防线:
 *
 * ① 反缓存 — 保证手机/代理永远拿到最新页面 (用户反馈过"改了还是旧版"):
 *  - HTML/RSC/API 全部 no-store (浏览器、预览代理、运营商加速节点都不许缓存)
 *  - /_next/static 与 _next/image 例外 (内容 hash 寻址, 本身 immutable)
 *
 * ② CSRF 防线 (Task 102 深度安全审计) — 会话 cookie 在 https 下为 SameSite=None
 *  (预览代理/iframe 嵌入所需), 第三方站点发起的跨站请求也会携带会话 cookie。
 *  对依赖 cookie 会话的写接口 (POST/PUT/DELETE/PATCH) 校验 Origin:
 *  - 浏览器跨站 fetch 一定携带 Origin → 不匹配即 403
 *  - 同源 fetch 携带 Origin=本站 host → 放行
 *  - curl/服务端调用一般不带 Origin → 放行 (此类请求天然无 CSRF 载体)
 *  - 现代浏览器补充 Sec-Fetch-Site 校验 (无 Origin 但声明 cross-site → 拒绝)
 *  不覆盖 /api/v1/* (sk- 令牌认证, 无 cookie 凭证) 与 /api/pay/* (三方 GET 回调)。
 */
const STATIC_PREFIXES = ['/_next/static/', '/_next/image']
const CSRF_PROTECTED_PREFIXES = ['/api/console', '/api/auth']

export function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname
  const isStatic = STATIC_PREFIXES.some((p) => path.startsWith(p))
  if (!isStatic) {
    res.headers.set('Cache-Control', 'no-store, must-revalidate, max-age=0')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Expires', '0')
  }

  const method = req.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && CSRF_PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
      .split(',')[0]
      .trim()
      .toLowerCase()
    const origin = req.headers.get('origin')
    if (origin) {
      let originHost = ''
      try {
        originHost = new URL(origin).host.toLowerCase()
      } catch {
        return csrfBlock()
      }
      if (!originHost || originHost !== host) return csrfBlock()
      return res
    }
    // 无 Origin 头: 依据 Fetch Metadata 补判 (现代浏览器同源请求也会带 Sec-Fetch-Site)
    const secSite = (req.headers.get('sec-fetch-site') || '').toLowerCase()
    if (secSite && secSite !== 'same-origin' && secSite !== 'same-site' && secSite !== 'none') {
      return csrfBlock()
    }
  }
  return res
}

function csrfBlock(): NextResponse {
  return NextResponse.json(
    { success: false, message: '跨站请求被拒绝 (CSRF 防护)' },
    { status: 403 },
  )
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
