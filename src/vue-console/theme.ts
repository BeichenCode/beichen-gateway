/**
 * 全局主题系统 — 完整移植自 soybeanjs/soybean-admin 官方仓库
 *   蓝本文件:
 *   - src/theme/settings.ts            → themeSettings (默认值逐字段对齐官方: themeColor
 *                                        #646cff / themeRadius 2 (站点直角语言收紧) / otherColor / tokens)
 *   - src/store/modules/theme/shared.ts → getNaiveTheme (5 色 × 5 场景) + createThemeToken +
 *                                        addThemeVarsToGlobal (--soy-* CSS 变量 :root / html.dark)
 *                                        + toggleAuxiliaryColorModes (灰色/色弱 filter)
 *   - packages/materials/.../page-tab/shared.ts → createTabCssVars (页签主题色 alpha 变量)
 * 这是整个后台唯一的观感配置源 (等价模板 GlobalThemeConfigProvider):
 *   Naive 组件观感 = getNaiveTheme (与官方逐字段一致);
 *   布局容器观感 = --soy-* CSS 变量 (container/layout/inverted/base-text + 三段阴影 + 调色板)。
 * 持久化 = console 专属 LS key (console-theme-settings), 与前台 theme-palette 完全解耦:
 *   后台主题色/圆角改动不再写穿 --primary 等前台 token (前台 Arco #165DFF/#2080f0 体系不受影响)。
 */
import './flags'
import './styles/theme-vt.css'
import './styles/detail.css'
import { ref, computed, watch, nextTick } from 'vue'
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'
import {
  addColorAlpha,
  transformColorWithOpacity,
  getColorPalette,
  getPaletteColorByNumber,
  getHexOrNull,
} from './theme/color'

type NaiveTheme = typeof darkTheme | null

/* ------------------------------------------------------------------ */
/* themeSettings — 官方 settings.ts 默认值 (逐字段一致, 不做锁定改写)     */
/* ------------------------------------------------------------------ */

export const themeSettings = {
  /** 官方 themeColor (Vite 紫蓝, 模板截图同源) */
  themeColor: '#646cff',
  /** 圆角: 官方默认 6 按站点全直角设计语言收紧为 2 (Arco 直角观感, 抽屉仍可调 0-24) */
  themeRadius: 2,
  otherColor: {
    info: '#2080f0',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
  },
  isInfoFollowPrimary: true,
  header: { height: 56 },
  /** 官方 settings.ts tab 逐字段默认值: mode 默认 chrome (浏览器风格斜切页签) */
  tab: {
    visible: true,
    cache: true,
    height: 44,
    mode: 'chrome' as const,
    closeTabByMiddleClick: false,
  },
  sider: { inverted: false, width: 220, collapsedWidth: 64 },
  footer: { height: 48 },
  content: { padding: 16 },
  page: { animate: true, animateMode: 'fade-slide' },
  /** 官方 tokens: 亮暗布局色 + 三段阴影 (逐字段对齐 settings.ts) */
  tokens: {
    light: {
      colors: {
        container: 'rgb(255, 255, 255)',
        layout: 'rgb(247, 250, 252)',
        inverted: 'rgb(0, 20, 40)',
        'base-text': 'rgb(31, 31, 31)',
      },
      boxShadow: {
        header: '0 1px 2px rgb(0, 21, 41, 0.08)',
        sider: '2px 0 8px 0 rgb(29, 35, 41, 0.05)',
        tab: '0 1px 2px rgb(0, 21, 41, 0.08)',
      },
    },
    dark: {
      colors: {
        container: 'rgb(28, 28, 28)',
        layout: 'rgb(18, 18, 18)',
        'base-text': 'rgb(224, 224, 224)',
      },
      boxShadow: {
        header: '0 1px 2px rgba(0, 0, 0, 0.24)',
        sider: '2px 0 8px 0 rgba(0, 0, 0, 0.2)',
        tab: '0 1px 2px rgba(0, 0, 0, 0.24)',
      },
    },
  },
}

