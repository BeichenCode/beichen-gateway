/**
 * 网关信息 — 平台接入总览 (Task 120 新功能)
 * 渐变 Hero (网关地址一键复制 + /v1/ping 实时延迟) + 接入点清单 + 快速接入示例 + 平台能力
 * 设计语言与 dashboard/wallet 同源 (118deg 品牌渐变 + 彩色徽章卡头 + 渐变卡底)
 */
import '../flags'
import { defineComponent, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { NButton } from 'naive-ui'
import { copyText } from '@/lib/utils'
import { message } from '../message'
import { navigate } from '../router'

const ENDPOINTS = [
  { method: 'POST', path: '/v1/chat/completions', desc: '对话补全 · 支持流式 SSE' },
  { method: 'POST', path: '/v1/completions', desc: '文本补全' },
  { method: 'POST', path: '/v1/embeddings', desc: '文本向量化' },
  { method: 'GET', path: '/v1/models', desc: '当前可用模型列表' },
  { method: 'POST', path: '/v1/messages', desc: 'Claude (Anthropic) 原生协议' },
  { method: 'GET', path: '/v1/ping', desc: '连通性探针 · 免鉴权' },
]

/* Task 125: 双网关入口 — 主站 bz + 备用 www 同一应用同库, 任一域名进入均可使用, 令牌通用。
   主站慢 / 故障时换备用即可, 无需换 key。恒定主站在前, 当前访问站点高亮标注 */
const GATEWAYS = [
  { host: 'bz.013.ltd', role: '主站', color: '#7dffb8' },
  { host: 'www.013.ltd', role: '备用', color: '#ffd666' },
]
const curHost = typeof window !== 'undefined' ? window.location.hostname : ''
const standbyUrl = () => (curHost === 'www.013.ltd' ? 'https://bz.013.ltd/v1' : 'https://www.013.ltd/v1')

const CAPS = [
  { icon: 'cable', color: '#2080f0', title: '双协议兼容', desc: 'OpenAI SDK 直接可用，Claude / Anthropic 原生 /v1/messages 同时支持' },
  { icon: 'zap', color: '#fa8c16', title: '流式透传', desc: 'SSE 流式响应逐字下发，token 用量实时统计入调用日志' },
  { icon: 'activity', color: '#00b42a', title: '智能路由', desc: '多渠道优先级 + 加权负载均衡，故障自动禁用与恢复' },
  { icon: 'shield-check', color: '#7c3aed', title: '安全鉴权', desc: 'sk-xxx 令牌鉴权，支持额度/有效期/限定模型/IP 白名单' },
]

export default defineComponent({
  name: 'GatewayPage',
  setup() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const gatewayUrl = origin + '/v1'

    /* 实时延迟探针 (与令牌管理页同源: /v1/ping 零鉴权零 DB, 10s 轮询) */
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
    const pingColor = () => (pingError.value ? 'rgba(255,255,255,0.5)' : pingMs.value === null ? 'rgba(255,255,255,0.5)' : '#7dffb8')
    const pingText = () => (pingError.value ? '网络异常' : pingMs.value === null ? '测量中…' : `${pingMs.value} ms`)

    function copy(text: string, tip: string) {
      void copyText(text).then((ok) => (ok ? message.success(tip) : message.error('复制失败')))
    }

    const curlCode = () =>
      `curl ${gatewayUrl}/chat/completions \\\n` +
      `  -H "Authorization: Bearer sk-xxx" \\\n` +
      `  -H "Content-Type: application/json" \\\n` +
      `  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hello"}]}'`
    const pyCode = () =>
      `from openai import OpenAI\n\n` +
      `client = OpenAI(\n` +
      `    base_url="${gatewayUrl}",\n` +
      `    api_key="sk-xxx",\n` +
      `)\n\n` +
      `resp = client.chat.completions.create(\n` +
      `    model="gpt-4o-mini",\n` +
      `    messages=[{"role": "user", "content": "hello"}],\n` +
      `)\n` +
      `print(resp.choices[0].message.content)`
    const nodeCode = () =>
      `import OpenAI from "openai";\n\n` +
      `const client = new OpenAI({\n` +
      `  baseURL: "${gatewayUrl}",\n` +
      `  apiKey: "sk-xxx",\n` +
      `});\n\n` +
      `const resp = await client.chat.completions.create({\n` +
      `  model: "gpt-4o-mini",\n` +
      `  messages: [{ role: "user", content: "hello" }],\n` +
      `});`

    const methodStyle = (m: string) =>
      m === 'GET'
        ? 'background: rgba(0,180,42,0.12); color: #00b42a'
        : 'background: rgba(32,128,240,0.12); color: #2080f0'

    return {
      origin, gatewayUrl, pingMs, pingAt, pingError, pingColor, pingText,
      ENDPOINTS, CAPS, curlCode, pyCode, nodeCode, methodStyle,
      GATEWAYS, curHost, standbyUrl,
      copy, navigate, NButton,
    }
  },
  template: `
  <div>
    <!-- 品牌渐变 Hero: 网关地址 + 实时状态 (与看板/钱包同语言) -->
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
              <server :size="18" />
            </span>
            <div>
              <h2 class="text-lg font-bold text-white md:text-xl">API 网关</h2>
              <p class="text-[12px] text-white/70">OpenAI / Claude 双协议兼容 · 统一密钥 · 智能路由</p>
            </div>
          </div>
          <div class="mt-3.5 flex flex-col gap-2">
            <div v-for="g in GATEWAYS" :key="g.host" class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex shrink-0 items-center border px-1.5 py-0.5 text-[10px] font-bold"
                :style="'border-radius: 5px; color: ' + g.color + '; border-color: ' + g.color + '55; background: ' + g.color + '14'"
              >{{ g.role }}</span>
              <code
                class="max-w-full truncate border bg-white/10 px-3 py-1.5 font-mono text-[13px] font-medium text-white"
                :style="curHost === g.host ? 'border-radius: 6px; border-color: rgba(125,255,184,0.55)' : 'border-radius: 6px; border-color: rgba(255,255,255,0.25)'"
              >https://{{ g.host }}/v1</code>
              <span v-if="curHost === g.host" class="inline-flex items-center gap-1 text-[10.5px]" style="color: #7dffb8"><circle-check :size="12" />当前访问</span>
              <button
                type="button"
                class="inline-flex items-center gap-1 border border-white/25 bg-white/10 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-white/20 active:scale-[0.97]"
                style="border-radius: 5px"
                @click="copy('https://' + g.host + '/v1', g.role + '网关地址已复制')"
              >
                <copy :size="12" />
                复制
              </button>
            </div>
            <div class="text-[11px] text-white/60">两个网关同一服务同库同额度，令牌通用；主站慢或故障时把 base_url 换成备用网关即可，无需换 key。</div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-2.5 py-2" style="border-radius: 6px">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full rounded-full opacity-60" style="background:#7dffb8; animation: dash-live-pulse 2s ease-out infinite" />
              <span class="relative inline-flex h-2 w-2 rounded-full" :style="{ background: pingMs === null ? 'rgba(255,255,255,0.5)' : '#7dffb8' }" />
            </span>
            <span class="text-[11px] font-medium text-white">{{ pingText() }}</span>
            <span v-if="pingAt" class="text-[11px] tabular-nums text-white/70">{{ pingAt }}</span>
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-white/20 active:scale-[0.97]"
            style="border-radius: 6px"
            @click="navigate('/speedtest')"
          >
            <gauge :size="15" />
            去测速
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-white/20 active:scale-[0.97]"
            style="border-radius: 6px"
            @click="navigate('/token')"
          >
            <key-round :size="15" />
            新建令牌
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- 接入点 -->
      <n-card size="small">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(32,128,240,0.14); color: #2080f0"><cable :size="14" /></span>
            <span class="text-sm font-semibold">平台接入点</span>
          </div>
        </template>
        <template #header-extra><span class="text-xs text-muted-foreground">base_url = 网关地址 + /v1</span></template>
        <div>
          <div
            v-for="e in ENDPOINTS"
            :key="e.path"
            class="flex items-center gap-2.5 border-b border-[var(--border)] py-2.5 last:border-b-0"
          >
            <span class="w-[52px] shrink-0 py-1 text-center font-mono text-[10.5px] font-bold" style="border-radius: 5px" :style="methodStyle(e.method)">{{ e.method }}</span>
            <code class="min-w-0 flex-1 truncate font-mono text-xs font-medium text-foreground">{{ e.path }}</code>
            <span class="hidden shrink-0 text-[11.5px] text-muted-foreground md:block">{{ e.desc }}</span>
            <n-button size="tiny" quaternary :title="'复制 ' + e.path" @click="copy(origin + e.path, '端点已复制')">
              <template #icon><copy :size="12" /></template>
            </n-button>
          </div>
        </div>
        <div class="mt-3 flex items-start gap-1.5 border p-2.5" style="border-radius: 6px; border-color: rgba(250,140,22,0.35); background: rgba(250,140,22,0.06)">
          <circle-check :size="13" class="mt-0.5 shrink-0" style="color: #fa8c16" />
          <span class="text-[11.5px] leading-relaxed text-muted-foreground">
            SDK 的 base_url 填 {{ gatewayUrl }} 即可，不要再拼接 /chat/completions；鉴权头使用 Authorization: Bearer sk-xxx（令牌管理页创建）。备用网关 {{ standbyUrl() }} 令牌通用，主站慢时可换用。
          </span>
        </div>
      </n-card>

      <!-- 快速接入 -->
      <n-card size="small">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(124,58,237,0.13); color: #7c3aed"><terminal :size="14" /></span>
            <span class="text-sm font-semibold">快速接入</span>
          </div>
        </template>
        <template #header-extra><span class="text-xs text-muted-foreground">任选一种语言，替换 sk-xxx</span></template>
        <div class="space-y-3">
          <div v-for="s in [
            { label: 'cURL', color: '#2080f0', code: curlCode() },
            { label: 'Python · OpenAI SDK', color: '#00b42a', code: pyCode() },
            { label: 'Node.js · OpenAI SDK', color: '#fa8c16', code: nodeCode() },
          ]" :key="s.label">
            <div class="flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 text-[11.5px] font-semibold" :style="{ color: s.color }">
                <span class="h-1.5 w-1.5 rounded-full" :style="{ background: s.color }"></span>
                {{ s.label }}
              </span>
              <n-button size="tiny" quaternary @click="copy(s.code, '示例代码已复制')">
                <template #icon><copy :size="12" /></template>
                复制
              </n-button>
            </div>
            <pre class="log-codeblock naive-scrollbar mt-1.5 overflow-auto whitespace-pre p-3 font-mono text-[11px] leading-relaxed" style="border-radius: 6px; max-height: 150px; background: #0d1017; color: #c6d0dc">{{ s.code }}</pre>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 平台能力 -->
    <n-card size="small" class="mt-4">
      <template #header>
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(0,180,42,0.13); color: #00b42a"><shield-check :size="14" /></span>
          <span class="text-sm font-semibold">平台能力</span>
        </div>
      </template>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="c in CAPS"
          :key="c.title"
          class="border border-[var(--border)] p-3.5 transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40"
          style="border-radius: 6px; background: linear-gradient(135deg, rgba(128,128,128,0.04), rgba(128,128,128,0.005) 60%)"
        >
          <div class="flex items-center gap-2">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center" style="border-radius: 7px" :style="{ background: c.color + '22', color: c.color }">
              <component :is="c.icon" :size="15" />
            </span>
            <span class="text-[13px] font-semibold text-foreground">{{ c.title }}</span>
          </div>
          <p class="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">{{ c.desc }}</p>
        </div>
      </div>
    </n-card>
  </div>
  `,
})
