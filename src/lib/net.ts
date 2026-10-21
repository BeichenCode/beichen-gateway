/**
 * 网络辅助 (Task 80 创建 / Task 102 信任链修正 / Task 154 扩展):
 * 从请求头提取真实客户端 IP 与国家归属。
 *
 * IP 信任链 (Task 102 深度安全审计结论):
 *   1) CF-Connecting-IP — Cloudflare 边缘注入并用真实客户端 IP 覆盖, 客户端伪造值会被 CF 替换 (可信)
 *   2) x-real-ip        — 本站反代 (Caddy/1Panel) 注入, 经 CF 链路时 = CF 节点 IP (不可伪造但非真实用户 IP)
 *   3) x-forwarded-for  — 取首跳 (仅本地直连开发环境使用)
 *
 * 旧实现 x-real-ip 优先的后果: 生产全站用户在限流器里共享少数 CF 节点 IP,
 * 注册/登录/发码限流互相误伤; 直连源站时该头可被客户端伪造绕过限流。
 *
 * Task 154 新增:
 *   ipOf      — 同 getIp 但无头时返回 '' (落库口径, 区分「无 IP」与字面 unknown)
 *   countryOf — CF-IPCountry (Cloudflare 免费版每请求附带, ISO alpha-2),
 *               任何来源日志行都能带国家归属; 非 CF 链路返回 ''
 */
export function getIp(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf && cf.trim()) return cf.trim()
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  )
}

/** 落库口径: 与 getIp 同链路, 但无头返回空串 (日志/看板按 ip!='' 过滤历史) */
export function ipOf(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf && cf.trim()) return cf.trim()
  const real = request.headers.get('x-real-ip')
  if (real && real.trim()) return real.trim()
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd && fwd.trim()) return fwd.split(',')[0].trim()
  return ''
}

/** 国家归属: CF-IPCountry (ISO alpha-2, 如 CN/SG/US); T1=Tor XX=未知特殊码一律不收 */
export function countryOf(request: Request): string {
  const c = request.headers.get('cf-ipcountry')?.trim().toUpperCase() || ''
  return /^[A-Z]{2}$/.test(c) && c !== 'T1' && c !== 'XX' ? c : ''
}