/** 布局尺寸 token (既有导出形状保持不变, 数值取自 themeSettings) */
export const THEME = {
  header: { height: themeSettings.header.height },
  tab: { height: themeSettings.tab.height },
  sider: {
    width: themeSettings.sider.width,
    collapsedWidth: themeSettings.sider.collapsedWidth,
    inverted: themeSettings.tokens.light.colors.inverted,
  },
  footer: { height: themeSettings.footer.height },
  content: { padding: themeSettings.content.padding },
  boxShadow: {
    header: themeSettings.tokens.light.boxShadow.header,
    sider: themeSettings.tokens.light.boxShadow.sider,
    tab: themeSettings.tokens.light.boxShadow.tab,
    dark: themeSettings.tokens.dark.boxShadow,
  },
} as const

export const LAYOUT_BG = { light: 'rgb(247, 250, 252)', dark: 'rgb(18, 18, 18)' } as const
export const CONTAINER_BG = { light: '#ffffff', dark: 'rgb(28, 28, 28)' } as const

/* ------------------------------------------------------------------ */
/* Console 专属持久化 (官方 theme store localStorage 语义的等价实现)      */
/*   与前台 theme-palette (soybean-theme-overrides) 完全隔离, 不写穿前台  */
/*   --primary/--radius-xl token                                        */
/* ------------------------------------------------------------------ */

interface ConsolePrefs {
  primary: string
  radius: number
  siderInverted: boolean
  grayscale: boolean
  colourWeakness: boolean
  semantic: { success: string; warning: string; error: string }
  tabVisible: boolean
  breadcrumbVisible: boolean
  footerVisible: boolean
  pageAnimate: boolean
  /** 官方 tab.* 剩余字段 */
  tabCache: boolean
  tabMode: 'chrome' | 'button' | 'slider'
  tabMiddleClose: boolean
  tabHeight: number
  /** 官方 page.animateMode (transition.css 六套+无) */
  pageAnimateMode: string
}

const PREFS_KEY = 'console-theme-settings'

function loadPrefs(): Partial<ConsolePrefs> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    return raw ? (JSON.parse(raw) as Partial<ConsolePrefs>) : {}
  } catch {
    return {}
  }
}

const savedPrefs = loadPrefs()

function persistPrefs() {
  if (typeof window === 'undefined') return
  try {
    const prefs: ConsolePrefs = {
      primary: primaryColor.value,
      radius: themeRadius.value,
      siderInverted: siderInverted.value,
      grayscale: grayscale.value,
      colourWeakness: colourWeakness.value,
      semantic: semanticColors.value,
      tabVisible: tabVisible.value,
      breadcrumbVisible: breadcrumbVisible.value,
      footerVisible: footerVisible.value,
      pageAnimate: pageAnimate.value,
      tabCache: tabCache.value,
      tabMode: tabMode.value,
      tabMiddleClose: tabMiddleClose.value,
      tabHeight: tabHeight.value,
      pageAnimateMode: pageAnimateMode.value,
    }
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage 不可用忽略 */
  }
}

/* ------------------------------------------------------------------ */
/* 主题模式 (亮 / 暗 / 跟随系统) — 'theme' key 与全站共享 (既有契约)      */
/* ------------------------------------------------------------------ */

export const themeMode = ref<'light' | 'dark' | 'system'>(
  (typeof window !== 'undefined' && ((localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null) || 'light')) || 'light',
)

