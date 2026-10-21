/**
 * Task 154: 认证/准入失败可观测性 — 网关收到 401/403/429/400/503 类拒绝时
 * 落 type=5 日志 (后台「调用日志」页可见) + journalctl 留痕。
 *
 * 背景 (用户排查实录): 客户端 (NewProviderClient) 连吃 401「Turn execution failed」,
 * 但网关零痕迹 (认证发生在计费落库之前, 失败即抛出) — 排查时「日志全是干净的」,
 * 只能靠 nginx access log 反推。落库后: 每一笔被拒请求都有 IP + 国家 + 确切原因,
 * 「无效的令牌 (令牌不存在) / 已过期 / 额度尽 / IP 白名单 / 防爆破 429」一眼可辨。
 *
 * 归属: 已通过认证的失败 (令牌限速/模型无权/无可用渠道) 记真实用户;
 * 未认证失败 (key 不存在等) 无用户上下文 → 挂到首个管理员名下 (Log.userId 必填,
 * 外键约束), username 留空由 IP/原因承载语义, 不污染任何真实用户名。
 *
 * 防刷: 同 IP 每分钟最多落 30 条 (撞库风暴只留样本, 不灌爆 Log 表);
 * journalctl 的 console.warn 每笔都打 (服务器本地日志, 可 grep)。
 */
import { db } from '@/lib/db'
import { ipOf, countryOf } from '@/lib/net'
import { hit } from '@/lib/rate-limit'

export interface AuthFailIdent {
  userId?: number
  username?: string
  tokenName?: string
  model?: string
}

/** Log.userId 外键必填 — 未认证失败挂到首个管理员 (模块级缓存, 查一次) */
let fallbackUserId: number | null | undefined
async function getFallbackUserId(): Promise<number | null> {
  if (fallbackUserId !== undefined) return fallbackUserId
  try {
    const u = await db.user.findFirst({
      where: { role: { gte: 100 } },
      orderBy: { id: 'asc' },
      select: { id: true },
    })
    fallbackUserId = u?.id ?? null
  } catch {
    fallbackUserId = null
  }
  return fallbackUserId
}

export async function recordAuthFailure(
  request: Request,
  status: number,
  reason: string,
  ident: AuthFailIdent = {}
): Promise<void> {
  const ip = ipOf(request)
  const country = countryOf(request)
  console.warn(`[auth] ${status} ip=${ip || '-'}${country ? ' ' + country : ''} :: ${reason}`)
  // 撞库/风暴限样本: 同 IP 60s 内最多 30 条落库 (journal 不限)
  if (!hit(`authlog|${ip || 'none'}`, 60_000, 30)) return
  const userId = ident.userId ?? (await getFallbackUserId())
  if (userId === null) return // 连管理员都查不到 (异常态) — 只留 journal
  try {
    await db.log.create({
      data: {
        userId,
        username: ident.username || '',
        type: 5,
        tokenName: ident.tokenName || '',
        modelName: ident.model || 'auth',
        useTime: 0,
        isStream: false,
        ip,
        country,
        content: truncate(`[${status}] ${reason}`, 400),
      },
    })
  } catch (e) {
    console.error('auth fail log failed:', e)
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '...' : s
}
