/**
 * 令牌管理 — sk-xxx 密钥的增删改查 (n-data-table + n-modal + n-date-picker 全原生)
 * Task 130: ① 页顶展示系统公告 ② 创建令牌: 名称强制必填 / 额度改 ¥ 面值直读 (1 元 = 1 额度,
 * cnyToQuota 入库) / 限定模型改下拉多选 (与模型商城同源 /api/console/mall)
 */
import '../flags'
import { defineComponent, h, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref , computed} from 'vue'
import { NButton, NCard, NDataTable, NInput, NInputNumber, NModal, NProgress, NRadioGroup, NRadioButton, NSelect, NSwitch, NTag } from 'naive-ui'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { copyText } from '@/lib/utils'
import { message, confirmDelete } from '../message'
import { navigate } from '../router'
import { renderQuota } from '../shared'
import { EmptyState } from '../components/empty-state'
import { getQuotaDisplayPrice, cnyToQuota } from '@/lib/quota-display'
import { useUserStore } from '../stores'
import { Plus, Trash2, RefreshCw, Search, Copy, KeyRound, CircleCheck, Network, Gauge, Megaphone } from 'lucide-vue-next'

interface TokenItem {
  id: number
  name: string
  key: string
  userId: number
  username: string
  status: number
  quota: number
  usedQuota: number
  unlimitedQuota: boolean
  expiredTime: string | null
  models: string
  groups: string
  ipLimit: string
  requestCount: number
  createdAt: string
  lastUsedAt: string | null
}

const emptyForm = () => ({
  id: 0,
  name: '',
  // Task 130: 额度改 ¥ 面值语义 (1 元 = 1 额度), 保存时 cnyToQuota 换算内部 quota
  quotaCny: 1,
  unlimitedQuota: false,
  expiredChoice: 'never' as 'never' | '7d' | '30d' | '90d' | 'custom',
  expiredTime: '' as string | null,
  // Task 130: 限定模型改下拉多选, 提交时 join(',') 兼容后端逗号串
  modelsArr: [] as string[],
  ipLimit: '',
})

function fmtExpiry(t: string | null): string {
  if (!t) return '永不过期'
  const d = new Date(t)
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return '已过期'
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days} 天后过期`
  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours} 小时后过期`
  return '即将过期'
}

