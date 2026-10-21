/**
 * SoybeanAdmin 主题配置持久化 (对齐官方 theme store: themeColor / themeRadius / sider.inverted)
 * - 16 个预设色取自官方 theme-drawer/modules/appearance/modules/theme-color.vue swatches
 * - 派生值取自官方 demo 实测 + naive-ui 自家色系双重验证: Hover = antd 索引 5 (变浅, 如 #2080f0→#4098fc 系),
 *   Pressed = antd 索引 7 (变深, 如 #18a058→#0c7a43 与 naive 官方绿完全一致)
 * - 通过 <html> 上的 CSS 变量全局生效, 预注入脚本见 apply-before-paint
 * 纯 TS 模块 (无 client 指令): 服务端 layout 需调用 themeBootstrapScript() 生成内联脚本
 */

export interface ThemeOverrides {
  primary: string
  radius: number
  siderInverted: boolean
}

export const DEFAULT_OVERRIDES: ThemeOverrides = {
  primary: '#2080f0', // 商务蓝 (naive-ui 正蓝; 用户反馈: 不喜欢旧默认紫 #646cff / 绿 #18a058)
  radius: 6, // 官方 themeRadius 默认值 (实测只影响容器/卡片圆角 xl = r+2 = 8px, 与官方页卡 rounded-8px 一致)
  siderInverted: false, // 官方 sider.inverted 默认值
}

/** 官方主题抽屉预设色板 (theme-color.vue swatches 原序) */
export const OFFICIAL_SWATCHES: string[] = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#0ea5e9', '#06b6d4', '#f43f5e', '#ef4444',
  '#ec4899', '#d946ef', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#22c55e', '#10b981',
]

/** 官方默认色也在色板中可选 (置于首位, 同官方 NColorPicker swatches 行为) */
export const SWATCHES = ['#2080f0', ...OFFICIAL_SWATCHES]

/** hover/pressed 派生表 [hover, pressed] — antd 索引 5/7, 由 scripts/gen-palette-map.ts 预计算
 *  正确性验证: #18a058 → #36ad69/#0c7a43 = naive-ui 官方绿 hover/pressed 原值 */
export const DERIVED_MAP: Record<string, [string, string]> = {
  '#2080f0': ['#4aa3fd', '#1161ca'],
  '#18a058': ['#36ad69', '#0c7a43'],
  '#646cff': ['#8d96ff', '#4a4dd9'],
  '#3b82f6': ['#66a6ff', '#2762d0'],
  '#6366f1': ['#9196fe', '#4b49cb'],
  '#8b5cf6': ['#b088ff', '#6943d0'],
  '#a855f7': ['#c681ff', '#853dd1'],
  '#0ea5e9': ['#36bff6', '#027fc3'],
  '#06b6d4': ['#2acbe1', '#008eae'],
  '#f43f5e': ['#ff6b7e', '#ce2b4b'],
  '#ef4444': ['#fc7570', '#c92f34'],
  '#ec4899': ['#f974b2', '#c63281'],
  '#d946ef': ['#ee72fc', '#af31c9'],
  '#f97316': ['#ff963f', '#d35608'],
  '#f59e0b': ['#ffbb34', '#cf7c00'],
  '#eab308': ['#f7cc30', '#c48c00'],
  '#84cc16': ['#9fd93a', '#62a60a'],
  '#22c55e': ['#46d274', '#139f4b'],
  '#10b981': ['#31c68f', '#059368'],
}

const LS_KEY = 'soybean-theme-overrides'

/** 旧默认色迁移: 已存储的历史默认 (紫/绿) 视为未配置, 回落到当前默认商务蓝 */
const LEGACY_DEFAULTS = ['#646cff', '#18a058']
function migratePrimary(primary: string | undefined): string {
  if (!primary || LEGACY_DEFAULTS.includes(primary)) return DEFAULT_OVERRIDES.primary
  return primary
}

export function loadOverrides(): ThemeOverrides {
  if (typeof window === 'undefined') return DEFAULT_OVERRIDES
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_OVERRIDES
    const parsed = JSON.parse(raw) as Partial<ThemeOverrides>
    return {
      primary: migratePrimary(typeof parsed.primary === 'string' ? parsed.primary : undefined),
      radius: typeof parsed.radius === 'number' ? parsed.radius : DEFAULT_OVERRIDES.radius,
      siderInverted: typeof parsed.siderInverted === 'boolean' ? parsed.siderInverted : DEFAULT_OVERRIDES.siderInverted,
    }
  } catch {
    return DEFAULT_OVERRIDES
  }
}

export function saveOverrides(o: ThemeOverrides) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(o))
  } catch {
    /* ignore quota errors */
  }
}

export function clearOverrides() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LS_KEY)
  } catch {
    /* ignore */
  }
}

/** radius → 卡片圆角令牌 (官方 demo 实测: themeRadius=6 时页卡 8px; naive 组件圆角固定 3px/2px 不随滑条) */
function radiusTokens(radius: number): Record<string, string> {
  return {
    '--radius-xl': `${((radius + 2) / 16).toFixed(4)}rem`,
  }
}

/** 将主题覆盖应用到 <html> CSS 变量 (primary/hover/pressed/ring + 圆角) */
export function applyOverrides(o: ThemeOverrides) {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  const derived = DERIVED_MAP[o.primary] ?? [o.primary, o.primary]
  const vars: Record<string, string> = {
    '--primary': o.primary,
    '--primary-hover': derived[0], // 官方 demo 实测: hover 变浅 (antd 索引 5)
    '--primary-pressed': derived[1], // pressed 变深 (antd 索引 7)
    '--ring': o.primary,
    ...radiusTokens(o.radius),
  }
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v))
}

/** 首屏预注入脚本字符串 (root layout 内联执行, 避免主题色闪烁; 含旧默认色迁移) */
export function themeBootstrapScript(): string {
  const defaults = JSON.stringify(DEFAULT_OVERRIDES)
  const legacy = JSON.stringify(LEGACY_DEFAULTS)
  const derivedMap = JSON.stringify(DERIVED_MAP)
  const fallback = JSON.stringify(DEFAULT_OVERRIDES.primary)
  return `(function(){try{var d=${defaults};var o=JSON.parse(localStorage.getItem('${LS_KEY}')||'null')||d;if(!o.primary||${legacy}.indexOf(o.primary)>=0)o.primary=d.primary;var el=document.documentElement;var dm=${derivedMap};var dv=dm[o.primary]||['${fallback}','${fallback}'];var xl=((o.radius+2)/16).toFixed(4);el.style.setProperty('--primary',o.primary);el.style.setProperty('--primary-hover',dv[0]);el.style.setProperty('--primary-pressed',dv[1]);el.style.setProperty('--ring',o.primary);el.style.setProperty('--radius-xl',xl+'rem');}catch(e){}})();`
}
