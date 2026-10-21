/**
 * 注册邮箱域名白名单 (Task 95-⑥) — 前后端共用, 纯常量零依赖 (客户端可 import)
 *
 * 背景: 注册只允许主流知名邮箱, 拦截临时邮箱/小众域名的批量注册与投递不可达问题。
 * 后端为唯一准绳 (register + email-code 双重校验); 前端 auth-form 同一份名单做
 * 内联红字提前拦截, 提示文案与后端一致。
 *
 * 覆盖: 腾讯 (qq/foxmail)、网易 (163/126)、Google、微软、新浪、搜狐、阿里、
 * 运营商 (139/189)、苹果、雅虎 — 国内主流 + 国际主流个人邮箱。
 */
export const WELL_KNOWN_EMAIL_DOMAINS: readonly string[] = [
  // 腾讯
  'qq.com',
  'foxmail.com',
  'vip.qq.com',
  // 网易
  '163.com',
  '126.com',
  'yeah.net',
  'vip.163.com',
  'vip.126.com',
  // Google
  'gmail.com',
  'googlemail.com',
  // 微软
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  // 门户系
  'sina.com',
  'sina.cn',
  'sohu.com',
  // 阿里 / 运营商
  'aliyun.com',
  '139.com',
  '189.cn',
  // 苹果 / 雅虎
  'icloud.com',
  'me.com',
  'yahoo.com',
] as const

const DOMAIN_SET: ReadonlySet<string> = new Set(WELL_KNOWN_EMAIL_DOMAINS)

/** 用户输入提示文案 (前端 placeholder/错误提示与后端 message 保持一致) */
export const EMAIL_DOMAIN_HINT = '支持 QQ、163、Gmail、Outlook 等主流邮箱'

/**
 * 校验邮箱是否属于白名单域名。
 * @param email 已 trim 的完整邮箱地址
 */
export function isWellKnownEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return false
  return DOMAIN_SET.has(email.slice(at + 1).toLowerCase())
}
