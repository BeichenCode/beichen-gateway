/**
 * Hash 路由工具: #/login, #/dashboard, #/channel ...
 */
export function getHashPath(): string {
  const hash = window.location.hash
  if (!hash.startsWith('#/')) return '/dashboard'
  return hash.slice(1) || '/dashboard'
}

export function navigate(path: string): void {
  window.location.hash = '#' + path
}
