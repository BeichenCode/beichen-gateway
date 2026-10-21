/**
 * 厂商识别 — 模型名前缀 → 厂商名/品牌色 (仅 UI 标签不涉数据)
 * Task 118: 从 mall.ts 抽出共享 — 模型商城厂商点标与调用日志模型头像同源同色
 */
export const VENDOR_RULES: Array<{ test: RegExp; name: string }> = [
  { test: /^(gpt|chatgpt|o[134](-|$)|sora|dall-e|whisper|text-|davinci|ada-|babbage)/, name: 'OpenAI' },
  { test: /^claude/, name: 'Anthropic' },
  { test: /^(gemini|gemma|palm)/, name: 'Google' },
  { test: /^deepseek/, name: 'DeepSeek' },
  { test: /^(qwen|qwq|qvq)/, name: '通义千问' },
  { test: /^(glm|chatglm|cogview|cogvideo)/, name: '智谱 GLM' },
  { test: /^(moonshot|kimi)/, name: '月之暗面' },
  { test: /^doubao/, name: '字节豆包' },
  { test: /^(ernie|eb-)/, name: '文心一言' },
  { test: /^(hunyuan)/, name: '腾讯混元' },
  { test: /^(spark)/, name: '讯飞星火' },
  { test: /^(minimax|abab)/, name: 'MiniMax' },
  { test: /^grok/, name: 'xAI' },
  { test: /^(mistral|mixtral|codestral)/, name: 'Mistral' },
  { test: /^llama/, name: 'Meta' },
  { test: /^(midjourney|mj-|mj_|niji)/, name: 'Midjourney' },
  { test: /^(suno)/, name: 'Suno' },
  { test: /^yi-/, name: '零一万物' },
]

export function vendorOf(name: string): string {
  const lower = name.toLowerCase()
  for (const r of VENDOR_RULES) if (r.test.test(lower)) return r.name
  return '其他'
}

/** 厂商品牌色 (UI 点标/头像着色, 与站点语义色系协调) */
const VENDOR_COLORS: Record<string, string> = {
  OpenAI: '#10a37f',
  Anthropic: '#d97757',
  Google: '#4285f4',
  DeepSeek: '#4d6bfe',
  通义千问: '#7c3aed',
  '智谱 GLM': '#0ea5e9',
  月之暗面: '#16191e',
  字节豆包: '#f59e0b',
  文心一言: '#2932e1',
  腾讯混元: '#0052d9',
  讯飞星火: '#ff5d1f',
  MiniMax: '#ff4d4f',
  xAI: '#18181b',
  Mistral: '#ff7000',
  Meta: '#0866ff',
  Midjourney: '#4945ff',
  Suno: '#ff6b3d',
  零一万物: '#06b6d4',
  其他: '#94a3b8',
}

export function vendorColorOf(name: string): string {
  return VENDOR_COLORS[vendorOf(name)] ?? VENDOR_COLORS['其他']
}
