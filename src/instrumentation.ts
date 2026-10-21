/**
 * Next.js instrumentation: 服务进程启动时执行一次 (生产 standalone 同样生效)
 * Task 171: 提前加载 relay 引擎, 让渠道自动恢复探活 (Task 152) 与模型广场自探测 (Task 171)
 * 在起服即运行 — 不必等第一笔用户流量才启动后台循环
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/relay/engine')
  }
}
