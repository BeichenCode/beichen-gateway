/**
 * 邮件服务 (Task 80: 注册邮箱验证码)
 * 双通道 (Task 88):
 *  - tencent-ses — 腾讯云邮件推送 SendEmail (模版信, 经腾讯中转投递,
 *    邮件头不暴露源站 IP, 发件人为平台自有域名地址)
 *  - smtp       — 通用 SMTP (nodemailer), 作为回退通道
 * 全部参数来自系统设置 (管理员后台配置), 未配置时诚实报错, 绝不假装发送成功。
 *
 * Task 132 邮件 UI 重做:
 *  - 精美版式统一由 src/lib/email-templates.ts 渲染; SES 侧同款 HTML 已建为云模版
 *    (验证码 226046 / 工单通知 226047 / 工单回复 226048, 占位符全纯文本),
 *    模版 ID 走系统设置可换; 该 SES 账号未开通 Simple 直传权限 (实测
 *    FailedOperation.WithOutPermission), 故 SES 必须走模版信。
 *  - SMTP 通道直接用代码内同款 HTML (无需云模版)。
 */
import { createHmac, timingSafeEqual } from 'crypto'
import nodemailer from 'nodemailer'
// Task 130: 静态 import — 动态 import() 字面量未被 Turbopack output tracing 追踪,
// standalone 包缺失该依赖导致 SES 通道运行时模块找不到 (生产已踩)
import { ses as tcSes } from 'tencentcloud-sdk-nodejs-ses'
import {
  verificationMailHtml,
  verificationMailText,
  ticketMailHtml,
  ticketMailText,
  normalizeSiteUrl,
} from './email-templates'

/** 验证码哈希: HMAC-SHA256 (服务端 SECRET), 库中不存明文 */
export function hashCodeEmailCode(code: string): string {
  const secret = process.env.SESSION_SECRET || 'beichen-gateway-secret'
  return createHmac('sha256', secret).update(`email-code:${code}`).digest('hex')
}

/** 验证码校验: timingSafeEqual 防时序侧信道 */
export function verifyEmailCode(code: string, stored: string): boolean {
  const calc = Buffer.from(hashCodeEmailCode(code))
  const expect = Buffer.from(stored)
  return calc.length === expect.length && timingSafeEqual(calc, expect)
}

export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  siteName: string
  /** 站点地址 (ServerAddress, 供邮件内按钮/官网链接, Task 132) */
  siteUrl: string
}

/** 从 options 记录解析 SMTP 配置, 未配置返回 null */
export function parseSmtp(o: Record<string, string | undefined>): SmtpConfig | null {
  const host = (o.SMTPServer || '').trim()
  const port = parseInt(o.SMTPPort || '', 10)
  const user = (o.SMTPAccount || '').trim()
  const pass = (o.SMTPToken || '').trim()
  const from = (o.SMTPFrom || '').trim()
  if (!host || !Number.isFinite(port) || !user || !pass || !from) return null
  return {
    host,
    port,
    secure: port === 465, // 465 隐式 TLS, 其余走 STARTTLS (如可用)
    user,
    pass,
    from,
    siteName: o.SystemName || '北辰中转站',
    siteUrl: siteUrlOf(o),
  }
}

/** 腾讯云 SES 通道配置 */
export interface SesMailConfig {
  secretId: string
  secretKey: string
  region: string
  fromEmail: string
  fromName: string
  /** 验证码模版 ID (必需, 需已审核; 精美版 v1 = 226046) */
  templateId: number
  /** 工单通知(管理员)模版 ID (0 = 未配置 — 诚实跳过; 精美版 v1 = 226047) */
  ticketTemplateId: number
  /** 工单回复(用户)模版 ID (0 = 未配置 — 诚实跳过; 精美版 v1 = 226048) */
  ticketReplyTemplateId: number
  siteName: string
  /** 站点地址 (ServerAddress, 供 SMTP 版式邮件内按钮/官网链接) */
  siteUrl: string
}