/** 主题色 — 默认官方 #646cff, 持久化于 console 专属 key */
export const primaryColor = ref(getHexOrNull(savedPrefs.primary || '') || themeSettings.themeColor)
/** 圆角 token (抽屉可调; 旧持久化值 6 = 旧默认值, 视为未定制 → 迁移到新默认 2) */
export const themeRadius = ref<number>(
  typeof savedPrefs.radius === 'number' && savedPrefs.radius !== 6
    ? savedPrefs.radius
    : themeSettings.themeRadius,
)
/** 侧边栏反转 (仓库 sider.inverted, 反转底色 = tokens.light.colors.inverted) */
export const siderInverted = ref(!!savedPrefs.siderInverted)
/** 官方辅助模式 (toggleAuxiliaryColorModes) */
export const grayscale = ref(!!savedPrefs.grayscale)
export const colourWeakness = ref(!!savedPrefs.colourWeakness)
/** 官方 otherColor (isInfoFollowPrimary=true → info 跟随主色, 其余三色可调) */
export const semanticColors = ref({
  success: savedPrefs.semantic?.success || themeSettings.otherColor.success,
  warning: savedPrefs.semantic?.warning || themeSettings.otherColor.warning,
  error: savedPrefs.semantic?.error || themeSettings.otherColor.error,
})
/** 界面显示开关 (官方 theme store 同名字段) */
export const tabVisible = ref(savedPrefs.tabVisible !== false)
/** 官方页签配置 (tab-settings.vue 五项): 缓存/风格/中键关闭 + 高度 */
export const tabCache = ref(savedPrefs.tabCache !== false)
export const tabMode = ref<'chrome' | 'button' | 'slider'>(savedPrefs.tabMode || themeSettings.tab.mode)
export const tabMiddleClose = ref(!!savedPrefs.tabMiddleClose)
export const tabHeight = ref<number>(
  typeof savedPrefs.tabHeight === 'number' && savedPrefs.tabHeight >= 28 && savedPrefs.tabHeight <= 72
    ? savedPrefs.tabHeight
    : themeSettings.tab.height,
)
export const breadcrumbVisible = ref(savedPrefs.breadcrumbVisible !== false)
export const footerVisible = ref(savedPrefs.footerVisible !== false)
export const pageAnimate = ref(savedPrefs.pageAnimate !== false)
/** 官方 page.animateMode (content-settings NSelect, 默认 fade-slide) */
export const pageAnimateMode = ref<string>(savedPrefs.pageAnimateMode || themeSettings.page.animateMode)

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export const isDark = ref(themeMode.value === 'dark' || (themeMode.value === 'system' && systemPrefersDark()))

let media: MediaQueryList | null = null
function resolveDark() {
  isDark.value = themeMode.value === 'dark' || (themeMode.value === 'system' && systemPrefersDark())
}

/** 应用到 <html>: .dark class (Tailwind/CSS 变量体系) + color-scheme + next-themes 同 key 持久化 */
function applyToDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark.value)
  document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
  try {
    localStorage.setItem('theme', themeMode.value)
  } catch {
    /* storage 不可用忽略 */
  }
}

/** 官方 toggleAuxiliaryColorModes — 灰色/色弱 filter (html 内联 style, 与仓库实现一致) */
function applyAuxColorModes() {
  if (typeof document === 'undefined') return
  document.documentElement.style.filter = [grayscale.value ? 'grayscale(100%)' : '', colourWeakness.value ? 'invert(80%)' : '']
    .filter(Boolean)
    .join(' ')
}

export function setThemeMode(m: 'light' | 'dark' | 'system') {
  themeMode.value = m
  resolveDark()
  applyToDocument()
}

/**
 * Task 104: 明暗切换流畅化 — View Transitions API 圆形揭示
 * 以触发点 (x,y) 为圆心把新主题从旧主题上揭示出来 (单次合成动画, 全元素同帧切换,
 * 消除旧方案零过渡硬切/各元素异步变色带来的割裂感)。
 * 不支持 startViewTransition 或用户偏好减少动效时直接 setThemeMode (零回退开销)。
 */
type VTDocument = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => { finished: Promise<unknown> }
}

