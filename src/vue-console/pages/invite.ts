/**
 * 邀请推广 — 邀请码/邀请链接/统计/奖励规则/邀请记录 (全真实数据, n-card 原生)
 * Task 119: 物料卡靛紫渐变 + 4 统计卡彩色化 + 规则步骤号/卡头徽章化 (同看板设计语言)
 */
import '../flags'
import { defineComponent, onMounted, onBeforeUnmount, ref } from 'vue'
import { NButton, NCard, NDataTable, NTag } from 'naive-ui'
import { h } from 'vue'
import { apiGet } from '@/lib/api'
import { copyText } from '@/lib/utils'
import { message } from '../message'
import { renderQuota } from '../shared'
import { useUserStore } from '../stores'
import { EmptyState } from '../components/empty-state'
import { Megaphone, Copy, Gift, UsersRound, Coins, Link2, CircleCheck } from 'lucide-vue-next'

/* Task 204: 窄屏 (<768px) 统计卡大数缩写 — 半宽卡 (26px 字号) 放不下 ¥1459998.9196 这类长金额,
 *   从中腰断成两行极难看; 窄屏改万缩写 (¥146 万, Task 103 用户明确偏好「多少万」), 桌面保持全精度 */
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

interface Invitee {
  id: number
  username: string
  displayName: string
  status: number
  createdAt: string
}