export type MailConfig =
  | { kind: 'ses'; ses: SesMailConfig }
  | { kind: 'smtp'; smtp: SmtpConfig }

/** 站点地址: SES 与 SMTP 共用 (邮件按钮/页脚链接) — 需在 parseSmtp 之前声明 */
function siteUrlOf(o: Record<string, string | undefined>): string {
  return normalizeSiteUrl(o.ServerAddress)
}

/** 从 options 记录解析发信通道: MailProvider=tencent-ses 时走 SES, 否则回退 SMTP; 均未配置返回 null
 *  SES 必需项: 凭证 + 发件地址 + 验证码模版 ID (该账号必须模版发送) */
export function parseMailConfig(o: Record<string, string | undefined>): MailConfig | null {
  const siteName = o.SystemName || '北辰中转站'
  const siteUrl = siteUrlOf(o)
  if ((o.MailProvider || '').trim() === 'tencent-ses') {
    const secretId = (o.TCSecretId || '').trim()
    const secretKey = (o.TCSecretKey || '').trim()
    const fromEmail = (o.SESFromEmail || '').trim()
    const templateId = parseInt(o.SESTemplateId || '', 10)
    if (secretId && secretKey && fromEmail && Number.isFinite(templateId) && templateId > 0) {
      return {
        kind: 'ses',
        ses: {
          secretId,
          secretKey,
          region: (o.SESRegion || '').trim() || 'ap-hongkong',
          fromEmail,
          fromName: (o.SESFromName || '').trim() || siteName,
          templateId,
          ticketTemplateId: parseInt(o.SESTicketTemplateId || '', 10) || 0,
          ticketReplyTemplateId: parseInt(o.SESTicketReplyTemplateId || '', 10) || 0,
          siteName,
          siteUrl,
        },
      }
    }
    // 明确选择 SES 但配置不完整 → 诚实视为未配置, 不静默回退到个人 SMTP
    return null
  }
  const smtp = parseSmtp(o)
  return smtp ? { kind: 'smtp', smtp } : null
}

/* ---------------- 腾讯云 SES 通道 ---------------- */

type SesClient = {
  SendEmail(req: Record<string, unknown>): Promise<unknown>
}
let sesClientCache: SesClient | null = null
let sesClientKey = ''

function getSesClient(cfg: SesMailConfig): SesClient {
  const key = `${cfg.secretId}:${cfg.region}`
  if (!sesClientCache || sesClientKey !== key) {
    sesClientCache = new tcSes.v20201002.Client({
      credential: { secretId: cfg.secretId, secretKey: cfg.secretKey },
      region: cfg.region,
      profile: { httpProfile: { endpoint: 'ses.tencentcloudapi.com', reqTimeout: 10 } },
    }) as unknown as SesClient
    sesClientKey = key
  }
  return sesClientCache
}

/** SES SendEmail 参数公共段 */
function sesFrom(cfg: SesMailConfig): string {
  // 别名与地址之间一个空格: <别名> <地址> (腾讯云 SES 规范)
  return `${cfg.fromName} <${cfg.fromEmail}>`
}

/**
 * SES 验证码邮件 — 精美版云模版 (占位符 {{code}}/{{minutes}}, 与代码内 HTML 同一设计)
 * 失败抛错 (错误消息带 SES 错误码, 调用方诚实上抛)
 */
async function sendVerificationSes(cfg: SesMailConfig, to: string, code: string): Promise<void> {
  const client = getSesClient(cfg)
  await client.SendEmail({
    FromEmailAddress: sesFrom(cfg),
    Destination: [to],
    Subject: `${cfg.siteName} 注册验证码`,
    Template: {
      TemplateID: cfg.templateId,
      TemplateData: JSON.stringify({ code, minutes: 5 }),
    },
    TriggerType: 1, // 触发类: 验证码等即时邮件
  })
}