export function setThemeModeWithReveal(m: 'light' | 'dark' | 'system', x?: number, y?: number) {
  if (typeof document === 'undefined') return setThemeMode(m)
  const doc = document as VTDocument
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduced) return setThemeMode(m)

  const cx = x ?? window.innerWidth / 2
  const cy = y ?? window.innerHeight / 2
  /* 揭示终态半径 = 圆心到四角最大距离 (任意窗口尺寸都完整覆盖) */
  const r = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy))
  const root = document.documentElement
  root.style.setProperty('--vt-x', `${Math.round(cx)}px`)
  root.style.setProperty('--vt-y', `${Math.round(cy)}px`)
  root.style.setProperty('--vt-r', `${Math.ceil(r)}px`)
  root.setAttribute('data-vt-reveal', '')
  const vt = doc.startViewTransition(() => {
    setThemeMode(m)
    return nextTick()
  })
  void vt.finished.finally(() => root.removeAttribute('data-vt-reveal'))
}

export function setSiderInverted(v: boolean) {
  siderInverted.value = v
  persistPrefs()
}

export function setThemeRadius(n: number) {
  themeRadius.value = Math.max(0, Math.min(24, Math.round(n)))
  persistPrefs()
}

export function setSemanticColor(key: 'success' | 'warning' | 'error', color: string) {
  const hex = getHexOrNull(color)
  if (!hex) return
  semanticColors.value = { ...semanticColors.value, [key]: hex }
  persistPrefs()
}

export function setAuxMode(key: 'grayscale' | 'colourWeakness', v: boolean) {
  if (key === 'grayscale') grayscale.value = v
  else colourWeakness.value = v
  applyAuxColorModes()
  persistPrefs()
}

export function setDisplayPref(key: 'tabVisible' | 'breadcrumbVisible' | 'footerVisible' | 'pageAnimate', v: boolean) {
  if (key === 'tabVisible') tabVisible.value = v
  else if (key === 'breadcrumbVisible') breadcrumbVisible.value = v
  else if (key === 'footerVisible') footerVisible.value = v
  else pageAnimate.value = v
  persistPrefs()
}

/** 官方 content-settings 页面切换动画类型 setter */
export function setPageAnimateMode(mode: string) {
  pageAnimateMode.value = mode
  persistPrefs()
}

/** 官方 tab-settings 可调项 setter (cache/mode/height/closeTabByMiddleClick) */
export function setTabPref(
  key: 'tabCache' | 'tabMiddleClose',
  v: boolean,
): void
export function setTabPref(key: 'tabMode', v: 'chrome' | 'button' | 'slider'): void
export function setTabPref(key: 'tabHeight', v: number): void
export function setTabPref(key: string, v: boolean | number | string) {
  if (key === 'tabCache') tabCache.value = !!v
  else if (key === 'tabMiddleClose') tabMiddleClose.value = !!v
  else if (key === 'tabMode') tabMode.value = v as 'chrome' | 'button' | 'slider'
  else if (key === 'tabHeight') tabHeight.value = Math.max(28, Math.min(72, Math.round(Number(v))))
  persistPrefs()
}

/** 恢复官方默认主题 (等价官方 resetStore) */
export function resetConsoleTheme() {
  themeRadius.value = themeSettings.themeRadius
  primaryColor.value = themeSettings.themeColor
  siderInverted.value = false
  grayscale.value = false
  colourWeakness.value = false
  semanticColors.value = {
    success: themeSettings.otherColor.success,
    warning: themeSettings.otherColor.warning,
    error: themeSettings.otherColor.error,
  }
  tabVisible.value = true
  breadcrumbVisible.value = true
  footerVisible.value = true
  pageAnimate.value = true
  tabCache.value = themeSettings.tab.cache
  tabMode.value = themeSettings.tab.mode
  tabMiddleClose.value = themeSettings.tab.closeTabByMiddleClick
  tabHeight.value = themeSettings.tab.height
  pageAnimateMode.value = themeSettings.page.animateMode
  applyAuxColorModes()
  persistPrefs()
}

