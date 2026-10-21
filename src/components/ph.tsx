/**
 * 图标库 — Task 75 全面换血: Phosphor(@iconify) → lucide-react
 * 旧版为 Phosphor 填充系 (gear_six/users_three 等造型陈旧, 与后台卡片语言脱节);
 * 新版统一为 Lucide 2px 线条系 (shadcn/ui / SoybeanAdmin 生态主流), 笔触一致造型现代。
 * 导出名与旧版 100% 兼容 (业务侧 import 无需改动), 少数 lucide 缺名用同形别名映射。
 */
import type { CSSProperties, ComponentType } from 'react'
import {
  // 原生同名 (下划线别名防与导出 const 冲突)
  LayoutDashboard as _LayoutDashboard, Cable as _Cable, KeyRound as _KeyRound,
  KeySquare as _KeySquare, ScrollText as _ScrollText, Tags as _Tags, Gift as _Gift,
  Users as _Users, Users2 as _Users2, Settings as _Settings, UserRound as _UserRound,
  Info as _Info, PanelLeftClose as _PanelLeftClose, PanelLeftOpen as _PanelLeftOpen,
  RefreshCw as _RefreshCw, Search as _Search, Maximize2 as _Maximize2, Minimize2 as _Minimize2,
  Moon as _Moon, Sun as _Sun, Bell as _Bell, BellRing as _BellRing, LogOut as _LogOut,
  Monitor as _Monitor, MonitorCheck as _MonitorCheck, Globe as _Globe, Copy as _Copy,
  House as _House, SwatchBook as _SwatchBook, Check as _Check, X as _X, RotateCcw as _RotateCcw,
  Loader2 as _Loader2, Inbox as _Inbox, Plus as _Plus, Pencil as _Pencil, Trash2 as _Trash2,
  Play as _Play, CircleCheck as _CircleCheck, Eye as _Eye, EyeOff as _EyeOff,
  ChevronLeft as _ChevronLeft, ChevronDown as _ChevronDown, Activity as _Activity,
  Coins as _Coins, Zap as _Zap, Database as _Database, Wallet as _Wallet, Save as _Save,
  Settings2 as _Settings2, ShieldCheck as _ShieldCheck, BookOpen as _BookOpen,
  Terminal as _Terminal, Cpu as _Cpu, BarChart3 as _BarChart3, TriangleAlert as _TriangleAlert,
  CircleAlert as _CircleAlert, ArrowUpRight as _ArrowUpRight, CornerDownLeft as _CornerDownLeft,
  ArrowRight as _ArrowRight, Sparkle as _Sparkle,
  // 别名映射 (lucide 无同名导出)
  ChevronRight as _CaretRight, Rocket as _RocketLaunch, ArrowLeftRight as _ArrowsLeftRight,
  Route as _Path, LockKeyhole as _LockKeyhole, Layers as _Stack,
  // Task 75 新增 (商城/钱包/邀请/模型)
  Store as _Store, ShoppingBag as _ShoppingBag, Megaphone as _Megaphone,
  UsersRound as _UsersRound, Ticket as _Ticket, TicketPercent as _TicketPercent,
  Banknote as _Banknote, CreditCard as _CreditCard, CircleDollarSign as _CircleDollarSign,
  BadgePercent as _BadgePercent, LayoutGrid as _LayoutGrid, Link2 as _Link2, Share2 as _Share2,
  Bot as _Bot, MessagesSquare as _MessagesSquare, Gauge as _Gauge, ChevronRight as _ChevronRight,
  // Task 76 新增 (菜单图标精修: 渠道/日志/价格/邀请/充值订单)
  Network as _Network, History as _History, BadgeDollarSign as _BadgeDollarSign,
  UserPlus as _UserPlus, ReceiptText as _ReceiptText,
} from 'lucide-react'

export interface PhProps {
  size?: number
  className?: string
  style?: CSSProperties
}

type LucideComp = ComponentType<{ size?: number | string; className?: string; style?: CSSProperties }>

/** 统一包一层: 默认尺寸/aria-hidden 与旧版 Phosphor 包装完全一致, 业务侧零改动 */
function wrap(Comp: LucideComp, name: string) {
  const C = ({ size = 24, className, style }: PhProps) => (
    <Comp size={size} className={className} style={style} aria-hidden="true" />
  )
  C.displayName = `Lucide.${name}`
  return C
}

