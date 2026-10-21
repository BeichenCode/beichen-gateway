/**
 * 图标注册 — lucide-vue-next (页面内全局可用) + 菜单图标名表
 *
 * Task 98-v7: 菜单/壳层图标全量换装官方 soybean-admin 家族 (Iconify 离线数据,
 *   见 svg-icon.ts / soy-icons-data.ts) — 菜单 = Material Symbols Outlined
 *   (官方菜单渲染链 route/shared.ts SvgIconVNode({ icon, fontSize: 20 }) 同构),
 *   壳层 chrome 图标与官方组件逐字同源 (ant-design/mdi/gridicons/line-md/uil/
 *   majesticons/ph)。lucide 仅保留给页面内部件。
 */
import './flags'
import type { App } from 'vue'
import type { MenuItem } from './routes'
import {
  LayoutDashboard, Store, KeyRound, History, Wallet, TicketPercent, UserPlus, BadgeDollarSign,
  Gift, Users, Settings, UserRound, Info, Network, ReceiptText, House, Search, Maximize2, Minimize2,
  Sun, Moon, Monitor, Bell, LogOut, Globe, Copy, SwatchBook, PanelLeftClose, PanelLeftOpen,
  X, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Coins, Activity, Zap, Database, BookOpen, RefreshCw,
  CircleCheck, CircleAlert, TriangleAlert, Plus, Pencil, Trash2, Play, Cable, Tags, BadgePercent,
  Megaphone, UsersRound, Link2, Terminal, ShieldCheck, Cpu, BarChart3, Check, Layers, Settings2,
  KeySquare, Save, MonitorCheck, BellRing, CreditCard, Banknote, Ticket, Users2, Inbox, Eye, EyeOff,
  Sparkle, LifeBuoy, TrendingUp, PieChart, Trophy,
  Gauge, Send, Lightbulb, ExternalLink, LoaderCircle, MessageSquareWarning, Server, WifiOff,
} from 'lucide-vue-next'

/** 菜单图标名表 — key 与 routes.ts MenuItem.icon 对应, 值为官方 Iconify 图标名
 *  (Material Symbols Outlined 家族 = 模板菜单同族, fontSize 20) */
export const MENU_ICON_NAMES: Record<MenuItem['icon'], string> = {
  dashboard: 'material-symbols:dashboard-outline',
  mall: 'material-symbols:storefront-outline',
  token: 'material-symbols:key-outline',
  logs: 'material-symbols:history-outline',
  wallet: 'material-symbols:account-balance-wallet-outline',
  redeem: 'material-symbols:redeem-outline',
  invite: 'material-symbols:group-add-outline',
  pricing: 'material-symbols:sell-outline',
  redemption: 'material-symbols:confirmation-number-outline',
  users: 'material-symbols:manage-accounts-outline',
  settings: 'material-symbols:settings-outline',
  profile: 'material-symbols:person-outline',
  about: 'material-symbols:info-outline',
  contact: 'material-symbols:headset-mic-outline',
  channel: 'material-symbols:hub-outline',
  orders: 'material-symbols:receipt-long-outline',
  ticket: 'material-symbols:contact-support-outline',
  gateway: 'material-symbols:api-outline',
}

/** 首页/看板图标 (面包屑「首页」与兜底, 官方首页路由 meta.icon 同语义) */
export const HOME_ICON_NAME = MENU_ICON_NAMES.dashboard

const ICONS: Record<string, unknown> = {
  LayoutDashboard, Store, KeyRound, History, Wallet, TicketPercent, UserPlus, BadgeDollarSign,
  Gift, Users, Settings, UserRound, Info, Network, ReceiptText, House, Search, Maximize2, Minimize2,
  Sun, Moon, Monitor, Bell, LogOut, Globe, Copy, SwatchBook, PanelLeftClose, PanelLeftOpen,
  X, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Coins, Activity, Zap, Database, BookOpen, RefreshCw,
  CircleCheck, CircleAlert, TriangleAlert, Plus, Pencil, Trash2, Play, Cable, Tags, BadgePercent,
  Megaphone, UsersRound, Link2, Terminal, ShieldCheck, Cpu, BarChart3, Check, Layers, Settings2,
  KeySquare, Save, MonitorCheck, BellRing, CreditCard, Banknote, Ticket, Users2, Inbox, Eye, EyeOff,
  Sparkle, LifeBuoy, TrendingUp, PieChart, Trophy,
  Gauge, Send, Lightbulb, ExternalLink, LoaderCircle, MessageSquareWarning, Server, WifiOff,
}

export function registerIcons(app: App) {
  for (const [name, comp] of Object.entries(ICONS)) {
    if (comp) app.component(name, comp as never)
  }
}