/* ------------------------------------------------------------------ */
/* 主题色系统 — 官方 getNaiveTheme 语义                                  */
/*   5 色 (primary/info/success/warning/error, isInfoFollowPrimary →    */
/*   info 跟随 primary) × 5 场景 (原色/Suppl/Hover=色板500/Pressed=     */
/*   色板700/Active=alpha 0.1) + LoadingBar + Tag 圆角                  */
/* ------------------------------------------------------------------ */

type ThemeColorKey = 'primary' | 'info' | 'success' | 'warning' | 'error'

/** 官方 otherColor + isInfoFollowPrimary (跟随主色, 与 theme store 逻辑一致) */
const themeColors = computed<Record<ThemeColorKey, string>>(() => ({
  primary: primaryColor.value,
  info: primaryColor.value,
  success: semanticColors.value.success,
  warning: semanticColors.value.warning,
  error: semanticColors.value.error,
}))

type NaiveColorScene = '' | 'Suppl' | 'Hover' | 'Pressed' | 'Active'

/** 官方 colorActions — 逐条对齐 shared.ts getNaiveThemeColors */
const colorActions: { scene: NaiveColorScene; handler: (color: string) => string }[] = [
  { scene: '', handler: (color) => color },
  { scene: 'Suppl', handler: (color) => color },
  { scene: 'Hover', handler: (color) => getPaletteColorByNumber(color, 500) },
  { scene: 'Pressed', handler: (color) => getPaletteColorByNumber(color, 700) },
  { scene: 'Active', handler: (color) => addColorAlpha(color, 0.1) },
]

/** getNaiveTheme — shared.ts 官方实现 + Task 203-a 组件级精修 (官方 overrides 分支默认无) */
export function getNaiveThemeOverrides(colors: Record<ThemeColorKey, string>): GlobalThemeOverrides {
  const common: Record<string, string> = {}
  for (const [colorType, colorValue] of Object.entries(colors)) {
    for (const action of colorActions) {
      common[`${colorType}Color${action.scene}`] = action.handler(colorValue)
    }
  }
  common.borderRadius = `${themeRadius.value}px`
  return {
    common,
    LoadingBar: { colorLoading: colors.primary },
    Tag: { borderRadius: `${themeRadius.value}px` },
    // Task 138 (用户定音): Toast 回归原版观感, 仅保留 12px 圆角 = 「把原来的 Toast 变圆润一点」;
    // 133 的芯片图标/描边/大阴影 CSS 覆盖块已整体撤销 (globals.css), 此处是 Vue 侧唯一的圆角来源
    Message: { borderRadius: '12px' },
    ...componentDetailOverrides(colors),
  }
}

