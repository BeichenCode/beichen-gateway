/**
 * 调色板算法 — 逐函数移植自官方仓库 packages/color (@sa/color)
 *   - packages/color/src/shared/colord.ts  → hex/rgb/hsv 换算 + addColorAlpha/mixColor/transformColorWithOpacity
 *   - packages/color/src/palette/antd.ts   → Ant Design 色板算法 (getAntDColorPalette)
 *   - packages/color/src/palette/index.ts  → getColorPalette / getPaletteColorByNumber
 * 零第三方依赖 (colord 最小等价实现), 供 theme.ts 生成 Naive themeOverrides 与 --soy-* CSS 变量。
 */

/* ---------------------------------- 基础换算 (colord 最小等价) ---------------------------------- */

type Rgb = { r: number; g: number; b: number }
type Hsv = { h: number; s: number; v: number }

function clamp(n: number, min = 0, max = 255) {
  return Math.min(Math.max(n, min), max)
}

function isHex(color: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color.trim())
}

/** rgb()/rgba() 字符串解析 */
function parseRgbStr(color: string): Rgb | null {
  const m = color.trim().match(/^rgba?\(([^)]+)\)$/i)
  if (!m) return null
  const parts = m[1].split(/[,\s/]+/).filter(Boolean)
  if (parts.length < 3) return null
  const nums = parts.slice(0, 3).map((p) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p)))
  if (nums.some((n) => Number.isNaN(n))) return null
  return { r: clamp(Math.round(nums[0])), g: clamp(Math.round(nums[1])), b: clamp(Math.round(nums[2])) }
}

function expandShortHex(hex: string): string {
  const h = hex.slice(1)
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
  if (h.length === 8) return `#${h.slice(0, 6)}`
  return hex
}

/** 任意输入 → 规范 6 位 hex (非法返回 null) */
export function getHexOrNull(color: unknown): string | null {
  if (typeof color !== 'string') return null
  const c = color.trim()
  if (isHex(c)) return expandShortHex(c.toLowerCase())
  const rgb = parseRgbStr(c)
  if (rgb) return rgbToHex(rgb)
  return null
}

function rgbToHex({ r, g, b }: Rgb): string {
  const to2 = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

export function hexToRgb(hex: string): Rgb {
  const h = expandShortHex(hex.toLowerCase())
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  }
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === rr) h = ((gg - bb) / delta) % 6
    else if (max === gg) h = (bb - rr) / delta + 2
    else h = (rr - gg) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : delta / max
  return { h, s: s * 100, v: max * 100 }
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const ss = s / 100
  const vv = v / 100
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return vv - vv * ss * Math.max(Math.min(k, 4 - k, 1), 0)
  }
  return { r: clamp(Math.round(f(5) * 255)), g: clamp(Math.round(f(3) * 255)), b: clamp(Math.round(f(1) * 255)) }
}

/* ------------------------------- @sa/color shared/colord.ts 等价 ------------------------------- */

