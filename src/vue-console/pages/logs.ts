/**
 * 调用日志 — 历史浏览 (n-data-table type=expand 原生展开行)
 * 汇总条 (当前接口响应真实聚合) + 类型筛选 (n-radio-button) + 文本筛选 (防抖) + 竞态守卫
 */
import '../flags'
import { defineComponent, h, onMounted, onBeforeUnmount, ref, watch , computed} from 'vue'
import { NButton, NDataTable, NInput, NTag } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { apiGet } from '@/lib/api'
import { navigate } from '@/lib/router'
import { copyText } from '@/lib/utils'
import { message } from '../message'
import { fmtWan, renderQuota } from '../shared'
import { EmptyState } from '../components/empty-state'
import { vendorColorOf } from '../vendors'
import { countryLabel } from '../geo'
import { useUserStore } from '../stores'
import {
  RefreshCw, Search, ChevronDown, Coins, Zap, Activity, Layers, KeyRound, Database, UserRound, Globe,
} from 'lucide-vue-next'

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

interface LogItem {
  id: number
  userId: number
  username: string
  type: number
  channelId: number | null
  channelName: string
  tokenName: string
  modelName: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  useTime: number
  isStream: boolean
  quota: number
  content: string
  ip?: string
  country?: string
  createdAt: string
}

/** Task 154: IP + 国家归属渲染 (列内 & 展开详情共用) */
function ipLocation(ip: string | undefined, country: string | undefined): { ip: string; region: string } {
  return { ip: ip || '', region: countryLabel(country) }
}

function smartTime(t: string): { short: string; full: string } {
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  const full = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  const now = new Date()
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  let short: string
  if (d.toDateString() === now.toDateString()) short = `今天 ${hm}`
  else if (d.toDateString() === yest.toDateString()) short = `昨天 ${hm}`
  else if (d.getFullYear() === now.getFullYear()) short = `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm.slice(0, 5)}`
  else short = full
  return { short, full }
}