export default defineComponent({
  name: 'InvitePage',
  components: { EmptyState },
  setup() {
    const isNarrow = useNarrow()
    const userStore = useUserStore()
    const user = userStore.user
    const invitees = ref<Invitee[]>([])
    const loading = ref(true)
    const origin = ref('')
    const copiedField = ref('')
    const affQuota = ref<string | null>(null)
    const newUserQuota = ref<string | null>(null)
    let timer: ReturnType<typeof setInterval> | null = null

    async function load() {
      loading.value = true
      try {
        const resp = await apiGet<{ data: { items: Invitee[] } }>('/api/console/user/invitees')
        invitees.value = resp.data.items
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      origin.value = window.location.origin
      void load()
      // 挂载即刷新会话统计 (邀请可能在其他页面/会话产生)
      void userStore.refresh()
      timer = setInterval(() => void userStore.refresh(), 30000)
      fetch('/api/console/option')
        .then((r) => r.json())
        .then((j) => {
          if (j.data) {
            if (j.data.AffQuota !== undefined) affQuota.value = j.data.AffQuota
            if (j.data.QuotaForNewUser !== undefined) newUserQuota.value = j.data.QuotaForNewUser
          }
        })
        .catch(() => {})
    })
    onBeforeUnmount(() => {
      if (timer) clearInterval(timer)
    })

    const quotaPerUnit = () => user?.quotaPerUnit ?? 500000
    const displayInCurrency = () => user?.displayInCurrency ?? true
    /* Task 204: 窄屏万缩写 — renderQuota 原样金额 ≥1万 时改「x.x万」; <1万 或桌面保持全精度 */
    function compactQuota(q: number | undefined): string {
      const s = renderQuota(q ?? 0, quotaPerUnit(), displayInCurrency())
      if (!isNarrow.value) return s
      const m = s.match(/^¥([\d.]+)$/)
      if (!m) return s
      const v = parseFloat(m[1])
      if (!(v >= 1e4)) return s
      return '¥' + parseFloat((v / 1e4).toFixed(1)) + ' 万'
    }
    // Task 130: 邀请链接直达注册页 (历史为 /?aff= → 落在官网首页, 邀请码不会被自动填写);
    // /register 页读 ?aff= 预填邀请码, 旧链接由官网壳检测 ?aff 重定向兼容
    const affLink = () => `${origin.value}/register?aff=${user?.affCode ?? ''}`
    const rewardQuota = () => (affQuota.value !== null ? parseFloat(affQuota.value) || 0 : 1)
    const newUserGift = () => (newUserQuota.value !== null ? parseFloat(newUserQuota.value) || 0 : 0)

    async function copyField(text: string, field: string) {
      const ok = await copyText(text)
      if (ok) {
        copiedField.value = field
        message.success('已复制到剪贴板')
        setTimeout(() => (copiedField.value = copiedField.value === field ? '' : copiedField.value), 1600)
        void userStore.refresh()
      } else {
        message.error('复制失败，请手动复制')
      }
    }

    const columns = [
      {
        title: '用户',
        key: 'username',
        render: (u: Invitee) =>
          h('div', { class: 'flex items-center gap-2' }, [
            h(
              'span',
              { class: 'flex shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground', style: 'height:24px;width:24px' },
              (u.displayName || u.username || '?').slice(0, 1).toUpperCase(),
            ),
            h('span', { class: 'text-xs' }, u.displayName || u.username),
            h('span', { class: 'font-mono text-[11px] text-muted-foreground' }, '@' + u.username),
          ]),
      },
      {
        title: '状态',
        key: 'status',
        width: 90,
        render: (u: Invitee) =>
          h(NTag, { size: 'small', bordered: false, type: u.status === 1 ? 'success' : 'default' }, { default: () => (u.status === 1 ? '正常' : '已禁用') }),
      },
      {
        title: '注册时间',
        key: 'createdAt',
        width: 170,
        render: (u: Invitee) =>
          h('span', { class: 'whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground' }, new Date(u.createdAt).toLocaleString('zh-CN', { hour12: false })),
      },
    ]

    return {
      user, invitees, loading, copiedField, load, copyField, affLink, rewardQuota, newUserGift,
      quotaPerUnit, displayInCurrency, columns, renderQuota, isNarrow, compactQuota,
      NButton, NCard, NDataTable, NTag,
      Megaphone, Copy, Gift, UsersRound, Coins, Link2, CircleCheck,
    }
  },
  template: `
  <div>
    <page-header title="邀请推广" description="分享专属邀请链接，好友注册后您将获得额度奖励" />

    <!-- 邀请物料 -->
    <n-card size="small" style="border-color: rgba(99,102,241,0.30); background: linear-gradient(120deg, rgba(99,102,241,0.08), rgba(124,58,237,0.04) 60%, rgba(255,255,255,0))">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center" style="border-radius: 5px; background: rgba(99,102,241,0.14); color: #6366f1"><gift :size="12" /></span>
            我的邀请码
          </div>
          <div class="mt-2.5 flex items-center gap-2.5">
            <code class="flex h-12 min-w-0 flex-1 items-center justify-between border border-[var(--border)] bg-muted/40 px-4 font-mono text-[17px] font-bold tracking-[0.18em] text-foreground">
              <span class="truncate">{{ user?.affCode }}</span>
            </code>
            <n-button size="small" type="primary" class="shrink-0" @click="copyField(user.affCode, 'code')">
              <template #icon><circle-check v-if="copiedField === 'code'" :size="13" /><copy v-else :size="13" /></template>
              {{ copiedField === 'code' ? '已复制' : '复制' }}
            </n-button>
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center" style="border-radius: 5px; background: rgba(124,58,237,0.13); color: #7c3aed"><link2 :size="12" /></span>
            邀请链接
          </div>
          <div class="mt-2.5 flex items-center gap-2.5">
            <n-input :value="affLink()" size="large" readonly class="min-w-0 flex-1" />
            <n-button size="small" class="shrink-0" @click="copyField(affLink(), 'link')">
              <template #icon><circle-check v-if="copiedField === 'link'" :size="13" /><copy v-else :size="13" /></template>
              {{ copiedField === 'link' ? '已复制' : '复制' }}
            </n-button>
          </div>
        </div>
      </div>
    </n-card>

    <!-- 统计 -->
    <div class="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <n-card size="small" style="background: linear-gradient(135deg, rgba(32,128,240,0.09), rgba(32,128,240,0.015) 60%)">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(32,128,240,0.15); color: #2080f0"><users-round :size="17" /></span>
          <span class="text-[13px] font-medium text-muted-foreground">累计邀请用户</span>
        </div>
        <div class="mt-3.5 text-[26px] font-bold leading-none tabular-nums text-foreground">{{ user?.affCount ?? 0 }} 人</div>
        <div class="mt-2.5 text-[11.5px] text-muted-foreground">通过您的链接注册</div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(0,180,42,0.09), rgba(0,180,42,0.015) 60%)">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(0,180,42,0.14); color: #00b42a"><coins :size="17" /></span>
          <span class="text-[13px] font-medium text-muted-foreground">累计邀请奖励</span>
        </div>
        <div class="mt-3.5 text-[26px] font-bold leading-none tabular-nums text-foreground">{{ compactQuota(user?.affHistoryQuota) }}</div>
        <div class="mt-2.5 text-[11.5px] text-muted-foreground">已实时到账余额</div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.015) 60%)">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(124,58,237,0.14); color: #7c3aed"><gift :size="17" /></span>
          <span class="text-[13px] font-medium text-muted-foreground">剩余额度</span>
        </div>
        <div class="mt-3.5 text-[26px] font-bold leading-none tabular-nums text-foreground">{{ compactQuota(user?.quota) }}</div>
        <div class="mt-2.5 text-[11.5px] text-muted-foreground">含邀请奖励</div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(250,140,22,0.10), rgba(250,140,22,0.015) 60%)">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(250,140,22,0.15); color: #fa8c16"><megaphone :size="17" /></span>
          <span class="text-[13px] font-medium text-muted-foreground">调用次数</span>
        </div>
        <div class="mt-3.5 text-[26px] font-bold leading-none tabular-nums text-foreground">{{ (user?.requestCount ?? 0).toLocaleString() }}</div>
        <div class="mt-2.5 text-[11.5px] text-muted-foreground">账户累计请求</div>
      </n-card>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
      <!-- 奖励规则 (站点真实配置) -->
      <n-card size="small" class="lg:col-span-2">
        <template #header><span class="flex items-center gap-2 text-sm font-semibold"><span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(99,102,241,0.13); color: #6366f1"><gift :size="14" /></span> 奖励规则</span></template>
        <div class="flex flex-col gap-3">
          <div class="flex items-start gap-3 border border-[var(--border)] p-3.5">
            <span class="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold" style="background: rgba(99,102,241,0.14); color: #6366f1">1</span>
            <div class="text-xs leading-relaxed text-muted-foreground">
              好友通过<span class="font-medium text-foreground">邀请链接</span>注册成功后，您获得
              <span class="mx-1 font-mono font-semibold text-foreground">¥{{ rewardQuota().toFixed(2) }}</span>
              面值额度奖励，实时到账。
            </div>
          </div>
          <div class="flex items-start gap-3 border border-[var(--border)] p-3.5">
            <span class="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold" style="background: rgba(99,102,241,0.14); color: #6366f1">2</span>
            <div class="text-xs leading-relaxed text-muted-foreground">
              新用户注册<template v-if="newUserGift() > 0">
                即赠送 <span class="mx-1 font-mono font-semibold text-foreground">¥{{ newUserGift().toFixed(2) }}</span> 面值额度，可直接体验</template><template v-else>赠送额度由管理员配置（当前未开启注册赠送）</template>。
            </div>
          </div>
          <div class="flex items-start gap-3 border border-[var(--border)] p-3.5">
            <span class="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold" style="background: rgba(99,102,241,0.14); color: #6366f1">3</span>
            <div class="text-xs leading-relaxed text-muted-foreground">奖励额度与余额同权，可在「钱包充值」查看，调用 API 时自动扣减。</div>
          </div>
        </div>
      </n-card>

      <!-- 邀请记录 (真实查询 inviterId = 我) -->
      <n-card size="small" class="lg:col-span-3">
        <template #header><span class="flex items-center gap-2 text-sm font-semibold"><span class="flex h-6 w-6 shrink-0 items-center justify-center" style="border-radius: 6px; background: rgba(32,128,240,0.13); color: #2080f0"><users-round :size="14" /></span> 邀请记录</span></template>
        <n-data-table :columns="columns" :data="invitees" :loading="loading" :bordered="false" size="small" :row-key="(r) => r.id">
          <!-- Task 203-b: 空态换装 — 邀请/工单语义, ticket 线稿 (原 naive 默认灰块, 同 203-a 表格空态规范) -->
          <template #empty>
            <n-empty description="暂无邀请记录" style="--n-icon-size: 88px">
              <template #icon><EmptyState variant="ticket" :size="88" /></template>
            </n-empty>
          </template>
        </n-data-table>
      </n-card>
    </div>
  </div>
  `,
})