/* ------------------------------------------------------------------ */
/* Task 203-a 组件级精修 (细节美化第一批 · 地基)                          */
/*   原则: 全部取值派生自 themeRadius / 五色 / isDark, 亮暗两套各自成立;  */
/*   只调观感 token (字重/密度/圆角通道/聚焦环/悬浮反馈), 不动布局结构;   */
/*   圆角零硬编码 (统一 `${themeRadius.value}px`); 过渡时长归 detail.css。*/
/* ------------------------------------------------------------------ */
function componentDetailOverrides(colors: Record<ThemeColorKey, string>): GlobalThemeOverrides {
  const r = `${themeRadius.value}px`
  const dark = isDark.value
  const primary = colors.primary
  /** 聚焦环: 统一走主色低透明 alpha (Input/Select 共用) */
  const focusRing = `0 0 0 2px ${addColorAlpha(primary, 0.16)}`
  /** 表头底色: 亮色冷灰微染 / 暗色白系 alpha (主色微染在暗底发闷) */
  const thBg = dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 20, 40, 0.02)'
  /** 悬浮行/菜单项: 亮色主色 6% 微染 (与品牌呼应), 暗色白系 5% (对比更干净) */
  const rowHover = dark ? 'rgba(255, 255, 255, 0.05)' : addColorAlpha(primary, 0.06)
  /** 浮层阴影: 替换 naive 默认三段大扩散 shadow2, 收敛为两层紧凑投影 (亮/暗各一档) */
  const floatShadow = dark
    ? '0 3px 12px -2px rgba(0, 0, 0, 0.5), 0 8px 28px -6px rgba(0, 0, 0, 0.36)'
    : '0 3px 12px -2px rgba(31, 35, 41, 0.1), 0 8px 28px -6px rgba(31, 35, 41, 0.13)'
  /** 弹窗阴影: 比 naive 默认 boxShadow3 更聚焦 (少一层大范围 48px 漫散) */
  const modalShadow = dark
    ? '0 8px 32px -8px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px -8px rgba(31, 35, 41, 0.16), 0 2px 8px rgba(31, 35, 41, 0.08)'

  return {
    /* 卡片: 标题 600/14px 拉开与正文的层级, small 档 (统计卡/容器卡主力) 内边距 12→14 起更透气 */
    Card: {
      borderRadius: r,
      titleFontWeight: '600',
      titleFontSizeSmall: '14px',
      paddingSmall: '14px 16px 15px',
      paddingMedium: '20px 20px 21px',
      paddingHuge: '22px 24px 24px',
    },
    /* 表格: 表头微染 + 600 字重 + 压灰字色 (层级), 悬浮行主色微染, 单元格纵向 +1px, 空态收紧 */
    DataTable: {
      thColor: thBg,
      thColorHover: thBg,
      thTextColor: dark ? 'rgba(230, 230, 230, 0.78)' : 'rgba(31, 31, 31, 0.72)',
      thFontWeight: '600',
      tdColorHover: rowHover,
      tdColorHoverModal: rowHover,
      tdColorHoverPopover: rowHover,
      thPaddingSmall: '10px 12px',
      tdPaddingSmall: '9px 12px',
      emptyPadding: '40px 0',
      paginationMargin: '14px 0 0 0',
    },
    /* 按钮: 圆角全档走 themeRadius; 次级 (default) 按钮 hover/按压描边改主色 alpha (比官方
       实色 hover 柔半档), 过渡时长由 detail.css 收敛到 0.2s */
    Button: {
      borderRadiusTiny: r,
      borderRadiusSmall: r,
      borderRadiusMedium: r,
      borderRadiusLarge: r,
      borderHover: `1px solid ${addColorAlpha(primary, 0.5)}`,
      borderPressed: `1px solid ${addColorAlpha(primary, 0.62)}`,
    },
    /* 输入/选择: 圆角走通道, focus 描边环 = 主色 alpha 0.16 (官方 0.2 收柔半档) */
    Input: { borderRadius: r, boxShadowFocus: focusRing },
    Select: {
      peers: {
        InternalSelection: { borderRadius: r, boxShadowFocus: focusRing },
        InternalSelectMenu: { borderRadius: r },
      },
    },
    /* 弹窗: 阴影聚焦化; card/dialog 两种 preset 的圆角与标题字重一并走通道 */
    Modal: {
      boxShadow: modalShadow,
      peers: {
        Card: { borderRadius: r },
        Dialog: { borderRadius: r, titleFontWeight: '600' },
      },
    },
    /* 抽屉: 移动端菜单/主题配置抽屉标题加重, 圆角走通道 (侧缘抽屉由 naive 自身置 0) */
    Drawer: { borderRadius: r, titleFontWeight: '600' },
    /* 浮层四件套: 圆角走通道 + 阴影统一精修版; Popover/Tooltip 内边距微收;
       Dropdown 悬浮项与表格行同款主色微染 (悬浮语言全站一致) */
    Popover: { borderRadius: r, padding: '9px 12px', boxShadow: floatShadow },
    Dropdown: { borderRadius: r, optionColorHover: rowHover, boxShadow: floatShadow },
    Tooltip: { borderRadius: r, padding: '7px 12px', boxShadow: floatShadow },
    /* 分隔线: 亮暗各降一档存在感 (官方 dividerColor 亮色偏蓝灰, 统一为中性 alpha) */
    Divider: { color: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(31, 31, 31, 0.08)' },
    /* 分页: 页码圆角走通道 (直角语言覆盖到分页器) */
    Pagination: { itemBorderRadius: r },
  }
}