export default defineComponent({
  name: 'LogsPage',
  components: { EmptyState },
  setup() {
    const isNarrow = useNarrow()
    const userStore = useUserStore()
    const user = userStore.user
    const isAdmin = (user?.role ?? 0) >= 10
    const quotaPerUnit = user?.quotaPerUnit ?? 500000
    const displayInCurrency = user?.displayInCurrency ?? true

    const logs = ref<LogItem[]>([])
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(20)
    const loading = ref(true)
    const filters = ref({ type: '', modelName: '', tokenName: '', username: '', channelName: '' })
    const expandedKeys = ref<Array<number>>([])
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let reqId = 0

    async function load() {
      const rid = ++reqId
      loading.value = true
      try {
        const params = new URLSearchParams({ page: String(page.value), size: String(pageSize.value) })
        const f = filters.value
        if (f.type) params.set('type', f.type)
        if (f.modelName) params.set('modelName', f.modelName)
        if (f.tokenName) params.set('tokenName', f.tokenName)
        if (isAdmin && f.username) params.set('username', f.username)
        if (isAdmin && f.channelName) params.set('channelName', f.channelName)
        const resp = await apiGet<{ data: { items: LogItem[]; total: number } }>(`/api/console/log?${params}`)
        if (rid !== reqId) return
        logs.value = resp.data.items
        total.value = resp.data.total
      } catch (e) {
        if (rid === reqId) message.error((e as Error).message)
      } finally {
        if (rid === reqId) loading.value = false
      }
    }

    onMounted(() => void load())
    onBeforeUnmount(() => {
      if (debounceTimer) clearTimeout(debounceTimer)
    })

    // 文本筛选 300ms 防抖, 切筛选自动回第 1 页
    watch(
      () => ({ ...filters.value, type: undefined as string | undefined }),
      () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          page.value = 1
          expandedKeys.value = []
          void load()
        }, 300)
      },
    )
    function setType(v: string) {
      filters.value = { ...filters.value, type: v }
      page.value = 1
      expandedKeys.value = []
      void load()
    }
    const hasFilter = () => {
      const f = filters.value
      return Boolean(f.type || f.modelName || f.tokenName || f.username || f.channelName)
    }
    function resetFilters() {
      filters.value = { type: '', modelName: '', tokenName: '', username: '', channelName: '' }
      expandedKeys.value = []
      page.value = 1
      void load()
    }

    // 汇总条: 只聚合当前接口响应的真实数据 (真实数据纪律)
    const summary = () => {
      const cons = logs.value.filter((l) => l.type === 2)
      const quota = cons.reduce((a, l) => a + l.quota, 0)
      const tokens = cons.reduce((a, l) => a + l.totalTokens, 0)
      const promptTokens = cons.reduce((a, l) => a + l.promptTokens, 0)
      const completionTokens = cons.reduce((a, l) => a + l.completionTokens, 0)
      const timed = cons.filter((l) => l.useTime > 0)
      const avg = timed.length > 0 ? timed.reduce((a, l) => a + l.useTime, 0) / timed.length / 1000 : 0
      return { quota, tokens, promptTokens, completionTokens, avg, count: cons.length }
    }

    const quotaPerUnitOf = () => quotaPerUnit
    const displayInCurrencyOf = () => displayInCurrency

    function tokenBar(p: number, c: number) {
      const tot = p + c
      if (tot <= 0) return null
      const inPct = Math.round((p / tot) * 100)
      return h('div', {
        class: 'mt-1.5 flex overflow-hidden bg-muted',
        style: 'height:4px;width:130px;max-width:100%',
        title: `输入占比 ${inPct}% · 输出占比 ${100 - inPct}%`,
      }, [
        h('span', { style: `height:100%;width:${inPct}%;background:#4aa3fd` }),
        h('span', { style: 'height:100%;flex:1;background:rgba(82,196,26,0.55)' }),
      ])
    }

    function copyContent(text: string) {
      void copyText(text).then((ok) => (ok ? message.success('已复制') : message.error('复制失败')))
    }

    function renderDetail(l: LogItem) {
      const tm = smartTime(l.createdAt)
      const secs = l.useTime / 1000
      const chip = (icon: unknown, text: string) =>
        h('span', { class: 'inline-flex items-center gap-1 border border-[var(--border)] bg-card px-2 py-1 text-[11px] text-muted-foreground' }, [h(icon as never, { size: 12 }), text])
      return h('div', { class: 'p-4', style: 'background: rgba(128,128,128,0.04)' }, [
        h('div', { class: 'flex flex-wrap items-center gap-2' }, [
          chip(Database, `渠道 ${l.channelName || '-'}`),
          chip(KeyRound, `令牌 ${l.tokenName || '-'}`),
          ...(isAdmin ? [chip(UserRound, `用户 ${l.username || '-'}`)] : []),
          chip(Globe, `IP ${l.ip || '-'}${l.country ? ' · ' + countryLabel(l.country) : ''}`),
          chip(Activity, `耗时 ${l.useTime > 0 ? secs.toFixed(2) + 's' : '-'}`),
          ...(l.type === 2
            ? [
                chip(Zap, l.isStream ? '流式' : '非流式'),
                /* Task 204: 窄屏隐藏「Tokens (输入/输出)」列后, 此处补上明细 chip 不丢信息 */
                chip(Coins, `Tokens ${l.promptTokens.toLocaleString()} / ${l.completionTokens.toLocaleString()}`),
              ]
            : []),
          chip(ChevronDown, `完整时间 ${tm.full}`),
          h('span', { class: 'inline-flex items-center rounded border border-[var(--border)] bg-card px-2 py-1 text-[11px] text-muted-foreground' }, '#' + l.id),
          l.content
            ? h(NButton, { size: 'tiny', quaternary: true, style: 'margin-left:auto', onClick: () => copyContent(l.content) }, { default: () => '复制内容' })
            : null,
        ]),
        l.content
          ? h('pre', {
              class: 'log-codeblock naive-scrollbar mt-3 whitespace-pre-wrap break-all p-3 font-mono text-[11.5px] leading-relaxed',
              style: 'max-height:176px;overflow:auto;background:#0d1017;color:#c6d0dc',
            }, l.content)
          : null,
      ])
    }

    const typeLabel = (t: number) => (t === 1 ? '充值' : t === 2 ? '消费' : t === 3 ? '管理' : '系统')
    const typeColor = (t: number) => (t === 1 ? 'success' : t === 2 ? 'info' : t === 3 ? 'warning' : 'default')

    /* Task 204: 窄屏 (<768px) 列集收敛 — 9 列压到 3+expand (总宽 ~1180px → ~420px):
     *   用户/渠道/IP/Tokens/耗时 五列全部移入展开详情 (renderDetail 已含渠道/令牌/用户/IP/耗时/Tokens chip);
     *   桌面 (≥768px) 保持原列集不动; 横向滚动仍由 n-data-table scroll-x 容器承担 */
    const columns = computed<DataTableColumns<LogItem>>(() => {
      if (isNarrow.value) {
        return [
          {
            type: 'expand',
            renderExpand: (row: LogItem) => renderDetail(row),
          },
          {
            title: '时间',
            key: 'createdAt',
            width: 112,
            render: (l: LogItem) => {
              const tm = smartTime(l.createdAt)
              return h('div', {}, [
                h('div', { class: 'whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground', title: tm.full }, tm.short),
                h('div', { class: 'mt-1' }, [
                  h(NTag, { size: 'tiny', bordered: false, type: typeColor(l.type) as never }, { default: () => typeLabel(l.type) }),
                ]),
              ])
            },
          },
          {
            title: '模型 / 令牌',
            key: 'modelName',
            minWidth: 150,
            render: (l: LogItem) =>
              h('div', { class: 'flex items-center gap-2' }, [
                h('span', { class: 'flex shrink-0 items-center justify-center text-[11px] font-bold', style: 'height:24px;width:24px;border-radius:6px;background:' + vendorColorOf(l.modelName) + '21;color:' + vendorColorOf(l.modelName) }, (l.modelName || '?').slice(0, 1).toUpperCase()),
                h('div', { class: 'min-w-0' }, [
                  h('div', { class: 'flex items-center gap-1.5' }, [
                    h('span', { class: 'max-w-[148px] truncate font-mono text-xs font-medium' }, l.modelName || (l.type === 1 ? '-' : 'unknown')),
                    ...(l.type === 2 && l.isStream
                      ? [h('span', { class: 'inline-flex shrink-0 items-center gap-0.5 bg-muted px-1 py-px text-[10px] text-muted-foreground', title: '流式响应' }, [h(Zap, { size: 9 }), '流'])]
                      : []),
                  ]),
                  h('div', { class: 'mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground' }, [
                    h(KeyRound, { size: 10, class: 'shrink-0 opacity-70' }),
                    h('span', { class: 'max-w-[110px] truncate' }, l.tokenName || '-'),
                  ]),
                ]),
              ]),
          },
          {
            title: '消耗',
            key: 'quota',
            width: 92,
            align: 'right' as const,
            render: (l: LogItem) =>
              h('div', { class: 'whitespace-nowrap font-mono text-xs font-semibold tabular-nums' }, [
                l.type === 1
                  ? h('span', { style: 'color:#00B42A' }, '+' + renderQuota(l.quota, quotaPerUnit, displayInCurrency))
                  : l.type === 2
                    ? h('span', { class: 'text-foreground' }, renderQuota(l.quota, quotaPerUnit, displayInCurrency))
                    : h('span', { class: 'text-muted-foreground' }, '-'),
              ]),
          },
        ]
      }
      return [
      {
        type: 'expand',
        renderExpand: (row: LogItem) => renderDetail(row),
      },
      {
        title: '时间',
        key: 'createdAt',
        width: 150,
        render: (l: LogItem) => {
          const tm = smartTime(l.createdAt)
          return h('div', {}, [
            h('div', { class: 'whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground', title: tm.full }, tm.short),
            h('div', { class: 'mt-1' }, [
              h(NTag, { size: 'tiny', bordered: false, type: typeColor(l.type) as never }, { default: () => typeLabel(l.type) }),
            ]),
          ])
        },
      },
      ...(isAdmin
        ? [
            {
              title: '用户',
              key: 'username',
              width: 120,
              render: (l: LogItem) =>
                h('div', { class: 'flex items-center gap-1.5' }, [
                  h('span', { class: 'flex shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground', style: 'height:20px;width:20px' }, (l.username || '?').slice(0, 1).toUpperCase()),
                  h('span', { class: 'truncate text-xs' }, l.username || '-'),
                ]),
            },
            {
              title: '渠道',
              key: 'channelName',
              width: 140,
              render: (l: LogItem) =>
                h('span', { class: 'inline-flex max-w-[130px] items-center gap-1 text-xs text-muted-foreground' }, [
                  h(Database, { size: 12, class: 'shrink-0 opacity-60' }),
                  h('span', { class: 'truncate' }, l.channelName || '-'),
                ]),
            },
          ]
        : []),
      {
        // Task 154: 调用来源 IP + 国家地区 — 排障/审计一眼定位 (用户要求: 不只看用户名, 还要看 IP 与地区)
        title: 'IP / 归属',
        key: 'ipLocation',
        width: 180,
        render: (l: LogItem) => {
          const { ip, region } = ipLocation(l.ip, l.country)
          return h('div', { class: 'flex items-center gap-1.5' }, [
            h(Globe, { size: 12, class: 'shrink-0 opacity-60' }),
            h('div', { class: 'min-w-0 leading-tight' }, [
              h('div', { class: 'truncate font-mono text-xs tabular-nums', title: ip }, ip || '-'),
              ip
                ? h('div', { class: 'mt-0.5 text-[10.5px] text-muted-foreground' }, region || '未知地区')
                : null,
            ]),
          ])
        },
      },
      {
        title: '模型 / 令牌',
        key: 'modelName',
        minWidth: 200,
        render: (l: LogItem) =>
          h('div', { class: 'flex items-center gap-2' }, [
            h('span', { class: 'flex shrink-0 items-center justify-center text-[11px] font-bold', style: 'height:24px;width:24px;border-radius:6px;background:' + vendorColorOf(l.modelName) + '21;color:' + vendorColorOf(l.modelName) }, (l.modelName || '?').slice(0, 1).toUpperCase()),
            h('div', { class: 'min-w-0' }, [
              h('div', { class: 'flex items-center gap-1.5' }, [
                h('span', { class: 'max-w-[148px] truncate font-mono text-xs font-medium' }, l.modelName || (l.type === 1 ? '-' : 'unknown')),
                ...(l.type === 2 && l.isStream
                  ? [h('span', { class: 'inline-flex shrink-0 items-center gap-0.5 bg-muted px-1 py-px text-[10px] text-muted-foreground', title: '流式响应' }, [h(Zap, { size: 9 }), '流'])]
                  : []),
              ]),
              h('div', { class: 'mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground' }, [
                h(KeyRound, { size: 10, class: 'shrink-0 opacity-70' }),
                h('span', { class: 'max-w-[140px] truncate' }, l.tokenName || '-'),
              ]),
            ]),
          ]),
      },
      {
        title: 'Tokens (输入/输出)',
        key: 'tokens',
        width: 160,
        render: (l: LogItem) =>
          l.type === 2
            ? h('div', {}, [
                h('div', { class: 'whitespace-nowrap font-mono text-xs tabular-nums' }, [
                  l.promptTokens.toLocaleString(),
                  h('span', { style: 'opacity:0.6' }, ' / '),
                  l.completionTokens.toLocaleString(),
                ]),
                tokenBar(l.promptTokens, l.completionTokens),
              ])
            : h('span', { class: 'text-xs text-muted-foreground' }, '-'),
      },
      {
        title: '消耗',
        key: 'quota',
        width: 120,
        render: (l: LogItem) =>
          h('div', { class: 'whitespace-nowrap font-mono text-xs font-semibold tabular-nums' }, [
            l.type === 1
              ? h('span', { style: 'color:#00B42A' }, '+' + renderQuota(l.quota, quotaPerUnit, displayInCurrency))
              : l.type === 2
                ? h('span', { class: 'text-foreground' }, renderQuota(l.quota, quotaPerUnit, displayInCurrency))
                : h('span', { class: 'text-muted-foreground' }, '-'),
          ]),
      },
      {
        title: '耗时',
        key: 'useTime',
        width: 110,
        render: (l: LogItem) => {
          const secs = l.useTime / 1000
          const speed = l.type === 2 && l.useTime > 0 && l.completionTokens > 0 ? Math.round(l.completionTokens / secs) : null
          return h('div', {}, [
            h('div', { class: 'whitespace-nowrap text-xs font-medium tabular-nums', style: secs > 3 ? 'color:#ff4d4f' : secs > 1 ? 'color:#faad14' : '' }, l.useTime > 0 ? secs.toFixed(1) + 's' : '-'),
            speed !== null ? h('div', { class: 'mt-0.5 whitespace-nowrap text-[10.5px] text-muted-foreground' }, '≈ ' + speed + ' tok/s') : null,
          ])
        },
      },
      ]
    })

    const pagination = computed(() => ({
      page: page.value,
      pageSize: pageSize.value,
      itemCount: total.value,
      pageSizes: [10, 20, 50, 100],
      showSizePicker: true,
      prefix: (p: { itemCount: number }) => `共 ${p.itemCount} 条`,
      onChange: (p: number) => {
        // 双保险: 分页回调异常时防御 NaN 进请求参数 (服务端已兜底, 此处保持状态干净)
        if (!Number.isFinite(p)) return
        page.value = Math.max(Math.floor(p), 1)
        expandedKeys.value = []
        void load()
      },
      onUpdatePageSize: (s: number) => {
        if (!Number.isFinite(s)) return
        pageSize.value = Math.min(Math.max(Math.floor(s), 1), 100)
        page.value = 1
        expandedKeys.value = []
        void load()
      },
    }))

    return {
      user, logs, total, page, pageSize, loading, filters, expandedKeys, isAdmin, isNarrow,
      load, setType, hasFilter, resetFilters, summary, pagination, columns, navigate, quotaPerUnitOf, displayInCurrencyOf,
      renderQuota, fmtWan, vendorColorOf, NButton, NDataTable, NInput, NTag,
      RefreshCw, Search, ChevronDown, Coins, Zap, Activity, Layers,
      Globe, ipLocation,
    }
  },
  template: `
  <div>
    <page-header title="调用日志" description="浏览 API 调用历史与额度消耗明细，点击任意一行查看完整详情" />

    <!-- 汇总条 (Task 120: 彩色徽章+同系渐变卡底同看板语言; 数值独占整行根治移动端截断) (全部由当前接口响应真实聚合) -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <n-card size="small" data-tilt style="--t-glow: rgba(32,128,240,0.45); --t-spot: rgba(32,128,240,0.09); background: linear-gradient(135deg, rgba(32,128,240,0.09), rgba(32,128,240,0.015) 60%)">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(32,128,240,0.15); color: #2080f0"><layers :size="16" /></span>
          <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">日志总数</span>
        </div>
        <div class="mt-2 sm:mt-3.5 whitespace-nowrap text-[20px] sm:text-[24px] font-bold leading-none tabular-nums text-foreground">{{ total.toLocaleString() }}<span class="ml-1 text-[13px] font-medium text-muted-foreground">条</span></div>
        <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">{{ hasFilter() ? '已启用筛选条件' : '当前页数据实时聚合' }}</div>
      </n-card>
      <n-card size="small" data-tilt style="--t-glow: rgba(0,180,42,0.42); --t-spot: rgba(0,180,42,0.08); background: linear-gradient(135deg, rgba(0,180,42,0.09), rgba(0,180,42,0.015) 60%)">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(0,180,42,0.14); color: #00b42a"><coins :size="16" /></span>
          <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">本页消费合计</span>
        </div>
        <div class="mt-2 sm:mt-3.5 whitespace-nowrap text-[20px] sm:text-[24px] font-bold leading-none tabular-nums text-foreground">{{ renderQuota(summary().quota, quotaPerUnitOf(), displayInCurrencyOf()) }}</div>
        <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">共 {{ summary().count }} 笔消费记录</div>
      </n-card>
      <n-card size="small" data-tilt style="--t-glow: rgba(250,140,22,0.45); --t-spot: rgba(250,140,22,0.09); background: linear-gradient(135deg, rgba(250,140,22,0.10), rgba(250,140,22,0.015) 60%)">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(250,140,22,0.15); color: #fa8c16"><zap :size="16" /></span>
          <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">本页 Tokens</span>
        </div>
        <div class="mt-2 sm:mt-3.5 whitespace-nowrap text-[20px] sm:text-[24px] font-bold leading-none tabular-nums text-foreground" :title="summary().tokens.toLocaleString() + ' tokens'">{{ fmtWan(summary().tokens) }}</div>
        <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">输入 {{ fmtWan(summary().promptTokens) }} · 输出 {{ fmtWan(summary().completionTokens) }}</div>
      </n-card>
      <n-card size="small" data-tilt style="--t-glow: rgba(124,58,237,0.45); --t-spot: rgba(124,58,237,0.09); background: linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.015) 60%)">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(124,58,237,0.14); color: #7c3aed"><activity :size="16" /></span>
          <span class="text-[12px] sm:text-[13px] font-medium text-muted-foreground">消费平均耗时</span>
        </div>
        <div class="mt-2 sm:mt-3.5 whitespace-nowrap text-[20px] sm:text-[24px] font-bold leading-none tabular-nums text-foreground">{{ summary().avg.toFixed(2) }}<span class="ml-1 text-[13px] font-medium text-muted-foreground">s</span></div>
        <div class="mt-1.5 sm:mt-2.5 text-[10.5px] sm:text-[11.5px] leading-snug text-muted-foreground">仅统计消费类请求</div>
      </n-card>
    </div>

    <n-card :content-style="'padding: 0'" class="mt-4">
      <template #header>
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(99,102,241,0.13); color: #6366f1"><history :size="14" /></span>
          <span class="text-sm font-semibold">日志明细</span>
        </div>
      </template>
      <template #header-extra><span class="text-xs text-muted-foreground">点击行首箭头展开完整详情</span></template>
      <!-- Task 203-a: 工具栏内边距与 channels/tokens/users 的 p-3 阶梯对齐 (原 px-4 py-3.5) -->
      <div class="flex flex-col gap-3 border-b border-[var(--border)] p-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <n-radio-group :value="filters.type" size="small" @update:value="setType">
            <n-radio-button value="">全部</n-radio-button>
            <n-radio-button value="2">消费</n-radio-button>
            <n-radio-button value="1">充值</n-radio-button>
            <n-radio-button value="3">管理</n-radio-button>
            <n-radio-button value="4">系统</n-radio-button>
          </n-radio-group>
          <div class="flex items-center gap-2">
            <n-button v-if="hasFilter()" size="small" quaternary @click="resetFilters">重置</n-button>
            <n-button size="small" secondary :loading="loading" @click="load">
              <template #icon><refresh-cw :size="13" /></template>
              刷新
            </n-button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <n-input v-model:value="filters.modelName" size="small" placeholder="模型名称" clearable style="width: 160px">
            <template #prefix><search :size="13" /></template>
          </n-input>
          <n-input v-model:value="filters.tokenName" size="small" placeholder="令牌名称" clearable style="width: 144px">
            <template #prefix><search :size="13" /></template>
          </n-input>
          <template v-if="isAdmin">
            <n-input v-model:value="filters.username" size="small" placeholder="用户名" clearable style="width: 144px">
              <template #prefix><search :size="13" /></template>
            </n-input>
            <n-input v-model:value="filters.channelName" size="small" placeholder="渠道名称" clearable style="width: 144px">
              <template #prefix><search :size="13" /></template>
            </n-input>
          </template>
        </div>
      </div>

      <n-data-table
        :columns="columns"
        :data="logs"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        size="small"
        :scroll-x="isNarrow ? 420 : 1000"
        :row-key="(r) => r.id"
        v-model:expanded-row-keys="expandedKeys"
      >
        <!-- Task 203-a: 空态换装 — 日志检索无结果语义, search 线稿 (原 naive 默认灰块) -->
        <template #empty>
          <n-empty description="暂无日志" style="--n-icon-size: 88px">
            <template #icon><EmptyState variant="search" :size="88" /></template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>
  </div>
  `,
})
