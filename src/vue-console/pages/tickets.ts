/**
 * 工单中心 — 常见问题自助方案 + 工单提交/列表 (所有用户)
 * Task 119: 两卡头彩色徽章 (灯泡橙/收件箱蓝)
 * 管理员同页切换「全部工单」视图: 回复 / 状态流转 (n-data-table + n-modal 全原生)
 * 真实数据纪律: 自动方案为静态知识库文案 (非编造统计数据), 工单数据全部来自 API
 */
import '../flags'
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NButton, NCard, NDataTable, NEmpty, NInput, NModal, NSelect, NTag, NPagination } from 'naive-ui'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { message, confirmDelete } from '../message'
import { useUserStore } from '../stores'
import { EmptyState } from '../components/empty-state'
import { LifeBuoy, Send, MessageSquareWarning, Clock, CircleCheck, CircleX, LoaderCircle, Lightbulb, ChevronRight, ExternalLink } from 'lucide-vue-next'

interface TicketItem {
  id: number
  userId: number
  username: string
  category: string
  categoryText?: string
  title: string
  detail: string
  contact: string
  status: number
  reply: string
  repliedAt?: string | null
  createdAt: string
}

/** 常见问题知识库 — 分类 key 与后端 CATEGORIES 同源; icon/color 为 Task 120 彩色徽章 (图标均已在 icons.ts 全局表) */
const CATS = [
  {
    key: 'topup',
    label: '充值/到账',
    desc: '充值未到账、到账延迟、重复扣款',
    icon: 'wallet',
    color: '#00b42a',
    solution:
      '① 在线充值到账通常为实时至 3 分钟内，支付完成后请刷新钱包页查看。\n② 超过 10 分钟未到账：先在钱包页核对「充值订单」状态，若订单显示已完成但额度未增加，请提交工单并附上订单号与支付流水号。\n③ 重复扣款：附两笔流水号，核实后多收部分原路退回。\n④ 兑换码到账即时，若提示已被使用请核对兑换码字符（无空格、区分大小写）。',
  },
  {
    key: 'token',
    label: '令牌/调用报错',
    desc: '401 无权限、404 模型不存在、调用失败',
    icon: 'key-round',
    color: '#6366f1',
    solution:
      '① 401：检查令牌是否被禁用/过期/额度用尽，请求头 Authorization: Bearer sk-xxx 是否完整。\n② 404/模型不存在：模型名需与模型广场展示完全一致（区分大小写）。\n③ 调用超时：模型广场仅展示在线可用模型，若个别时段失败可重试或提交工单附上完整报错。\n④ base_url 应为网关地址 + /v1，SDK 内不要多拼 /chat/completions。',
  },
  {
    key: 'billing',
    label: '计费/余额',
    desc: '扣费疑问、余额变动、账单核对',
    icon: 'coins',
    color: '#fa8c16',
    solution:
      '① 计费口径：按模型倍率实时计费，人民币展示；每次调用可在「调用日志」查看 token 用量与扣费金额。\n② 余额变动疑问：对照调用日志时间点即可逐笔核对。\n③ 兑换码/邀请奖励到账记录可在钱包页查看明细。',
  },
  {
    key: 'model',
    label: '模型可用性',
    desc: '模型在线状态、限流 429、输出质量',
    icon: 'cpu',
    color: '#7c3aed',
    solution:
      '① 429 限流：请降低调用频率，或稍后重试。\n② 模型广场只展示真实在线可用的模型；若某模型长时间不可用会自动从列表撤下。\n③ 输出异常（截断/空回复）：先确认 max_tokens 设置，仍异常请提交工单附模型名与时间点。',
  },
  {
    key: 'account',
    label: '账号/登录',
    desc: '登录异常、密码找回、注册问题',
    icon: 'user-round',
    color: '#0ea5e9',
    solution:
      '① 忘记密码：登录页「忘记密码」通过注册邮箱自助找回。\n② 收不到验证码：检查垃圾箱；发送有 60 秒冷却与每小时上限，稍候重试。\n③ 仅支持 QQ、163、Gmail、Outlook 等主流邮箱注册。',
  },
  {
    key: 'other',
    label: '其他问题',
    desc: '以上未覆盖的问题与建议',
    icon: 'message-square-warning',
    color: '#8c8c8c',
    solution: '请直接提交工单，描述清楚问题场景与期望结果；也欢迎通过公告中的 QQ 客服联系我们。',
  },
]

