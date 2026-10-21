/**
 * 模型商城 — 只展示已接入的模型 (在线/掉线), 未接入的计价项不再铺满页面
 * Task 142: 用户反馈「不要显示这么多模型, 只显示在线的」「切换全部什么的不要」——
 *   ① 列表只保留 status=online / offline (配置过渠道的), 「未接入」的 40+ 计价项不再显示,
 *      底部一行小字说明数量, 启用渠道后自动上架;
 *   ② 撤掉「全部/可用/按量/按次」筛选药丸组 (只显示已接入后无筛选意义), 保留搜索框;
 *   ③ 顶部统计卡换实时口径: 在线 / 掉线 / 近 5 分钟调用 / 实时吞吐;
 *   ④ 卡片视觉再升级: 顶部语义渐变条 (在线品牌色 / 掉线红) + 状态药丸前置 + 大号价格。
 * 真实数据纪律: 不编造在线状态/吞吐量, 无调用=「暂无实时调用」。
 * Task 195: 状态/延迟/吞吐改 new-api 原生口径 (对标 QuantumNous/new-api 模型广场徽章):
 *   状态 = 24h 成功率% + 小时级成功率竖条 (四级配色 100/90/70), 无样本显示「暂无性能数据」不编造;
 *   延迟 = Σ耗时/Σ样本 (成功+失败); 吞吐 = Σ输出tokens ÷ Σ生成耗时 (池化 t/s)。
 */