/** 发送注册验证码邮件 (按配置选择通道); 失败抛错, 由调用方返回诚实错误信息 */
export async function sendVerificationMail(cfg: MailConfig, to: string, code: string): Promise<void> {
  if (cfg.kind === 'ses') return sendVerificationSes(cfg.ses, to, code)
  return sendVerificationSmtp(cfg.smtp, to, code)
}

/** SMTP 通道发送 (与 SES 同一款精美版式) */
async function sendVerificationSmtp(cfg: SmtpConfig, to: string, code: string): Promise<void> {
  const subject = `${cfg.siteName} 注册验证码`
  const html = verificationMailHtml({ siteName: cfg.siteName, siteUrl: cfg.siteUrl, code, minutes: 5 })
  const text = verificationMailText({ siteName: cfg.siteName, siteUrl: cfg.siteUrl, code, minutes: 5 })
  await transporterSend(cfg, to, subject, html, text)
}

/* ---------------- 通用 HTML 邮件 (Task 103: 工单通知等) ---------------- */

/** SMTP 通用发送 (统一超时与发件人格式); 失败抛错由调用方决定是否吞掉 */
async function transporterSend(
  cfg: SmtpConfig,
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  await transporter.sendMail({
    from: cfg.from.includes('<') ? cfg.from : `"${cfg.siteName}" <${cfg.from}>`,
    to,
    subject,
    html,
    text,
  })
}

const TICKET_STATUS_TEXT: Record<number, string> = { 1: '待处理', 2: '处理中', 3: '已解决', 4: '已关闭' }

/** 工单状态 → 邮件徽章色调 */
const TICKET_STATUS_TONE: Record<number, 'ok' | 'info' | 'warn' | 'off'> = {
  1: 'warn',
  2: 'info',
  3: 'ok',
  4: 'off',
}

interface TicketMailLike {
  siteName: string
  siteUrl: string
}

/** 管理员通知邮件体 (双通道共用的精美版式) */
function ticketAdminMail(
  p: TicketMailLike,
  info: { ticketId: number; username: string; category: string; title: string; detail: string; contact: string; createdAt: string },
): { subject: string; html: string; text: string } {
  const s = p.siteName
  const subject = `[${s}] 新工单 #${info.ticketId} ${info.title}`.slice(0, 90)
  const rows = [
    { label: '工单编号', value: `#${info.ticketId}` },
    { label: '提交用户', value: esc(info.username) },
    { label: '问题分类', value: esc(info.category) },
    { label: '标题', value: esc(info.title) },
    { label: '回访方式', value: info.contact ? esc(info.contact) : '未填写' },
    { label: '提交时间', value: esc(info.createdAt) },
  ]
  const body = esc(info.detail) || '(未填写补充描述)'
  const footer = `请登录 ${s} 控制台 → 工单中心 处理并回复用户。本邮件由系统自动发送。`
  return {
    subject,
    html: ticketMailHtml({
      siteName: s,
      siteUrl: p.siteUrl,
      head: '收到新的用户工单，请及时处理',
      rows,
      bodyLabel: '问题描述',
      body,
      buttonLabel: '前往工单中心处理',
      footerNote: footer,
    }),
    text: ticketMailText({ siteName: s, siteUrl: p.siteUrl, head: '收到新的用户工单，请及时处理', rows, bodyLabel: '问题描述', body, footerNote: footer }),
  }
}

/** 用户回复通知邮件体 (双通道共用) */
function ticketReplyMail(
  p: TicketMailLike,
  info: { ticketId: number; username: string; title: string; reply: string; status: number },
): { subject: string; html: string; text: string } {
  const s = p.siteName
  const statusText = TICKET_STATUS_TEXT[info.status] ?? '处理中'
  const subject = `[${s}] 工单 #${info.ticketId} 已回复`.slice(0, 90)
  const rows = [
    { label: '工单编号', value: `#${info.ticketId}` },
    { label: '标题', value: esc(info.title) },
    { label: '当前状态', value: statusText },
  ]
  const body = esc(info.reply)
  const footer = `可登录 ${s} 控制台 → 工单中心 查看完整进展。如仍有疑问可继续在工单内追问。本邮件由系统自动发送。`
  return {
    subject,
    html: ticketMailHtml({
      siteName: s,
      siteUrl: p.siteUrl,
      head: '您的工单有新回复',
      rows,
      statusText,
      statusTone: TICKET_STATUS_TONE[info.status] ?? 'info',
      bodyLabel: '管理员回复',
      body,
      buttonLabel: '查看工单回复',
      footerNote: footer,
    }),
    text: ticketMailText({ siteName: s, siteUrl: p.siteUrl, head: '您的工单有新回复', rows, statusText, bodyLabel: '管理员回复', body, footerNote: footer }),
  }
}

