/**
 * 数据库种子: 默认管理员账号 / 默认系统设置 / 常见模型定价
 * 运行: bun scripts/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'crypto'

const prisma = new PrismaClient()

// 邀请码: 8 位大写字母数字, 剔除易混淆字符 (与 src/lib/utils.ts genAffCode 一致)
const AFF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function genAffCode(): string {
  const bytes = randomBytes(8)
  let code = ''
  for (let i = 0; i < 8; i++) code += AFF_ALPHABET[bytes[i] % AFF_ALPHABET.length]
  return code
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function genKey(prefix = ''): string {
  return prefix + randomBytes(24).toString('hex')
}

async function main() {
  console.log('Seeding...')

  // ---- 默认管理员账号 ----
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashPassword('admin123'),
      displayName: 'Admin',
      role: 100,
      status: 1,
      quota: 100000000000n,
      group: 'default',
      affCode: genAffCode(),
    },
  })
  console.log('admin user ready:', admin.username, '(默认密码 admin123, 首次登录后请立即修改)'

  // ---- 默认系统设置 ----
  const defaultOptions: Record<string, string> = {
    SystemName: '北辰中转站',
    Logo: '',
    ServerAddress: '',
    FooterHTML: '',
    Announcement: '欢迎使用北辰中转站！统一 OpenAI / Claude 兼容接口，多渠道负载均衡。默认管理员：admin / admin123（首次登录后请立即修改密码）。',
    About: '## 关于\n\n北辰中转站是自托管的 LLM 网关与 API 资产管理系统。\n\n- 统一 OpenAI 兼容接口\n- 多渠道负载均衡与故障转移\n- 精细计费与额度管理',
    RegisterEnabled: 'true',
    EmailVerificationEnabled: 'false',
    GitHubOAuthEnabled: 'false',
    GitHubClientId: '',
    GitHubClientSecret: '',
    TurnstileCheckEnabled: 'false',
    TurnstileSiteKey: '',
    TurnstileSecretKey: '',
    QuotaPerUnit: '500000',
    DisplayInCurrencyEnabled: 'true',
    RetryTimes: '3',
    AutomaticDisableChannelEnabled: 'true',
    AutomaticEnableChannelEnabled: 'true',
    ChannelDisableThreshold: '10',
    QuotaRemindThreshold: '1000000',
    PreConsumedQuota: '0',
    AffEnabled: 'true',
    AffQuota: '100000',
    AffInviteEnabled: 'true',
    LogConsumeEnabled: 'true',
    ModelRequestRateLimitEnabled: 'false',
    ModelRequestRateLimitCount: '1000',
    ModelRequestRateLimitDurationMinutes: '1',
    TopupGroupRatio: '{"default":1,"vip":0.8,"svip":0.5}',
    DefaultModels: '',
  }

  for (const [key, value] of Object.entries(defaultOptions)) {
    await prisma.option.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }
  console.log('options seeded')

  // ---- 常见模型定价 (ratio: $0.002/1K tokens × ratio) ----
  const models: Array<[string, number, number, number, string]> = [
    ['gpt-3.5-turbo', 0.25, 1.3333, -1, 'OpenAI GPT-3.5'],
    ['gpt-4', 15, 2, -1, 'OpenAI GPT-4'],
    ['gpt-4-turbo', 5, 3, -1, 'OpenAI GPT-4 Turbo'],
    ['gpt-4o', 1.25, 4, -1, 'OpenAI GPT-4o'],
    ['gpt-4o-mini', 0.075, 4, -1, 'OpenAI GPT-4o mini'],
    ['gpt-4.1', 1, 4, -1, 'OpenAI GPT-4.1'],
    ['gpt-4.1-mini', 0.2, 4, -1, 'OpenAI GPT-4.1 mini'],
    ['gpt-4.1-nano', 0.05, 4, -1, 'OpenAI GPT-4.1 nano'],
    ['o1', 7.5, 4, -1, 'OpenAI o1'],
    ['o1-mini', 0.55, 4, -1, 'OpenAI o1-mini'],
    ['o3', 1, 4, -1, 'OpenAI o3'],
    ['o3-mini', 0.55, 4, -1, 'OpenAI o3-mini'],
    ['o4-mini', 0.55, 4, -1, 'OpenAI o4-mini'],
    ['text-embedding-3-small', 0.01, 1, -1, 'OpenAI Embedding'],
    ['text-embedding-3-large', 0.065, 1, -1, 'OpenAI Embedding'],
    ['text-embedding-ada-002', 0.05, 1, -1, 'OpenAI Embedding'],
    ['dall-e-3', 20, 1, 0.04, 'OpenAI DALL-E 3 按次'],
    ['claude-3-opus-20240229', 7.5, 5, -1, 'Claude 3 Opus'],
    ['claude-3-sonnet-20240229', 1.5, 5, -1, 'Claude 3 Sonnet'],
    ['claude-3-5-sonnet-20241022', 1.5, 5, -1, 'Claude 3.5 Sonnet'],
    ['claude-3-5-haiku-20241022', 0.4, 5, -1, 'Claude 3.5 Haiku'],
    ['claude-3-7-sonnet-20250219', 1.5, 5, -1, 'Claude 3.7 Sonnet'],
    ['claude-sonnet-4-20250514', 1.5, 5, -1, 'Claude Sonnet 4'],
    ['claude-opus-4-20250514', 7.5, 5, -1, 'Claude Opus 4'],
    ['gemini-1.5-pro', 0.625, 4, -1, 'Gemini 1.5 Pro'],
    ['gemini-1.5-flash', 0.0375, 4, -1, 'Gemini 1.5 Flash'],
    ['gemini-2.0-flash', 0.05, 4, -1, 'Gemini 2.0 Flash'],
    ['gemini-2.5-pro', 0.625, 8, -1, 'Gemini 2.5 Pro'],
    ['gemini-2.5-flash', 0.15, 4, -1, 'Gemini 2.5 Flash'],
    ['deepseek-chat', 0.135, 2, -1, 'DeepSeek V3'],
    ['deepseek-reasoner', 0.275, 4, -1, 'DeepSeek R1'],
    ['qwen-turbo', 0.15, 2, -1, '通义千问 Turbo'],
    ['qwen-plus', 0.2, 2, -1, '通义千问 Plus'],
    ['qwen-max', 1.2, 4, -1, '通义千问 Max'],
    ['glm-4', 5, 5, -1, '智谱 GLM-4'],
    ['glm-4-flash', 0.06, 1, -1, '智谱 GLM-4 Flash'],
    ['moonshot-v1-8k', 1.2, 1.2, -1, '月之暗面 8K'],
    ['moonshot-v1-32k', 2.4, 2.4, -1, '月之暗面 32K'],
    ['doubao-pro-32k', 0.4, 1.2, -1, '豆包 Pro 32K'],
    ['hunyuan-lite', 0.075, 0.5, -1, '腾讯混元 Lite'],
    ['spark-v3.5', 0.65, 1.3, -1, '讯飞星火 V3.5'],
  ]

  for (const [modelName, ratio, completionRatio, modelPrice, description] of models) {
    await prisma.modelRatio.upsert({
      where: { modelName },
      update: {},
      create: {
        modelName,
        ratio,
        completionRatio,
        modelPrice,
        description,
        quotaType: modelPrice >= 0 ? 1 : 0,
      },
    })
  }
  console.log(`model ratios seeded: ${models.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