import '../flags'
import { defineComponent, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { computed } from 'vue'
import { NButton, NCard, NInput } from 'naive-ui'
import { apiGet } from '@/lib/api'
import { copyText } from '@/lib/utils'
import { getQuotaDisplayPrice } from '@/lib/quota-display'
import { message } from '../message'
import { useUserStore } from '../stores'
import { EmptyState } from '../components/empty-state'
import { Store, Search, Zap, CircleCheck, Copy, RefreshCw, Info, Activity, WifiOff, Clock, Gauge, CloudOff } from 'lucide-vue-next'

interface MallPerf {
  successRate: number | null
  avgLatencyMs: number | null
  avgTps: number | null
  series: { ts: number; rate: number }[]
}

/** Task 206: 探测健康 (来自 ModelHealth, API 序列化为 ISO 字符串) */
interface MallHealth {
  status: number // 1=在售 0=探测异常已自动下架
  lastTtftMs: number | null
  lastOkAt: string | null
  lastFailAt: string | null
  lastFailReason: string
  lastDownAt: string | null
  lastUpAt: string | null
  updatedAt: string | null
}

interface MallSummary {
  reqs: number
  successRate: number | null
  avgLatencyMs: number | null
  avgTps: number | null
}

interface MallItem {
  id: number
  modelName: string
  ratio: number
  completionRatio: number
  modelPrice: number
  quotaType: number
  description: string
  enableGroup: string
  available: boolean
  /** 实时状态 — online=有启用渠道 / offline=渠道被禁用(掉线) / none=从未配置(不展示) */
  status: 'online' | 'offline' | 'none'
  /** 近 5 分钟真实调用 { 次数, tokens 合计 } */
  live: { reqs: number; tokens: number }
  /** Task 206: 探测健康 — status=0 为探测异常已自动下架 (前台广场//v1/models 已隐藏) */
  health: MallHealth | null
  /** Task 195: new-api 原生口径 24h 性能指标 (状态/延迟/吞吐), 无样本 null */
  perf: MallPerf | null
}

function fmtPrice(n: number): string {
  const s = n >= 1 ? n.toFixed(2) : n.toFixed(4)
  return s.replace(/\.?0+$/, (m) => (m.includes('.') ? '' : m)) || '0'
}

/** 吞吐量速率格式化: tok/分 */
function fmtRate(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K'
  return String(Math.round(v))
}

// ============ Task 195: new-api 原生格式化 (port of features/performance-metrics/lib/format.ts) ============
/** 延迟: ≥1s 显示秒两位, 否则毫秒整; 无数据 — */
function fmtLatency(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'
  if (ms >= 1000) return (ms / 1000).toFixed(2) + 's'
  return String(Math.round(ms)) + 'ms'
}
/** 吞吐: 池化 t/s, ≥1000 显示 K t/s; 无数据 — */
function fmtTps(tps: number | null): string {
  if (tps == null || !Number.isFinite(tps) || tps <= 0) return '—'
  if (tps >= 1000) return (tps / 1000).toFixed(1) + 'K t/s'
  return tps.toFixed(tps < 10 ? 2 : 1) + ' t/s'
}
/** new-api 四级配色: 100% 翠绿 / ≥90 浅翠 / ≥70 琥珀 / <70 红 / 无数据灰 */
function perfColor(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '#9ca3af'
  if (rate >= 100) return '#10b981'
  if (rate >= 90) return '#34d399'
  if (rate >= 70) return '#f59e0b'
  return '#ef4444'
}
/** 卡顶条颜色: 渠道禁用红渐变 > 探测下架琥珀渐变 (Task 206); 有性能数据按成功率级别; 无数据品牌渐变 */
function barOf(m: MallItem): string {
  if (m.status === 'offline') return 'linear-gradient(90deg, #d03050, rgba(208,58,82,0.06))'
  if (m.health && m.health.status === 0) return 'linear-gradient(90deg, #f59e0b, rgba(245,158,11,0.06))'
  if (m.perf && m.perf.successRate != null) {
    const c = perfColor(m.perf.successRate)
    return `linear-gradient(90deg, ${c}, ${c}14)`
  }
  return 'linear-gradient(90deg, var(--primary), rgba(100,108,255,0.06))'
}
/** Task 206: 探测异常已自动下架? */
function isDelisted(m: MallItem): boolean {
  return !!m.health && m.health.status === 0
}
/** Task 206: 下架时刻短格式 (MM-DD HH:mm) */
function fmtWhen(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
/** 卡片是否有性能数据 (决定显示徽章还是占位) */
function hasPerf(m: MallItem): boolean {
  return !!m.perf && (m.perf.successRate != null || (!!m.perf.series && m.perf.series.length > 0))
}

export default defineComponent({
  name: 'MallPage',
  components: { EmptyState },
  setup() {
    const items = ref<MallItem[]>([])
    const summary = ref<MallSummary | null>(null)
    const keyword = ref('')
    const loading = ref(true)
    const copied = ref('')

    async function load(silent = false) {
      if (!silent) loading.value = true
      try {
        const resp = await apiGet<{ data: { items: MallItem[]; availableCount: number; summary: MallSummary | null } }>('/api/console/mall')
        // Task 152: 脏检查 — 数据没变不替换数组, 避免每 15s 轮询都触发整组重渲染
        // (transition-group FLIP 测量 + 卡片文案重刷, 页签切换瞬间叠加发涩的元凶之一)
        const fresh = resp.data.items
        if (JSON.stringify(fresh) !== JSON.stringify(items.value)) items.value = fresh
        summary.value = resp.data.summary ?? null
      } catch (e) {
        if (!silent) message.error((e as Error).message)
      } finally {
        if (!silent) loading.value = false
      }
    }

    onMounted(() => void load())

    // 实时状态/吞吐量 15s 轮询 — KeepAlive 页签缓存下仅激活时跑, 后台标签静默暂停
    let timer: ReturnType<typeof setInterval> | null = null
    function startPolling() {
      if (timer) clearInterval(timer)
      timer = setInterval(() => {
        if (!document.hidden && !loading.value) void load(true)
      }, 15_000)
    }
    function stopPolling() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    onActivated(() => {
      void load(true)
      startPolling()
    })
    onDeactivated(stopPolling)
    onUnmounted(stopPolling)

    // Task 142: 只展示已接入 (online/offline); 「未接入」计价项收进底部一行说明
    const shown = computed(() => {
      const kw = keyword.value.trim().toLowerCase()
      return items.value
        .filter((m) => m.status !== 'none')
        .filter((m) => {
          if (kw && !m.modelName.toLowerCase().includes(kw) && !m.description.toLowerCase().includes(kw)) return false
          return true
        })
        .sort(
          (a, b) =>
            Number(b.available) - Number(a.available) ||
            Number(isDelisted(a)) - Number(isDelisted(b)) || // Task 206: 已下架沉底
            a.modelName.localeCompare(b.modelName)
        )
    })

    // 底部「未接入」计数 (总览统计卡已换 Task 195 native 汇总口径)
    const hiddenCount = computed(() => items.value.filter((m) => m.status === 'none').length)
    // Task 206: 探测异常已下架计数
    const delistedCount = computed(() => items.value.filter((m) => m.health && m.health.status === 0).length)

    async function copyModel(name: string) {
      const ok = await copyText(name)
      if (ok) {
        copied.value = name
        message.success(`模型名已复制: ${name}`)
        setTimeout(() => (copied.value = copied.value === name ? '' : copied.value), 1600)
      } else {
        message.error('复制失败，请手动复制')
      }
    }

    const priceOf = (m: MallItem) => {
      const k = getQuotaDisplayPrice()
      const byTimes = m.quotaType === 1 && m.modelPrice >= 0
      return {
        byTimes,
        inPrice: byTimes ? m.modelPrice * k : m.ratio * 0.002 * 1000 * k,
        outPrice: byTimes ? m.modelPrice * k : m.ratio * m.completionRatio * 0.002 * 1000 * k,
      }
    }

    /** 近 5 分钟实时行文案: 有调用 → 「N 次 · X tok/分」; 无 → 诚实留白 */
    function liveText(m: MallItem): string {
      if (!m.live || m.live.reqs <= 0) return '暂无实时调用'
      return `近 5 分钟 ${m.live.reqs} 次 · ${fmtRate(m.live.tokens / 5)} tok/分`
    }

    return {
      items, summary, keyword, loading, copied, shown, load, copyModel, priceOf, fmtPrice, fmtRate,
      fmtLatency, fmtTps, perfColor, barOf, hasPerf, liveText, hiddenCount, delistedCount,
      isDelisted, fmtWhen,
      NButton, NCard, NInput,
      Store, Search, Zap, CircleCheck, Copy, RefreshCw, Info, Activity, WifiOff, Clock, Gauge, CloudOff,
    }
  },
  template: `
  <div>
    <page-header title="模型商城" description="已接入模型 · 状态/延迟/吞吐为 new-api 原生口径（24h 真实中继样本）· 探测异常自动下架，恢复自动回榜">
      <template #extra>
        <n-button quaternary size="small" @click="load">
          <template #icon><refresh-cw :size="13" /></template>
          刷新
        </n-button>
      </template>
    </page-header>

    <!-- Task 195: 总览换 new-api 原生口径 — 24h 采样 / 成功率 / 延迟 / 吞吐 (真实中继样本聚合) -->
    <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <n-card size="small" style="background: linear-gradient(135deg, rgba(32,128,240,0.09), rgba(32,128,240,0.015) 60%)">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(32,128,240,0.15); color: #2080f0"><activity :size="17" /></span>
          <span class="text-[13px] font-medium text-muted-foreground">24h 采样请求</span>
        </div>
        <div class="mt-3.5 text-[26px] font-bold leading-none tabular-nums text-foreground">{{ summary ? summary.reqs.toLocaleString() : '—' }}</div>
        <div class="mt-2.5 text-[11.5px] text-muted-foreground">成功+失败真实中继样本（含系统探测）</div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(0,180,42,0.09), rgba(0,180,42,0.015) 60%)">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(0,180,42,0.14); color: #00b42a"><circle-check :size="17" /></span>
          <span class="text-[13px] font-medium text-muted-foreground">平均成功率</span>
        </div>
        <div class="mt-3.5 text-[26px] font-bold leading-none tabular-nums text-foreground" :style="{ color: perfColor(summary ? summary.successRate : null) }">{{ summary && summary.successRate != null ? summary.successRate.toFixed(2) + '%' : '—' }}</div>
        <div class="mt-2.5 text-[11.5px] text-muted-foreground">状态口径 · 同 new-api 模型广场</div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.015) 60%)">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(124,58,237,0.14); color: #7c3aed"><clock :size="17" /></span>
          <span class="text-[13px] font-medium text-muted-foreground">平均延迟</span>
        </div>
        <div class="mt-3.5 text-[26px] font-bold leading-none tabular-nums text-foreground">{{ fmtLatency(summary ? summary.avgLatencyMs : null) }}</div>
        <div class="mt-2.5 text-[11.5px] text-muted-foreground">Σ耗时 ÷ Σ样本（成功+失败）</div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(208,158,10,0.10), rgba(208,158,10,0.015) 60%)">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(245,158,11,0.15); color: #f59e0b"><gauge :size="17" /></span>
          <span class="text-[13px] font-medium text-muted-foreground">平均吞吐</span>
        </div>
        <div class="mt-3.5 text-[26px] font-bold leading-none tabular-nums text-foreground">{{ fmtTps(summary ? summary.avgTps : null) }}</div>
        <div class="mt-2.5 text-[11.5px] text-muted-foreground">Σ输出 tokens ÷ Σ生成耗时（池化）</div>
      </n-card>
    </div>

    <!-- 诚实提示: 全部未接入时不编造可用性 -->
    <n-card v-if="!loading && items.length > 0 && shown.length === 0" size="small" class="mt-4">
      <div class="flex items-start gap-3">
        <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center" style="background: rgba(32,128,240,0.1); color: var(--primary)">
          <info :size="15" />
        </span>
        <div class="text-xs leading-relaxed text-muted-foreground">
          <span class="font-medium text-foreground">暂无已接入的模型</span>
          ，模型计价已收录 {{ items.length }} 项；管理员在「渠道」中配置并启用模型后，会自动上架到这里。
        </div>
      </div>
    </n-card>

    <n-card :content-style="'padding: 0'" class="mt-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5">
        <div class="flex items-center gap-2">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(100,108,255,0.12); color: var(--primary)"><store :size="15" /></span>
          <span class="text-sm font-semibold text-foreground">已接入模型</span>
          <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" style="background: rgba(100,108,255,0.1); color: var(--primary)">{{ shown.length }}</span>
        </div>
        <n-input v-model:value="keyword" placeholder="搜索模型 / 说明..." style="width: 280px" clearable>
          <template #prefix><search :size="14" /></template>
        </n-input>
      </div>

      <div v-if="loading" class="flex justify-center py-16"><n-spin size="large" /></div>
      <div v-else-if="shown.length === 0" class="py-10">
        <n-empty description="暂无匹配的模型" style="--n-icon-size: 96px">
          <!-- Task 184-b: 空态图标换装 — 魔方/模型语义线稿 -->
          <template #icon><EmptyState variant="cube" :size="96" /></template>
          <template #extra><span class="text-xs text-muted-foreground">试试其他关键词</span></template>
        </n-empty>
      </div>
      <!-- 切换筛选/搜索时新卡片淡入上浮 (键控 m.id, 仅入场不干扰布局) -->
      <transition-group v-else name="mall-card" tag="div" appear class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <n-card
          v-for="m in shown"
          :key="m.id"
          size="small"
          class="relative overflow-hidden transition-[transform] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(15,23,42,0.16)]"
        >
          <!-- 顶部语义渐变条: 在线=品牌色 / 掉线=红 -->
          <div class="absolute inset-x-0 top-0 h-[3px]" :style="{ background: barOf(m) }"></div>

          <!-- 头部: (渠道禁用时)标记 + (探测下架时)标记 + 模型名 + 内联圆钮复制 — 健康状态由下方 native 徽章表达 -->
          <div class="flex items-center gap-2">
            <span
              v-if="m.status === 'offline'"
              class="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium"
              style="background: rgba(208, 58, 82, 0.1); color: #d03050"
              title="覆盖该模型的渠道当前全部被禁用"
            >
              <wifi-off :size="11" />
              渠道禁用
            </span>
            <span
              v-if="isDelisted(m)"
              class="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium"
              style="background: rgba(245, 158, 11, 0.12); color: #d97706"
              :title="'探测异常自动下架（已从广场与 /v1/models 隐藏，恢复后自动回榜）· ' + (m.health?.lastFailReason || '探测异常') + (m.health?.lastDownAt ? ' · 下架于 ' + fmtWhen(m.health.lastDownAt) : '')"
            >
              <cloud-off :size="11" />
              探测下架
            </span>
            <code class="min-w-0 flex-1 line-clamp-2 break-all font-mono text-[13px] font-bold leading-snug text-foreground sm:line-clamp-none sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap sm:text-[14px]" :title="m.modelName">{{ m.modelName }}</code>
            <n-button
              quaternary
              circle
              size="tiny"
              class="shrink-0"
              :title="copied === m.modelName ? '已复制' : '复制模型名'"
              :aria-label="'复制模型名 ' + m.modelName"
              @click="copyModel(m.modelName)"
            >
              <template #icon><circle-check v-if="copied === m.modelName" :size="14" style="color: #00b42a" /><copy v-else :size="13" /></template>
            </n-button>
          </div>
          <p class="mt-1.5 line-clamp-2 min-h-[32px] text-[11.5px] leading-relaxed text-muted-foreground">{{ m.description || '暂无说明' }}</p>

          <!-- 价目面板 (淡底内嵌) — 输入/输出双列大字, 一眼读价 -->
          <div class="mt-3 rounded-[10px] px-3 py-3" style="background: rgba(128,128,128,0.055)">
            <div v-if="!priceOf(m).byTimes" class="grid grid-cols-2 gap-3">
              <div>
                <div class="text-[10.5px] text-muted-foreground">输入 / M tokens</div>
                <div class="mt-1 font-mono text-[17px] font-bold leading-none tabular-nums text-foreground">¥{{ fmtPrice(priceOf(m).inPrice) }}</div>
              </div>
              <div>
                <div class="text-[10.5px] text-muted-foreground">输出 / M tokens</div>
                <div class="mt-1 font-mono text-[17px] font-bold leading-none tabular-nums text-foreground">¥{{ fmtPrice(priceOf(m).outPrice) }}</div>
              </div>
            </div>
            <div v-else class="flex items-end justify-between gap-3">
              <div>
                <div class="text-[10.5px] text-muted-foreground">按次计费</div>
                <div class="mt-1 font-mono text-[17px] font-bold leading-none tabular-nums text-foreground">
                  ¥{{ fmtPrice(priceOf(m).inPrice) }}<span class="ml-0.5 text-[11px] font-normal text-muted-foreground">/ 次</span>
                </div>
              </div>
              <div class="text-[10.5px] text-muted-foreground">每次调用固定结算</div>
            </div>
          </div>

          <!-- Task 195: new-api 原生性能徽章 — 状态(成功率%+小时条) / 延迟 / 吞吐; 无样本不编造 -->
          <div v-if="hasPerf(m)" class="mt-2.5 flex items-center gap-4 text-[11px] leading-none">
            <div class="w-[104px] shrink-0" title="状态 = 24h 成功率 + 小时级成功率条（同 new-api 模型广场口径）">
              <div class="flex items-center justify-between gap-1 text-[10.5px] text-muted-foreground">
                <span>状态</span>
                <span class="font-mono tabular-nums" :style="{ color: perfColor(m.perf ? m.perf.successRate : null) }">{{ m.perf && m.perf.successRate != null ? m.perf.successRate.toFixed(2) + '%' : '—' }}</span>
              </div>
              <div class="mt-1 flex h-3 w-full items-center gap-px">
                <span
                  v-for="pt in (m.perf && m.perf.series) || []"
                  :key="pt.ts"
                  class="h-full w-[3px] shrink-0"
                  style="border-radius: 1px"
                  :style="{ background: perfColor(pt.rate) }"
                ></span>
              </div>
            </div>
            <div class="shrink-0" title="平均延迟 = Σ耗时 ÷ Σ样本（成功+失败）">
              <div class="text-[10.5px] text-muted-foreground">延迟</div>
              <div class="mt-1 font-mono whitespace-nowrap tabular-nums">{{ fmtLatency(m.perf ? m.perf.avgLatencyMs : null) }}</div>
            </div>
            <div class="shrink-0" title="吞吐 = Σ输出 tokens ÷ Σ生成耗时（池化 t/s）">
              <div class="text-[10.5px] text-muted-foreground">吞吐</div>
              <div class="mt-1 font-mono whitespace-nowrap tabular-nums">{{ fmtTps(m.perf ? m.perf.avgTps : null) }}</div>
            </div>
          </div>
          <div v-else class="mt-2.5 text-[10.5px] leading-none text-muted-foreground">暂无性能数据（24h 内无真实中继样本）</div>

          <!-- 近 5 分钟真实调用脚注 (15s 静默刷新) -->
          <div class="mt-2 flex items-center justify-end gap-2 text-[11px] leading-none">
            <span class="truncate text-right tabular-nums text-muted-foreground">{{ liveText(m) }}</span>
          </div>
        </n-card>
      </transition-group>

      <!-- 未接入计价项: 一行说明, 不再铺满列表 -->
      <div v-if="hiddenCount > 0" class="flex items-center gap-1.5 border-t border-[var(--border)] px-4 py-3 text-[11.5px] text-muted-foreground">
        <info :size="12" class="shrink-0" />
        另有 {{ hiddenCount }} 个计价模型未接入渠道，暂未上架；管理员启用渠道后自动上架。
      </div>
      <!-- Task 206: 探测下架计数与自愈说明 -->
      <div v-if="delistedCount > 0" class="flex items-center gap-1.5 border-t border-[var(--border)] px-4 py-3 text-[11.5px] text-muted-foreground">
        <cloud-off :size="12" class="shrink-0" style="color: #d97706" />
        当前有 {{ delistedCount }} 个模型探测异常已自动下架（上游恢复后连续 2 轮探测正常即自动回榜）。
      </div>
    </n-card>
  </div>
  `,
})
