/**
 * API 请求封装
 * 认证双通道: cookie + Authorization Bearer (localStorage 持久化, 兼容跨站 iframe/三方 cookie 受限场景)
 */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const TOKEN_KEY = 'newapi_token'

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage 不可用时静默降级为 cookie 认证 */
  }
}

export function clearAuthToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

async function request<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken()
  const resp = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (resp.status === 401) {
    clearAuthToken()
    // 会话过期 → 跳独立登录页
    if (!url.includes('/api/auth/')) {
      window.location.href = '/login'
      throw new ApiError(401, '登录已过期')
    }
  }
  const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>
  if (!resp.ok) {
    throw new ApiError(resp.status, (json.message as string) || (json.error as string) || `请求失败 (${resp.status})`)
  }
  if (json.success === false) {
    throw new ApiError(resp.status, (json.message as string) || '请求失败')
  }
  return json as T
}

export function apiGet<T = unknown>(url: string): Promise<T> {
  return request<T>(url)
}

export function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) })
}

export function apiPatch<T = unknown>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: 'PATCH', body: JSON.stringify(body ?? {}) })
}

export function apiPut<T = unknown>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: 'PUT', body: JSON.stringify(body ?? {}) })
}

export function apiDelete<T = unknown>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' })
}
