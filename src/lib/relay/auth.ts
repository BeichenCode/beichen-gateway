/**
 * API Key (sk-xxx) 认证
 */
import { db } from '@/lib/db'
import { AuthError } from '@/lib/auth'
import { getIp } from '@/lib/net'
import { hit } from '@/lib/rate-limit'
import { recordAuthFailure } from './auth-log'
import type { Token, User } from '@prisma/client'

export interface TokenAuthResult {
  token: Token
  user: User
}

/** 从 request 提取 Bearer Key */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get('Authorization') || ''
  let key = ''
  if (auth.startsWith('Bearer ')) key = auth.slice(7).trim()
  const xKey = request.headers.get('x-api-key')
  if (!key && xKey) key = xKey.trim()
  if (!key) return null
  // 兼容 sk- 前缀与裸 key
  return key.startsWith('sk-') ? key.slice(3) : key
}

export async function authenticateApiKey(request: Request): Promise<TokenAuthResult> {
  try {
    return await doAuthenticateApiKey(request)
  } catch (err) {
    // Task 154: 认证失败可观测 — 401/403/429 落 type=5 日志 (IP+国家+原因), 不再「日志全是干净的」
    if (err instanceof AuthError) void recordAuthFailure(request, err.status, err.message)
    throw err
  }
}

async function doAuthenticateApiKey(request: Request): Promise<TokenAuthResult> {
  const rawKey = extractApiKey(request)
  const ip = getIp(request)
  // 认证失败限流 (Task 102): 仅对「未提供 key / key 不存在」的撞库特征计数,
  // 同 IP 10 分钟内 60 次 → 封 10 分钟; 合法持有者的业务性 403 (过期/额度尽) 不计数
  const keyScanLimited = (): boolean =>
    !hit(`v1authfail|${ip}`, 10 * 60 * 1000, 60, 10 * 60 * 1000)
  if (!rawKey) {
    if (keyScanLimited()) throw new AuthError(429, '认证失败次数过多，请 10 分钟后再试')
    throw new AuthError(401, '无效的令牌 (未提供 API Key)')
  }
  const token = await db.token.findUnique({ where: { key: rawKey } })
  if (!token) {
    if (keyScanLimited()) throw new AuthError(429, '认证失败次数过多，请 10 分钟后再试')
    throw new AuthError(401, '无效的令牌 (令牌不存在)')
  }
  if (token.status !== 1) {
    const reason: Record<number, string> = { 2: '该令牌已被禁用', 3: '该令牌已过期', 4: '该令牌额度已用尽' }
    throw new AuthError(401, reason[token.status] || '该令牌状态异常')
  }
  // 过期检查
  if (token.expiredTime && token.expiredTime.getTime() < Date.now()) {
    await db.token.update({ where: { id: token.id }, data: { status: 3 } })
    throw new AuthError(401, '该令牌已过期')
  }
  // 额度检查
  if (!token.unlimitedQuota && token.quota <= token.usedQuota) {
    await db.token.update({ where: { id: token.id }, data: { status: 4 } })
    throw new AuthError(401, '该令牌额度已用尽')
  }
  // IP 白名单 (Task 102: IP 提取统一走 getIp 信任链, 客户端自带的伪造头不再生效)
  if (token.ipLimit) {
    const whitelist = token.ipLimit.split(',').map((s) => s.trim()).filter(Boolean)
    if (whitelist.length > 0 && !whitelist.includes(ip)) {
      throw new AuthError(403, `IP ${ip} 不在该令牌的白名单中`)
    }
  }
  const user = await db.user.findUnique({ where: { id: token.userId } })
  if (!user) throw new AuthError(401, '令牌所属用户不存在')
  if (user.status !== 1) throw new AuthError(403, '用户已被禁用')
  if (user.quota <= 0n && user.role < 100) {
    throw new AuthError(403, '用户额度已用尽，请联系管理员充值')
  }
  // 模型/分组限制在请求时按需校验
  return { token, user }
}

/** 校验 token 是否允许使用某模型 */
export function checkModelAllowed(token: Token, model: string): boolean {
  if (!token.models) return true
  const allowed = token.models.split(',').map((s) => s.trim()).filter(Boolean)
  return allowed.includes(model)
}

/** 解析 token 可用分组 (为空则跟随用户分组) */
export function getTokenGroups(token: Token, user: User): string[] {
  if (token.groups) {
    return token.groups.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return [user.group]
}