/** addColorAlpha — 官方语义: colord(color).alpha(alpha).toHex() → 8 位 hex */
export function addColorAlpha(color: string, alpha: number): string {
  const hex = getHexOrNull(color)
  if (!hex) return ''
  const a = Math.min(Math.max(alpha, 0), 1)
  const aHex = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${aHex}`
}

/** mixColor — 官方语义: colord(first).mix(second, ratio) 线性插值 → hex */
export function mixColor(firstColor: string, secondColor: string, ratio: number): string {
  const a = getHexOrNull(firstColor)
  const b = getHexOrNull(secondColor)
  if (!a || !b) return a || b || ''
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  const r = Math.min(Math.max(ratio, 0), 1)
  return rgbToHex({
    r: ra.r + (rb.r - ra.r) * r,
    g: ra.g + (rb.g - ra.g) * r,
    b: ra.b + (rb.b - ra.b) * r,
  })
}

/**
 * transformColorWithOpacity — 官方语义: 带透明度颜色 → 同视觉的不透明色
 * bg + (origin - bg) * alpha (origin 已含 alpha, 再按 alpha 合成一次, 与官方实现逐行一致)
 */
export function transformColorWithOpacity(color: string, alpha: number, bgColor = '#ffffff'): string {
  const origin = getHexOrNull(addColorAlpha(color, alpha))
  const bg = getHexOrNull(bgColor)
  if (!origin || !bg) return ''
  const o = hexToRgb(origin)
  const b = hexToRgb(bg)
  const cal = (oc: number, bc: number) => Math.round(bc + (oc - bc) * alpha)
  return rgbToHex({ r: cal(o.r, b.r), g: cal(o.g, b.g), b: cal(o.b, b.b) })
}

/* ------------------------------ @sa/color palette/antd.ts 官方算法 ------------------------------ */

/** Hue step */
const hueStep = 2
/** Saturation step, light color part */
const saturationStep = 16
/** Saturation step, dark color part */
const saturationStep2 = 5
/** Brightness step, light color part */
const brightnessStep1 = 5
/** Brightness step, dark color part */
const brightnessStep2 = 15
/** Light color count, main color up */
const lightColorCount = 5
/** Dark color count, main color down */
const darkColorCount = 4

function getHue(hsv: Hsv, i: number, isLight: boolean): number {
  let hue: number
  const hsvH = Math.round(hsv.h)
  if (hsvH >= 60 && hsvH <= 240) {
    hue = isLight ? hsvH - hueStep * i : hsvH + hueStep * i
  } else {
    hue = isLight ? hsvH + hueStep * i : hsvH - hueStep * i
  }
  if (hue < 0) hue += 360
  if (hue >= 360) hue -= 360
  return hue
}

function getSaturation(hsv: Hsv, i: number, isLight: boolean): number {
  if (hsv.h === 0 && hsv.s === 0) return hsv.s
  let saturation: number
  if (isLight) {
    saturation = hsv.s - saturationStep * i
  } else if (i === darkColorCount) {
    saturation = hsv.s + saturationStep
  } else {
    saturation = hsv.s + saturationStep2 * i
  }
  if (saturation > 100) saturation = 100
  if (isLight && i === lightColorCount && saturation > 10) saturation = 10
  if (saturation < 6) saturation = 6
  return saturation
}

function getValue(hsv: Hsv, i: number, isLight: boolean): number {
  if (isLight) {
    return Math.min(hsv.v + brightnessStep1 * i, 100)
  }
  return hsv.v - brightnessStep2 * i
}

/** AntD 色板单档 (主色 index = 6) */
function getAntDPaletteColorByIndex(color: string, index: number): string {
  if (index === 6) return getHexOrNull(color) || color
  const isLight = index < 6
  const hsv = rgbToHsv(hexToRgb(getHexOrNull(color) || color))
  const i = isLight ? lightColorCount + 1 - index : index - lightColorCount - 1
  const next: Hsv = { h: getHue(hsv, i, isLight), s: getSaturation(hsv, i, isLight), v: getValue(hsv, i, isLight) }
  return rgbToHex(hsvToRgb(next))
}

/** AntD 色板 11 档 (index 1-11 → 50-950), darkTheme 混色分支保留官方语义 */
export function getAntDColorPalette(color: string, darkTheme = false, darkThemeMixColor = '#141414'): string[] {
  const indexes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const patterns = indexes.map((index) => getAntDPaletteColorByIndex(color, index))
  if (darkTheme) {
    const darkColorMap = [
      { index: 7, opacity: 0.15 },
      { index: 6, opacity: 0.25 },
      { index: 5, opacity: 0.3 },
      { index: 5, opacity: 0.45 },
      { index: 5, opacity: 0.65 },
      { index: 5, opacity: 0.85 },
      { index: 5, opacity: 0.9 },
      { index: 4, opacity: 0.93 },
      { index: 3, opacity: 0.95 },
      { index: 2, opacity: 0.97 },
      { index: 1, opacity: 0.98 },
    ]
    return darkColorMap.map(
      ({ index, opacity }) => getHexOrNull(mixColor(darkThemeMixColor, patterns[index], opacity)) || patterns[index],
    )
  }
  return patterns
}

const COLOR_PALETTE_NUMBERS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

/** getColorPalette — index.ts 官方逻辑 (亮色) */
export function getColorPalette(color: string): Map<number, string> {
  const colorMap = new Map<number, string>()
  const colors = getAntDColorPalette(color)
  COLOR_PALETTE_NUMBERS.forEach((number, index) => {
    colorMap.set(number, colors[index])
  })
  return colorMap
}

/** getPaletteColorByNumber — index.ts 官方逻辑 */
export function getPaletteColorByNumber(color: string, number: (typeof COLOR_PALETTE_NUMBERS)[number]): string {
  return getColorPalette(color).get(number) || color
}
