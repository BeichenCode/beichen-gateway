/**
 * /console 路由级 loading — 全站统一 5 竖条加载动画 (用户钦定「加载动画不要变」,
 * 与前台 boot-splash/register/login 同一 .loading-bar 视觉语言, 原样保留不随模板更换)
 */
import RouteLoading from '@/components/route-loading'

export default function ConsoleRouteLoading() {
  return <RouteLoading />
}
