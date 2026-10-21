/**
 * 认证库: JWT (HS256, node:crypto 零依赖实现) + scrypt 密码哈希 + 会话辅助
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies, headers } from 'next/headers'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'newapi_session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'newapi-gateway-secret-key-2026'
const SESSION_TTL = 7 * 24 * 3600 // 7天

export interface SessionPayload {
  uid: number
  username: string
  role: number // 1=user 10=admin 100=root
  ver?: number // 会话版本 (tokenVersion): 不一致即吊销 (Task 82)
  iat: number
  exp: number
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function hmac(data: string): string {
  return createHmac('sha256', SESSION_SECRET).update(data).digest('base64url')
}

export function signJWT(payload: SessionPayload): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  return `${header}.${body}.${hmac(`${header}.${body}`)}`
}

export function verifyJWT(token: string): SessionPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const expect = hmac(`${header}.${body}`)
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// ---------- 密码 ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const calc = scryptSync(password, salt, 64)
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), calc)
  } catch {
    return false
  }
}

// ---------- 会话 Cookie ----------
export async function createSessionCookie(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const token = signJWT({ ...payload, ver: payload.ver ?? 0, iat: now, exp: now + SESSION_TTL })
  const store = await cookies()
  const h = await headers()
  const proto = (h.get('x-forwarded-proto') || 'http').split(',')[0].trim()
  const isHttps = proto === 'https'
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // https (预览代理/iframe 嵌入) 必须 SameSite=None; Secure, 否则跨站上下文下 cookie 被浏览器拦截导致登录回跳
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge: SESSION_TTL,
  })
  return token
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<SessionPayload | null> {
  // 双通道认证: 1) Authorization: Bearer (iframe/三方 cookie 受限时仍然可用) 2) cookie
  const h = await headers()
  const authz = h.get('authorization')
  if (authz && authz.toLowerCase().startsWith('bearer ')) {
    const payload = verifyJWT(authz.slice(7).trim())
    if (payload) return payload
  }
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyJWT(token)
}

/**
 * 控制台 API 鉴权: 返回会话或抛 401 响应
 * Task 82 会话吊销: JWT 之外还核验 DB 实时状态 — 账号禁用/会话版本变更立即踢出
 * (改密后旧会话全部失效; 管理员禁用用户即刻生效, 不再等到 JWT 过期)
 * 代价: 每次控制台 API 调用一次主键索引查询 (<1ms), 控制面 QPS 低, 可接受
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new AuthError(401, '无权进行此操作，未登录或登录已过期')
  const live = await db.user.findUnique({
    where: { id: session.uid },
    select: { tokenVersion: true, status: true },
  })
  if (!live || live.status !== 1) throw new AuthError(401, '账号不可用，请联系管理员或重新登录')
  if ((session.ver ?? 0) !== live.tokenVersion) {
    throw new AuthError(401, '登录状态已变更，请重新登录')
  }
  return session
}

/** 会话吊销: 使该用户所有已签发 JWT 立即失效 (改密/禁用等安全敏感变更时调用) */
export async function revokeSessions(uid: number): Promise<void> {
  await db.user.update({ where: { id: uid }, data: { tokenVersion: { increment: 1 } } })
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession()
  if (session.role < 10) throw new AuthError(403, '无权进行此操作，权限不足')
  return session
}

export async function requireRoot(): Promise<SessionPayload> {
  const session = await requireSession()
  if (session.role < 100) throw new AuthError(403, '无权进行此操作，需要超级管理员权限')
  return session
}

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
