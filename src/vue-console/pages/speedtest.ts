/**
 * 网关测速页 (Task 110; 隐藏页 — 不进侧栏, 令牌页网关卡「去测速」跳转)
 * 网关地址卡 (与令牌页同源语义) + 10 轮往返采样 (间隔 300ms, 零鉴权 /v1/ping 探针,
 * 不消耗调用额度) → ECharts 平滑趋势线 (面积渐变 + 平均虚线 markLine)
 * + 平均/最快/最慢/抖动四统计 + 质量结论 (≤60 优秀 / ≤150 良好 / ≤400 一般 / 更高 较差)
 * 坑: 首轮回调时 v-show 容器 display:none (Vue DOM 补丁异步) echarts.init 量到 0 宽
 * 画空白 → renderChart 内 await nextTick 再 init
 */
import '../flags'
import { computed, defineComponent, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { NButton, NCard, NEmpty, NProgress, NTag } from 'naive-ui'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { copyText } from '@/lib/utils'
import { message } from '../message'
import { themeRadius } from '../theme'
import { EmptyState } from '../components/empty-state'
import { Copy, Gauge, Network, Play } from 'lucide-vue-next'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const ROUNDS = 10

export default defineComponent({
  name: 'SpeedtestPage',
  components: { EmptyState },
  setup() {
    const gatewayUrl = window.location.origin + '/v1'

    /* Task 130: 双网关对比测速 — 主站 bz / 备用 www (同库同额度令牌通用),
       类似测速平台的多节点选择: 分别对两个网关采样, 直观对比哪条链路更快 */
    const isWwwOrigin = window.location.origin.includes('www.013.ltd')
    const GATEWAYS = computed(() => [
      {
        key: 'main' as const,
        label: isWwwOrigin ? '主站 bz.013.ltd' : '主站 (当前访问)',
        base: isWwwOrigin ? 'https://bz.013.ltd' : window.location.origin,
      },
      {
        key: 'standby' as const,
        label: isWwwOrigin ? '备用站 (当前访问)' : '备用站 www.013.ltd',
        base: isWwwOrigin ? window.location.origin : 'https://www.013.ltd',
      },
    ])
    const gwKey = ref<'main' | 'standby'>('main')
    const targetBase = computed(() => GATEWAYS.value.find((g) => g.key === gwKey.value)?.base ?? window.location.origin)
    const targetUrl = computed(() => targetBase.value + '/v1')

    /** 单轮探针: 零鉴权 /v1/ping (已开放 CORS), 完整收包后取往返毫秒 (失败返回 null) */
    async function probe(): Promise<number | null> {
      const t0 = performance.now()
      try {
        const resp = await fetch(targetBase.value + '/v1/ping', { cache: 'no-store' })
        if (!resp.ok) return null
        await resp.arrayBuffer()
        return Math.round(performance.now() - t0)
      } catch {
        return null
      }
    }

    /* 实时延迟 (10s 轮询, 与令牌页网关卡同源语义) */
    const pingMs = ref<number | null>(null)
    const pingError = ref(false)
    let liveTimer: number | null = null
    async function tick() {
      const ms = await probe()
      pingMs.value = ms
      pingError.value = ms === null
    }
    function startLive() {
      if (liveTimer === null) {
        void tick()
        liveTimer = window.setInterval(() => void tick(), 10_000)
      }
    }
    function stopLive() {
      if (liveTimer !== null) {
        clearInterval(liveTimer)
        liveTimer = null
      }
    }
    onMounted(startLive)
    onBeforeUnmount(stopLive)
    onActivated(startLive)
    onDeactivated(stopLive)

    /* 测速流程 */
    const running = ref(false)
    const rounds = ref<Array<number | null>>([])
    const chartEl = ref<HTMLElement | null>(null)
    let chart: echarts.ECharts | null = null

    const valid = computed(() => rounds.value.filter((r) => r !== null))
    const avg = computed(() => (valid.value.length ? Math.round(valid.value.reduce((a, b) => a + (b ?? 0), 0) / valid.value.length) : null))
    const fastest = computed(() => (valid.value.length ? Math.min(...(valid.value as number[])) : null))
    const slowest = computed(() => (valid.value.length ? Math.max(...(valid.value as number[])) : null))
    const jitter = computed(() => (valid.value.length < 2 || avg.value === null ? null : Math.round(valid.value.reduce((a, b) => a + Math.abs((b ?? 0) - avg.value!), 0) / valid.value.length)))
    const failedCount = computed(() => rounds.value.filter((r) => r === null).length)
    const progressPct = computed(() => Math.round((rounds.value.length / ROUNDS) * 100))
    const verdict = computed(() => {
      if (avg.value === null) return null
      const v = avg.value
      if (v <= 60) return { label: '优秀', color: '#52c41a', desc: '链路质量极佳，流式对话与高频调用都毫无压力' }
      if (v <= 150) return { label: '良好', color: '#52c41a', desc: '链路质量良好，日常对话使用无感' }
      if (v <= 400) return { label: '一般', color: '#faad14', desc: '延迟偏高，建议检查本地网络或代理链路' }
      return { label: '较差', color: '#ff4d4f', desc: '延迟很高，可能存在跨网绕行或丢包，建议更换网络环境重试' }
    })

    /* Task 203-b: tooltip 与控制台卡片贴合 — 圆角走 themeRadius 通道 + 收敛的两层投影
       (纯样式参数, 同 dashboard 203-a tooltipCss 模式; 亮暗底色随 html.dark 现取) */
    function tooltipCss() {
      return `border-radius:${themeRadius.value}px;box-shadow:0 4px 14px -4px rgba(31,35,41,0.16);`
    }
    function tooltipSkin() {
      const dark = document.documentElement.classList.contains('dark')
      return {
        backgroundColor: dark ? 'rgb(28,28,28)' : '#fff',
        borderColor: 'rgba(128,128,128,0.25)',
        textStyle: { color: dark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.82)', fontSize: 12 },
      }
    }

    function renderChart() {
      if (!chartEl.value) return
      if (!chart) chart = echarts.init(chartEl.value)
      const data = rounds.value
      chart.setOption(
        {
          grid: { left: 48, right: 18, top: 30, bottom: 28 },
          tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => `${v} ms`, ...tooltipSkin(), extraCssText: tooltipCss() },
          xAxis: {
            type: 'category',
            data: data.map((_, i) => `第 ${i + 1} 次`),
            axisLabel: { color: 'rgba(128,128,128,0.9)', fontSize: 11 },
            axisLine: { lineStyle: { color: 'rgba(128,128,128,0.3)' } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: 'rgba(128,128,128,0.9)', fontSize: 11, formatter: '{value} ms' },
            splitLine: { lineStyle: { color: 'rgba(128,128,128,0.15)' } },
          },
          series: [
            {
              type: 'line',
              data,
              smooth: true,
              symbolSize: 6,
              connectNulls: false,
              lineStyle: { width: 2.5, color: '#6366f1' },
              itemStyle: { color: '#6366f1' },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(99,102,241,0.25)' },
                  { offset: 1, color: 'rgba(99,102,241,0.02)' },
                ]),
              },
              markLine: avg.value
                ? {
                    silent: true,
                    symbol: 'none',
                    lineStyle: { color: 'rgba(128,128,128,0.45)', type: 'dashed' },
                    label: { formatter: `平均 ${avg.value} ms`, color: 'rgba(128,128,128,0.9)', fontSize: 11 },
                    data: [{ yAxis: avg.value }],
                  }
                : undefined,
            },
          ],
        },
        { notMerge: true }
      )
    }

    const onResize = () => chart?.resize()

    async function runTest() {
      if (running.value) return
      running.value = true
      rounds.value = []
      for (let i = 0; i < ROUNDS; i++) {
        const ms = await probe()
        rounds.value = [...rounds.value, ms]
        renderChart()
        if (i < ROUNDS - 1) await new Promise((r) => setTimeout(r, 300))
      }
      running.value = false
    }

    /** Task 130: 切换目标网关 → 清空既有采样与图表, 下次测速对新目标进行 */
    function switchGw(k: 'main' | 'standby') {
      if (gwKey.value === k || running.value) return
      gwKey.value = k
      rounds.value = []
      nextTick(() => renderChart())
    }

    onMounted(() => window.addEventListener('resize', onResize))
    onBeforeUnmount(() => {
      window.removeEventListener('resize', onResize)
      chart?.dispose()
      chart = null
    })

    const liveColor = computed(() => (pingError.value ? '#bfbfbf' : pingMs.value === null ? '#faad14' : pingMs.value <= 200 ? '#52c41a' : pingMs.value <= 500 ? '#faad14' : '#ff4d4f'))
    const liveText = computed(() => (pingError.value ? '网络异常' : pingMs.value === null ? '测量中…' : `${pingMs.value} ms`))

    return {
      gatewayUrl, pingMs, liveColor, liveText, running, rounds, avg, fastest, slowest, jitter,
      failedCount, verdict, progressPct, runTest, GATEWAYS, gwKey, targetUrl, switchGw,
      copyGateway: () => {
        void copyText(gatewayUrl).then((ok) => (ok ? message.success('网关地址已复制') : message.error('复制失败')))
      },
      chartEl, ROUNDS,
      NButton, NCard, NProgress, NTag,
      Copy, Gauge, Network, Play,
    }
  },
  template: `
  <div>
    <page-header title="网关测速" description="测量本机到 API 网关的链路延迟（含 Cloudflare 边缘），不代表上游模型推理速度" />

    <!-- 网关地址 + 实时延迟 (与令牌页网关卡同源语义) -->
    <n-card class="mb-4" :content-style="'padding: 12px 16px'" style="border-color: rgba(99,102,241,0.28); background: linear-gradient(120deg, rgba(99,102,241,0.09), rgba(124,58,237,0.04) 55%, rgba(124,58,237,0.01))">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div class="flex min-w-[260px] flex-1 items-center gap-3">
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
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full" :style="{ background: liveColor, boxShadow: '0 0 6px ' + liveColor }"></span>
          <span class="text-sm font-medium tabular-nums">{{ liveText }}</span>
          <span class="text-xs text-muted-foreground">实时延迟</span>
        </div>
      </div>
    </n-card>

    <n-card :content-style="'padding: 16px'">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(32,128,240,0.14); color: #2080f0"><gauge :size="14" /></span>
          <span class="text-sm font-medium">链路测速</span>
          <span class="text-xs text-muted-foreground">10 次往返采样 · 零鉴权探针 · 不消耗调用额度</span>
        </div>
        <n-button type="primary" :loading="running" @click="runTest">
          <template #icon><play :size="13" v-if="!running" /></template>
          {{ rounds.length && !running ? '重新测速' : '开始测速' }}
        </n-button>
      </div>

      <!-- Task 130: 双网关对比 — 主站 / 备用站切换, 切换后清空采样重新测 -->
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <span class="text-[11px] text-muted-foreground">目标网关</span>
        <div class="flex items-center gap-1.5">
          <button
            v-for="g in GATEWAYS"
            :key="g.key"
            type="button"
            class="cursor-pointer border px-3 text-xs font-medium transition-all duration-300"
            style="height: 28px; border-radius: 999px"
            :style="gwKey === g.key
              ? 'border-color: transparent; background: var(--primary); color: #fff'
              : 'border-color: var(--border); background: transparent; color: var(--muted-foreground)'"
            @click="switchGw(g.key)"
          >
            {{ g.label }}
          </button>
        </div>
        <code class="font-mono text-[11px] text-muted-foreground">{{ targetUrl }}</code>
      </div>

      <n-progress v-if="running || rounds.length" :percentage="progressPct" :show-indicator="false" :height="4" class="mb-4" />

      <div v-if="avg !== null" class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div class="rounded-md p-3" style="background: rgba(32,128,240,0.08); border: 1px solid rgba(32,128,240,0.16)">
          <div class="text-xs text-muted-foreground">平均延迟</div>
          <div class="mt-1 text-xl font-semibold tabular-nums" style="color: #2080f0">{{ avg }} <span class="text-xs font-normal text-muted-foreground">ms</span></div>
        </div>
        <div class="rounded-md p-3" style="background: rgba(0,180,42,0.08); border: 1px solid rgba(0,180,42,0.16)">
          <div class="text-xs text-muted-foreground">最快</div>
          <div class="mt-1 text-xl font-semibold tabular-nums">{{ fastest }} <span class="text-xs font-normal text-muted-foreground">ms</span></div>
        </div>
        <div class="rounded-md p-3" style="background: rgba(250,140,22,0.08); border: 1px solid rgba(250,140,22,0.16)">
          <div class="text-xs text-muted-foreground">最慢</div>
          <div class="mt-1 text-xl font-semibold tabular-nums">{{ slowest }} <span class="text-xs font-normal text-muted-foreground">ms</span></div>
        </div>
        <div class="rounded-md p-3" style="background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.16)">
          <div class="text-xs text-muted-foreground">抖动</div>
          <div class="mt-1 text-xl font-semibold tabular-nums">{{ jitter }} <span class="text-xs font-normal text-muted-foreground">ms</span></div>
        </div>
      </div>

      <div v-if="verdict" class="mb-4 flex flex-wrap items-center gap-2">
        <n-tag :bordered="false" :color="{ color: verdict.color + '1A', textColor: verdict.color }">{{ verdict.label }}</n-tag>
        <span class="text-xs text-muted-foreground">{{ verdict.desc }}<template v-if="failedCount"> · {{ failedCount }} 次采样失败</template></span>
      </div>

      <div v-show="rounds.length" ref="chartEl" style="height: 260px"></div>
      <div v-if="!rounds.length" class="py-10">
        <n-empty description="暂无测速数据" style="--n-icon-size: 88px">
          <!-- Task 203-b: 空态换装 — 链路探测语义, search 线稿 (原纯文字占位, 同全站空态规范) -->
          <template #icon><EmptyState variant="search" :size="88" /></template>
          <template #extra><span class="text-xs text-muted-foreground">点击「开始测速」，将对网关发起 10 次轻量探测并绘制延迟趋势</span></template>
        </n-empty>
      </div>
    </n-card>
  </div>
  `,
})
