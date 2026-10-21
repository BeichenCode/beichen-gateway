/**
 * Task 154: 国家/地区 ISO alpha-2 → 中文名 (调用日志 & 看板「实时在线」明细用)。
 * 数据源 CF-IPCountry (ISO 3166-1 alpha-2); 未收录的显示原始两位码, 空值返回 ''。
 * 覆盖常见来源地区即可, 长尾走码值兜底 (诚实展示, 不编造)。
 */
const COUNTRY_NAMES: Record<string, string> = {
  CN: '中国', HK: '中国香港', MO: '中国澳门', TW: '中国台湾',
  SG: '新加坡', JP: '日本', KR: '韩国', US: '美国', CA: '加拿大',
  GB: '英国', DE: '德国', FR: '法国', NL: '荷兰', RU: '俄罗斯',
  AU: '澳大利亚', NZ: '新西兰', IN: '印度', ID: '印度尼西亚',
  MY: '马来西亚', TH: '泰国', VN: '越南', PH: '菲律宾',
  BR: '巴西', AR: '阿根廷', MX: '墨西哥', CL: '智利',
  TR: '土耳其', AE: '阿联酋', SA: '沙特阿拉伯', QA: '卡塔尔',
  IL: '以色列', SE: '瑞典', NO: '挪威', DK: '丹麦', FI: '芬兰',
  PL: '波兰', CH: '瑞士', AT: '奥地利', IE: '爱尔兰', BE: '比利时',
  ES: '西班牙', IT: '意大利', PT: '葡萄牙', CZ: '捷克', RO: '罗马尼亚',
  UA: '乌克兰', KZ: '哈萨克斯坦', PK: '巴基斯坦', BD: '孟加拉国',
  ZA: '南非', NG: '尼日利亚', EG: '埃及', KE: '肯尼亚',
  BN: '文莱', KH: '柬埔寨', LA: '老挝', MM: '缅甸', MN: '蒙古',
  NP: '尼泊尔', LK: '斯里兰卡', MV: '马尔代夫',
  AS: '美属萨摩亚', GU: '关岛', PR: '波多黎各', IS: '冰岛', LU: '卢森堡',
  GR: '希腊', HU: '匈牙利', BG: '保加利亚', SK: '斯洛伐克', SI: '斯洛文尼亚',
  EE: '爱沙尼亚', LV: '拉脱维亚', LT: '立陶宛', HR: '克罗地亚', RS: '塞尔维亚',
  PE: '秘鲁', CO: '哥伦比亚', VE: '委内瑞拉', UY: '乌拉圭', EC: '厄瓜多尔',
  BO: '玻利维亚', PY: '巴拉圭', CR: '哥斯达黎加', PA: '巴拿马',
}

/** 'SG' → '新加坡'; 未收录 → 原码; 空 → '' */
export function countryLabel(code: string | null | undefined): string {
  if (!code) return ''
  const c = String(code).toUpperCase()
  return COUNTRY_NAMES[c] || c
}
