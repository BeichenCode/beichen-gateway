/**
 * 数据看板 — 统计卡片 (n-card, 大数字万化) + 四图表 (ECharts: 消耗趋势面积图 /
 * 每日请求柱状 / Token 构成堆叠面积 / 模型分布环图+中心总额) + 模型排行 (n-data-table)
 * Task 103: 大数字显示简化 (多少万/多少亿) + 图表扩充美化, 全部真实数据
 * Task 117: 板块视觉升级 — 品牌渐变 Hero 欢迎横幅 (玻璃按钮, flex-wrap 根治移动端横向溢出) +
 *   统计卡彩色徽章/同系渐变卡底 + 图表/排行卡彩色标题徽章 + 引导卡品牌色化
 */
import '../flags'
import { defineComponent, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { NButton, NCard, NDataTable, NEmpty } from 'naive-ui'
import * as echarts from 'echarts/core'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { h } from 'vue'
import { apiGet } from '@/lib/api'
import { navigate } from '@/lib/router'
import { copyText } from '@/lib/utils'
import { message } from '../message'
import { renderQuota, fmtWan, tweenNum } from '../shared'
import { themeRadius } from '../theme'
import { EmptyState } from '../components/empty-state'
import { countryLabel } from '../geo'
import { useUserStore } from '../stores'
import { Coins, Wallet, Activity, Zap, Database, BookOpen, CircleCheck, Copy, X, TicketPercent, KeyRound, LifeBuoy, UserRound, Users, ChevronDown } from 'lucide-vue-next'

echarts.use([LineChart, PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

interface TrendPoint {
  date: string
  quota: number
  tokens: number
  count: number
  promptTokens: number
  completionTokens: number
}

interface StatsData {
  isAdmin: boolean
  quotaPerUnit: number
  today: { quota: number; requests: number; tokens: number }
  total: { quota: number; requests: number; promptTokens: number; completionTokens: number }
  myQuota: number
  myUsedQuota: number
  /** Task 130: 管理员本人账号的独立用量 (全站数据之外分列展示) */
  mine: {
    today: { quota: number; requests: number; tokens: number }
    total: { quota: number; requests: number }
  } | null
  channels: { total: number; enabled: number }
  userCount: number
  /** Task 133→152: 实时在线 (全站聚合 — 近15分钟活跃调用 IP / 近5分钟调用 IP, 按独立 IP 去重)
   *  Task 154: 附 IP 明细 (国家/次数/最近活跃) + selfIp (已排除的自身出口) */
  online?: {
    ips15: number
    ips5: number
    selfIp?: string
    ips15List?: Array<{ ip: string; country: string; reqs: number; lastAt: number }>
  }
  trend: TrendPoint[]
  modelDist: Array<{ model: string; quota: number; count: number }>
}

const PIE_COLORS = ['#2080f0', '#52c41a', '#faad14', '#f5222d', '#4aa3fd', '#74beff', '#63e225', '#fbbb3c']

const ONBOARD_KEY = 'sb_onboard_done_v1'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export default defineComponent({
  name: 'DashboardPage',
  components: { EmptyState },
  setup() {
    const userStore = useUserStore()
    const user = userStore.user
    const stats = ref<StatsData | null>(null)
    const loading = ref(true)

    /* Task 123: 大数字滚动 — tweenNum (shared, rAF easeOutQuart)。轮询拉到新值时
       卡片数字平滑滚动到新值而非瞬间跳变, 「实时更新」肉眼可见 (不刷新也实时) */
    const dispTodayQuota = ref(0)
    const dispTodayReq = ref(0)
    const dispTodayTokens = ref(0)
    const dispMyQuota = ref(0)
    const dispMyUsed = ref(0)
    const dispTotalReq = ref(0)
    const dispTotalQuota = ref(0)
    const dispTotalTokens = ref(0)
    const dispPrompt = ref(0)
    const dispCompletion = ref(0)
    const dispUserCount = ref(0)
    // Task 133→152: 实时在线数字滚动 (口径 = 独立 IP 数)
    const dispOnline15 = ref(0)
    const dispOnline5 = ref(0)
    // Task 154: 实时在线 IP 明细展开 (自证真实性: 每个 IP 的国家/次数/最近活跃)
    const ipDetailOpen = ref(false)
    function relTime(ts: number): string {
      const d = Date.now() - ts
      if (d < 60_000) return Math.max(1, Math.floor(d / 1000)) + ' 秒前'
      if (d < 3600_000) return Math.floor(d / 60_000) + ' 分钟前'
      return Math.floor(d / 3600_000) + ' 小时前'
    }
    // Task 130: 「我的数据」分区数字滚动
    const dispMineTodayQuota = ref(0)
    const dispMineTodayReq = ref(0)
    const dispMineTotalReq = ref(0)
    const dispMineTotalQuota = ref(0)
    function syncDisp(s: StatsData | null): void {
      if (!s) return
      tweenNum(dispTodayQuota, s.today.quota)
      tweenNum(dispTodayReq, s.today.requests)
      tweenNum(dispTodayTokens, s.today.tokens)
      tweenNum(dispMyQuota, s.myQuota)
      tweenNum(dispMyUsed, s.myUsedQuota)
      tweenNum(dispTotalReq, s.total.requests)
      tweenNum(dispTotalQuota, s.total.quota)
      tweenNum(dispTotalTokens, s.total.promptTokens + s.total.completionTokens)
      tweenNum(dispPrompt, s.total.promptTokens)
      tweenNum(dispCompletion, s.total.completionTokens)
      tweenNum(dispUserCount, s.userCount)
      if (s.online) {
        tweenNum(dispOnline15, s.online.ips15)
        tweenNum(dispOnline5, s.online.ips5)
      }
      if (s.mine) {
        tweenNum(dispMineTodayQuota, s.mine.today.quota)
        tweenNum(dispMineTodayReq, s.mine.today.requests)
        tweenNum(dispMineTotalReq, s.mine.total.requests)
        tweenNum(dispMineTotalQuota, s.mine.total.quota)
      }
    }
    const trendEl = ref<HTMLElement | null>(null)
    const barEl = ref<HTMLElement | null>(null)
    const stackEl = ref<HTMLElement | null>(null)
    const pieEl = ref<HTMLElement | null>(null)
    let trendChart: echarts.ECharts | null = null
    let barChart: echarts.ECharts | null = null
    let stackChart: echarts.ECharts | null = null
    let pieChart: echarts.ECharts | null = null

    // 新手引导 (真实状态驱动)
    const onboardHidden = ref(true)
    const onboardHasToken = ref(false)
    const onboardGateway = ref('')
    const onboardCopied = ref(false)
    const onboardDone = ref(false)

    async function load(silent = false) {
      if (inflight) return
      inflight = true
      if (!silent) loading.value = true
      else refreshing.value = true
      try {
        const resp = await apiGet<{ data: StatsData }>('/api/console/stats?days=14')
        stats.value = resp.data
        lastUpdated.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      } catch {
        /* 静默 */
      } finally {
        inflight = false
        loading.value = false
        refreshing.value = false
      }
    }

    /* Task 111: 后台自动刷新 — 用户要求「不用刷新也能看到实时最新数据」。
       Task 123 提速: 10s → 5s 轮询 (SQLite 本地聚合查询 <50ms, 无压力) +
       静默更新 (不闪 loading, 图表 ECharts 自带过渡) + 大数字滚动 tween;
       页签隐藏时暂停省流量, 回到前台立即拉一次; KeepAlive 激活重启/失活停表;
       手动暂停开关 + 最近更新时间戳, 全部透明可见 */
    const POLL_MS = 5_000
    const lastUpdated = ref('')
    const refreshing = ref(false)
    const autoOn = ref(true)
    let inflight = false
    let pollTimer: number | null = null
    function startPoll() {
      stopPoll()
      if (!autoOn.value) return
      pollTimer = window.setInterval(() => {
        if (document.visibilityState !== 'visible') return
        void load(true)
      }, POLL_MS)
    }
    function stopPoll() {
      if (pollTimer !== null) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    }
    function toggleAuto() {
      autoOn.value = !autoOn.value
      if (autoOn.value) {
        void load(true)
        startPoll()
      } else stopPoll()
    }
    function onVisibility() {
      if (document.visibilityState === 'visible' && autoOn.value) void load(true)
    }

    function initOnboard() {
      try {
        if (localStorage.getItem(ONBOARD_KEY) === '1') return
      } catch { /* ignore */ }
      onboardHidden.value = false
      apiGet<{ data: { items: unknown[] } }>('/api/console/token?page=1&size=1')
        .then((r) => (onboardHasToken.value = r.data.items.length > 0))
        .catch(() => {})
      fetch('/api/console/option', { headers: (() => { const t = localStorage.getItem('newapi_token'); return t ? { Authorization: 'Bearer ' + t } : undefined })() })
        .then((r) => r.json())
        .then((j) => {
          const sa = (j.data?.ServerAddress || '').trim().replace(/\/+$/, '')
          onboardGateway.value = sa || window.location.origin
        })
        .catch(() => (onboardGateway.value = window.location.origin))
    }

    function dismissOnboard() {
      onboardHidden.value = true
      try {
        localStorage.setItem(ONBOARD_KEY, '1')
      } catch { /* ignore */ }
    }

    function copyGateway() {
      void copyText(onboardGateway.value + '/v1').then((ok) => {
        if (ok) {
          onboardCopied.value = true
          message.success('已复制 base_url，接入时粘贴到 SDK 配置即可')
        } else message.error('复制失败，请手动复制')
      })
    }
    /* Task 125: 备用网关 (与当前访问站点互为备份, 同库同额度令牌通用) */
    const standbyGateway = () =>
      onboardGateway.value.includes('www.013.ltd') ? 'https://bz.013.ltd/v1' : 'https://www.013.ltd/v1'

    const quotaOk = () => (stats.value?.myQuota ?? 0) > 0
    const onboardSteps = [
      { n: 1, title: '创建首个令牌', done: () => onboardHasToken.value },
      { n: 2, title: '复制网关地址', done: () => onboardCopied.value },
      { n: 3, title: '充值或邀请得额度', done: quotaOk },
    ]
    const onboardDoneCount = () => onboardSteps.filter((s) => s.done()).length
    const onboardAllDone = () => onboardDoneCount() === onboardSteps.length

    /** 图表通用: 主题相关色 */
    function themeColors() {
      const isDarkNow = document.documentElement.classList.contains('dark')
      return {
        axisColor: isDarkNow ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
        splitLine: isDarkNow ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        tooltipBg: isDarkNow ? 'rgb(28,28,28)' : '#fff',
        tooltipText: isDarkNow ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.82)',
        border: isDarkNow ? 'rgb(28,28,28)' : '#fff',
      }
    }

    function grad(c1: string, c2: string) {
      return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 },
      ])
    }

    /* Task 203-a: tooltip 与卡片贴合 — 圆角走 themeRadius 通道 + 收敛的两层投影 (纯样式参数) */
    function tooltipCss() {
      return `border-radius:${themeRadius.value}px;box-shadow:0 4px 14px -4px rgba(31,35,41,0.16);`
    }

    function renderCharts() {
      const s = stats.value
      if (!s) return
      const { axisColor, splitLine, tooltipBg, tooltipText, border } = themeColors()
      const dates = s.trend.map((t) => t.date.slice(5))

      // ── ① 消耗趋势: 渐变面积 + 双系列 (¥ 面积 / 请求次线) ──
      if (trendEl.value) {
        if (!trendChart) trendChart = echarts.init(trendEl.value)
        trendChart.setOption({
          grid: { top: 28, right: 12, bottom: 24, left: 8, containLabel: true },
          tooltip: {
            trigger: 'axis',
            backgroundColor: tooltipBg,
            borderColor: 'rgba(128,128,128,0.25)',
            textStyle: { color: tooltipText, fontSize: 12 },
            extraCssText: tooltipCss(),
          },
          legend: {
            top: 0,
            right: 0,
            itemWidth: 12,
            itemHeight: 8,
            textStyle: { color: axisColor, fontSize: 11 },
          },
          xAxis: {
            type: 'category',
            data: dates,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: axisColor, fontSize: 11 },
          },
          yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: axisColor, fontSize: 11 },
            splitLine: { lineStyle: { color: splitLine, type: 'dashed' } },
          },
          series: [
            {
              name: '消耗 (¥)',
              type: 'line',
              smooth: true,
              symbol: 'circle',
              symbolSize: 5,
              showSymbol: false,
              data: s.trend.map((t) => Number((t.quota / s.quotaPerUnit).toFixed(4))),
              lineStyle: { color: '#2080f0', width: 2.2 },
              itemStyle: { color: '#2080f0' },
              areaStyle: { color: grad('rgba(32,128,240,0.30)', 'rgba(32,128,240,0.01)') },
            },
            {
              name: '请求次数',
              type: 'line',
              smooth: true,
              symbol: 'none',
              data: s.trend.map((t) => t.count),
              lineStyle: { color: '#52c41a', width: 1.6, type: 'dashed' },
              itemStyle: { color: '#52c41a' },
            },
          ],
        })
      }

      // ── ② 每日请求量: 渐变圆角柱 ──
      if (barEl.value) {
        if (!barChart) barChart = echarts.init(barEl.value)
        barChart.setOption({
          grid: { top: 16, right: 12, bottom: 24, left: 8, containLabel: true },
          tooltip: {
            trigger: 'axis',
            backgroundColor: tooltipBg,
            borderColor: 'rgba(128,128,128,0.25)',
            textStyle: { color: tooltipText, fontSize: 12 },
            extraCssText: tooltipCss(),
          },
          xAxis: {
            type: 'category',
            data: dates,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: axisColor, fontSize: 11 },
          },
          yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: axisColor, fontSize: 11 },
            splitLine: { lineStyle: { color: splitLine, type: 'dashed' } },
          },
          series: [
            {
              name: '请求次数',
              type: 'bar',
              barMaxWidth: 18,
              itemStyle: { borderRadius: [3, 3, 0, 0], color: grad('#4aa3fd', 'rgba(32,128,240,0.28)') },
              data: s.trend.map((t) => t.count),
            },
          ],
        })
      }

      // ── ③ Token 构成: 输入/输出堆叠面积 ──
      if (stackEl.value) {
        if (!stackChart) stackChart = echarts.init(stackEl.value)
        stackChart.setOption({
          grid: { top: 28, right: 12, bottom: 24, left: 8, containLabel: true },
          tooltip: {
            trigger: 'axis',
            backgroundColor: tooltipBg,
            borderColor: 'rgba(128,128,128,0.25)',
            textStyle: { color: tooltipText, fontSize: 12 },
            extraCssText: tooltipCss(),
            valueFormatter: (v: unknown) => fmtWan(Number(v)),
          },
          legend: {
            top: 0,
            right: 0,
            itemWidth: 12,
            itemHeight: 8,
            textStyle: { color: axisColor, fontSize: 11 },
          },
          xAxis: {
            type: 'category',
            data: dates,
            axisLine: { show: false },
            axisTick: { show: false },
            boundaryGap: false,
            axisLabel: { color: axisColor, fontSize: 11 },
          },
          yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: axisColor,
              fontSize: 11,
              formatter: (v: number) => fmtWan(v),
            },
            splitLine: { lineStyle: { color: splitLine, type: 'dashed' } },
          },
          series: [
            {
              name: '输入 tokens',
              type: 'line',
              stack: 'tokens',
              smooth: true,
              symbol: 'none',
              data: s.trend.map((t) => t.promptTokens),
              lineStyle: { width: 0 },
              areaStyle: { color: grad('rgba(74,163,253,0.45)', 'rgba(74,163,253,0.08)') },
            },
            {
              name: '输出 tokens',
              type: 'line',
              stack: 'tokens',
              smooth: true,
              symbol: 'none',
              data: s.trend.map((t) => t.completionTokens),
              lineStyle: { width: 0 },
              areaStyle: { color: grad('rgba(98,225,90,0.42)', 'rgba(98,225,90,0.06)') },
            },
          ],
        })
      }

      // ── ④ 模型分布: 环图 + 中心总额 ──
      if (pieEl.value) {
        const pieData = s.modelDist.filter((m) => m.quota > 0).map((m) => ({ name: m.model, value: Number((m.quota / s.quotaPerUnit).toFixed(4)) }))
        if (!pieChart) pieChart = echarts.init(pieEl.value)
        const totalCny = s.modelDist.reduce((acc, m) => acc + m.quota, 0) / s.quotaPerUnit
        pieChart.setOption({
          tooltip: { trigger: 'item', backgroundColor: tooltipBg, borderColor: 'rgba(128,128,128,0.25)', textStyle: { color: tooltipText, fontSize: 12 }, extraCssText: tooltipCss() },
          legend: { bottom: 0, textStyle: { color: axisColor, fontSize: 11 }, type: 'scroll', itemWidth: 12, itemHeight: 8 },
          title: {
            text: renderQuota(Math.round(totalCny * s.quotaPerUnit), s.quotaPerUnit, true),
            subtext: '近 14 天总消耗',
            left: 'center',
            top: '34%',
            itemGap: 4,
            textStyle: { fontSize: 20, fontWeight: 700, color: tooltipText },
            subtextStyle: { fontSize: 11, color: axisColor },
          },
          series: [
            {
              type: 'pie',
              radius: ['52%', '72%'],
              center: ['50%', '44%'],
              itemStyle: { borderRadius: 3, borderWidth: 2, borderColor: border },
              label: { show: false },
              emphasis: {
                scale: true,
                scaleSize: 6,
                label: { show: false },
              },
              data: pieData.map((d, i) => ({ ...d, itemStyle: { color: PIE_COLORS[i % PIE_COLORS.length] } })),
            },
          ],
        })
      }
    }

    const onResize = () => {
      trendChart?.resize()
      barChart?.resize()
      stackChart?.resize()
      pieChart?.resize()
    }

    onMounted(async () => {
      await load()
      initOnboard()
      renderCharts()
      window.addEventListener('resize', onResize)
      document.addEventListener('visibilitychange', onVisibility)
      startPoll()
    })
    onActivated(() => {
      // KeepAlive 页签切回: 立即拉最新 + 恢复轮询 (onDeactivated 已停表)
      if (autoOn.value) void load(true)
      startPoll()
    })
    onDeactivated(stopPoll)
    watch(stats, (s) => {
      syncDisp(s)
      renderCharts()
    })
    onBeforeUnmount(() => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      stopPoll()
      trendChart?.dispose()
      barChart?.dispose()
      stackChart?.dispose()
      pieChart?.dispose()
    })

    const rankColumns = [
      {
        title: '排名',
        key: 'rank',
        width: 80,
        render: (_row: unknown, i: number) =>
          h('span', { class: 'inline-flex items-center justify-center text-xs font-bold text-muted-foreground' }, String(i + 1)),
      },
      { title: '模型', key: 'model', render: (row: { model: string }) => h('code', { class: 'font-mono text-xs' }, row.model) },
      { title: '调用次数', key: 'count', render: (row: { count: number }) => h('span', { class: 'text-sm' }, fmtWan(row.count)) },
      {
        title: '消耗额度',
        key: 'quota',
        render: (row: { quota: number }) => h('span', { class: 'font-mono text-xs' }, renderQuota(row.quota, stats.value?.quotaPerUnit ?? 500000, true)),
      },
    ]

    const copyModelName = (m: string) => {
      void copyText(m).then((ok) => (ok ? message.success('模型名已复制: ' + m) : message.error('复制失败，请手动复制')))
    }

    return {
      user, userStore, stats, loading, navigate, greeting, message, fmtWan,
      dispTodayQuota, dispTodayReq, dispTodayTokens, dispMyQuota, dispMyUsed,
      dispTotalReq, dispTotalQuota, dispTotalTokens, dispPrompt, dispCompletion, dispUserCount,
      dispOnline15, dispOnline5, ipDetailOpen, relTime, countryLabel,
      dispMineTodayQuota, dispMineTodayReq, dispMineTotalReq, dispMineTotalQuota,
      lastUpdated, refreshing, autoOn, toggleAuto,
      trendEl, barEl, stackEl, pieEl, rankColumns, copyModelName,
      onboardHidden, onboardSteps, onboardDoneCount, onboardAllDone, dismissOnboard, copyGateway, onboardGateway, onboardHasToken, onboardCopied, quotaOk, standbyGateway,
      renderQuota, NButton, NCard, NDataTable, NEmpty,
      Coins, Wallet, Activity, Zap, Database, BookOpen, CircleCheck, Copy, X, TicketPercent, KeyRound, LifeBuoy, UserRound, Users, ChevronDown,
    }
  },
  template: `
  <div>
    <page-header title="数据看板" :description="'欢迎回来，' + (user?.displayName || user?.username || '') + '，以下是您的用量概览'" />

    <!-- 欢迎横幅 (Task 117: 品牌渐变 Hero 替代素白卡 — 装饰圆 + 玻璃按钮; 按钮组 flex-wrap 根治移动端横向溢出) -->
    <div
      class="relative mb-4 overflow-hidden"
      style="border-radius: 8px; background: linear-gradient(118deg, #4338ca 0%, #6366f1 52%, #7c3aed 100%)"
    >
      <div class="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full" style="background: rgba(255,255,255,0.10)"></div>
      <div class="pointer-events-none absolute right-16 -bottom-24 h-44 w-44 rounded-full" style="background: rgba(255,255,255,0.07)"></div>
      <div class="pointer-events-none absolute -left-12 -bottom-20 h-40 w-40 rounded-full" style="background: rgba(255,255,255,0.06)"></div>
      <div class="relative flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7 md:py-6">
        <div class="min-w-0">
          <h2 class="truncate text-lg font-bold text-white md:text-xl">{{ greeting() }}，{{ user?.displayName || user?.username || '朋友' }}，欢迎回来</h2>
          <p class="mt-1.5 text-[12.5px] leading-relaxed text-white/70">
            {{ user?.systemName || '北辰中转站' }} · OpenAI / Claude 兼容接口，统一密钥、多通道路由与实时用量统计
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <!-- Task 111: 实时状态胶囊 — 呼吸点 + 最近更新时间 + 暂停/恢复开关 (逻辑不变, 玻璃化适配渐变底) -->
          <button
            type="button"
            class="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-2.5 py-2 transition hover:bg-white/20"
            style="border-radius: 6px"
            :title="autoOn ? '实时更新中，每 5 秒自动拉取最新数据；点击暂停' : '已暂停自动更新；点击恢复'"
            @click="toggleAuto"
          >
            <span class="relative flex h-2 w-2">
              <span
                v-if="autoOn && !refreshing"
                class="absolute inline-flex h-full w-full rounded-full opacity-60" style="background:#7dffb8; animation: dash-live-pulse 2s ease-out infinite"
              />
              <span class="relative inline-flex h-2 w-2 rounded-full" :style="{ background: refreshing ? '#ffd666' : autoOn ? '#7dffb8' : 'rgba(255,255,255,0.45)' }" />
            </span>
            <span class="text-[11px] font-medium text-white">{{ autoOn ? '实时' : '已暂停' }}</span>
            <span v-if="lastUpdated" class="text-[11px] tabular-nums text-white/70">{{ lastUpdated }}</span>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 bg-white px-3.5 py-2 text-[13px] font-semibold text-[#4338ca] shadow-sm transition hover:bg-white/90 active:scale-[0.97]"
            style="border-radius: 6px"
            @click="navigate('/token')"
          >
            <key-round :size="15" />
            新建令牌
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-white/20 active:scale-[0.97]"
            style="border-radius: 6px"
            @click="navigate('/ticket')"
          >
            <life-buoy :size="15" />
            工单支持
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-white/20 active:scale-[0.97]"
            style="border-radius: 6px"
            @click="navigate('/about')"
          >
            <book-open :size="15" />
            接入文档
          </button>
        </div>
      </div>
    </div>

    <!-- 新手引导卡 (真实状态驱动) -->
    <n-card
      v-if="!onboardHidden && !onboardAllDone()"
      size="small"
      class="mb-4"
      style="border-color: rgba(99,102,241,0.30); background: linear-gradient(120deg, rgba(99,102,241,0.10), rgba(124,58,237,0.05) 55%, rgba(124,58,237,0.01))"
    >
      <div class="flex items-center gap-2 pr-8">
        <ticket-percent :size="15" class="shrink-0 text-[#6366f1]" />
        <span class="shrink-0 whitespace-nowrap text-[13px] font-semibold text-foreground">三步开始调用</span>
        <span class="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">{{ onboardDoneCount() }}/{{ onboardSteps.length }} 已完成</span>
        <!-- Task 204: 窄屏隐藏 80px 进度条 (标题/计数 nowrap 后 375px 下临界挤压换行), sm 起恢复 -->
        <n-progress
          class="ml-1 hidden sm:block" style="width: 80px" type="line" :show-indicator="false"
          :percentage="Math.round((onboardDoneCount() / onboardSteps.length) * 100)" :height="4"
        />
        <n-button quaternary size="tiny" class="absolute right-3 top-3" title="不再显示" @click="dismissOnboard">
          <template #icon><x :size="13" /></template>
        </n-button>
      </div>
      <div class="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          v-for="s in onboardSteps"
          :key="s.n"
          class="border p-3.5 transition-colors"
          :style="s.done() ? 'border-color:rgba(0,180,42,0.3);background:rgba(0,180,42,0.04)' : ''"
        >
          <div class="flex items-center gap-2">
            <span
              class="flex items-center justify-center rounded-full text-white"
              :style="{ height: '20px', width: '20px', background: s.done() ? '#00B42A' : 'rgba(99,102,241,0.15)', color: s.done() ? '#fff' : '#6366f1' }"
            >
              <circle-check v-if="s.done()" :size="12" />
              <span v-else class="text-[11px] font-bold">{{ s.n }}</span>
            </span>
            <span class="text-[13px] font-medium" :style="s.done() ? 'color:#00B42A' : ''">{{ s.title }}</span>
          </div>
          <p class="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {{ s.n === 1 ? (onboardHasToken ? '令牌已就绪，可用于全部在线模型' : '令牌即调用密钥，一分钟创建')
              : s.n === 2 ? (onboardCopied ? '接入时把 base_url 指向该地址' : 'SDK 的 base_url 指向网关即可')
              : (quotaOk() ? '当前余额 ' + renderQuota(stats?.myQuota ?? 0, stats?.quotaPerUnit ?? 500000, true) : '兑换码 / 在线充值 / 邀请好友均可') }}
          </p>
          <div v-if="s.n === 1 && !onboardHasToken" class="mt-2.5">
            <n-button size="tiny" type="primary" @click="navigate('/token')">去创建</n-button>
          </div>
          <div v-else-if="s.n === 2" class="mt-2.5 flex min-w-0 flex-col gap-1.5">
            <div class="flex min-w-0 items-center gap-1.5">
              <code class="truncate bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground" :title="onboardGateway + '/v1'">{{ onboardGateway }}/v1</code>
              <n-button quaternary size="tiny" title="复制 base_url" @click="copyGateway">
                <template #icon><copy :size="12" /></template>
              </n-button>
            </div>
            <div class="text-[10.5px] leading-snug text-muted-foreground">备用网关 <code class="font-mono">{{ standbyGateway() }}</code>，令牌通用，主站慢时可换用</div>
          </div>
          <div v-else-if="s.n === 3 && !quotaOk()" class="mt-2.5 flex gap-1.5">
            <n-button size="tiny" type="primary" @click="navigate('/wallet')">去充值</n-button>
            <n-button size="tiny" quaternary @click="navigate('/invite')">去邀请</n-button>
          </div>
        </div>
      </div>
    </n-card>

    <!-- 统计卡片 (Task 117: 彩色徽章 + 同系渐变卡底, 移动端 2 列紧凑不变, 桌面 4 列)
         Task 123: 指针丝滑交互 — data-tilt (3D 微倾斜 + 指针光斑 + 弹性回正),
         --t-glow/--t-spot 传各卡主题色; 大数字滚动 tween 实时可见 -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <n-card size="small" class="group" data-tilt style="--t-glow: rgba(32,128,240,0.45); --t-spot: rgba(32,128,240,0.09); background: linear-gradient(135deg, rgba(32,128,240,0.09), rgba(32,128,240,0.015) 60%)">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style="border-radius: 8px; background: rgba(32,128,240,0.15); color: #2080f0"><coins :size="16" /></span>
          <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">今日消耗</span>
        </div>
        <div class="mt-2 sm:mt-3.5 text-[20px] sm:text-[26px] font-bold leading-none tabular-nums text-foreground">{{ stats ? renderQuota(dispTodayQuota, stats.quotaPerUnit, true) : '-' }}</div>
        <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">{{ stats ? '今日请求 ' + fmtWan(dispTodayReq) + ' 次 · ' + fmtWan(dispTodayTokens) + ' tokens' : '' }}</div>
      </n-card>
      <!-- 管理员首排第二卡: 实时在线 (Task 133: 用户反馈全站看板放「剩余额度」无用 —
           管理员本人的余额已在下方「我的数据」分列; 改为全站实时在线/调用人数。
           普通用户仍保留自己的剩余额度卡 — 那是他们最关心的资产数据) -->
      <n-card v-if="stats?.isAdmin" size="small" class="group" data-tilt style="--t-glow: rgba(0,180,42,0.42); --t-spot: rgba(0,180,42,0.08); background: linear-gradient(135deg, rgba(0,180,42,0.09), rgba(0,180,42,0.015) 60%)">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style="border-radius: 8px; background: rgba(0,180,42,0.14); color: #00b42a"><users :size="16" /></span>
          <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">实时在线</span>
        </div>
        <div class="mt-2 sm:mt-3.5 text-[20px] sm:text-[26px] font-bold leading-none tabular-nums text-foreground">{{ stats ? fmtWan(dispOnline15) + ' 个 IP' : '-' }}</div>
        <div class="mt-1.5 sm:mt-2.5 flex items-center justify-between gap-2">
          <span class="text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">{{ stats ? '近 15 分钟活跃 · 5 分钟内调用 ' + fmtWan(dispOnline5) + ' 个' : '' }}</span>
          <button
            class="inline-flex shrink-0 items-center gap-0.5 text-[10.5px] font-medium transition-colors"
            :style="{ color: ipDetailOpen ? '#00b42a' : 'var(--muted-foreground)' }"
            @click="ipDetailOpen = !ipDetailOpen"
          >
            明细
            <chevron-down :size="11" class="transition-transform duration-200" :class="ipDetailOpen ? 'rotate-180' : ''" />
          </button>
        </div>
        <!-- Task 154: IP 明细 — 每个 IP 的国家归属/请求次数/最近活跃, 数字真实可核对 -->
        <div v-if="ipDetailOpen" class="mt-2 border-t border-[var(--border)] pt-2">
          <div v-if="!stats?.online?.ips15List?.length" class="py-1 text-[11px] text-muted-foreground">近 15 分钟暂无外部调用</div>
          <div v-else class="naive-scrollbar flex flex-col gap-1" style="max-height: 168px; overflow-y: auto">
            <div v-for="it in stats.online.ips15List" :key="it.ip" class="flex items-center gap-2 text-[11px] leading-tight">
              <span class="shrink-0 rounded px-1 py-px font-medium" style="background: rgba(0,180,42,0.1); color: #00b42a">{{ countryLabel(it.country) || '未知' }}</span>
              <span class="min-w-0 flex-1 truncate font-mono tabular-nums" :title="it.ip" style="color: var(--foreground)">{{ it.ip }}</span>
              <span class="shrink-0 tabular-nums text-muted-foreground">{{ it.reqs }} 次 · {{ relTime(it.lastAt) }}</span>
            </div>
          </div>
          <div class="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
            每次真实 API 调用的来源 IP · 已排除回环与服务器自身探测{{ stats.online.selfIp ? ' (' + stats.online.selfIp + ')' : '' }}；同一宽带的 IPv4 / IPv6 会各计一个
          </div>
        </div>
      </n-card>
      <n-card v-else size="small" class="group" data-tilt style="--t-glow: rgba(0,180,42,0.42); --t-spot: rgba(0,180,42,0.08); background: linear-gradient(135deg, rgba(0,180,42,0.09), rgba(0,180,42,0.015) 60%)">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style="border-radius: 8px; background: rgba(0,180,42,0.14); color: #00b42a"><wallet :size="16" /></span>
          <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">剩余额度</span>
        </div>
        <div class="mt-2 sm:mt-3.5 text-[20px] sm:text-[26px] font-bold leading-none tabular-nums text-foreground">{{ stats ? renderQuota(dispMyQuota, stats.quotaPerUnit, true) : '-' }}</div>
        <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">{{ stats ? '已用 ' + renderQuota(dispMyUsed, stats.quotaPerUnit, true) : '' }}</div>
      </n-card>
      <n-card size="small" class="group" data-tilt style="--t-glow: rgba(250,140,22,0.45); --t-spot: rgba(250,140,22,0.09); background: linear-gradient(135deg, rgba(250,140,22,0.10), rgba(250,140,22,0.015) 60%)">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style="border-radius: 8px; background: rgba(250,140,22,0.15); color: #fa8c16"><activity :size="16" /></span>
          <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">累计请求</span>
        </div>
        <div class="mt-2 sm:mt-3.5 text-[20px] sm:text-[26px] font-bold leading-none tabular-nums text-foreground">{{ stats ? fmtWan(dispTotalReq) : '-' }}</div>
        <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">{{ stats ? '累计消耗 ' + renderQuota(dispTotalQuota, stats.quotaPerUnit, true) : '' }}</div>
      </n-card>
      <n-card size="small" class="group" data-tilt style="--t-glow: rgba(124,58,237,0.45); --t-spot: rgba(124,58,237,0.09); background: linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.015) 60%)">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style="border-radius: 8px; background: rgba(124,58,237,0.14); color: #7c3aed">
            <database v-if="stats?.isAdmin" :size="16" /><zap v-else :size="16" />
          </span>
          <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">{{ stats?.isAdmin ? '渠道状态' : '累计 Tokens' }}</span>
        </div>
        <div class="mt-2 sm:mt-3.5 text-[20px] sm:text-[26px] font-bold leading-none tabular-nums text-foreground">
          {{ stats?.isAdmin ? (stats.channels.enabled + ' / ' + stats.channels.total) : (stats ? fmtWan(dispTotalTokens) : '-') }}
        </div>
        <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">
          {{ stats?.isAdmin ? ('系统用户 ' + fmtWan(dispUserCount) + ' 人') : (stats ? '输入 ' + fmtWan(dispPrompt) + ' / 输出 ' + fmtWan(dispCompletion) : '') }}
        </div>
      </n-card>
    </div>

    <!-- 管理员「我的数据」(Task 130: 管理员本人账号的用量与全站数据分列展示) -->
    <div v-if="stats?.isAdmin && stats.mine" class="mt-4">
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <span class="flex h-5 w-5 shrink-0 items-center justify-center" style="border-radius: 5px; background: rgba(14,165,233,0.14); color: #0ea5e9"><user-round :size="12" /></span>
        <span class="text-[13px] font-semibold text-foreground">我的数据</span>
        <span class="text-[11px] text-muted-foreground">管理员本人账号的独立用量 · 与上方全站数据分开统计</span>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <n-card size="small" class="group" data-tilt style="--t-glow: rgba(14,165,233,0.45); --t-spot: rgba(14,165,233,0.09); background: linear-gradient(135deg, rgba(14,165,233,0.09), rgba(14,165,233,0.015) 60%)">
          <div class="flex items-center gap-2 sm:gap-3">
            <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style="border-radius: 8px; background: rgba(14,165,233,0.15); color: #0ea5e9"><coins :size="16" /></span>
            <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">我的今日消耗</span>
          </div>
          <div class="mt-2 sm:mt-3.5 text-[20px] sm:text-[26px] font-bold leading-none tabular-nums text-foreground">{{ stats ? renderQuota(dispMineTodayQuota, stats.quotaPerUnit, true) : '-' }}</div>
          <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">{{ stats ? '本人请求 ' + fmtWan(dispMineTodayReq) + ' 次' : '' }}</div>
        </n-card>
        <n-card size="small" class="group" data-tilt style="--t-glow: rgba(99,102,241,0.45); --t-spot: rgba(99,102,241,0.09); background: linear-gradient(135deg, rgba(99,102,241,0.10), rgba(99,102,241,0.015) 60%)">
          <div class="flex items-center gap-2 sm:gap-3">
            <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style="border-radius: 8px; background: rgba(99,102,241,0.15); color: #6366f1"><activity :size="16" /></span>
            <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">我的累计请求</span>
          </div>
          <div class="mt-2 sm:mt-3.5 text-[20px] sm:text-[26px] font-bold leading-none tabular-nums text-foreground">{{ stats ? fmtWan(dispMineTotalReq) : '-' }}</div>
          <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">本人账号全部调用</div>
        </n-card>
        <n-card size="small" class="group" data-tilt style="--t-glow: rgba(20,184,166,0.45); --t-spot: rgba(20,184,166,0.09); background: linear-gradient(135deg, rgba(20,184,166,0.10), rgba(20,184,166,0.015) 60%)">
          <div class="flex items-center gap-2 sm:gap-3">
            <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style="border-radius: 8px; background: rgba(20,184,166,0.15); color: #14b8a6"><wallet :size="16" /></span>
            <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">我的剩余额度</span>
          </div>
          <div class="mt-2 sm:mt-3.5 text-[20px] sm:text-[26px] font-bold leading-none tabular-nums text-foreground">{{ stats ? renderQuota(dispMyQuota, stats.quotaPerUnit, true) : '-' }}</div>
          <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">{{ stats ? '已用 ' + renderQuota(dispMyUsed, stats.quotaPerUnit, true) : '' }}</div>
        </n-card>
        <n-card size="small" class="group" data-tilt style="--t-glow: rgba(244,63,94,0.45); --t-spot: rgba(244,63,94,0.09); background: linear-gradient(135deg, rgba(244,63,94,0.10), rgba(244,63,94,0.015) 60%)">
          <div class="flex items-center gap-2 sm:gap-3">
            <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style="border-radius: 8px; background: rgba(244,63,94,0.15); color: #f43f5e"><zap :size="16" /></span>
            <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">我的累计消耗</span>
          </div>
          <div class="mt-2 sm:mt-3.5 text-[20px] sm:text-[26px] font-bold leading-none tabular-nums text-foreground">{{ stats ? renderQuota(dispMineTotalQuota, stats.quotaPerUnit, true) : '-' }}</div>
          <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">本人账号累计扣费</div>
        </n-card>
      </div>
    </div>

    <!-- 图表 第一行: 消耗趋势 + 模型分布(中心总额) -->
    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <n-card size="small" class="lg:col-span-2" data-tilt style="--t-glow: rgba(32,128,240,0.35); --t-spot: rgba(32,128,240,0.07)">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(32,128,240,0.14); color: #2080f0"><trending-up :size="14" /></span>
            <span class="text-sm font-semibold">消耗趋势</span>
          </div>
        </template>
        <template #header-extra><span class="text-xs text-muted-foreground">近 14 天</span></template>
        <div class="relative" style="height: 288px">
          <div ref="trendEl" style="height: 100%; width: 100%"></div>
          <div v-if="stats && stats.total.requests === 0" class="absolute inset-0 flex items-center justify-center">
            <n-empty description="暂无消耗数据" style="--n-icon-size: 96px">
              <!-- Task 184-b: 空态图标换装 — 消耗趋势语义线稿 -->
              <template #icon><EmptyState variant="chart" :size="96" /></template>
              <template #extra>
                <div class="text-xs text-muted-foreground">创建令牌发起首次调用后展示趋势</div>
                <n-button size="small" type="primary" class="mt-2" @click="navigate('/token')">新建令牌</n-button>
              </template>
            </n-empty>
          </div>
        </div>
      </n-card>
      <n-card size="small" data-tilt style="--t-glow: rgba(124,58,237,0.35); --t-spot: rgba(124,58,237,0.07)">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(124,58,237,0.13); color: #7c3aed"><pie-chart :size="14" /></span>
            <span class="text-sm font-semibold">模型消耗分布</span>
          </div>
        </template>
        <template #header-extra><span class="text-xs text-muted-foreground">近 14 天</span></template>
        <div style="height: 288px"><div ref="pieEl" style="height: 100%; width: 100%"></div></div>
      </n-card>
    </div>

    <!-- 图表 第二行: 每日请求量 + Token 构成 -->
    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <n-card size="small" data-tilt style="--t-glow: rgba(0,180,42,0.35); --t-spot: rgba(0,180,42,0.07)">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(0,180,42,0.13); color: #00b42a"><bar-chart-3 :size="14" /></span>
            <span class="text-sm font-semibold">每日请求量</span>
          </div>
        </template>
        <template #header-extra><span class="text-xs text-muted-foreground">近 14 天</span></template>
        <div style="height: 240px"><div ref="barEl" style="height: 100%; width: 100%"></div></div>
      </n-card>
      <n-card size="small" data-tilt style="--t-glow: rgba(14,165,233,0.35); --t-spot: rgba(14,165,233,0.07)">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(14,165,233,0.13); color: #0ea5e9"><layers :size="14" /></span>
            <span class="text-sm font-semibold">Token 构成</span>
          </div>
        </template>
        <template #header-extra><span class="text-xs text-muted-foreground">输入 / 输出堆叠 · 近 14 天</span></template>
        <div style="height: 240px"><div ref="stackEl" style="height: 100%; width: 100%"></div></div>
      </n-card>
    </div>

    <!-- 模型排行 -->
    <n-card size="small" class="mt-4" data-tilt style="--t-glow: rgba(250,140,22,0.35); --t-spot: rgba(250,140,22,0.07)">
      <template #header>
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(250,140,22,0.14); color: #fa8c16"><trophy :size="14" /></span>
          <span class="text-sm font-semibold">模型调用排行</span>
        </div>
      </template>
      <template #header-extra><span class="text-xs text-muted-foreground">近 14 天</span></template>
      <n-data-table
        :columns="rankColumns"
        :data="stats?.modelDist ?? []"
        :bordered="false"
        size="small"
        :row-key="(r) => r.model"
      >
        <!-- Task 203-a: 空态换装 — 模型排行语义线稿 (原 naive 默认灰块图标) -->
        <template #empty>
          <n-empty description="暂无模型调用数据" style="--n-icon-size: 88px">
            <template #icon><EmptyState variant="cube" :size="88" /></template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>
  </div>
  `,
})
