/**
 * 钱包充值 — Task 76 易支付闭环 (n-card/n-input/n-button/n-progress 全原生)
 * Task 119: 余额总览品牌渐变 Hero + 三卡头彩色徽章 (与看板/商城设计语言同源)
 * 余额总览 (真实) + 兑换码兑换 (真实接口) + 在线充值 (易支付: 下单→跳转收银台→回调入账) + 充值订单 (真实 TopupOrder)
 */
import '../flags'
import { computed, defineComponent, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NButton, NCard, NInput, NInputNumber, NProgress, NTag } from 'naive-ui'
import { h } from 'vue'
import { apiGet, apiPost } from '@/lib/api'
import { message } from '../message'
import { renderQuota, tweenNum } from '../shared'
import { useUserStore } from '../stores'
import { EmptyState } from '../components/empty-state'
import { Wallet, Ticket, CreditCard, CircleCheck, Coins, Zap, Activity, Banknote, Info, Loader2 } from 'lucide-vue-next'

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

interface TopupOrder {
  id: number
  orderNo: string
  amount: number
  money: number
  status: number
  payType: string
  createdAt: string
}

const PRESETS = [10, 30, 50, 100, 200]
/** Task 130: 官方品牌图标 (simple-icons CC0) + 深浅双色 — 充值面板随选中方式整体换色 */
const PAY_METHODS = [
  {
    type: 'alipay',
    label: '支付宝',
    brand: '#1677FF',
    brandDeep: '#0e5fd8',
    desc: '推荐 · 即时到账',
    iconPath:
      'M19.695 15.07c3.426 1.158 4.203 1.22 4.203 1.22V3.846c0-2.124-1.705-3.845-3.81-3.845H3.914C1.808.001.102 1.722.102 3.846v16.31c0 2.123 1.706 3.845 3.813 3.845h16.173c2.105 0 3.81-1.722 3.81-3.845v-.157s-6.19-2.602-9.315-4.119c-2.096 2.602-4.8 4.181-7.607 4.181-4.75 0-6.361-4.19-4.112-6.949.49-.602 1.324-1.175 2.617-1.497 2.025-.502 5.247.313 8.266 1.317a16.796 16.796 0 0 0 1.341-3.302H5.781v-.952h4.799V6.975H4.77v-.953h5.81V3.591s0-.409.411-.409h2.347v2.84h5.744v.951h-5.744v1.704h4.69a19.453 19.453 0 0 1-1.986 5.06c1.424.52 2.702 1.011 3.654 1.333m-13.81-2.032c-.596.06-1.71.325-2.321.869-1.83 1.608-.735 4.55 2.968 4.55 2.151 0 4.301-1.388 5.99-3.61-2.403-1.182-4.438-2.028-6.637-1.809',
  },
  {
    type: 'wxpay',
    label: '微信支付',
    brand: '#07C160',
    brandDeep: '#059a4d',
    desc: '扫码支付 · 即时到账',
    iconPath:
      'M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z',
  },
]

