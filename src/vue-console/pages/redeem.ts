/**
 * 兑换中心 — 用户自助兑换 (真实接口 /api/console/redemption/redeem)
 * Task 119: 兑换主卡靛紫渐变 + 图标徽章化 + 快捷入口/记录卡头品牌色
 * 兑换记录来自真实 Log (type=1, 服务端按 session 自动限定本人), 零编造数据。
 */
import '../flags'
import { defineComponent, onMounted, ref } from 'vue'
import { NButton, NCard, NInput } from 'naive-ui'
import { apiGet, apiPost } from '@/lib/api'
import { message } from '../message'
import { renderQuota } from '../shared'
import { useUserStore } from '../stores'
import { EmptyState } from '../components/empty-state'
import { navigate } from '../router'
import { TicketPercent, CircleCheck, Coins, Info, ReceiptText } from 'lucide-vue-next'

interface RedeemLog {
  id: number
  quota: number
  content: string
  createdAt: string
}

export default defineComponent({
  name: 'RedeemPage',
  components: { EmptyState },
  setup() {
    const userStore = useUserStore()
    const user = userStore.user
    const code = ref('')
    const redeeming = ref(false)
    const logs = ref<RedeemLog[]>([])
    const logsLoading = ref(true)

    async function loadLogs() {
      logsLoading.value = true
      try {
        // type=1 为系统充值类日志 (兑换/在线充值到账), 服务端自动限定本人
        const resp = await apiGet<{ data: { items: RedeemLog[] } }>('/api/console/log?type=1&page=1&size=10')
        logs.value = resp.data.items
      } catch {
        /* 记录加载失败不打断主流程 */
      } finally {
        logsLoading.value = false
      }
    }

    onMounted(() => void loadLogs())

    const quotaPerUnit = () => user?.quotaPerUnit ?? 500000
    const displayInCurrency = () => user?.displayInCurrency ?? true

    async function handleRedeem() {
      const key = code.value.trim()
      if (!key) {
        message.error('请输入兑换码')
        return
      }
      redeeming.value = true
      try {
        const resp = await apiPost<{ data: { quota: number } }>('/api/console/redemption/redeem', { key })
        message.success(`兑换成功，获得 ${renderQuota(resp.data.quota, quotaPerUnit(), displayInCurrency())} 额度`)
        code.value = ''
        await userStore.refresh()
        void loadLogs()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        redeeming.value = false
      }
    }

    return {
      user, code, redeeming, logs, logsLoading, handleRedeem, quotaPerUnit, displayInCurrency, navigate, renderQuota,
      NButton, NCard, NInput,
      TicketPercent, CircleCheck, Coins, Info, ReceiptText,
    }
  },
  template: `
  <div>
    <page-header title="兑换中心" description="输入兑换码即时兑换额度，实时到账" />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <!-- 兑换主卡 -->
      <n-card size="small" class="lg:col-span-3" style="border-color: rgba(99,102,241,0.30); background: linear-gradient(120deg, rgba(99,102,241,0.08), rgba(124,58,237,0.04) 60%, rgba(255,255,255,0))">
        <div class="flex items-center gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center" style="border-radius: 10px; background: rgba(99,102,241,0.15); color: #6366f1"><ticket-percent :size="21" /></span>
          <div>
            <h3 class="text-[15px] font-semibold text-foreground">兑换码兑换</h3>
            <p class="mt-0.5 text-xs text-muted-foreground">兑换成功后额度立即入账，可在钱包与数据看板查看</p>
          </div>
        </div>

        <div class="mt-5 flex gap-2.5">
          <n-input
            v-model:value="code"
            size="large"
            placeholder="输入兑换码"
            class="flex-1"
            :disabled="redeeming"
            @keyup.enter="handleRedeem"
          />
          <n-button size="large" type="primary" :loading="redeeming" class="shrink-0" @click="handleRedeem">
            <template #icon><circle-check v-if="!redeeming" :size="14" /></template>
            {{ redeeming ? '兑换中…' : '立即兑换' }}
          </n-button>
        </div>

        <div class="mt-4 flex items-start gap-2 bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <info :size="13" class="mt-px shrink-0 opacity-70" />
          兑换码由管理员生成并通过活动 / 邀请等渠道发放；每个兑换码仅可使用一次，兑换后与您的账号绑定。
        </div>

        <!-- 快捷入口 -->
        <div class="mt-4 grid grid-cols-2 gap-2.5">
          <button
            class="flex items-center gap-2.5 border border-[var(--border)] p-3 text-left transition-colors hover:border-primary/40"
            @click="navigate('/wallet')"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="background: rgba(0,180,42,0.1); color: #00B42A">
              <coins :size="15" />
            </span>
            <span class="min-w-0">
              <span class="block text-[13px] font-medium text-foreground">没有兑换码？</span>
              <span class="mt-0.5 block text-[11px] text-muted-foreground">去在线充值</span>
            </span>
          </button>
          <button
            class="flex items-center gap-2.5 border border-[var(--border)] p-3 text-left transition-colors hover:border-primary/40"
            @click="navigate('/invite')"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="background: rgba(99,102,241,0.10); color: #6366f1"><ticket-percent :size="15" /></span>
            <span class="min-w-0">
              <span class="block text-[13px] font-medium text-foreground">免费赚额度</span>
              <span class="mt-0.5 block text-[11px] text-muted-foreground">邀请好友双方得奖励</span>
            </span>
          </button>
        </div>
      </n-card>

      <!-- 我的兑换记录 -->
      <n-card size="small" class="lg:col-span-2">
        <template #header><span class="flex items-center gap-2 text-sm font-semibold"><span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(0,180,42,0.13); color: #00b42a"><receipt-text :size="14" /></span> 我的到账记录</span></template>
        <template #header-extra><span class="text-[11px] text-muted-foreground">最近 10 条</span></template>
        <div v-if="logsLoading" class="flex justify-center py-10"><n-spin size="medium" /></div>
        <div v-else-if="logs.length === 0" class="py-8">
          <n-empty description="暂无兑换记录" style="--n-icon-size: 92px">
            <!-- Task 184-b: 空态图标换装 — 礼品券/票券语义线稿 -->
            <template #icon><EmptyState variant="coupon" :size="92" /></template>
            <template #extra><span class="text-xs text-muted-foreground">首次兑换成功后将在这里展示</span></template>
          </n-empty>
        </div>
        <div v-else class="overflow-y-auto" style="max-height: 320px">
          <div
            v-for="l in logs"
            :key="l.id"
            class="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
          >
            <div class="min-w-0">
              <div class="truncate text-xs text-foreground" :title="l.content">{{ l.content || '兑换到账' }}</div>
              <div class="mt-1 whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground">
                {{ new Date(l.createdAt).toLocaleString('zh-CN', { hour12: false }) }}
              </div>
            </div>
            <div class="shrink-0 font-mono text-xs font-semibold tabular-nums" style="color:#00B42A">
              +{{ renderQuota(l.quota, quotaPerUnit(), displayInCurrency()) }}
            </div>
          </div>
        </div>
      </n-card>
    </div>
  </div>
  `,
})
