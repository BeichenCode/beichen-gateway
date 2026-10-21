import { headers } from 'next/headers'
import { ThemeProvider } from 'next-themes'
import Landing from '@/components/landing/landing'
import { Toaster } from '@/components/naive-message'
import ConsoleWarmup from '@/components/console-warmup'
import { getOptions } from '@/lib/options'

/**
 * 官网首页 — 服务端直出真实网关地址:
 *  1) 管理员在「系统设置 → 服务器地址」配置的 ServerAddress 优先 (对外公布的规范域名)
 *  2) 未配置时按当前请求头 (x-forwarded-host / x-forwarded-proto) 推导真实访问地址
 * 该地址作为 prop 传入落地页, SSR 首帧即渲染真实网关, 彻底消灭
 * 「客户端水合后才回填 origin」造成的假地址占位窗 (dev 慢水合下可达数秒)。
 */
async function resolveGateway(): Promise<string> {
  try {
    const options = await getOptions()
    const sa = (options.ServerAddress || '').trim().replace(/\/+$/, '')
    if (sa) return sa
  } catch {
    // 设置表读取失败不阻塞首页, 继续走请求头推导
  }
  try {
    const h = await headers()
    // 反代链路上 x-forwarded-host/proto 可能是逗号分隔多值, 取第一跳
    const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim()
    if (host) {
      const proto = (h.get('x-forwarded-proto') || 'http').split(',')[0].trim()
      return `${proto}://${host}`
    }
  } catch {
    // headers 不可用时交给客户端 origin 兜底
  }
  return ''
}

export default async function HomePage() {
  const gateway = await resolveGateway()
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <Landing gateway={gateway} />
      <Toaster />
      {/* Task 111: 官网空闲期预拉控制台 chunk (登录/进入后台时加载动画近零) */}
      <ConsoleWarmup />
    </ThemeProvider>
  )
}