const STATUS_META: Record<number, { text: string; type: 'warning' | 'info' | 'success' | 'default'; icon: unknown }> = {
  1: { text: '待处理', type: 'warning', icon: Clock },
  2: { text: '处理中', type: 'info', icon: LoaderCircle },
  3: { text: '已解决', type: 'success', icon: CircleCheck },
  4: { text: '已关闭', type: 'default', icon: CircleX },
}

const QQ_SERVICE = '615129803'

function fmtTime(s?: string | null): string {
  if (!s) return '-'
  try {
    return new Date(s).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return s
  }
}

export default defineComponent({
  name: 'TicketsPage',
  components: { EmptyState },
  setup() {
    const userStore = useUserStore()
    const user = userStore.user
    const isAdmin = (user?.role ?? 0) >= 10

    const items = ref<TicketItem[]>([])
    const total = ref(0)
    const page = ref(1)
    const size = ref(20)
    const statusFilter = ref<number | null>(null)
    const loading = ref(true)
    const scopeAll = ref(false) // 管理员可切全部工单

    // 提交对话框
    const open = ref(false)
    const saving = ref(false)
    const form = ref({ category: 'topup', title: '', detail: '', contact: '' })
    const autoHint = ref('') // 记录本次提交源自哪个自动方案

    // 自助方案
    const activeCat = ref<string | null>(null)

    // Task 187-a: 面板测量高度 morph — 显式 px 高度 + CSS height transition (替代 grid-rows 0fr↔1fr + out-in 串行)
    const panelH = ref('0px') // wrap 显式高度, 恒为 px (从当前计算高度连续插值到目标, 天然可中断续走)
    const displayCat = ref<string | null>(null) // 实际渲染内容的分类 (收起时保留 lastCat 让内容随高度一起淡出, 而非瞬间卸载)
    const bodyRef = ref<HTMLElement | null>(null) // 内容根元素 (测量真实 scrollHeight)
    const wrapRef = ref<HTMLElement | null>(null) // 面板外层 (transitionend 判定 / resize 校准)

    watch(activeCat, async (cat) => {
      if (cat) {
        // 打开或 A→B 切换: displayCat 换 key → 内容元素整体替换 (新元素挂载即播放入场淡入, 无 out-in 离场空白拍),
        // 高度并行从当前值 morph 到新内容真实高度; 快速连点时每次都重测最新 DOM, 最后一次赋值胜出, 无需加锁
        displayCat.value = cat
        await nextTick() // 必须等新内容渲染完成后再测量
        const h = bodyRef.value?.scrollHeight
        if (h) panelH.value = h + 'px'
      } else {
        // 收起: 高度收到 0, 内容经 .faq-closing 随收缩一起淡出; 高度过渡结束 (onWrapEnd) 后再卸载内容
        panelH.value = '0px'
      }
    })

    /** 面板高度过渡结束: 已收拢到 0 时才卸载内容 (此时高度为 0 且内容已淡出, 卸载无视觉影响) */
    function onWrapEnd(e: TransitionEvent): void {
      if (e.target !== wrapRef.value || e.propertyName !== 'height') return
      if (!activeCat.value) displayCat.value = null
    }

    /** 窗口尺寸变化 → 文案折行变化 → 真实高度变化: 跳过过渡直接校准面板高度, 避免裁切内容 */
    function syncPanelHeight(): void {
      const el = bodyRef.value
      const wrap = wrapRef.value
      if (!activeCat.value || !el || !wrap) return
      wrap.style.transition = 'none'
      panelH.value = el.scrollHeight + 'px'
      void wrap.offsetHeight // 强制回流, 使禁用过渡的高度变更即时生效
      requestAnimationFrame(() => {
        wrap.style.transition = ''
      })
    }

    let resizeRaf = 0
    function onWinResize(): void {
      if (resizeRaf) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        syncPanelHeight()
      })
    }
    onMounted(() => window.addEventListener('resize', onWinResize))
    onBeforeUnmount(() => {
      window.removeEventListener('resize', onWinResize)
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
    })

    // 详情/回复对话框 (管理员回复, 用户查看)
    const viewTicket = ref<TicketItem | null>(null)
    const replyText = ref('')
    const replyStatus = ref<number | null>(null)
    const replying = ref(false)

    const statusOptions = [
      { label: '全部状态', value: -1 },
      { label: '待处理', value: 1 },
      { label: '处理中', value: 2 },
      { label: '已解决', value: 3 },
      { label: '已关闭', value: 4 },
    ]

    async function load() {
      loading.value = true
      try {
        const qs = new URLSearchParams({ page: String(page.value), size: String(size.value) })
        if (scopeAll.value) qs.set('scope', 'all')
        if (statusFilter.value != null && statusFilter.value > 0) qs.set('status', String(statusFilter.value))
        const resp = await apiGet<{ data: { items: TicketItem[]; total: number } }>(`/api/console/ticket?${qs.toString()}`)
        items.value = resp.data.items
        total.value = resp.data.total
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => void load())

    function pickCat(key: string) {
      /* Task 133: 手风琴语义 — 再点同卡收起, 点别的卡平滑切换 (替代原只能点「收起」按钮) */
      activeCat.value = activeCat.value === key ? null : key
    }

    /** 当前展示分类的主题色 (面板左侧色条/淡底/图标芯片同源; 取 displayCat 使收起淡出过程中颜色不跳变) */
    function activeColor(): string {
      return CATS.find((c) => c.key === (displayCat.value ?? activeCat.value))?.color ?? '#2080f0'
    }

    /** 从自动方案流转到提交: 未解决 → 预填分类 */
    function submitFromSolution(key: string) {
      form.value.category = key
      autoHint.value = key
      form.value.title = ''
      form.value.detail = ''
      open.value = true
    }

    function openSubmitBlank() {
      autoHint.value = ''
      form.value.category = activeCat.value ?? 'other'
      form.value.title = ''
      form.value.detail = ''
      open.value = true
    }

    async function submitTicket() {
      if (!form.value.title.trim()) {
        message.error('请填写问题标题')
        return
      }
      saving.value = true
      try {
        const resp = await apiPost<{ data: { id: number; notified: boolean; notifyError: string } }>('/api/console/ticket', {
          ...form.value,
          autoHint: autoHint.value,
        })
        const d = resp.data
        if (d.notified) message.success(`工单 #${d.id} 已提交，管理员已同步收到邮件通知`)
        else if (d.notifyError) message.warning(`工单 #${d.id} 已提交；邮件通知暂未送达 (${d.notifyError})，管理员将在后台看到`)
        else message.success(`工单 #${d.id} 已提交，请耐心等待处理`)
        open.value = false
        page.value = 1
        scopeAll.value = false
        await load()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        saving.value = false
      }
    }

    function openView(t: TicketItem) {
      viewTicket.value = t
      replyText.value = t.reply || ''
      replyStatus.value = t.status === 1 ? 2 : t.status
    }

    async function saveReply() {
      const t = viewTicket.value
      if (!t) return
      if (!replyText.value.trim() && (replyStatus.value ?? t.status) === t.status) {
        message.error('请填写回复内容或调整状态')
        return
      }
      replying.value = true
      try {
        await apiPatch('/api/console/ticket', {
          id: t.id,
          reply: replyText.value.trim(),
          status: replyStatus.value ?? t.status,
        })
        message.success(`工单 #${t.id} 已更新`)
        viewTicket.value = null
        await load()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        replying.value = false
      }
    }

    async function closeTicket(t: TicketItem) {
      const ok = await confirmDelete(`关闭工单「${t.title}」？`, '关闭后表示问题已了结；如后续仍有问题可重新提交。')
      if (!ok) return
      try {
        await apiPatch('/api/console/ticket', { id: t.id, action: 'close' })
        message.success('工单已关闭')
        await load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    const columns = [
      {
        title: '编号',
        key: 'id',
        width: 76,
        render: (t: TicketItem) => h('span', { class: 'font-mono text-xs text-muted-foreground' }, `#${t.id}`),
      },
      ...(isAdmin && scopeAll.value
        ? [
            {
              title: '用户',
              key: 'username',
              width: 120,
              render: (t: TicketItem) => h('span', { class: 'text-xs' }, t.username || `uid:${t.userId}`),
            },
          ]
        : []),
      {
        title: '分类',
        key: 'category',
        width: 110,
        render: (t: TicketItem) => h(NTag, { size: 'small', bordered: false }, { default: () => t.categoryText || t.category }),
      },
      {
        title: '标题',
        key: 'title',
        render: (t: TicketItem) =>
          h(
            'a',
            {
              class: 'cursor-pointer text-[13px] font-medium text-foreground hover:text-primary hover:underline',
              onClick: () => openView(t),
            },
            t.title,
          ),
      },
      {
        title: '状态',
        key: 'status',
        width: 96,
        render: (t: TicketItem) => {
          const m = STATUS_META[t.status] ?? STATUS_META[1]
          return h(
            NTag,
            { size: 'small', type: m.type, bordered: false },
            { default: () => m.text, icon: () => h(m.icon as never, { size: 12 }) },
          )
        },
      },
      {
        title: '提交时间',
        key: 'createdAt',
        width: 150,
        render: (t: TicketItem) => h('span', { class: 'text-xs text-muted-foreground' }, fmtTime(t.createdAt)),
      },
      {
        title: '操作',
        key: 'op',
        width: 130,
        render: (t: TicketItem) =>
          h('div', { class: 'flex gap-1.5' }, [
            h(
              NButton,
              { size: 'tiny', quaternary: true, type: 'primary', onClick: () => openView(t) },
              { default: () => (isAdmin && scopeAll.value ? '处理' : '查看'), icon: () => h(MessageSquareWarning, { size: 12 }) },
            ),
            ...(t.status !== 4
              ? [
                  h(
                    NButton,
                    { size: 'tiny', quaternary: true, type: 'error', onClick: () => closeTicket(t) },
                    { default: () => '关闭', icon: () => h(CircleX, { size: 12 }) },
                  ),
                ]
              : []),
          ]),
      },
    ]

    return {
      user, isAdmin, items, total, page, size, statusFilter, loading, scopeAll,
      open, saving, form, autoHint, activeCat, viewTicket, replyText, replyStatus, replying,
      CATS, STATUS_META, STATUS_OPTIONS: statusOptions, QQ_SERVICE, activeColor,
      panelH, displayCat, bodyRef, wrapRef, onWrapEnd,
      load, pickCat, submitFromSolution, openSubmitBlank, submitTicket, openView, saveReply, closeTicket, fmtTime,
      NButton, NCard, NDataTable, NEmpty, NInput, NModal, NSelect, NTag, NPagination,
      LifeBuoy, Send, MessageSquareWarning, Clock, CircleCheck, CircleX, LoaderCircle, Lightbulb, ChevronRight, ExternalLink,
    }
  },
  template: `
  <div>
    <!-- Task 120: 品牌渐变 Hero 替代素颜页头 — 提交工单按钮收进 Hero 右侧 (移动端不再孤零零垂在描述下方) -->
    <div
      class="relative mb-4 overflow-hidden"
      style="border-radius: 8px; background: linear-gradient(118deg, #4338ca 0%, #6366f1 52%, #7c3aed 100%)"
    >
      <div class="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full" style="background: rgba(255,255,255,0.10)"></div>
      <div class="pointer-events-none absolute right-16 -bottom-24 h-44 w-44 rounded-full" style="background: rgba(255,255,255,0.07)"></div>
      <div class="pointer-events-none absolute -left-12 -bottom-20 h-40 w-40 rounded-full" style="background: rgba(255,255,255,0.06)"></div>
      <div class="relative flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7 md:py-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2.5">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center border border-white/25 bg-white/10" style="border-radius: 8px; color: #fff">
              <life-buoy :size="18" />
            </span>
            <div>
              <h2 class="text-lg font-bold text-white md:text-xl">工单中心</h2>
              <p class="text-[12px] leading-relaxed text-white/70">常见问题自助解决 · 未解决可提交工单，管理员邮件实时同步</p>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 bg-white px-3.5 py-2 text-[13px] font-semibold text-[#4338ca] shadow-sm transition hover:bg-white/90 active:scale-[0.97]"
            style="border-radius: 6px"
            @click="openSubmitBlank"
          >
            <send :size="15" />
            提交工单
          </button>
          <a
            class="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-white/20 active:scale-[0.97]"
            style="border-radius: 6px"
            target="_blank"
            href="https://wpa.qq.com/msgrd?v=3&site=qq&menu=yes&uin=615129803"
          >
            <external-link :size="15" />
            QQ 客服
          </a>
        </div>
      </div>
    </div>

    <!-- 常见问题自助方案 -->
    <n-card size="small" class="mb-4">
      <template #header>
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(250,140,22,0.14); color: #fa8c16"><lightbulb :size="14" /></span>
          <span class="text-sm font-semibold">常见问题 · 自动解决方案</span>
        </div>
      </template>
      <template #header-extra><span class="hidden text-xs text-muted-foreground sm:inline">先试自助，未解决再提交工单</span></template>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="c in CATS"
          :key="c.key"
          class="faq-card cursor-pointer border p-3.5 hover:-translate-y-0.5 hover:border-primary/40"
          :style="activeCat === c.key ? 'border-color:var(--primary);background:rgba(32,128,240,0.05);box-shadow:0 2px 10px rgba(32,128,240,0.10)' : ''"
          @click="pickCat(c.key)"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center"
                style="border-radius: 6px"
                :style="{ background: c.color + '22', color: c.color }"
              >
                <component :is="c.icon" :size="14" />
              </span>
              <span class="truncate text-[13px] font-semibold text-foreground">{{ c.label }}</span>
            </div>
            <chevron-right :size="14" class="shrink-0 text-muted-foreground transition-transform duration-200 ease-out" :class="activeCat === c.key ? 'rotate-90' : ''" />
          </div>
          <p class="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{{ c.desc }}</p>
        </div>
      </div>

      <!-- 选中的自动方案 (Task 187-a: 测量高度 morph — 显式 px 高度 + height transition 可中断续走,
           内容 :key 整体替换式快速淡入; A→B 切换高度连续过渡、全程无空白拍, 收起时内容随高度一起淡出,
           再点同卡或「收起」均可收合) -->
      <div ref="wrapRef" class="faq-wrap" :style="{ height: panelH }" @transitionend="onWrapEnd">
        <div class="faq-clip" :class="{ 'faq-closing': !activeCat && displayCat }">
          <div v-if="displayCat" :key="displayCat" ref="bodyRef" class="faq-body pt-3.5">
            <div
              class="border p-4"
              :style="'background:' + activeColor() + '0a; border-color:' + activeColor() + '38; border-left:3px solid ' + activeColor()"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center"
                    :style="{ borderRadius: '6px', background: activeColor() + '22', color: activeColor() }"
                  >
                    <life-buoy :size="14" />
                  </span>
                  <span class="text-[13px] font-semibold">{{ CATS.find((c) => c.key === displayCat)?.label }} — 解决方案</span>
                </div>
                <n-button size="tiny" quaternary @click="activeCat = null">收起</n-button>
              </div>
              <pre class="mt-2.5 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-foreground">{{ CATS.find((c) => c.key === displayCat)?.solution }}</pre>
              <div class="mt-3.5 flex flex-wrap items-center gap-2">
                <n-button size="small" type="primary" secondary @click="submitFromSolution(displayCat)">
                  <template #icon><send :size="12" /></template>
                  未解决，提交工单（自动带入分类）
                </n-button>
                <n-button size="small" quaternary tag="a" target="_blank" href="https://wpa.qq.com/msgrd?v=3&site=qq&menu=yes&uin=615129803">
                  <template #icon><external-link :size="12" /></template>
                  联系 QQ 客服 {{ QQ_SERVICE }}
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-card>

    <!-- 工单列表 -->
    <n-card size="small">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-2 text-sm font-semibold">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(32,128,240,0.13); color: #2080f0"><inbox :size="14" /></span>
            {{ isAdmin && scopeAll ? '全部用户工单' : '我的工单' }}
          </span>
          <div class="flex items-center gap-2">
            <n-select
              v-model:value="statusFilter"
              :options="STATUS_OPTIONS"
              size="small"
              style="width: 130px"
              placeholder="全部状态"
              clearable
              @update:value="() => { page = 1; load() }"
            />
            <n-button v-if="isAdmin" size="small" :type="scopeAll ? 'primary' : 'default'" secondary @click="() => { scopeAll = !scopeAll; page = 1; load() }">
              {{ scopeAll ? '切回我的工单' : '查看全部工单' }}
            </n-button>
            <n-button size="small" quaternary @click="load">
              <template #icon><loader-circle :size="13" /></template>
              刷新
            </n-button>
          </div>
        </div>
      </template>
      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        size="small"
        :row-key="(r) => r.id"
      >
        <!-- Task 111: 表格自带「无数据」与下方「暂无工单」重复出现 → 隐藏表格默认空态,
             空态统一由下方 n-empty 呈现 (用户反馈双空态很难看) -->
        <template #empty>
          <span style="display: none"></span>
        </template>
      </n-data-table>
      <div v-if="total > size" class="mt-3 flex justify-end">
        <n-pagination v-model:page="page" :page-size="size" :item-count="total" size="small" @update:page="load" />
      </div>
      <n-empty
        v-if="!loading && items.length === 0"
        class="py-10"
        description="暂无工单"
        style="--n-icon-size: 104px"
      >
        <!-- Task 184-b: 空态图标换装 — 工单/收件箱语义线稿 (全站空状态统一 EmptyState 组件) -->
        <template #icon><EmptyState variant="ticket" :size="104" /></template>
        <template #extra>
          <div class="text-xs text-muted-foreground">遇到问题？先试试上方常见问题自助方案，未解决即可提交工单</div>
          <n-button size="small" type="primary" class="mt-2.5" @click="openSubmitBlank">提交工单</n-button>
        </template>
      </n-empty>
    </n-card>

    <!-- 提交工单 -->
    <n-modal
      v-model:show="open"
      preset="card"
      title="提交工单"
      style="width: min(560px, calc(100vw - 32px))"
      :bordered="false"
      size="small"
    >
      <div class="space-y-3.5">
        <div>
          <div class="mb-1.5 text-[12.5px] font-medium text-foreground">问题分类 <span class="text-red-500">*</span></div>
          <n-select v-model:value="form.category" :options="CATS.map((c) => ({ label: c.label, value: c.key }))" size="small" />
        </div>
        <div>
          <div class="mb-1.5 text-[12.5px] font-medium text-foreground">问题标题 <span class="text-red-500">*</span></div>
          <n-input v-model:value="form.title" size="small" maxlength="60" show-count placeholder="一句话概括问题，如：充值 10 元未到账" />
        </div>
        <div>
          <div class="mb-1.5 text-[12.5px] font-medium text-foreground">详细描述</div>
          <n-input
            v-model:value="form.detail"
            type="textarea"
            :rows="5"
            maxlength="2000"
            show-count
            placeholder="请补充：发生时间 / 订单号或令牌名 / 完整报错信息 / 已尝试的步骤（越详细处理越快）"
          />
        </div>
        <div>
          <div class="mb-1.5 text-[12.5px] font-medium text-foreground">回访方式（选填）</div>
          <n-input v-model:value="form.contact" size="small" maxlength="60" placeholder="QQ 号 / 邮箱，便于更快联系您" />
        </div>
        <div class="text-[11.5px] leading-relaxed text-muted-foreground">
          提交后工单将同步至管理员后台与邮箱（{{ QQ_SERVICE }}@qq.com），通常 24 小时内处理。
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button size="small" @click="open = false">取消</n-button>
          <n-button size="small" type="primary" :loading="saving" @click="submitTicket">
            <template #icon><send :size="13" /></template>
            提交工单
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 工单详情 / 管理员回复 -->
    <n-modal
      :show="!!viewTicket"
      preset="card"
      :title="'工单 #' + (viewTicket?.id ?? '')"
      style="width: min(600px, calc(100vw - 32px))"
      :bordered="false"
      size="small"
      @update:show="(v) => (!v ? (viewTicket = null) : null)"
    >
      <div v-if="viewTicket" class="space-y-3.5">
        <div class="flex flex-wrap items-center gap-2">
          <n-tag size="small" :type="STATUS_META[viewTicket.status]?.type ?? 'default'" :bordered="false">
            {{ STATUS_META[viewTicket.status]?.text ?? '待处理' }}
          </n-tag>
          <n-tag size="small" :bordered="false">{{ viewTicket.categoryText || viewTicket.category }}</n-tag>
          <span class="text-xs text-muted-foreground">{{ fmtTime(viewTicket.createdAt) }}</span>
          <span v-if="isAdmin && scopeAll" class="text-xs text-muted-foreground">用户: {{ viewTicket.username || viewTicket.userId }}</span>
        </div>
        <div>
          <div class="text-[13px] font-semibold text-foreground">{{ viewTicket.title }}</div>
          <pre v-if="viewTicket.detail" class="mt-1.5 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-foreground">{{ viewTicket.detail }}</pre>
        </div>
        <div v-if="viewTicket.contact" class="text-xs text-muted-foreground">回访方式：{{ viewTicket.contact }}</div>

        <div class="border p-3" style="background:rgba(32,128,240,0.03)">
          <div class="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <message-square-warning :size="13" />
            提交前已查看的自动方案: {{ CATS.find((c) => c.key === viewTicket.category)?.label || '-' }}
          </div>
          <pre class="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-muted-foreground">{{ CATS.find((c) => c.key === (viewTicket.autoHint || viewTicket.category))?.solution || '未使用自助方案' }}</pre>
        </div>

        <template v-if="isAdmin">
          <div>
            <div class="mb-1.5 text-[12.5px] font-medium text-foreground">管理员回复</div>
            <n-input v-model:value="replyText" type="textarea" :rows="4" maxlength="2000" show-count placeholder="回复内容将展示给用户，留有邮箱时同步邮件通知" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[12.5px] font-medium text-foreground">状态流转</span>
            <n-select v-model:value="replyStatus" :options="STATUS_OPTIONS.filter((o) => o.value > 0)" size="small" style="width: 130px" />
          </div>
        </template>
        <template v-else>
          <div v-if="viewTicket.reply" class="border p-3">
            <div class="mb-1 text-[12px] font-semibold text-muted-foreground">管理员回复 · {{ fmtTime(viewTicket.repliedAt) }}</div>
            <pre class="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-foreground">{{ viewTicket.reply }}</pre>
          </div>
          <div v-else class="text-xs text-muted-foreground">管理员尚未回复，通常 24 小时内处理；处理结果将通过工单与邮件同步。</div>
        </template>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button size="small" @click="viewTicket = null">关闭</n-button>
          <n-button v-if="isAdmin" size="small" type="primary" :loading="replying" @click="saveReply">保存回复</n-button>
        </div>
      </template>
    </n-modal>
  </div>
  `,
})