/** naive-ui themeOverrides — 与官方 getNaiveTheme 输出一致 (亮暗由 darkTheme + naive 默认值提供) */
export const themeOverrides = computed<GlobalThemeOverrides>(() => {
  /* Task 203-a: componentDetailOverrides 内读取 isDark/themeRadius, 但 computed 的自动依赖
     只收集到 themeColors — 若不显式登记这两个依赖, 切换亮暗主题或调圆角时组件级覆写
     (表头底色/悬浮行/阴影/圆角) 会残留旧值。void 取值即向 computed 登记依赖。 */
  void isDark.value
  void themeRadius.value
  return getNaiveThemeOverrides(themeColors.value)
})

/* ------------------------------------------------------------------ */
/* CSS 变量通道 — 官方 createThemeToken + addThemeVarsToGlobal           */
/*   :root / html.dark 双段注入:                                        */
/*   - 调色板: --primary-50..950-color 等 (R G B 空间分量格式)           */
/*   - 布局色: --container-bg-color / --layout-bg-color / --inverted-   */
/*     bg-color / --base-text-color                                     */
/*   - 三段阴影: --header-box-shadow / --sider-box-shadow / --tab-...   */
/*   - 页签主题变量 (createTabCssVars): --soy-primary-color*            */
/*   - 布局尺寸: --soy-header-height 等 (admin-layout 同名)              */
/* ------------------------------------------------------------------ */

