/**
 * 关于页 — 系统介绍 + API 使用文档 (登录后在后台壳内展示; 游客模式由根组件提供轻壳)
 * Task 119: 特性瓷砖四色化 (蓝/紫/绿/橙 徽章)
 */
import '../flags'
import { computed, defineComponent, onMounted, ref } from 'vue'
import { NCard } from 'naive-ui'
import { copyText } from '@/lib/utils'
import { useUserStore } from '../stores'
import { BookOpen, Terminal, ShieldCheck, Cpu, BarChart3, Copy, Check } from 'lucide-vue-next'

export default defineComponent({
  name: 'AboutPage',
  setup() {
    const userStore = useUserStore()
    const user = userStore.user
    const about = ref('')
    const origin = ref('')
    const loading = ref(true)
    const copiedLang = ref('')

    onMounted(() => {
      const o = window.location.origin
      fetch('/api/auth/status')
        .then((r) => r.json())
        .then((j) => {
          origin.value = o
          if (j.data?.about) about.value = j.data.about
        })
        .catch(() => {
          origin.value = o
        })
        .finally(() => {
          loading.value = false
        })
    })

    const openaiCode = () => `curl ${origin.value}/v1/chat/completions \\
  -H "Authorization: Bearer sk-你的令牌" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "你好"}
    ],
    "stream": true
  }'`

    const claudeCode = () => `curl ${origin.value}/v1/messages \\
  -H "x-api-key: sk-你的令牌" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'`

    const pythonCode = () => `from openai import OpenAI

client = OpenAI(
    api_key="sk-你的令牌",
    base_url="${origin.value}/v1"
)

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "你好"}]
)
print(resp.choices[0].message.content)`

    async function copyCode(code: string, lang: string) {
      const ok = await copyText(code)
      if (ok) {
        copiedLang.value = lang
        setTimeout(() => (copiedLang.value = copiedLang.value === lang ? '' : copiedLang.value), 1600)
      }
    }

    const endpoints = [
      ['POST /v1/chat/completions', 'Chat 对话 (支持流式)'],
      ['POST /v1/completions', '文本补全'],
      ['POST /v1/embeddings', '文本向量化'],
      ['GET  /v1/models', '可用模型列表'],
      ['POST /v1/messages', 'Claude 原生格式'],
    ]

    /** 管理员配置的 About (markdown 子集) 结构化: 标题/列表/段落三态
     *  — 列表用方角竖条 marker (呼应全直角设计语言), 不再裸吐 "- " 文本 */
    const aboutBlocks = computed(() => {
      const src = about.value.replace(/\*/g, '')
      if (!src) return []
      return src
        .split(/\r?\n/)
        .map((raw) => raw.trim())
        .filter(Boolean)
        .map((line) => {
          const h = line.match(/^#{1,4}\s*(.+)$/)
          if (h) return { type: 'h' as const, text: h[1] }
          const li = line.match(/^[-•]\s*(.+)$/)
          if (li) return { type: 'li' as const, text: li[1] }
          return { type: 'p' as const, text: line }
        })
    })

    return {
      user, about, origin, loading, openaiCode, claudeCode, pythonCode, copyCode, copiedLang, endpoints, aboutBlocks,
      NCard, BookOpen, Terminal, ShieldCheck, Cpu, BarChart3, Copy, Check,
    }
  },
  template: `
  <div>
    <page-header title="关于" description="系统介绍与 API 使用文档" />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <n-card size="small" class="lg:col-span-2">
        <template #header><span class="flex items-center gap-2 text-sm font-semibold"><book-open :size="16" style="color: var(--primary)" /> 关于本系统</span></template>
        <div v-if="aboutBlocks.length" class="text-sm leading-relaxed text-muted-foreground">
          <template v-for="(b, i) in aboutBlocks" :key="i">
            <div v-if="b.type === 'h'" class="mb-2 mt-4 text-[13px] font-semibold text-foreground first:mt-0">{{ b.text }}</div>
            <div v-else-if="b.type === 'li'" class="mb-1.5 flex items-start gap-2.5">
              <span class="mt-[8px] inline-block h-[10px] w-[3px] shrink-0" style="background: var(--primary)" />
              <span>{{ b.text }}</span>
            </div>
            <p v-else class="mb-2">{{ b.text }}</p>
          </template>
        </div>
        <div v-else class="text-sm leading-relaxed text-muted-foreground">
          <p class="mb-2">
            本系统是对标 New API 的大模型网关与资产管理系统，提供统一的 OpenAI / Claude 兼容接口，
            支持多渠道负载均衡、故障自动切换、精细计费与额度管理。
          </p>
          <p>技术栈: Next.js 16 · TypeScript · Prisma (SQLite) · Tailwind CSS · Naive UI (Vue3)</p>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="f in [
            { icon: 'shield', label: '统一接口', desc: 'OpenAI/Claude', bg: 'rgba(32,128,240,0.10)', color: '#2080f0' },
            { icon: 'cpu', label: '智能路由', desc: '负载均衡', bg: 'rgba(124,58,237,0.10)', color: '#7c3aed' },
            { icon: 'chart', label: '精细计费', desc: '倍率体系', bg: 'rgba(0,180,42,0.10)', color: '#00b42a' },
            { icon: 'term', label: '完整日志', desc: '全程可查', bg: 'rgba(250,140,22,0.12)', color: '#fa8c16' },
          ]" :key="f.label" class="border border-[var(--border)] p-3 text-center">
            <div class="mx-auto mb-2 flex h-8 w-8 items-center justify-center" :style="'border-radius: 8px; background: ' + f.bg + '; color: ' + f.color">
              <shield-check v-if="f.icon === 'shield'" :size="20" />
              <cpu v-else-if="f.icon === 'cpu'" :size="20" />
              <bar-chart3 v-else-if="f.icon === 'chart'" :size="20" />
              <terminal v-else :size="20" />
            </div>
            <div class="text-xs font-medium text-foreground">{{ f.label }}</div>
            <div class="mt-0.5 text-[10px] text-muted-foreground">{{ f.desc }}</div>
          </div>
        </div>
      </n-card>

      <n-card size="small">
        <template #header><span class="text-sm font-semibold">系统信息</span></template>
        <div class="flex flex-col gap-2.5 text-xs">
          <div v-for="r in [
            { label: '系统名称', value: user?.systemName || '北辰中转站' },
            { label: '版本', value: 'v1.0.0' },
            { label: '运行环境', value: 'Next.js 16 (Node.js)' },
            { label: '数据库', value: 'SQLite (Prisma)' },
            { label: '我的分组', value: user?.group || 'default' },
            { label: '接口地址', value: origin },
          ]" :key="r.label" class="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-b-0">
            <span class="text-muted-foreground">{{ r.label }}</span>
            <span class="max-w-[180px] truncate font-medium text-foreground">{{ r.value }}</span>
          </div>
        </div>
      </n-card>
    </div>

    <!-- API 文档 -->
    <n-card size="small" class="mt-4">
      <template #header><span class="flex items-center gap-2 text-sm font-semibold"><terminal :size="16" style="color: var(--primary)" /> API 使用文档</span></template>
      <div class="flex flex-col gap-4">
        <div>
          <h4 class="mb-2 text-xs font-semibold text-foreground">1. OpenAI 兼容接口</h4>
          <div class="overflow-hidden border border-[var(--border)]" style="background: linear-gradient(180deg, var(--card, #fff), var(--code-soft, rgba(243,247,255,0.6)))">
            <div class="flex h-9 items-center gap-2 border-b border-[var(--border)] bg-white/70 px-3 dark:bg-white/5">
              <span class="px-1.5 py-0.5 font-mono text-[10px] font-semibold" style="background: rgba(32,128,240,0.1); color: var(--primary)">bash</span>
              <button class="ml-auto flex items-center gap-1 border px-2 py-1 text-[11px] text-muted-foreground transition-colors" @click="copyCode(openaiCode(), 'bash')">
                <check v-if="copiedLang === 'bash'" :size="12" style="color: #10b981" /><copy v-else :size="12" />
                {{ copiedLang === 'bash' ? '已复制' : '复制' }}
              </button>
            </div>
            <pre class="naive-scrollbar overflow-x-auto p-3.5 font-mono text-[11.5px] leading-relaxed text-foreground">{{ openaiCode() }}</pre>
          </div>
        </div>
        <div>
          <h4 class="mb-2 text-xs font-semibold text-foreground">2. Claude 兼容接口</h4>
          <div class="overflow-hidden border border-[var(--border)]" style="background: linear-gradient(180deg, var(--card, #fff), var(--code-soft, rgba(243,247,255,0.6)))">
            <div class="flex h-9 items-center gap-2 border-b border-[var(--border)] bg-white/70 px-3 dark:bg-white/5">
              <span class="px-1.5 py-0.5 font-mono text-[10px] font-semibold" style="background: rgba(32,128,240,0.1); color: var(--primary)">bash</span>
              <button class="ml-auto flex items-center gap-1 border px-2 py-1 text-[11px] text-muted-foreground transition-colors" @click="copyCode(claudeCode(), 'claude')">
                <check v-if="copiedLang === 'claude'" :size="12" style="color: #10b981" /><copy v-else :size="12" />
                {{ copiedLang === 'claude' ? '已复制' : '复制' }}
              </button>
            </div>
            <pre class="naive-scrollbar overflow-x-auto p-3.5 font-mono text-[11.5px] leading-relaxed text-foreground">{{ claudeCode() }}</pre>
          </div>
        </div>
        <div>
          <h4 class="mb-2 text-xs font-semibold text-foreground">3. Python (OpenAI SDK)</h4>
          <div class="overflow-hidden border border-[var(--border)]" style="background: linear-gradient(180deg, var(--card, #fff), var(--code-soft, rgba(243,247,255,0.6)))">
            <div class="flex h-9 items-center gap-2 border-b border-[var(--border)] bg-white/70 px-3 dark:bg-white/5">
              <span class="px-1.5 py-0.5 font-mono text-[10px] font-semibold" style="background: rgba(32,128,240,0.1); color: var(--primary)">python</span>
              <button class="ml-auto flex items-center gap-1 border px-2 py-1 text-[11px] text-muted-foreground transition-colors" @click="copyCode(pythonCode(), 'python')">
                <check v-if="copiedLang === 'python'" :size="12" style="color: #10b981" /><copy v-else :size="12" />
                {{ copiedLang === 'python' ? '已复制' : '复制' }}
              </button>
            </div>
            <pre class="naive-scrollbar overflow-x-auto p-3.5 font-mono text-[11.5px] leading-relaxed text-foreground">{{ pythonCode() }}</pre>
          </div>
        </div>
        <div>
          <h4 class="mb-2 text-xs font-semibold text-foreground">4. 支持的端点</h4>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div v-for="[ep, desc] in endpoints" :key="ep" class="flex items-center justify-between bg-muted px-3 py-2">
              <code class="font-mono text-[11px] font-medium text-foreground">{{ ep }}</code>
              <span class="text-[11px] text-muted-foreground">{{ desc }}</span>
            </div>
          </div>
        </div>
      </div>
    </n-card>
  </div>
  `,
})