/* ---- 原生同名 ---- */
export const LayoutDashboard = wrap(_LayoutDashboard, 'LayoutDashboard')
export const Cable = wrap(_Cable, 'Cable')
export const KeyRound = wrap(_KeyRound, 'KeyRound')
export const KeySquare = wrap(_KeySquare, 'KeySquare')
export const ScrollText = wrap(_ScrollText, 'ScrollText')
export const Tags = wrap(_Tags, 'Tags')
export const Gift = wrap(_Gift, 'Gift')
export const Users = wrap(_Users, 'Users')
export const Users2 = wrap(_Users2, 'Users2')
export const Settings = wrap(_Settings, 'Settings')
export const UserRound = wrap(_UserRound, 'UserRound')
export const Info = wrap(_Info, 'Info')
export const PanelLeftClose = wrap(_PanelLeftClose, 'PanelLeftClose')
export const PanelLeftOpen = wrap(_PanelLeftOpen, 'PanelLeftOpen')
export const RefreshCw = wrap(_RefreshCw, 'RefreshCw')
export const Search = wrap(_Search, 'Search')
export const Maximize2 = wrap(_Maximize2, 'Maximize2')
export const Minimize2 = wrap(_Minimize2, 'Minimize2')
export const Moon = wrap(_Moon, 'Moon')
export const Sun = wrap(_Sun, 'Sun')
export const Bell = wrap(_Bell, 'Bell')
export const BellRing = wrap(_BellRing, 'BellRing')
export const LogOut = wrap(_LogOut, 'LogOut')
export const Monitor = wrap(_Monitor, 'Monitor')
export const MonitorCheck = wrap(_MonitorCheck, 'MonitorCheck')
export const Globe = wrap(_Globe, 'Globe')
export const Copy = wrap(_Copy, 'Copy')
export const House = wrap(_House, 'House')
export const SwatchBook = wrap(_SwatchBook, 'SwatchBook')
export const Check = wrap(_Check, 'Check')
export const X = wrap(_X, 'X')
export const RotateCcw = wrap(_RotateCcw, 'RotateCcw')
export const Loader2 = wrap(_Loader2, 'Loader2')
export const Inbox = wrap(_Inbox, 'Inbox')
export const Plus = wrap(_Plus, 'Plus')
export const Pencil = wrap(_Pencil, 'Pencil')
export const Trash2 = wrap(_Trash2, 'Trash2')
export const Play = wrap(_Play, 'Play')
export const CircleCheck = wrap(_CircleCheck, 'CircleCheck')
export const Eye = wrap(_Eye, 'Eye')
export const EyeOff = wrap(_EyeOff, 'EyeOff')
export const ChevronLeft = wrap(_ChevronLeft, 'ChevronLeft')
export const ChevronDown = wrap(_ChevronDown, 'ChevronDown')
export const Activity = wrap(_Activity, 'Activity')
export const Coins = wrap(_Coins, 'Coins')
export const Zap = wrap(_Zap, 'Zap')
export const Database = wrap(_Database, 'Database')
export const Wallet = wrap(_Wallet, 'Wallet')
export const Save = wrap(_Save, 'Save')
export const Settings2 = wrap(_Settings2, 'Settings2')
export const ShieldCheck = wrap(_ShieldCheck, 'ShieldCheck')
export const BookOpen = wrap(_BookOpen, 'BookOpen')
export const Terminal = wrap(_Terminal, 'Terminal')
export const Cpu = wrap(_Cpu, 'Cpu')
export const BarChart3 = wrap(_BarChart3, 'BarChart3')
export const TriangleAlert = wrap(_TriangleAlert, 'TriangleAlert')
export const CircleAlert = wrap(_CircleAlert, 'CircleAlert')
export const ArrowUpRight = wrap(_ArrowUpRight, 'ArrowUpRight')
export const CornerDownLeft = wrap(_CornerDownLeft, 'CornerDownLeft')
export const ArrowRight = wrap(_ArrowRight, 'ArrowRight')
export const Sparkle = wrap(_Sparkle, 'Sparkle')

/* ---- 别名映射 (旧导出名 → lucide 同形图标) ---- */
export const CaretRight = wrap(_CaretRight, 'CaretRight')
export const RocketLaunch = wrap(_RocketLaunch, 'RocketLaunch')
export const ArrowsLeftRight = wrap(_ArrowsLeftRight, 'ArrowsLeftRight')
export const Path = wrap(_Path, 'Path')
export const LockKey = wrap(_LockKeyhole, 'LockKey')
export const Stack = wrap(_Stack, 'Stack')

/* ---- Task 75 新增 (新页面图标) ---- */
export const Store = wrap(_Store, 'Store')
export const ShoppingBag = wrap(_ShoppingBag, 'ShoppingBag')
export const Megaphone = wrap(_Megaphone, 'Megaphone')
export const UsersRound = wrap(_UsersRound, 'UsersRound')
export const Ticket = wrap(_Ticket, 'Ticket')
export const TicketPercent = wrap(_TicketPercent, 'TicketPercent')
export const Banknote = wrap(_Banknote, 'Banknote')
export const CreditCard = wrap(_CreditCard, 'CreditCard')
export const CircleDollarSign = wrap(_CircleDollarSign, 'CircleDollarSign')
export const BadgePercent = wrap(_BadgePercent, 'BadgePercent')
export const LayoutGrid = wrap(_LayoutGrid, 'LayoutGrid')
export const Link2 = wrap(_Link2, 'Link2')
export const Share2 = wrap(_Share2, 'Share2')
export const Bot = wrap(_Bot, 'Bot')
export const MessagesSquare = wrap(_MessagesSquare, 'MessagesSquare')
export const Gauge = wrap(_Gauge, 'Gauge')
export const ChevronRight = wrap(_ChevronRight, 'ChevronRight')

/* ---- Task 76 新增 (菜单图标精修) ---- */
export const Network = wrap(_Network, 'Network')
export const History = wrap(_History, 'History')
export const BadgeDollarSign = wrap(_BadgeDollarSign, 'BadgeDollarSign')
export const UserPlus = wrap(_UserPlus, 'UserPlus')
export const ReceiptText = wrap(_ReceiptText, 'ReceiptText')