export default defineComponent({
  name: 'TokensPage',
  components: { EmptyState },
  setup() {
    const userStore = useUserStore()
    const user = userStore.user
    const isAdmin = (user?.role ?? 0) >= 10
    const quotaPerUnit = user?.quotaPerUnit ?? 500000
    const displayInCurrency = user?.displayInCurrency ?? true

    const tokens = ref<TokenItem[]>([])
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(20)
    const keyword = ref('')
    const loading = ref(true)
    const dialogOpen = ref(false)
    const form = ref(emptyForm())
    const saving = ref(false)
    const createdKey = ref('')
    // Task 130: 令牌名称必填校验态 + 系统公告 + 限定模型下拉选项 (同步模型商城)
    const nameErr = ref(false)
    const announcement = ref('')
    const modelOptions = ref<Array<{ label: string; value: string }>>([])

    async function load() {
      loading.value = true
      try {
        const url = `/api/console/token?page=${page.value}&size=${pageSize.value}&keyword=${encodeURIComponent(keyword.value)}${isAdmin ? '&all=1' : ''}`
        const resp = await apiGet<{ data: { items: TokenItem[]; total: number } }>(url)
        tokens.value = resp.data.items
        total.value = resp.data.total
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      void load()
      // Task 130: 系统公告 (Bearer 注入, 同 dashboard initOnboard 模式)
      fetch('/api/console/option', { headers: (() => { const t = localStorage.getItem('newapi_token'); return t ? { Authorization: 'Bearer ' + t } : undefined })() })
        .then((r) => r.json())
        .then((j) => {
          if (j.data?.Announcement) announcement.value = j.data.Announcement
        })
        .catch(() => {})
      // Task 130: 限定模型下拉与模型商城同源 (可用在前), 管理员下架模型自动同步
      apiGet<{ data: { items: Array<{ modelName: string; available: boolean }> } }>('/api/console/mall')
        .then((r) => {
          const items = [...(r.data.items || [])].sort((a, b) => Number(b.available) - Number(a.available))
          modelOptions.value = items.map((m) => ({ label: m.available ? m.modelName : `${m.modelName}（未接入）`, value: m.modelName }))
        })
        .catch(() => {})
    })

    /* Task 110: 网关接入卡 — 网关地址一键复制 + 实时延迟 (10s 轮询) + 跳转测速;
       探针 /v1/ping 零鉴权零 DB, 不消耗 relay 认证限流预算与调用额度 */
    const gatewayOrigin = window.location.origin
    const gatewayUrl = gatewayOrigin + '/v1'
    /* Task 125: 备用网关 — 主站 bz / 备用 www 同库同额度, 令牌通用 */
    const standbyUrl = gatewayOrigin.includes('www.013.ltd') ? 'https://bz.013.ltd/v1' : 'https://www.013.ltd/v1'
    const pingMs = ref<number | null>(null)
    const pingAt = ref('')
    const pingError = ref(false)
    let pingTimer: number | null = null
    async function pingProbe(): Promise<number | null> {
      const t0 = performance.now()
      try {
        const resp = await fetch('/v1/ping', { cache: 'no-store' })
        if (!resp.ok) return null
        await resp.arrayBuffer()
        return Math.round(performance.now() - t0)
      } catch {
        return null
      }
    }
    async function pingTick() {
      const ms = await pingProbe()
      pingMs.value = ms
      pingError.value = ms === null
      pingAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    }
    function pingStart() {
      if (pingTimer === null) {
        void pingTick()
        pingTimer = window.setInterval(() => void pingTick(), 10_000)
      }
    }
    function pingStop() {
      if (pingTimer !== null) {
        clearInterval(pingTimer)
        pingTimer = null
      }
    }
    onMounted(() => pingStart())
    onBeforeUnmount(() => pingStop())
    onActivated(() => pingStart())
    onDeactivated(() => pingStop())
    const pingColor = computed(() => (pingError.value ? '#bfbfbf' : pingMs.value === null ? '#faad14' : pingMs.value <= 200 ? '#52c41a' : pingMs.value <= 500 ? '#faad14' : '#ff4d4f'))
    const pingText = computed(() => (pingError.value ? '网络异常' : pingMs.value === null ? '测量中…' : `${pingMs.value} ms`))
    function copyGateway() {
      void copyText(gatewayUrl).then((ok) => (ok ? message.success('网关地址已复制') : message.error('复制失败')))
    }
    function goSpeedtest() {
      navigate('/speedtest')
    }
    function onSearch(v: string) {
      keyword.value = v
      page.value = 1
      void load()
    }

    function fmtQuota(q: number): string {
      return renderQuota(q, quotaPerUnit, displayInCurrency)
    }

    function openCreate() {
      form.value = emptyForm()
      createdKey.value = ''
      nameErr.value = false
      dialogOpen.value = true
    }

    /** Task 130: 面值(元) → 内部 quota (1 元 = 1 额度严格换算) */
    const quotaInternal = computed(() => cnyToQuota(Math.max(Number(form.value.quotaCny) || 0, 0), quotaPerUnit))

    async function handleSave() {
      // Task 130: 令牌名称强制必填 (历史留空自动生成 token-时间戳, 用户要求必须自己命名)
      if (!form.value.name.trim()) {
        nameErr.value = true
        message.error('请输入令牌名称')
        return
      }
      saving.value = true
      try {
        let expiredTime: string | null = null
        if (form.value.expiredChoice === '7d') expiredTime = new Date(Date.now() + 7 * 86400000).toISOString()
        else if (form.value.expiredChoice === '30d') expiredTime = new Date(Date.now() + 30 * 86400000).toISOString()
        else if (form.value.expiredChoice === '90d') expiredTime = new Date(Date.now() + 90 * 86400000).toISOString()
        else if (form.value.expiredChoice === 'custom' && form.value.expiredTime)
          expiredTime = new Date(form.value.expiredTime.replace(' ', 'T')).toISOString()

        const payloadModels = form.value.modelsArr.map((s) => s.trim()).filter(Boolean).join(',')
        const payloadQuota = form.value.unlimitedQuota && isAdmin ? 0 : Math.max(0, Math.round(quotaInternal.value))

        if (form.value.id) {
          await apiPut(`/api/console/token/${form.value.id}`, {
            name: form.value.name.trim(),
            quota: payloadQuota,
            unlimitedQuota: form.value.unlimitedQuota && isAdmin,
            expiredTime,
            models: payloadModels,
            ipLimit: form.value.ipLimit,
          })
          message.success('令牌更新成功')
        } else {
          const resp = await apiPost<{ data: TokenItem }>('/api/console/token', {
            name: form.value.name.trim(),
            quota: payloadQuota,
            unlimitedQuota: form.value.unlimitedQuota && isAdmin,
            expiredTime,
            models: payloadModels,
            ipLimit: form.value.ipLimit,
          })
          createdKey.value = resp.data.key
          void load()
          saving.value = false
          return
        }
        dialogOpen.value = false
        void load()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        saving.value = false
      }
    }

    async function toggleStatus(t: TokenItem) {
      try {
        await apiPut(`/api/console/token/${t.id}`, { status: t.status === 1 ? 2 : 1 })
        message.success(t.status === 1 ? '已禁用' : '已启用')
        void load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    async function handleDelete(t: TokenItem) {
      const ok = await confirmDelete(`删除令牌「${t.name}」？`, '删除后使用该令牌的应用将无法继续调用，此操作不可恢复。')
      if (!ok) return
      try {
        await apiDelete(`/api/console/token/${t.id}`)
        message.success('删除成功')
        void load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    function copyKey(key: string) {
      void copyText(key).then((ok) => (ok ? message.success('密钥已复制') : message.error('复制失败')))
    }

    const pagination = computed(() => ({
      page: page.value,
      pageSize: pageSize.value,
      itemCount: total.value,
      pageSizes: [10, 20, 50, 100],
      showSizePicker: true,
      prefix: (p: { itemCount: number }) => `共 ${p.itemCount} 条`,
      onChange: (p: number) => {
        page.value = p
        void load()
      },
      onUpdatePageSize: (s: number) => {
        pageSize.value = s
        page.value = 1
        void load()
      },
    }))

    const originNow = typeof window !== 'undefined' ? window.location.origin : ''

    const curlExample = () =>
      'curl ' + originNow + '/v1/chat/completions \\\n' +
      '  -H "Authorization: Bearer ' + (createdKey.value ? createdKey.value.slice(0, 12) : 'sk-xxx') + '..." \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hello"}]}\''

    const columns = [
      {
        title: '名称',
        key: 'name',
        render: (t: TokenItem) =>
          h('div', {}, [
            h('div', { class: 'flex items-center gap-2 font-medium text-foreground' }, [h('span', { class: 'flex h-6 w-6 shrink-0 items-center justify-center', style: 'border-radius:6px;background:rgba(99,102,241,0.13);color:#6366f1' }, [h(KeyRound, { size: 13 })]), t.name]),
            t.models ? h('div', { class: 'mt-0.5 max-w-[180px] truncate text-[11px] text-muted-foreground' }, '限模型: ' + t.models) : null,
          ]),
      },
      {
        title: '密钥',
        key: 'key',
        render: (t: TokenItem) =>
          h(
            NButton,
            { text: true, onClick: () => copyKey(t.key), title: '点击复制' },
            {
              default: () =>
                h('span', { class: 'font-mono text-xs text-muted-foreground' }, `${t.key.slice(0, 10)}...${t.key.slice(-4)}`),
              icon: () => h(Copy, { size: 12 }),
            },
          ),
      },
      {
        title: '状态',
        key: 'status',
        render: (t: TokenItem) =>
          h(
            NButton,
            { text: true, onClick: () => toggleStatus(t) },
            {
              default: () =>
                h(
                  NTag,
                  {
                    size: 'small',
                    bordered: false,
                    type: t.status === 1 ? 'success' : t.status === 3 ? 'warning' : t.status === 4 ? 'error' : 'default',
                  },
                  { default: () => (t.status === 1 ? '已启用' : t.status === 3 ? '已过期' : t.status === 4 ? '已耗尽' : '已禁用') },
                ),
            },
          ),
      },
      {
        title: '已用 / 额度',
        key: 'quota',
        width: 180,
        render: (t: TokenItem) =>
          h('div', { class: 'text-xs' }, [
            h('div', { class: 'font-mono' }, `${fmtQuota(t.usedQuota)} / ${t.unlimitedQuota ? '∞' : fmtQuota(t.quota)}`),
            !t.unlimitedQuota && t.quota > 0
              ? h(NProgress, {
                  type: 'line',
                  percentage: Math.min((t.usedQuota / t.quota) * 100, 100),
                  showIndicator: false,
                  height: 4,
                  style: 'margin-top: 4px; max-width: 96px',
                })
              : null,
          ]),
      },
      {
        title: '过期时间',
        key: 'expiredTime',
        width: 110,
        render: (t: TokenItem) => h('span', { class: 'text-xs text-muted-foreground' }, fmtExpiry(t.expiredTime)),
      },
      ...(isAdmin ? [{ title: '所属用户', key: 'username', width: 110, render: (t: TokenItem) => h('span', { class: 'text-xs' }, t.username) }] : []),
      {
        title: '调用次数',
        key: 'requestCount',
        width: 96,
        render: (t: TokenItem) => h('span', { class: 'text-xs tabular-nums' }, t.requestCount.toLocaleString()),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        align: 'right' as const,
        render: (t: TokenItem) =>
          h('div', { class: 'inline-flex items-center gap-1' }, [
            h(NButton, { size: 'tiny', quaternary: true, onClick: () => copyKey(t.key) }, { default: () => '复制' }),
            h(
              NButton,
              { size: 'tiny', quaternary: true, type: 'error', onClick: () => handleDelete(t) },
              { icon: () => h(Trash2, { size: 13 }) },
            ),
          ]),
      },
    ]

    return {
      user, tokens, total, page, pageSize, keyword, loading, dialogOpen, form, saving, createdKey, originNow, curlExample,
      load, onSearch, openCreate, handleSave, copyKey, fmtQuota, fmtExpiry, isAdmin, displayInCurrency, quotaPerUnit,
      pagination, columns, getQuotaDisplayPrice,
      announcement, nameErr, modelOptions, quotaInternal,
      gatewayUrl, standbyUrl, pingMs, pingAt, pingColor, pingText, copyGateway, goSpeedtest,
      NButton, NCard, NDataTable, NModal, NInput, NInputNumber, NRadioGroup, NRadioButton, NSelect, NSwitch, NTag, NProgress,
      Plus, RefreshCw, Search, Copy, KeyRound, CircleCheck, Network, Gauge, Megaphone,
    }
  },
  template: `
  <div>
    <page-header title="令牌管理" description="管理 API 密钥 (sk-xxx)，用于调用本系统的 OpenAI/Claude 兼容接口">
      <template #extra>
        <n-button type="primary" @click="openCreate">
          <template #icon><plus :size="14" /></template>
          添加令牌
        </n-button>
      </template>
    </page-header>

    <!-- Task 130: 系统公告 (令牌页同步展示, 与登录页/看板同源) -->
    <div
      v-if="announcement"
      class="mb-4 flex items-start gap-2.5 border-l-2 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground"
      style="border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.06)"
    >
      <megaphone :size="14" class="mt-0.5 shrink-0" style="color: var(--primary)" />
      <span class="min-w-0"><span class="mr-1.5 font-medium text-foreground">公告</span>{{ announcement }}</span>
    </div>

    <!-- Task 110/120: 网关接入卡 — 网关地址一键复制 + 实时延迟 + 网关详情/测速入口;
         Task 120 重排: 桌面左地址右状态按钮组等高对齐 (状态胶囊化), 移动端纵向堆叠不再错位;
         探针 /v1/ping 零鉴权零 DB, 不消耗 relay 认证限流预算与调用额度 -->
    <n-card class="mb-4" :content-style="'padding: 12px 16px'" style="border-color: rgba(99,102,241,0.28); background: linear-gradient(120deg, rgba(99,102,241,0.09), rgba(124,58,237,0.04) 55%, rgba(124,58,237,0.01))">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(99,102,241,0.15); color: #6366f1">
            <network :size="17" />
          </div>
          <div class="min-w-0">
            <div class="text-xs text-muted-foreground">API 网关地址</div>
            <div class="flex items-center gap-1">
              <code class="truncate font-mono text-sm font-medium">{{ gatewayUrl }}</code>
              <n-button size="tiny" quaternary type="primary" @click="copyGateway">
                <template #icon><copy :size="13" /></template>
                复制
              </n-button>
            </div>
            <div class="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">备用网关 <code class="font-mono">{{ standbyUrl }}</code>（同库同额度令牌通用，主站慢时可换用）</div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 border border-[var(--border)] bg-card px-2.5 py-1.5" style="border-radius: 999px">
            <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: pingColor, boxShadow: '0 0 6px ' + pingColor }"></span>
            <span class="text-xs font-medium tabular-nums">{{ pingText }}</span>
            <span class="text-[11px] text-muted-foreground">实时延迟{{ pingAt ? ' · ' + pingAt : '' }}</span>
          </span>
          <n-button size="small" secondary @click="navigate('/gateway')">
            <template #icon><server :size="14" /></template>
            网关详情
          </n-button>
          <n-button size="small" type="primary" ghost @click="goSpeedtest">
            <template #icon><gauge :size="14" /></template>
            去测速
          </n-button>
        </div>
      </div>
    </n-card>

    <n-card :content-style="'padding: 0'">
      <div class="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
        <n-input :value="keyword" placeholder="搜索令牌名称..." style="width: 280px" clearable @update:value="onSearch">
          <template #prefix><search :size="14" /></template>
        </n-input>
        <n-button size="small" quaternary @click="load">
          <template #icon><refresh-cw :size="13" /></template>
          刷新
        </n-button>
      </div>
      <n-data-table
        :columns="columns"
        :data="tokens"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        size="small"
        :scroll-x="900"
        :row-key="(r) => r.id"
      >
        <!-- Task 203-a: 空态换装 — 令牌=调用凭证, 语义最近的 coupon 票券线稿 (原 naive 默认灰块) -->
        <template #empty>
          <n-empty description="暂无令牌" style="--n-icon-size: 88px">
            <template #icon><EmptyState variant="coupon" :size="88" /></template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>

    <n-modal v-model:show="dialogOpen">
      <n-card style="width: 512px; max-width: 92vw" :title="createdKey ? '令牌创建成功' : '添加令牌'" :bordered="false" size="huge" role="dialog" aria-modal="true">
        <template #header-extra>
          <circle-check v-if="createdKey" :size="17" style="color:#52c41a" />
          <key-round v-else :size="17" class="text-muted-foreground" />
        </template>

        <div v-if="createdKey">
          <p class="mb-3 text-sm text-muted-foreground">请立即复制您的密钥，出于安全考虑，之后将无法再次完整查看：</p>
          <div class="flex items-center gap-2 p-3" style="border: 1px solid rgba(32,128,240,0.3); background: rgba(32,128,240,0.05)">
            <code class="flex-1 break-all font-mono text-xs" style="color: var(--primary)">{{ createdKey }}</code>
            <n-button size="small" type="primary" @click="copyKey(createdKey)">
              <template #icon><copy :size="13" /></template>
              复制
            </n-button>
          </div>
          <div class="mt-4 bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
            <p class="mb-1 font-medium text-foreground">接口使用示例:</p>
            <code class="block whitespace-pre-wrap font-mono">{{ curlExample() }}</code>
          </div>
        </div>

        <n-form v-else label-placement="top" :show-feedback="false">
          <div class="flex flex-col gap-4">
            <form-row label="令牌名称" :required="true" hint="必填">
              <div>
                <n-input
                  v-model:value="form.name"
                  placeholder="例如: my-chatbot"
                  :status="nameErr ? 'error' : undefined"
                  @update:value="nameErr = false"
                />
                <p v-if="nameErr" class="mt-1.5 text-xs" style="color: #f5222d">请输入令牌名称（必填）</p>
              </div>
            </form-row>
            <form-row label="额度面值 (元)" :hint="'1 元 = 1 额度 · 支付面值即到账' + (displayInCurrency ? '' : ' (额度单位为系统 quota)')">
              <div class="flex items-center gap-2">
                <n-input-number v-model:value="form.quotaCny" style="width: 100%" :min="0" :step="1" :precision="4" :disabled="form.unlimitedQuota && isAdmin">
                  <template #prefix>¥</template>
                </n-input-number>
                <span class="shrink-0 text-xs text-muted-foreground">≈ {{ fmtQuota(quotaInternal) }}</span>
              </div>
            </form-row>
            <form-row v-if="isAdmin" label="无限额度" hint="仅管理员可设置">
              <n-switch v-model:value="form.unlimitedQuota" />
            </form-row>
            <form-row label="过期时间">
              <div>
                <!-- 显式覆盖三件套: .n-radio-group 被 naive 固定 height:28px + white-space:nowrap +
                     行内布局 (display:inline-block), 仅设 flex-wrap 不换行、不覆盖 height 则第二行与
                     下个表单项重叠 (用户实拍两次迭代教训) -->
                <n-radio-group v-model:value="form.expiredChoice" size="small" style="display: flex; flex-wrap: wrap; row-gap: 8px; height: auto; white-space: normal">
                  <n-radio-button value="never">永不过期</n-radio-button>
                  <n-radio-button value="7d">7 天</n-radio-button>
                  <n-radio-button value="30d">30 天</n-radio-button>
                  <n-radio-button value="90d">90 天</n-radio-button>
                  <n-radio-button value="custom">自定义</n-radio-button>
                </n-radio-group>
                <n-date-picker
                  v-if="form.expiredChoice === 'custom'"
                  v-model:formatted-value="form.expiredTime"
                  type="datetime"
                  style="margin-top: 8px; width: 100%"
                  value-format="yyyy-MM-dd HH:mm:ss"
                  clearable
                />
              </div>
            </form-row>
            <form-row label="限定模型" hint="留空 = 可使用全部模型；下拉多选，列表与「模型商城」实时同步">
              <n-select
                v-model:value="form.modelsArr"
                multiple
                filterable
                tag
                clearable
                placeholder="选择限定模型（可多选 / 可搜索 / 可自定义）"
                :options="modelOptions"
                :max-tag-count="3"
              />
            </form-row>
            <form-row label="IP 白名单" hint="留空表示不限制，多个 IP 用逗号分隔">
              <n-input v-model:value="form.ipLimit" placeholder="192.168.1.1, 10.0.0.2" />
            </form-row>
          </div>
        </n-form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <template v-if="createdKey">
              <n-button type="primary" @click="dialogOpen = false">完成</n-button>
            </template>
            <template v-else>
              <n-button @click="dialogOpen = false">取消</n-button>
              <n-button type="primary" :loading="saving" @click="handleSave">创建</n-button>
            </template>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
  `,
})
