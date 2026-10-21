import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { getOptions } from '@/lib/options'
import { parseMailConfig, sendTicketNotifyToAdmin, sendTicketReplyToUser } from '@/lib/email'
import { intParam, intParamOpt } from '@/lib/params'

export const runtime = 'nodejs'

/**
 * 工单系统 (Task 103)
 *  GET   /api/console/ticket?scope=all&status=&page=&size=  — 我的工单 (scope=all 仅管理员)
 *  POST  /api/console/ticket                 — 提交工单 (同步邮件通知管理员 QQ 邮箱)
 *  PATCH /api/console/ticket                 — 管理员回复/改状态; 用户关闭自己的工单
 */

// 问题分类 — 与前端 tickets.ts 同源 (前端展示自动方案, 后端仅存 key+快照)
const CATEGORIES = new Set(['topup', 'token', 'billing', 'model', 'account', 'other'])
const CATEGORY_TEXT: Record<string, string> = {
  topup: '充值/到账',
  token: '令牌/调用报错',
  billing: '计费/余额',
  model: '模型可用性',
  account: '账号/登录',
  other: '其他问题',
}

const STATUS_OPEN = 1
const STATUS_CLOSED = 4
const STATUSES = new Set<number>([1, 2, 3, 4])

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)
    const isAdmin = session.role >= 10
    const scopeAll = isAdmin && searchParams.get('scope') === 'all'
    const status = intParamOpt(searchParams, 'status')
    const page = intParam(searchParams, 'page', 1, 1)
    const size = intParam(searchParams, 'size', 20, 1, 100)

    const where: Record<string, unknown> = {}
    if (!scopeAll) where.userId = session.uid
    if (status !== undefined && STATUSES.has(status)) where.status = status

    const [items, total] = await Promise.all([
      db.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.ticket.count({ where }),
    ])

    // 管理员视角附带统计
    const stats = isAdmin
      ? await db.ticket.groupBy({ by: ['status'], _count: { _all: true } })
      : undefined

    return Response.json({
      success: true,
      data: {
        items: items.map((t) => ({ ...t, categoryText: CATEGORY_TEXT[t.category] ?? t.category })),
        total,
        page,
        size,
        statusStats: stats ? Object.fromEntries(stats.map((s) => [s.status, s._count._all])) : undefined,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    return Response.json({ message: '获取工单列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const body = (await request.json().catch(() => ({}))) as {
      category?: string
      title?: string
      detail?: string
      contact?: string
      autoHint?: string
    }

    const category = (body.category || '').trim()
    const title = (body.title || '').trim()
    const detail = (body.detail || '').trim()
    const contact = (body.contact || '').trim().slice(0, 60)
    const autoHint = (body.autoHint || '').trim()

    if (!CATEGORIES.has(category)) throw new AuthError(400, '请选择问题分类')
    if (!title) throw new AuthError(400, '请填写问题标题')
    if (title.length > 60) throw new AuthError(400, '标题最长 60 字')
    if (detail.length > 2000) throw new AuthError(400, '问题描述最长 2000 字')

    // 同用户限流: 未关闭工单 >= 5 条时不允许再开新工单 (防刷)
    const openCount = await db.ticket.count({
      where: { userId: session.uid, status: { in: [1, 2] } },
    })
    if (openCount >= 5) throw new AuthError(429, '您有多个工单正在处理中，请等待处理完成后再提交')

    const ticket = await db.ticket.create({
      data: {
        userId: session.uid,
        username: session.username,
        category,
        title,
        detail,
        contact,
        autoHint: CATEGORIES.has(autoHint) ? autoHint : '',
        status: STATUS_OPEN,
      },
    })

    // 邮件同步到管理员邮箱 (QQ 邮箱): 工单先落库, 邮件失败不阻断, 结果诚实返回
    let notified = false
    let notifyError = ''
    try {
      const options = await getOptions()
      const mail = parseMailConfig(options)
      const adminEmail = (options.AdminEmail || '').trim() || (options.SMTPAccount || '').trim()
      if (mail && adminEmail) {
        await sendTicketNotifyToAdmin(mail, adminEmail, {
          ticketId: ticket.id,
          username: session.username,
          category: CATEGORY_TEXT[category] ?? category,
          title,
          detail,
          contact,
          createdAt: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }),
        })
        notified = true
      } else {
        notifyError = '邮件通道未配置'
      }
    } catch (e) {
      notifyError = e instanceof Error ? e.message.slice(0, 120) : '发送失败'
    }

    return Response.json({ success: true, data: { id: ticket.id, notified, notifyError } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    return Response.json({ message: '提交工单失败' }, { status: 500 })
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const session = await requireSession()
    const body = (await request.json().catch(() => ({}))) as { id?: number; reply?: string; status?: number; action?: string }
    const id = parseInt(String(body.id ?? ''), 10)
    if (!Number.isFinite(id)) throw new AuthError(400, '参数错误')

    const ticket = await db.ticket.findUnique({ where: { id } })
    if (!ticket) throw new AuthError(404, '工单不存在')
    const isAdmin = session.role >= 10

    // 用户动作: 关闭自己的工单
    if (body.action === 'close') {
      if (ticket.userId !== session.uid && !isAdmin) throw new AuthError(403, '无权操作该工单')
      await db.ticket.update({ where: { id }, data: { status: STATUS_CLOSED } })
      return Response.json({ success: true })
    }

    // 管理员动作: 回复 + 状态流转
    if (!isAdmin) throw new AuthError(403, '仅管理员可回复工单')
    const reply = (body.reply ?? ticket.reply ?? '').trim().slice(0, 2000)
    const status = typeof body.status === 'number' && STATUSES.has(body.status) ? body.status : ticket.status
    if (status === STATUS_OPEN && reply) {
      // 回复后不允许停留在待处理 — 至少推进为处理中
      throw new AuthError(400, '已回复的工单状态不能仍为待处理')
    }
    const updated = await db.ticket.update({
      where: { id },
      data: { reply, status, repliedAt: new Date() },
    })

    // 回复同步到用户邮箱 (已留邮箱才发); 失败不影响回复落库
    let notified = false
    try {
      if (reply && reply !== ticket.reply) {
        const user = await db.user.findUnique({ where: { id: ticket.userId }, select: { email: true } })
        const email = (user?.email || '').trim()
        if (email) {
          const options = await getOptions()
          const mail = parseMailConfig(options)
          if (mail) {
            await sendTicketReplyToUser(mail, email, {
              ticketId: id,
              username: ticket.username,
              title: ticket.title,
              reply,
              status,
            })
            notified = true
          }
        }
      }
    } catch {
      /* 邮件失败静默: 回复已落库 */
    }

    return Response.json({ success: true, data: { notified, ticket: updated } })
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status })
    return Response.json({ message: '操作失败' }, { status: 500 })
  }
}