/** HTML 转义 (工单内容用户可控, 防邮件注入) */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 用户提交工单 → 通知管理员; 失败抛错 (调用方捕获后不影响工单落库, 仅记录)
 * Task 132: SES 走精美版云模版 226047 (占位符全纯文本); 未配置时诚实抛错由调用方降级记录
 */
export async function sendTicketNotifyToAdmin(
  cfg: MailConfig,
  adminEmail: string,
  info: { ticketId: number; username: string; category: string; title: string; detail: string; contact: string; createdAt: string },
): Promise<void> {
  if (cfg.kind === 'ses') {
    if (!cfg.ses.ticketTemplateId) throw new Error('SES 通道未配置工单通知模版 ID，工单邮件已跳过')
    const s = cfg.ses.siteName
    const client = getSesClient(cfg.ses)
    await client.SendEmail({
      FromEmailAddress: sesFrom(cfg.ses),
      Destination: [adminEmail],
      Subject: `[${s}] 新工单 #${info.ticketId} ${info.title}`.slice(0, 90),
      Template: {
        TemplateID: cfg.ses.ticketTemplateId,
        TemplateData: JSON.stringify({
          ticketId: info.ticketId,
          username: esc(info.username),
          category: esc(info.category),
          title: esc(info.title),
          contact: info.contact ? esc(info.contact) : '未填写',
          createdAt: esc(info.createdAt),
          body: esc(info.detail) || '(未填写补充描述)',
        }),
      },
      TriggerType: 1,
    })
    return
  }
  const mail = ticketAdminMail({ siteName: cfg.smtp.siteName, siteUrl: cfg.smtp.siteUrl }, info)
  await transporterSend(cfg.smtp, adminEmail, mail.subject, mail.html, mail.text)
}

/**
 * 管理员回复工单 → 通知用户 (用户已留邮箱时); 失败静默上抛由调用方记录
 * Task 132: SES 走精美版云模版 226048 (占位符全纯文本); 未配置时诚实抛错由调用方降级记录
 */
export async function sendTicketReplyToUser(
  cfg: MailConfig,
  userEmail: string,
  info: { ticketId: number; username: string; title: string; reply: string; status: number },
): Promise<void> {
  if (cfg.kind === 'ses') {
    if (!cfg.ses.ticketReplyTemplateId) throw new Error('SES 通道未配置工单回复模版 ID，工单邮件已跳过')
    const s = cfg.ses.siteName
    const client = getSesClient(cfg.ses)
    await client.SendEmail({
      FromEmailAddress: sesFrom(cfg.ses),
      Destination: [userEmail],
      Subject: `[${s}] 工单 #${info.ticketId} 已回复`.slice(0, 90),
      Template: {
        TemplateID: cfg.ses.ticketReplyTemplateId,
        TemplateData: JSON.stringify({
          ticketId: info.ticketId,
          username: esc(info.username),
          title: esc(info.title),
          status: TICKET_STATUS_TEXT[info.status] ?? '处理中',
          body: esc(info.reply),
        }),
      },
      TriggerType: 1,
    })
    return
  }
  const mail = ticketReplyMail({ siteName: cfg.smtp.siteName, siteUrl: cfg.smtp.siteUrl }, info)
  await transporterSend(cfg.smtp, userEmail, mail.subject, mail.html, mail.text)
}
