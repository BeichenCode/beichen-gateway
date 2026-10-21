/**
 * 充值订单 (管理员) — 统计 + 筛选 + 分页 (n-data-table 全原生)
 * Task 119: 4 统计卡彩色化 (蓝/绿/橙/紫渐变徽章, 同看板设计语言)
 */
import '../flags'
import { defineComponent, h, onMounted, onBeforeUnmount, ref , computed} from 'vue'
import { NButton, NDataTable, NInput, NSelect, NTag } from 'naive-ui'
import { apiGet } from '@/lib/api'
import { message } from '../message'
import { renderQuota } from '../shared'
import { useUserStore } from '../stores'
import { EmptyState } from '../components/empty-state'
import { RefreshCw, ReceiptText, Search } from 'lucide-vue-next'

interface TopupOrder {
  id: number
  orderNo: string
  userId: number
  username: string
  amount: number
  money: number
  status: number
  payType: string
  tradeNo: string
  createdAt: string
}

interface Stats {
  total: number
  paid: number
  paidMoney: number
  paidQuota: number
}

function payTypeLabel(t: string): string {
  return t === 'alipay' ? '支付宝' : t === 'wxpay' ? '微信支付' : t || '-'
}

/* Task 204: 窄屏 (<768px) 列集收敛 — 断点判定沿用 users.ts Task 174-d 的 matchMedia 模式 */
function useNarrow() {
  const isNarrow = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  let mql: MediaQueryList | null = null
  onMounted(() => {
    mql = window.matchMedia('(max-width: 767px)')
    isNarrow.value = !!mql.matches
    mql.addEventListener('change', resolve)
  })
  function resolve() {
    isNarrow.value = !!mql?.matches
  }
  onBeforeUnmount(() => mql?.removeEventListener('change', resolve))
  return isNarrow
}

