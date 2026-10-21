/**
 * 渠道类型定义 (对标 New API 渠道类型)
 */
export const ChannelType = {
  OPENAI: 1,
  API2D: 2,
  AZURE: 3,
  BAICHUAN: 15,
  CLAUDE: 14,
  COHERE: 26,
  COZE: 37,
  CUSTOM: 8,
  DEEPSEEK: 25,
  GEMINI: 24,
  LINGYIWANWEI: 31,
  MINIMAX: 29,
  MOONSHOT: 15,
  OLLAMA: 36,
  OPENROUTER: 20,
  PAI: 35,
  QWEN: 15,
  TENCENT: 39,
  VOLCENGINE: 33,
  XUNFEI: 28,
  ZHIPU: 27,
} as const

interface ChannelTypeInfo {
  value: number
  label: string
  color: string
  defaultBaseUrl: string
  keyNote?: string
}

/** 渠道类型元数据 — key 为 OpenAI 兼容或需协议转换 */
export const CHANNEL_TYPES: ChannelTypeInfo[] = [
  { value: 1, label: 'OpenAI', color: 'success', defaultBaseUrl: 'https://api.openai.com' },
  { value: 8, label: '自定义渠道', color: 'primary', defaultBaseUrl: '', keyNote: '输入兼容 OpenAI 格式的 BaseURL + Key' },
  { value: 14, label: 'Claude', color: 'warning', defaultBaseUrl: 'https://api.anthropic.com', keyNote: 'sk-ant-...' },
  { value: 24, label: 'Gemini', color: 'info', defaultBaseUrl: 'https://generativelanguage.googleapis.com', keyNote: 'Google AI Studio Key' },
  { value: 25, label: 'DeepSeek', color: 'secondary', defaultBaseUrl: 'https://api.deepseek.com' },
  { value: 15, label: '阿里通义千问', color: 'error', defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode' },
  { value: 27, label: '智谱 GLM', color: 'info', defaultBaseUrl: 'https://open.bigmodel.cn/api/paas' },
  { value: 28, label: '讯飞星火', color: 'warning', defaultBaseUrl: 'https://spark-api-open.xf-yun.com' },
  { value: 29, label: 'MiniMax', color: 'error', defaultBaseUrl: 'https://api.minimax.chat' },
  { value: 20, label: 'OpenRouter', color: 'secondary', defaultBaseUrl: 'https://openrouter.ai/api' },
  { value: 33, label: '火山引擎(豆包)', color: 'error', defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api' },
  { value: 36, label: 'Ollama', color: 'primary', defaultBaseUrl: 'http://localhost:11434' },
  { value: 37, label: 'Coze', color: 'info', defaultBaseUrl: 'https://api.coze.cn' },
  { value: 38, label: 'Midjourney-Proxy', color: 'warning', defaultBaseUrl: '' },
  { value: 39, label: '腾讯混元', color: 'primary', defaultBaseUrl: 'https://api.hunyuan.cloud.tencent.com' },
  { value: 40, label: 'SiliconFlow', color: 'success', defaultBaseUrl: 'https://api.siliconflow.cn' },
  { value: 41, label: 'Cloudflare', color: 'warning', defaultBaseUrl: 'https://api.cloudflare.com' },
]

export function getChannelTypeMeta(value: number): ChannelTypeInfo {
  return (
    CHANNEL_TYPES.find((t) => t.value === value) ?? {
      value,
      label: `类型 ${value}`,
      color: 'default',
      defaultBaseUrl: '',
    }
  )
}

/** Claude 原生协议渠道 */
export function isClaudeChannel(type: number): boolean {
  return type === 14
}

/** OpenAI 兼容协议渠道(其余全部按此处理) */
export function isOpenAICompatible(type: number): boolean {
  return !isClaudeChannel(type)
}
