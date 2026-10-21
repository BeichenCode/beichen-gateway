/**
 * Task 132: 站内邮件统一精美版式 (验证码 / 工单通知)
 *
 * 设计语言 (与站点品牌一致):
 *  - 靛紫品牌渐变 #4338ca → #7c3aed (顶栏 / 徽标 / CTA 按钮同源)
 *  - 浅灰底 #eef0f7 + 白色圆角主卡 (16px) + 卡顶渐变条
 *  - 文字徽标 (站点首字) 取代外链 <img> — 邮箱默认拦图也不会裂图
 *  - 验证码: 大号等宽字 + 靛紫淡底圆角容器 + 有效期胶囊
 *
 * 客户端兼容纪律:
 *  - table 布局 + 全 inline style (零外部 CSS)
 *  - 渐变均带纯色兜底 (background-color), Outlook 桌面端降级不破相
 *  - 不引用任何远程图片; color-scheme 锁 light 防暗色客户端反色
 *  - 注意: rows/body 中的用户可控内容由调用方 esc() 后传入
 */

const FONT = "-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif"
const MONO = "'SF Mono','JetBrains Mono',Menlo,Consolas,'Courier New',monospace"
/** 品牌渐变 (纯色兜底 #5158d6 = 两端混合近似) */
const GRAD = 'background-color:#5158d6;background-image:linear-gradient(135deg,#4338ca 0%,#7c3aed 100%)'

/** 徽标字符: 站点名首字 (空名兜底「北」) */
function badgeChar(siteName: string): string {
  const ch = siteName.trim().charAt(0)
  return ch || '北'
}