export default defineComponent({
  name: 'OrdersPage',
  components: { EmptyState },
  setup() {
    const isNarrow = useNarrow()
    const userStore = useUserStore()
    const user = userStore.user
    const quotaPerUnit = user?.quotaPerUnit || 500000
    const displayInCurrency = user?.displayInCurrency ?? true

    const items = ref<TopupOrder[]>([])
    const stats = ref<Stats | null>(null)
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(10)
    const status = ref('')
    const username = ref('')
    const usernameInput = ref('')
    const loading = ref(true)

    async function load() {
      loading.value = true
      try {
        const qs = new URLSearchParams({ scope: 'all', page: String(page.value), size: String(pageSize.value), stats: '1' })
        if (status.value) qs.set('status', status.value)
        if (username.value) qs.set('username', username.value)
        const resp = await apiGet<{ data: { items: TopupOrder[]; total: number; stats?: Stats } }>(`/api/console/topup?${qs.toString()}`)
        items.value = resp.data.items
        total.value = resp.data.total
        if (resp.data.stats) stats.value = resp.data.stats
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => void load())

    const statusOptions = [
      { value: '', label: '全部状态' },
      { value: '1', label: '待支付' },
      { value: '2', label: '已完成' },
      { value: '3', label: '已关闭' },
    ]
    function onStatus(v: string) {
      status.value = v
      page.value = 1
      void load()
    }
    function onUsernameSearch() {
      username.value = usernameInput.value.trim()
      page.value = 1
      void load()
    }
    function clearUsername() {
      usernameInput.value = ''
      username.value = ''
      page.value = 1
      void load()
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

    /* Task 204: 窄屏 (<768px) 列集收敛 — 8 列压到 4 列 (总宽 ~990px → ~390px):
     *   用户/支付方式/易支付流水号/创建时间 窄屏隐藏 (订单号 title 悬浮可查全文, 管理员深查用桌面);
     *   桌面 (≥768px) 保持原 8 列不动 */
    const columns = computed(() => {
      if (isNarrow.value) {
        return [
          {
            title: '订单号',
            key: 'orderNo',
            width: 132,
            render: (o: TopupOrder) =>
              h('div', { class: 'min-w-0' }, [
                h('span', { class: 'block max-w-[116px] truncate font-mono text-xs tabular-nums', title: o.orderNo }, o.orderNo),
                h('span', { class: 'mt-0.5 block text-[10.5px] text-muted-foreground' }, new Date(o.createdAt).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })),
              ]),
          },
          {
            title: '充值额度',
            key: 'amount',
            width: 100,
            render: (o: TopupOrder) =>
              h('span', { class: 'whitespace-nowrap font-mono text-xs font-semibold tabular-nums', style: 'color:#00B42A' }, '+' + renderQuota(o.amount, quotaPerUnit, displayInCurrency)),
          },
          {
            title: '实付',
            key: 'money',
            width: 82,
            render: (o: TopupOrder) => h('span', { class: 'whitespace-nowrap font-mono text-xs tabular-nums' }, '¥' + o.money.toFixed(2)),
          },
          {
            title: '状态',
            key: 'status',
            width: 76,
            align: 'right' as const,
            render: (o: TopupOrder) =>
              h(
                NTag,
                { size: 'small', bordered: false, type: o.status === 2 ? 'success' : o.status === 1 ? 'warning' : 'default' },
                { default: () => (o.status === 1 ? '待支付' : o.status === 2 ? '已完成' : '已关闭') },
              ),
          },
        ]
      }
      return [
      {
        title: '订单号',
        key: 'orderNo',
        width: 190,
        render: (o: TopupOrder) => h('span', { class: 'font-mono text-xs tabular-nums', title: o.orderNo }, o.orderNo),
      },
      { title: '用户', key: 'username', width: 110, render: (o: TopupOrder) => h('span', { class: 'text-xs font-medium' }, o.username || '#' + o.userId) },
      {
        title: '充值额度',
        key: 'amount',
        width: 120,
        render: (o: TopupOrder) =>
          h('span', { class: 'whitespace-nowrap font-mono text-xs font-semibold tabular-nums', style: 'color:#00B42A' }, '+' + renderQuota(o.amount, quotaPerUnit, displayInCurrency)),
      },
      {
        title: '实付金额',
        key: 'money',
        width: 100,
        render: (o: TopupOrder) => h('span', { class: 'whitespace-nowrap font-mono text-xs tabular-nums' }, '¥' + o.money.toFixed(2)),
      },
      { title: '支付方式', key: 'payType', width: 96, render: (o: TopupOrder) => h('span', { class: 'text-xs text-muted-foreground' }, payTypeLabel(o.payType)) },
      {
        title: '状态',
        key: 'status',
        width: 92,
        render: (o: TopupOrder) =>
          h(
            NTag,
            { size: 'small', bordered: false, type: o.status === 2 ? 'success' : o.status === 1 ? 'warning' : 'default' },
            { default: () => (o.status === 1 ? '待支付' : o.status === 2 ? '已完成' : '已关闭') },
          ),
      },
      {
        title: '易支付流水号',
        key: 'tradeNo',
        width: 150,
        render: (o: TopupOrder) => h('span', { class: 'font-mono text-xs text-muted-foreground', title: o.tradeNo }, o.tradeNo || '-'),
      },
      {
        title: '创建时间',
        key: 'createdAt',
        width: 170,
        render: (o: TopupOrder) =>
          h('span', { class: 'whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground' }, new Date(o.createdAt).toLocaleString('zh-CN', { hour12: false })),
      },
      ]
    })

    return {
      user, items, stats, total, page, pageSize, status, username, usernameInput, loading, isNarrow, renderQuota, quotaPerUnit, displayInCurrency,
      load, statusOptions, onStatus, onUsernameSearch, clearUsername, pagination, columns,
      NButton, NDataTable, NInput, NSelect, NTag,
      RefreshCw, ReceiptText, Search,
    }
  },
  template: `
  <div>
    <page-header title="充值订单" description="全站在线充值订单与成交统计">
      <template #extra>
        <n-button quaternary size="small" @click="load">
          <template #icon><refresh-cw :size="13" /></template>
          刷新
        </n-button>
      </template>
    </page-header>

    <div class="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
      <n-card size="small" style="background: linear-gradient(135deg, rgba(32,128,240,0.09), rgba(32,128,240,0.015) 60%)">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(32,128,240,0.14); color: #2080f0"><receipt-text :size="15" /></span>
          <span class="text-xs text-muted-foreground">订单总数</span>
        </div>
        <div class="mt-2.5 text-2xl font-bold tabular-nums text-foreground">{{ stats?.total ?? 0 }}</div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(0,180,42,0.09), rgba(0,180,42,0.015) 60%)">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(0,180,42,0.13); color: #00b42a"><circle-check :size="15" /></span>
          <span class="text-xs text-muted-foreground">已成交订单</span>
        </div>
        <div class="mt-2.5 text-2xl font-bold tabular-nums text-foreground">{{ stats?.paid ?? 0 }}</div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(250,140,22,0.10), rgba(250,140,22,0.015) 60%)">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(250,140,22,0.15); color: #fa8c16"><banknote :size="15" /></span>
          <span class="text-xs text-muted-foreground">成交金额</span>
        </div>
        <div class="mt-2.5 text-2xl font-bold tabular-nums text-foreground">¥{{ (stats?.paidMoney ?? 0).toFixed(2) }}</div>
        <div class="mt-1 text-[11px] text-muted-foreground">已完成订单实付合计 (CNY)</div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.015) 60%)">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(124,58,237,0.14); color: #7c3aed"><coins :size="15" /></span>
          <span class="text-xs text-muted-foreground">售出额度</span>
        </div>
        <div class="mt-2.5 text-2xl font-bold tabular-nums text-foreground">{{ renderQuota(stats?.paidQuota ?? 0, quotaPerUnit, displayInCurrency) }}</div>
        <div class="mt-1 text-[11px] text-muted-foreground">已完成订单额度面值合计 (人民币)</div>
      </n-card>
    </div>

    <n-card :content-style="'padding: 0'">
      <div class="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
        <n-select :value="status" :options="statusOptions" size="small" style="width: 128px" @update:value="onStatus" />
        <n-input
          v-model:value="usernameInput"
          size="small"
          placeholder="按用户名搜索，回车确认"
          style="width: 208px"
          clearable
          @keyup.enter="onUsernameSearch"
          @clear="clearUsername"
        >
          <template #prefix><search :size="14" /></template>
        </n-input>
        <n-button v-if="username" size="small" quaternary @click="clearUsername">清除筛选</n-button>
      </div>
      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        size="small"
        :scroll-x="isNarrow ? 390 : 1000"
        :row-key="(r) => r.id"
      >
        <!-- Task 203-b: 空态换装 — 礼品券/订单凭证语义, coupon 线稿 (原 naive 默认灰块, 同 203-a 表格空态规范) -->
        <template #empty>
          <n-empty description="暂无充值订单" style="--n-icon-size: 88px">
            <template #icon><EmptyState variant="coupon" :size="88" /></template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>
  </div>
  `,
})