/** hex → "R G B" 分量串 (非法回退黑色) */
function hexToRgbTuple(color: string): { r: number; g: number; b: number } {
  const hex = getHexOrNull(color)
  if (!hex) return { r: 0, g: 0, b: 0 }
  const h = hex.slice(1)
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** 官方 createThemeToken + addThemeVarsToGlobal — 生成并注入 <style id="console-theme-vars"> */
function updateThemeVars() {
  if (typeof document === 'undefined') return
  const colors = themeColors.value

  /* --- 调色板 (官方 createThemePaletteColors: 每色 50-950 全刻度 + 500 主档) --- */
  const paletteColors: Record<string, string> = {}
  const colorKeys = Object.keys(colors) as ThemeColorKey[]
  colorKeys.forEach((key) => {
    const colorMap = getColorPalette(colors[key])
    colorPaletteNumbers.forEach((number) => {
      paletteColors[`${key}-${number}-color`] = colorMap.get(number) || colors[key]
    })
    paletteColors[`${key}-color`] = colorMap.get(500) || colors[key]
  })

  /* --- NProgress 颜色 (官方 shared.ts: nprogress: paletteColors.primary = 500 档) --- */
  const nprogressRgb = hexToRgbTuple(paletteColors['primary-500-color'])
  const nprogressLine = `--nprogress-color: ${nprogressRgb.r} ${nprogressRgb.g} ${nprogressRgb.b}`

  /* --- 布局 token (官方 getCssVarByTokens: 色值 → "R G B" 分量, 阴影原样) --- */
  const lightTokens = themeSettings.tokens.light
  const darkTokens = { colors: { ...lightTokens.colors, ...themeSettings.tokens.dark.colors } }

  const lightLines: string[] = []
  Object.entries(paletteColors).forEach(([k, v]) => {
    const { r, g, b } = hexToRgbTuple(v)
    lightLines.push(`--${k}: ${r} ${g} ${b}`)
  })
  Object.entries(lightTokens.colors).forEach(([k, v]) => {
    const { r, g, b } = hexToRgbTuple(getHexOrNull(v) || v)
    lightLines.push(`--${k}-bg-color: ${r} ${g} ${b}`)
  })
  Object.entries(lightTokens.boxShadow).forEach(([k, v]) => {
    lightLines.push(`--${k}-box-shadow: ${v}`)
  })

  const darkLines: string[] = []
  Object.entries(darkTokens.colors).forEach(([k, v]) => {
    const { r, g, b } = hexToRgbTuple(getHexOrNull(v) || v)
    darkLines.push(`--${k}-bg-color: ${r} ${g} ${b}`)
  })
  Object.entries(themeSettings.tokens.dark.boxShadow).forEach(([k, v]) => {
    darkLines.push(`--${k}-box-shadow: ${v}`)
  })
  darkLines.push(nprogressLine)
  lightLines.push(nprogressLine)

  /* --- 页签主题变量 (官方 createTabCssVars) --- */
  const primary = primaryColor.value
  const tabVars = [
    `--soy-primary-color: ${primary}`,
    `--soy-primary-color1: ${transformColorWithOpacity(primary, 0.1, '#ffffff')}`,
    `--soy-primary-color2: ${transformColorWithOpacity(primary, 0.3, '#000000')}`,
    `--soy-primary-color-opacity1: ${addColorAlpha(primary, 0.1)}`,
    `--soy-primary-color-opacity2: ${addColorAlpha(primary, 0.15)}`,
    `--soy-primary-color-opacity3: ${addColorAlpha(primary, 0.3)}`,
  ]

  /* --- 布局尺寸变量 (官方 admin-layout cssVars 同名) --- */
  const sizeVars = [
    `--soy-header-height: ${THEME.header.height}px`,
    `--soy-tab-height: ${tabHeight.value}px`,
    `--soy-sider-width: ${THEME.sider.width}px`,
    `--soy-sider-collapsed-width: ${THEME.sider.collapsedWidth}px`,
    `--soy-footer-height: ${THEME.footer.height}px`,
  ]

  const styleId = 'console-theme-vars'
  const style = document.querySelector(`#${styleId}`) || document.createElement('style')
  style.id = styleId
  style.textContent = `
    :root { ${lightLines.join(';')}; ${tabVars.join(';')}; ${sizeVars.join(';')} }
    html.dark { ${darkLines.join(';')}; ${tabVars.join(';')}; ${sizeVars.join(';')} }
  `
  document.head.appendChild(style)
}

const colorPaletteNumbers = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

/* ------------------------------------------------------------------ */
/* 主题色写入 (console 专属, 不触前台 token)                             */
/* ------------------------------------------------------------------ */

export function setPrimary(color: string) {
  const hex = getHexOrNull(color)
  if (!hex) return
  primaryColor.value = hex
  // 后台 naive 通道 (themeOverrides + --soy-* 调色板) 由 watch(primaryColor) 联动, 官方调色板语义
  persistPrefs()
}

/* ------------------------------------------------------------------ */
/* 阴影 token 响应式取值 (既有导出形状)                                  */
/* ------------------------------------------------------------------ */

export const shadowOf = (key: 'header' | 'sider' | 'tab') =>
  computed(() => (isDark.value ? THEME.boxShadow.dark[key] : THEME.boxShadow[key]))

/** discrete API 用的 configProviderProps (随 isDark/主题色 响应式) */
export const discreteConfigProps = computed(() => ({
  theme: (isDark.value ? darkTheme : null) as NaiveTheme,
  themeOverrides: themeOverrides.value,
}))

/** 系统主题变化监听 (跟随系统模式) */
export function watchSystemTheme() {
  if (typeof window === 'undefined' || media) return
  media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', () => {
    if (themeMode.value === 'system') resolveDark()
  })
}

export function initTheme() {
  resolveDark()
  applyToDocument()
  applyAuxColorModes()
  watchSystemTheme()
  updateThemeVars()
}

/* --- 响应式联动: 主题色 / 亮暗 / 页签高度变化 → CSS 变量通道重注入 --- */
watch(primaryColor, () => updateThemeVars())
watch(isDark, () => {
  applyToDocument()
  updateThemeVars()
})
watch(tabHeight, () => updateThemeVars())