function hostOf(siteUrl: string): string {
  try {
    return new URL(siteUrl).host
  } catch {
    return siteUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}

/** 规范站点地址: 无协议自动补 https, 去尾部斜杠; 非法回退默认 */
export function normalizeSiteUrl(raw: string | undefined): string {
  let u = (raw || '').trim().replace(/\/+$/, '')
  if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`
  if (/^https?:\/\/.+/i.test(u)) return u
  return 'https://bz.013.ltd'
}

interface ShellOpts {
  siteName: string
  siteUrl: string
  /** 隐藏预览文案 (收件箱列表首行摘要) */
  preheader: string
  docTitle: string
  title: string
  desc: string
  /** 主卡内容行 (code 块 / 信息表 / 正文块) */
  inner: string
  /** 卡底安全提示行 (验证码邮件专用; 工单传空省略) */
  tips?: string[]
  buttonLabel: string
  footerNote: string
}

function shell(o: ShellOpts): string {
  const host = hostOf(o.siteUrl)
  const tipsHtml = o.tips?.length
    ? `<tr><td style="padding:22px 38px 30px;">
  <div style="border-top:1px solid #eef0f6;padding-top:16px;font-family:${FONT};font-size:12px;line-height:2;color:#9aa3b8;">
    ${o.tips.map((t) => `<div>· ${t}</div>`).join('')}
  </div>
</td></tr>`
    : '<tr><td style="padding:28px 0 30px;font-size:0;line-height:0;">&nbsp;</td></tr>'
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${o.docTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef0f7;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${o.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef0f7;">
<tr><td align="center" style="padding:40px 12px 36px;">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;">
  <tr>
    <td align="center" style="padding:0 0 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="${GRAD};width:42px;height:42px;border-radius:12px;text-align:center;vertical-align:middle;font-family:${FONT};font-size:20px;font-weight:700;color:#ffffff;">${badgeChar(o.siteName)}</td>
          <td style="padding-left:11px;font-family:${FONT};font-size:19px;font-weight:700;color:#1d2129;letter-spacing:0.5px;">${o.siteName}</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background-color:#ffffff;border:1px solid #e7e9f3;border-radius:16px;">
      <div style="${GRAD};height:6px;border-radius:16px 16px 0 0;font-size:0;line-height:6px;">&nbsp;</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:34px 38px 0;font-family:${FONT};text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#1d2129;letter-spacing:0.5px;">${o.title}</h1>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.9;color:#5a6480;">${o.desc}</p>
        </td></tr>
        ${o.inner}
        ${tipsHtml}
      </table>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:22px 12px 0;">
      <a href="${o.siteUrl}/" target="_blank" rel="nofollow noopener" style="display:inline-block;${GRAD};padding:12px 38px;border-radius:999px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:1px;">${o.buttonLabel}</a>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:14px 12px 0;font-family:${FONT};font-size:11.5px;line-height:1.9;color:#a3aabf;">
      官网：<a href="${o.siteUrl}/" target="_blank" rel="nofollow noopener" style="color:#6d7690;text-decoration:none;">${host}</a>
      <br/>${o.footerNote}
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

/* ---------------- 注册验证码邮件 ---------------- */

export function verificationMailHtml(p: {
  siteName: string
  siteUrl: string
  code: string
  minutes: number
}): string {
  return shell({
    siteName: p.siteName,
    siteUrl: p.siteUrl,
    preheader: `您的验证码 ${p.code}，${p.minutes} 分钟内有效`,
    docTitle: `${p.siteName} 注册验证码`,
    title: '邮箱验证',
    desc: `您好！感谢注册 ${p.siteName}。请将以下验证码填入注册页面，即可完成邮箱验证：`,
    inner: `<tr><td align="center" style="padding:26px 38px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td style="background-color:#f5f6ff;border:1px solid #e0e3fc;border-radius:14px;padding:20px 34px;font-family:${MONO};font-size:34px;font-weight:700;letter-spacing:10px;text-indent:10px;color:#4338ca;line-height:1;">${p.code}</td>
    </tr>
  </table>
</td></tr>
<tr><td align="center" style="padding:16px 38px 0;">
  <span style="display:inline-block;background-color:#f7f8fc;border:1px solid #eceef6;border-radius:999px;padding:6px 16px;font-family:${FONT};font-size:12px;color:#6d7690;">验证码 ${p.minutes} 分钟内有效，超时请重新获取</span>
</td></tr>`,
    tips: [
      '如非本人操作，请忽略此邮件，您的账号不会受到任何影响',
      `请勿将验证码透露给任何人，${p.siteName} 工作人员不会向您索要验证码`,
    ],
    buttonLabel: `进入${p.siteName}`,
    footerNote: '本邮件由系统自动发送，请勿直接回复',
  })
}

export function verificationMailText(p: {
  siteName: string
  siteUrl: string
  code: string
  minutes: number
}): string {
  return [
    `您的 ${p.siteName} 注册验证码：${p.code}`,
    '',
    `验证码 ${p.minutes} 分钟内有效，超时请重新获取。`,
    '如非本人操作，请忽略此邮件，您的账号不会受到任何影响。',
    `官网：${p.siteUrl}`,
  ].join('\n')
}

/* ---------------- 工单通知邮件 ---------------- */

export type TicketTone = 'ok' | 'info' | 'warn' | 'off'

const TONE_STYLE: Record<TicketTone, { color: string; bg: string; border: string }> = {
  ok: { color: '#00b42a', bg: '#e8f7ec', border: '#c3ead0' },
  info: { color: '#4338ca', bg: '#f0f1ff', border: '#dfe2fc' },
  warn: { color: '#d46b08', bg: '#fdf1e6', border: '#f5ddc2' },
  off: { color: '#6d7690', bg: '#f2f3f7', border: '#e5e7ef' },
}

export function ticketMailHtml(p: {
  siteName: string
  siteUrl: string
  head: string
  rows: Array<{ label: string; value: string }>
  /** 状态徽章 (用户侧回复通知带「当前状态」) */
  statusText?: string
  statusTone?: TicketTone
  bodyLabel: string
  body: string
  buttonLabel: string
  footerNote: string
}): string {
  const statusPill = p.statusText
    ? (() => {
        const t = TONE_STYLE[p.statusTone ?? 'info']
        return `<span style="display:inline-block;margin-top:10px;background-color:${t.bg};border:1px solid ${t.border};border-radius:999px;padding:4px 14px;font-family:${FONT};font-size:12px;font-weight:600;color:${t.color};">${p.statusText}</span>`
      })()
    : ''
  const rowHtml = p.rows
    .map(
      (r, i) =>
        `<tr><td style="padding:10px 16px;${i < p.rows.length - 1 ? 'border-bottom:1px solid #f0f2f8;' : ''}font-family:${FONT};font-size:12px;color:#8a92a6;width:88px;white-space:nowrap;">${r.label}</td><td style="padding:10px 16px;${i < p.rows.length - 1 ? 'border-bottom:1px solid #f0f2f8;' : ''}font-family:${FONT};font-size:13px;color:#1d2129;font-weight:500;">${r.value}</td></tr>`,
    )
    .join('')
  return shell({
    siteName: p.siteName,
    siteUrl: p.siteUrl,
    preheader: `${p.siteName} · ${p.head}`,
    docTitle: `${p.siteName} 工单通知`,
    title: '工单通知',
    desc: p.head,
    inner: `${statusPill ? `<tr><td align="center" style="padding:0 38px;font-family:${FONT};">${statusPill}</td></tr>` : ''}
<tr><td style="padding:22px 38px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eceef6;border-radius:12px;background-color:#fafbfd;">
    ${rowHtml}
  </table>
</td></tr>
<tr><td style="padding:14px 38px 0;">
  <div style="background-color:#f5f6ff;border-radius:12px;padding:16px 18px;">
    <div style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1px;color:#8a92a6;margin-bottom:8px;">${p.bodyLabel}</div>
    <div style="font-family:${FONT};font-size:13.5px;line-height:1.9;color:#2c3550;white-space:pre-wrap;">${p.body}</div>
  </div>
</td></tr>`,
    buttonLabel: p.buttonLabel,
    footerNote: p.footerNote,
  })
}

export function ticketMailText(p: {
  siteName: string
  siteUrl: string
  head: string
  rows: Array<{ label: string; value: string }>
  statusText?: string
  bodyLabel: string
  body: string
  footerNote: string
}): string {
  const lines = [
    `${p.siteName} · ${p.head}${p.statusText ? `（${p.statusText}）` : ''}`,
    '',
    ...p.rows.map((r) => `${r.label}：${r.value}`),
    '',
    `${p.bodyLabel}：`,
    p.body,
    '',
    p.footerNote,
    `官网：${p.siteUrl}`,
  ]
  return lines.join('\n')
}
