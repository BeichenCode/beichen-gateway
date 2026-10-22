/**
 * 个人中心 — 资料修改 / 密码修改 / 快捷入口 (n-card/n-input/n-button 原生)
 * Task 119: 三概览卡彩色化 (靛蓝/绿/橙渐变) + 快捷入口图标品牌色徽章
 */
import '../flags'
import { defineComponent, ref } from 'vue'
import { NButton, NCard, NInput } from 'naive-ui'
import { apiPut } from '@/lib/api'
import { message } from '../message'
import { renderQuota } from '../shared'
import { useUserStore } from '../stores'
import { navigate } from '../router'
import { UserRound, KeySquare, Gift, Wallet, Save, Megaphone, ChevronRight } from 'lucide-vue-next'

export default defineComponent({
  name: 'ProfilePage',
  setup() {
    const userStore = useUserStore()
    const user = userStore.user
    const displayName = ref(user?.displayName ?? '')
    const oldPassword = ref('')
    const newPassword = ref('')
    const savingProfile = ref(false)
    const savingPassword = ref(false)

    async function handleSaveProfile() {
      savingProfile.value = true
      try {
        await apiPut('/api/console/user/self', { displayName: displayName.value })
        message.success('资料已更新')
        await userStore.refresh()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        savingProfile.value = false
      }
    }

    async function handleChangePassword() {
      if (!oldPassword.value || !newPassword.value) {
        message.error('请填写旧密码和新密码')
        return
      }
      savingPassword.value = true
      try {
        await apiPut('/api/console/user/self', { oldPassword: oldPassword.value, password: newPassword.value })
        message.success('密码修改成功')
        oldPassword.value = ''
        newPassword.value = ''
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        savingPassword.value = false
      }
    }

    return {
      user, displayName, oldPassword, newPassword, savingProfile, savingPassword,
      handleSaveProfile, handleChangePassword, navigate, userStore, renderQuota,
      NButton, NCard, NInput,
      UserRound, KeySquare, Gift, Wallet, Save, Megaphone, ChevronRight,
    }
  },
  template: `
  <div>
    <page-header title="个人中心" description="管理个人信息、额度与邀请" />

    <!-- 概览 -->
    <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <n-card size="small" style="background: linear-gradient(135deg, rgba(99,102,241,0.10), rgba(99,102,241,0.02) 60%)">
        <div class="flex items-center gap-3">
          <span class="flex h-12 w-12 items-center justify-center text-lg font-bold" style="border-radius: 10px; background: rgba(99,102,241,0.15); color: #6366f1">
            {{ (user?.displayName || user?.username || '?').charAt(0).toUpperCase() }}
          </span>
          <div>
            <div class="font-semibold text-foreground">{{ user?.displayName || user?.username }}</div>
            <div class="text-xs text-muted-foreground">
              {{ user?.role >= 100 ? '超级管理员' : user?.role >= 10 ? '管理员' : '普通用户' }} · 分组 {{ user?.group }}
            </div>
          </div>
        </div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(0,180,42,0.09), rgba(0,180,42,0.015) 60%)">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground">剩余额度</span>
          <span class="flex h-7 w-7 items-center justify-center" style="border-radius: 6px; background: rgba(0,180,42,0.13); color: #00b42a"><wallet :size="14" /></span>
        </div>
        <div class="mt-2 text-xl font-bold text-foreground">{{ renderQuota(user?.quota ?? 0, user?.quotaPerUnit ?? 500000, !!user?.displayInCurrency) }}</div>
        <div class="mt-1 text-[11px] text-muted-foreground">
          已用 {{ renderQuota(user?.usedQuota ?? 0, user?.quotaPerUnit ?? 500000, !!user?.displayInCurrency) }} · {{ user?.requestCount ?? 0 }} 次请求
        </div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(250,140,22,0.10), rgba(250,140,22,0.015) 60%)">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground">邀请统计</span>
          <span class="flex h-7 w-7 items-center justify-center" style="border-radius: 6px; background: rgba(250,140,22,0.14); color: #fa8c16"><gift :size="14" /></span>
        </div>
        <div class="mt-2 text-xl font-bold text-foreground">{{ user?.affCount ?? 0 }} 人</div>
        <div class="mt-1 text-[11px] text-muted-foreground">
          累计奖励 {{ renderQuota(user?.affHistoryQuota ?? 0, user?.quotaPerUnit ?? 500000, !!user?.displayInCurrency) }}
        </div>
      </n-card>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- 资料与密码 -->
      <n-card size="small">
        <template #header><span class="flex items-center gap-2 text-sm font-semibold"><user-round :size="16" class="text-muted-foreground" /> 个人资料</span></template>
        <div class="flex flex-col gap-4">
          <form-row label="用户名" hint="用户名不可修改">
            <n-input :value="user?.username ?? ''" disabled />
          </form-row>
          <form-row label="显示名称">
            <n-input v-model:value="displayName" />
          </form-row>
          <n-button size="small" type="primary" :loading="savingProfile" @click="handleSaveProfile" style="align-self: flex-start">
            <template #icon><save :size="13" /></template>
            保存资料
          </n-button>

          <div class="border-t border-[var(--border)] pt-4">
            <h4 class="mb-3 text-sm font-semibold">修改密码</h4>
            <div class="flex flex-col gap-3">
              <form-row label="旧密码">
                <n-input v-model:value="oldPassword" type="password" show-password-on="click" />
              </form-row>
              <form-row label="新密码" hint="至少 6 位">
                <n-input v-model:value="newPassword" type="password" show-password-on="click" />
              </form-row>
              <n-button size="small" :loading="savingPassword" @click="handleChangePassword" style="align-self: flex-start">
                <template #icon><key-square :size="13" /></template>
                修改密码
              </n-button>
            </div>
          </div>
        </div>
      </n-card>

      <!-- 快捷入口 -->
      <div class="flex flex-col gap-4">
        <n-card v-for="item in [
            { key: '/wallet', icon: 'wallet', title: '钱包充值', desc: '额度余额 · 兑换码兑换 · 充值记录' },
            { key: '/invite', icon: 'megaphone', title: '邀请推广', desc: '邀请码 ' + (user?.affCode ?? '') + ' · 好友注册得奖励' },
          ]"
          :key="item.key"
          size="small"
          class="cursor-pointer transition-colors hover:border-primary/40"
          @click="navigate(item.key)"
        >
          <div class="flex w-full items-center gap-3 text-left">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center" :style="item.icon === 'wallet' ? 'border-radius: 8px; background: rgba(0,180,42,0.12); color: #00b42a' : 'border-radius: 8px; background: rgba(250,140,22,0.13); color: #fa8c16'">
              <wallet v-if="item.icon === 'wallet'" :size="18" />
              <megaphone v-else :size="18" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[13.5px] font-semibold text-foreground">{{ item.title }}</span>
              <span class="mt-0.5 block truncate text-[11.5px] text-muted-foreground">{{ item.desc }}</span>
            </span>
            <chevron-right :size="15" class="shrink-0 text-muted-foreground/50" />
          </div>
        </n-card>
      </div>
    </div>
  </div>
  `,
})
