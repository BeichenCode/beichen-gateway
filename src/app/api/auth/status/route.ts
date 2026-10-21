import { getOptions } from '@/lib/options'

export const runtime = 'nodejs'

/**
 * 站点版本指纹 = 服务进程启动时刻 (globalThis 缓存, dev 热重载不漂移, 进程重启才变化)。
 * 控制台轮询比对: 变化 → 提示用户刷新 (解决手机端停留在旧版 JS 的场景)
 */
const g = globalThis as unknown as { __site_rev?: string }
if (!g.__site_rev) g.__site_rev = Date.now().toString(36)

/** 公开站点状态: 注册开关/公告/系统名/版本指纹 */
export async function GET(): Promise<Response> {
  const options = await getOptions()
  return Response.json({
    success: true,
    data: {
      systemName: options.SystemName || '北辰中转站',
      logo: options.Logo || '',
      registerEnabled: options.RegisterEnabled === 'true',
      emailVerification: options.EmailVerificationEnabled === 'true',
      announcement: options.Announcement || '',
      about: options.About || '',
      footer: options.FooterHTML || '',
      githubOAuth: options.GitHubOAuthEnabled === 'true',
      rev: g.__site_rev,
    },
  })
}