export default defineComponent({
  name: 'WalletPage',
  components: { EmptyState },
  setup() {
    const userStore = useUserStore()
    const user = () => userStore.user
    const redeemKey = ref('')
    const redeeming = ref(false)
    const orders = ref<TopupOrder[]>([])
    const ordersLoading = ref(true)

    // 在线充值状态
    const onlineEnabled = ref(false)
    const price = ref(7.3)
    const minTopUp = ref(0.01)
    const groupRatio = ref(1)
    const amount = ref<number>(10)
    const customMode = ref(false)
    const payType = ref('alipay')
    const submitting = ref(false)

    /* Task 123: 余额实时化 — 切回钱包页 (KeepAlive 激活) 静默拉最新 me,
       Hero 剩余额度/累计已用/调用次数数字滚动到新值 (不刷新页面也实时) */
    const dispQuota = ref(user()?.quota ?? 0)
    const dispUsed = ref(user()?.usedQuota ?? 0)
    const dispReqCount = ref(user()?.requestCount ?? 0)
    watch(
      () => [user()?.quota ?? 0, user()?.usedQuota ?? 0, user()?.requestCount ?? 0] as const,
      ([q, u, r]) => {
        tweenNum(dispQuota, q)
        tweenNum(dispUsed, u)
        tweenNum(dispReqCount, r)
      },
    )
    onActivated(() => {
      if (userStore.loaded) void userStore.refresh()
    })

    async function loadOrders() {
      ordersLoading.value = true
      try {
        const resp = await apiGet<{ data: { items: TopupOrder[] } }>('/api/console/topup?page=1&size=8')
        orders.value = resp.data.items
      } catch {
        /* 订单加载失败不打断主流程 */
      } finally {
        ordersLoading.value = false
      }
    }

    // 支付回跳: /console#/wallet?order=xxx&result=ok → 提示 + 刷新, 然后清掉回跳参数防重复提示
    function handlePayReturn() {
      const hash = window.location.hash
      const qi = hash.indexOf('?')
      if (qi < 0) return
      const q = new URLSearchParams(hash.slice(qi + 1))
      const order = q.get('order')
      const result = q.get('result')
      if (!order && !result) return
      window.history.replaceState(null, '', '/console#/wallet')
      if (result === 'ok') {
        message.success(`订单 ${order} 支付流程已完成，若已付款额度将在数秒内到账`)
      } else {
        message.info(`订单 ${order} 未完成支付${result === 'sign' ? '（签名校验未通过）' : ''}`)
      }
      void userStore.refresh()
    }

    onMounted(() => {
      handlePayReturn()
      void loadOrders()
      fetch('/api/console/option', { headers: (() => { const t = localStorage.getItem('newapi_token'); return t ? { Authorization: 'Bearer ' + t } : undefined })() })
        .then((r) => r.json())
        .then((j) => {
          const d = j.data || {}
          onlineEnabled.value = d.EnableOnlineTopUp === 'true'
          const p = parseFloat(d.Price)
          if (isFinite(p) && p > 0) price.value = p
          const m = parseFloat(d.MinTopUp)
          if (isFinite(m) && m > 0) minTopUp.value = m
          try {
            const ratios = JSON.parse(d.TopupGroupRatio || '{}') as Record<string, number>
            const g = userStore.user?.group
            const r = g ? ratios[g] : undefined
            if (typeof r === 'number' && r > 0 && r <= 1) groupRatio.value = r
          } catch {
            /* 默认 1 */
          }
        })
        .catch(() => {})
    })

    const usagePct = () => {
      const u = user()
      if (!u) return 0
      return u.quota + u.usedQuota > 0 ? Math.min(100, Math.round((u.usedQuota / (u.quota + u.usedQuota)) * 100)) : 0
    }

    const effPrice = () => price.value * groupRatio.value
    // 到账预估: 实付人民币 / (单价×分组折扣) × QuotaPerUnit
    const quotaPreview = () => Math.round((amount.value / effPrice()) * (user()?.quotaPerUnit ?? 500000))
    // 到账面值金额 (1 额度 = ¥1): 金额 / 分组折扣; 整数不带尾零 (Task 124)
    const arriveAmt = (v: number) => {
      const a = v / groupRatio.value
      return Number.isInteger(a) ? String(a) : a.toFixed(2)
    }

    /* Task 130: 充值面板联动 — 选中支付方式的品牌色/图标驱动滑块与 CTA */
    const payBrand = computed(() => PAY_METHODS.find((m) => m.type === payType.value)?.brand ?? '#1677FF')
    const payBrandDeep = computed(() => PAY_METHODS.find((m) => m.type === payType.value)?.brandDeep ?? '#0e5fd8')
    const payIconPath = computed(() => PAY_METHODS.find((m) => m.type === payType.value)?.iconPath ?? '')
    const currentPayDesc = computed(() => PAY_METHODS.find((m) => m.type === payType.value)?.desc ?? '')

    async function handleRedeem() {
      if (!redeemKey.value.trim()) {
        message.error('请输入兑换码')
        return
      }
      redeeming.value = true
      try {
        const resp = await apiPost<{ data: { quota: number } }>('/api/console/redemption/redeem', { key: redeemKey.value.trim() })
        message.success(`兑换成功，获得 ${renderQuota(resp.data.quota, user()?.quotaPerUnit ?? 500000, user()?.displayInCurrency ?? true)}`)
        redeemKey.value = ''
        await userStore.refresh()
        void loadOrders()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        redeeming.value = false
      }
    }

    async function handleTopup() {
      if (!amount.value || amount.value <= 0) {
        message.error('请输入充值金额')
        return
      }
      if (amount.value < minTopUp.value) {
        message.error(`最低充值金额为 ¥${minTopUp.value}`)
        return
      }
      submitting.value = true
      try {
        const resp = await apiPost<{ data: { orderNo: string; money: number; quota: number; payUrl: string } }>('/api/console/topup', {
          amount: amount.value,
          type: payType.value,
        })
        message.success(`订单已创建：${resp.data.orderNo}，正在跳转收银台…`)
        window.location.href = resp.data.payUrl
      } catch (e) {
        message.error((e as Error).message)
        submitting.value = false
      }
    }

    /* Task 204: 窄屏 (<768px) 充值记录列集收敛 — 6 列压到 4 列 (总宽 ~760px → ~390px):
     *   支付方式/创建时间 窄屏隐藏 (订单号下方收纳 MM-DD HH:mm), 桌面保持原 6 列 */
    const orderColumns = computed(() => {
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
              h('span', { class: 'whitespace-nowrap font-mono text-xs font-semibold tabular-nums', style: 'color:#00B42A' }, '+' + renderQuota(o.amount, user()?.quotaPerUnit ?? 500000, user()?.displayInCurrency ?? true)),
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
        render: (o: TopupOrder) => h('span', { class: 'font-mono text-xs tabular-nums', title: o.orderNo }, o.orderNo),
      },
      {
        title: '充值额度',
        key: 'amount',
        width: 130,
        render: (o: TopupOrder) =>
          h('span', { class: 'whitespace-nowrap font-mono text-xs font-semibold tabular-nums', style: 'color:#00B42A' }, '+' + renderQuota(o.amount, user()?.quotaPerUnit ?? 500000, user()?.displayInCurrency ?? true)),
      },
      {
        title: '实付金额',
        key: 'money',
        width: 100,
        render: (o: TopupOrder) => h('span', { class: 'whitespace-nowrap font-mono text-xs tabular-nums' }, '¥' + o.money.toFixed(2)),
      },
      {
        title: '支付方式',
        key: 'payType',
        width: 96,
        render: (o: TopupOrder) =>
          h('span', { class: 'text-xs text-muted-foreground' }, o.payType === 'alipay' ? '支付宝' : o.payType === 'wxpay' ? '微信支付' : o.payType || '-'),
      },
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
        title: '创建时间',
        key: 'createdAt',
        width: 170,
        render: (o: TopupOrder) =>
          h('span', { class: 'whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground' }, new Date(o.createdAt).toLocaleString('zh-CN', { hour12: false })),
      },
      ]
    })

    return {
      userStore, user, redeemKey, redeeming, orders, ordersLoading, loadOrders, isNarrow,
      dispQuota, dispUsed, dispReqCount,
      onlineEnabled, price, minTopUp, groupRatio, amount, customMode, payType, submitting,
      payBrand, payBrandDeep, payIconPath, currentPayDesc,
      usagePct, quotaPreview, arriveAmt, handleRedeem, handleTopup, orderColumns, PRESETS, PAY_METHODS, renderQuota,
      NButton, NCard, NInput, NInputNumber, NProgress, NTag,
      Wallet, Ticket, CreditCard, CircleCheck, Coins, Zap, Activity, Banknote, Info, Loader2,
    }
  },
  template: `
  <div>
    <page-header title="钱包充值" description="额度余额、兑换码兑换与在线充值" />

    <!-- 余额总览 (全部真实) — 品牌渐变 Hero -->
    <div class="relative overflow-hidden" style="border-radius: 8px; background: linear-gradient(118deg, #4338ca 0%, #6366f1 52%, #7c3aed 100%)">
      <div class="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full" style="background: rgba(255,255,255,0.10)"></div>
      <div class="pointer-events-none absolute -bottom-20 left-1/3 h-36 w-36 rounded-full" style="background: rgba(255,255,255,0.06)"></div>
      <div class="relative px-5 py-5 md:px-6">
        <div class="flex flex-wrap items-center justify-between gap-5">
          <div class="flex items-center gap-4">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center" style="border-radius: 10px; background: rgba(255,255,255,0.16); color: #ffffff"><wallet :size="22" /></span>
            <div>
              <div class="text-xs text-white/75">剩余额度</div>
              <div class="mt-1 font-mono text-[28px] font-bold leading-none tabular-nums text-white">
                {{ renderQuota(dispQuota, user?.quotaPerUnit ?? 500000, !!user?.displayInCurrency) }}
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <div class="flex items-center gap-1 text-xs text-white/75"><coins :size="12" class="opacity-80" /> 累计已用</div>
              <div class="mt-1.5 font-mono text-lg font-semibold tabular-nums text-white">{{ renderQuota(dispUsed, user?.quotaPerUnit ?? 500000, !!user?.displayInCurrency) }}</div>
            </div>
            <div>
              <div class="flex items-center gap-1 text-xs text-white/75"><zap :size="12" class="opacity-80" /> 调用次数</div>
              <div class="mt-1.5 font-mono text-lg font-semibold tabular-nums text-white">{{ Math.round(dispReqCount).toLocaleString() }}</div>
            </div>
            <div>
              <div class="flex items-center gap-1 text-xs text-white/75"><activity :size="12" class="opacity-80" /> 额度使用率</div>
              <div class="mt-1.5 font-mono text-lg font-semibold tabular-nums text-white">{{ usagePct() }}%</div>
            </div>
          </div>
        </div>
        <n-progress type="line" :percentage="usagePct()" :show-indicator="false" :height="6" color="#ffffff" rail-color="rgba(255,255,255,0.22)" style="margin-top: 16px" />
        <div class="mt-2 text-[11px] text-white/80">
          额度按人民币 1:1 计价，支付金额即到账额度面值{{ groupRatio < 1 ? ' · 当前分组享 ' + Math.round((1 - groupRatio) * 100) + '% 充值折扣' : '' }}
        </div>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- 在线充值 (Task 124: 充值面板重做 — 金额卡选中渐变+对勾角标 / 品牌色支付卡 / 渐变结算条) -->
      <n-card size="small">
        <template #header>
          <span class="flex items-center gap-2 text-sm font-semibold"><span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(250,140,22,0.14); color: #fa8c16"><banknote :size="14" /></span> 在线充值</span>
        </template>
        <template #header-extra>
          <span v-if="onlineEnabled" class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span class="relative flex h-1.5 w-1.5"><span class="absolute inline-flex h-full w-full rounded-full opacity-60" style="background:#00b42a; animation: dash-live-pulse 2s ease-out infinite" /><span class="relative inline-flex h-1.5 w-1.5 rounded-full" style="background:#00b42a" /></span>易支付通道 · 即时到账</span>
        </template>

        <template v-if="onlineEnabled">
          <!-- 金额选择 (Task 130 重做: 干净卡面 + 主色描边选中态 + 对勾角点, 去掉厚重的整卡渐变) -->
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <button
              v-for="v in PRESETS"
              :key="v"
              type="button"
              class="relative border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5"
              style="border-radius: 10px"
              :style="!customMode && amount === v
                ? 'border-color: var(--primary); background: rgba(32,128,240,0.06); box-shadow: inset 0 0 0 1px var(--primary)'
                : 'border-color: var(--border); background: var(--card)'"
              @click="amount = v; customMode = false"
            >
              <span
                v-if="!customMode && amount === v"
                class="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-white"
                style="background: var(--primary)"
              >
                <circle-check :size="10" />
              </span>
              <div class="flex flex-col items-center gap-1.5 py-3.5">
                <div class="font-mono text-[17px] font-bold leading-none tabular-nums" :style="!customMode && amount === v ? 'color: var(--primary)' : ''">¥{{ v }}</div>
                <div class="text-[10px] leading-none text-muted-foreground">到账 ¥{{ arriveAmt(v) }}</div>
              </div>
            </button>
            <button
              type="button"
              class="relative border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5"
              style="border-radius: 10px"
              :style="customMode
                ? 'border-color: var(--primary); background: rgba(32,128,240,0.06); box-shadow: inset 0 0 0 1px var(--primary)'
                : 'border-color: var(--border); background: var(--card)'"
              @click="customMode = true; amount = minTopUp"
            >
              <span
                v-if="customMode"
                class="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-white"
                style="background: var(--primary)"
              >
                <circle-check :size="10" />
              </span>
              <div class="flex flex-col items-center gap-1.5 py-3.5">
                <div class="text-[13.5px] font-semibold leading-none" :style="customMode ? 'color: var(--primary)' : ''">自定义</div>
                <div class="text-[10px] leading-none text-muted-foreground">≥ ¥{{ minTopUp }}</div>
              </div>
            </button>
          </div>

          <div v-if="customMode" class="mt-3">
            <form-row label="充值金额 (¥)" :hint="'最低 ¥' + minTopUp">
              <n-input-number v-model:value="amount" :min="minTopUp" :step="0.01" style="width: 100%" placeholder="100" />
            </form-row>
          </div>

          <!-- 支付方式 (Task 130 重做: 单容器滑块分段切换 — 品牌色滑块 300ms 滑动过渡 + 官方品牌图标, 替代两张分离卡) -->
          <div
            class="relative mt-4 grid grid-cols-2 overflow-hidden border border-[var(--border)] p-1"
            style="border-radius: 10px; background: rgba(128,128,128,0.07)"
          >
            <span
              aria-hidden
              class="pointer-events-none absolute bottom-1 top-1 w-[calc(50%-6px)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              :style="payType === 'alipay'
                ? 'left: 4px; border-radius: 7px; background: #1677FF; box-shadow: 0 4px 14px -6px rgba(22,119,255,0.75)'
                : 'left: calc(50% + 2px); border-radius: 7px; background: #07C160; box-shadow: 0 4px 14px -6px rgba(7,193,96,0.75)'"
            ></span>
            <button
              v-for="m in PAY_METHODS"
              :key="m.type"
              type="button"
              class="relative z-10 flex h-11 cursor-pointer items-center justify-center gap-2 text-[13.5px] font-semibold transition-colors duration-300"
              :style="payType === m.type ? 'color: #fff' : 'color: var(--muted-foreground)'"
              @click="payType = m.type"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path :d="m.iconPath" /></svg>
              {{ m.label }}
            </button>
          </div>
          <div class="mt-1.5 text-center text-[10.5px] text-muted-foreground">{{ currentPayDesc }}</div>

          <!-- 结算区 (Task 130 重做: CTA 随支付方式换品牌色 — 支付宝蓝/微信绿, 替代不搭调的紫色渐变按钮) -->
          <div class="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="flex items-baseline gap-1.5">
                <span class="text-xs text-muted-foreground">应付</span>
                <span class="font-mono text-[26px] font-bold leading-none tabular-nums text-foreground">¥{{ amount.toFixed(2) }}</span>
              </div>
              <div class="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
                到账 ¥{{ arriveAmt(amount) }} 额度 · 1 额度 = ¥1{{ groupRatio < 1 ? ' · 已享 ' + Math.round((1 - groupRatio) * 100) + '% 充值折扣' : '' }}
              </div>
            </div>
            <button
              type="button"
              :disabled="submitting"
              class="inline-flex h-11 items-center justify-center gap-2 px-7 text-[14px] font-semibold text-white transition-all duration-300 hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12"
              :style="'border-radius: 10px; background: linear-gradient(135deg, ' + payBrand + ', ' + payBrandDeep + '); box-shadow: 0 10px 24px -10px ' + payBrand + '99'"
              @click="handleTopup"
            >
              <loader2 v-if="submitting" :size="15" class="animate-spin" />
              <svg v-else viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path :d="payIconPath" /></svg>
              {{ submitting ? '正在创建订单 …' : '立即充值' }}
            </button>
          </div>
          <div class="mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <info :size="13" class="mt-px shrink-0 opacity-70" />
            提交后将跳转至易支付收银台完成付款，支付成功后额度自动到账；未支付订单不影响账户。
          </div>
        </template>

        <template v-else>
          <!-- 诚实空态 (站点未开启在线充值) -->
          <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div class="flex items-center gap-3 border border-[var(--border)] p-3.5 opacity-60">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center bg-muted text-muted-foreground"><credit-card :size="16" /></span>
              <span class="min-w-0">
                <span class="block text-[13px] font-medium text-foreground">在线支付</span>
                <span class="mt-0.5 block text-[11px] text-muted-foreground">暂未开通</span>
              </span>
            </div>
            <div class="flex items-center gap-3 border p-3.5" style="border-color: rgba(0,180,42,0.25); background: rgba(0,180,42,0.05)">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center" style="background: rgba(0,180,42,0.1); color: #00B42A"><ticket :size="16" /></span>
              <span class="min-w-0">
                <span class="block text-[13px] font-medium text-foreground">兑换码兑换</span>
                <span class="mt-0.5 block text-[11px] text-muted-foreground">当前可用方式</span>
              </span>
            </div>
          </div>
          <div class="mt-3 flex items-start gap-2 bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <info :size="13" class="mt-px shrink-0 opacity-70" />
            管理员在「系统设置 → 支付设置」开启在线充值后，此处将开放充值入口；当前请使用兑换码兑换额度。
          </div>
        </template>
      </n-card>

      <!-- 兑换码兑换 (真实接口) -->
      <n-card size="small">
        <template #header><span class="flex items-center gap-2 text-sm font-semibold"><span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(0,180,42,0.13); color: #00b42a"><ticket :size="14" /></span> 兑换码兑换</span></template>
        <form-row label="兑换码" hint="兑换成功后额度立即到账">
          <div class="flex gap-2">
            <n-input
              v-model:value="redeemKey"
              placeholder="输入兑换码"
              clearable
              @keyup.enter="handleRedeem"
            />
            <n-button type="primary" :loading="redeeming" class="shrink-0" @click="handleRedeem">兑换</n-button>
          </div>
        </form-row>
        <p class="mt-2 text-[11px] text-muted-foreground">兑换码由管理员生成，可在「数据看板」查看到账后的额度变化</p>
      </n-card>
    </div>

    <!-- 充值订单 (真实 TopupOrder) -->
    <n-card size="small" class="mt-4" :content-style="'padding: 0'">
      <template #header><span class="flex items-center gap-2 text-sm font-semibold"><span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(0,180,42,0.13); color: #00b42a"><circle-check :size="14" /></span> 充值订单</span></template>
      <template #header-extra><span class="text-[11px] text-muted-foreground">最近 8 条</span></template>
      <n-data-table :columns="orderColumns" :data="orders" :loading="ordersLoading" :bordered="false" size="small" :row-key="(r) => r.id" :scroll-x="isNarrow ? 390 : 760">
        <!-- Task 203-b: 空态换装 — 消耗/额度语义, chart 线稿 (原 naive 默认灰块, 同 203-a 表格空态规范) -->
        <template #empty>
          <n-empty description="暂无充值订单" style="--n-icon-size: 88px">
            <template #icon><EmptyState variant="chart" :size="88" /></template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>
  </div>
  `,
})
