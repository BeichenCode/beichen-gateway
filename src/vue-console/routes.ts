/**
 * 菜单配置与页面映射 (SoybeanAdmin 风格; 菜单数据与全站 menus.ts 同源, 页面为 Vue 异步组件)
 */
import './flags'
import { defineAsyncComponent } from 'vue'
import type { Component } from 'vue'

export interface MenuItem {
  key: string
  label: string
  icon: string
  admin?: boolean
  section: 'console' | 'admin'
}

export const MENU_ITEMS: MenuItem[] = [
  { key: '/dashboard', label: '数据看板', icon: 'dashboard', section: 'console' },
  { key: '/mall', label: '模型广场', icon: 'mall', section: 'console' },
  { key: '/token', label: '令牌管理', icon: 'token', section: 'console' },
  { key: '/gateway', label: '网关信息', icon: 'gateway', section: 'console' },
  { key: '/logs', label: '调用日志', icon: 'logs', section: 'console' },
  { key: '/wallet', label: '钱包充值', icon: 'wallet', section: 'console' },
  { key: '/redeem', label: '兑换中心', icon: 'redeem', section: 'console' },
  { key: '/ticket', label: '工单中心', icon: 'ticket', section: 'console' },
  { key: '/invite', label: '邀请推广', icon: 'invite', section: 'console' },
  { key: '/pricing', label: '模型价格', icon: 'pricing', section: 'console' },
  { key: '/profile', label: '个人中心', icon: 'profile', section: 'console' },
  { key: '/about', label: '关于', icon: 'about', section: 'console' },
  { key: '/contact', label: '联系我们', icon: 'contact', section: 'console' },
  { key: '/channel', label: '渠道管理', icon: 'channel', admin: true, section: 'admin' },
  { key: '/orders', label: '充值订单', icon: 'orders', admin: true, section: 'admin' },
  { key: '/redemption', label: '兑换码', icon: 'redemption', admin: true, section: 'admin' },
  { key: '/users', label: '用户管理', icon: 'users', admin: true, section: 'admin' },
  { key: '/settings', label: '系统设置', icon: 'settings', admin: true, section: 'admin' },
]

export const SECTION_LABELS: Record<MenuItem['section'], string> = {
  console: '控制台',
  admin: '运营管理',
}

export function visibleMenus(role: number): MenuItem[] {
  return MENU_ITEMS.filter((m) => !m.admin || role >= 10)
}

export function findMenuByKey(key: string): MenuItem | undefined {
  return MENU_ITEMS.find((m) => m.key === key)
}

/** 全部 15 个后台页面 (Vue 异步组件, 按需分包)
 *  asyncPage: 为异步包装组件回填内层页面 name — 官方 KeepAlive include 按路由组件
 *  name 匹配 (routeStore.cacheRoutes), defineAsyncComponent 默认名为
 *  AsyncComponentWrapper (全部同名, 无法区分), 回填后与官方语义一致 */
function asyncPage(loader: () => Promise<{ default: unknown }>, name: string) {
  const comp = defineAsyncComponent(loader as Parameters<typeof defineAsyncComponent>[0])
  ;(comp as { name?: string }).name = name
  return comp
}

export const PAGE_MAP: Record<string, ReturnType<typeof asyncPage>> = {
  '/dashboard': asyncPage(() => import('./pages/dashboard'), 'DashboardPage'),
  '/mall': asyncPage(() => import('./pages/mall'), 'MallPage'),
  '/token': asyncPage(() => import('./pages/tokens'), 'TokensPage'),
  '/gateway': asyncPage(() => import('./pages/gateway'), 'GatewayPage'),
  '/logs': asyncPage(() => import('./pages/logs'), 'LogsPage'),
  '/wallet': asyncPage(() => import('./pages/wallet'), 'WalletPage'),
  '/redeem': asyncPage(() => import('./pages/redeem'), 'RedeemPage'),
  '/ticket': asyncPage(() => import('./pages/tickets'), 'TicketsPage'),
  '/invite': asyncPage(() => import('./pages/invite'), 'InvitePage'),
  '/pricing': asyncPage(() => import('./pages/pricing'), 'PricingPage'),
  '/profile': asyncPage(() => import('./pages/profile'), 'ProfilePage'),
  '/about': asyncPage(() => import('./pages/about'), 'AboutPage'),
  '/speedtest': asyncPage(() => import('./pages/speedtest'), 'SpeedtestPage'),
  '/contact': asyncPage(() => import('./pages/contact'), 'ContactPage'),
  '/channel': asyncPage(() => import('./pages/channels'), 'ChannelsPage'),
  '/orders': asyncPage(() => import('./pages/orders'), 'OrdersPage'),
  '/redemption': asyncPage(() => import('./pages/redemptions'), 'RedemptionsPage'),
  '/users': asyncPage(() => import('./pages/users'), 'UsersPage'),
  '/settings': asyncPage(() => import('./pages/settings'), 'SettingsPage'),
}

/** 异步页面 loader 表 (与 PAGE_MAP 同源; 供路由预解析 await)
 *  vue-router 语义: 异步路由组件在「导航确认前」解析完毕, GlobalContent 的
 *  <Transition mode="out-in"> 进入的永远是已解析完成的同步组件 —
 *  否则 defineAsyncComponent 在冷 chunk 加载完成后替换内部根元素,
 *  过渡钩子与元素失联, fade-slide-enter-from (opacity 0) 永不移除 → 页面白屏 */
export const PAGE_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  '/dashboard': () => import('./pages/dashboard'),
  '/mall': () => import('./pages/mall'),
  '/token': () => import('./pages/tokens'),
  '/gateway': () => import('./pages/gateway'),
  '/logs': () => import('./pages/logs'),
  '/wallet': () => import('./pages/wallet'),
  '/redeem': () => import('./pages/redeem'),
  '/ticket': () => import('./pages/tickets'),
  '/invite': () => import('./pages/invite'),
  '/pricing': () => import('./pages/pricing'),
  '/profile': () => import('./pages/profile'),
  '/about': () => import('./pages/about'),
  '/speedtest': () => import('./pages/speedtest'),
  '/contact': () => import('./pages/contact'),
  '/channel': () => import('./pages/channels'),
  '/orders': () => import('./pages/orders'),
  '/redemption': () => import('./pages/redemptions'),
  '/users': () => import('./pages/users'),
  '/settings': () => import('./pages/settings'),
}

/** 已解析同步组件缓存 (path → 页面组件本体, name = xxxPage, KeepAlive include 直接命中) */
const RESOLVED_PAGES: Record<string, Component> = {}

/** 预解析路由页面: 复用模块缓存, 二次调用零开销; 未知路径返回 undefined */
export async function resolvePage(path: string): Promise<Component | undefined> {
  if (RESOLVED_PAGES[path]) return RESOLVED_PAGES[path]
  const loader = PAGE_LOADERS[path]
  if (!loader) return undefined
  const mod = await loader()
  RESOLVED_PAGES[path] = mod.default as Component
  return RESOLVED_PAGES[path]
}
