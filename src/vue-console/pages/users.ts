/**
 * 用户管理 — 管理员专用 (n-data-table + n-modal 全原生)
 * Task 130: 列表新增「今日调用」简略列 (后端批量聚合) + 点「详情」弹窗看完整档案与最近调用
 */
import '../flags'
import { defineComponent, h, onBeforeUnmount, onMounted, ref , computed} from 'vue'
import { NButton, NDataTable, NInput, NInputNumber, NModal, NSelect, NTag } from 'naive-ui'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { message, confirmDelete } from '../message'
import { renderQuota } from '../shared'
import { EmptyState } from '../components/empty-state'
import { getQuotaDisplayPrice, cnyToQuota } from '@/lib/quota-display'
import { useUserStore } from '../stores'
import { Plus, Trash2, RefreshCw, Search, Users2, Pencil, Eye } from 'lucide-vue-next'

interface UserItem {
  id: number
  username: string
  displayName: string
  role: number
  status: number
  email: string
  quota: number
  usedQuota: number
  requestCount: number
  group: string
  affCode: string
  affCount: number
  affHistoryQuota: number
  createdAt: string
  lastLoginTime: string | null
  // Task 130: 今日调用简略数据 (后端批量聚合)
  todayRequests: number
  todayQuota: number
  todayTokens: number
}

const emptyForm = () => ({
  id: 0,
  username: '',
  password: '',
  displayName: '',
  group: 'default',
  role: 1,
  status: 1,
  email: '',
})
// Task 127: 余额不再放进表单绝对值字段 — 编辑弹窗改「增加/减少余额」增量模式:
// 当前余额只读展示 + 增/减切换 + 金额输入, 保存时提交 quotaDelta (内部 quota 增量) 后端在原值上原子增减

export default defineComponent({
  name: 'UsersPage',
  components: { EmptyState },
  setup() {
    const userStore = useUserStore()
    const me = userStore.user
    const quotaPerUnit = me?.quotaPerUnit ?? 500000
    const isRoot = (me?.role ?? 0) >= 100

    const users = ref<UserItem[]>([])
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(20)
    const keyword = ref('')
    const loading = ref(true)
    const dialogOpen = ref(false)
    const form = ref(emptyForm())
    const saving = ref(false)
    // Task 127: 增量余额状态 — curQuota 为打开编辑器时的余额快照 (内部 quota)
    const curQuota = ref(0)
    const adjMode = ref<'add' | 'sub'>('add')
    const adjAmt = ref<number | null>(0)
    const quickAdd = [1, 5, 10, 50]
    function addAdj(n: number) {
      const cur = Number(adjAmt.value) || 0
      adjAmt.value = Math.round((cur + n) * 10000) / 10000
    }
    const adjQuota = computed(() => {
      const amt = Math.max(Number(adjAmt.value) || 0, 0)
      const q = cnyToQuota(amt, quotaPerUnit)
      return adjMode.value === 'add' ? q : -q
    })
    const overSub = computed(() => adjMode.value === 'sub' && (Number(adjAmt.value) || 0) > 0 && cnyToQuota(Number(adjAmt.value) || 0, quotaPerUnit) > curQuota.value)
    const segOnStyle = { background: 'var(--primary)', color: '#fff' }
    const segOffStyle = { background: 'transparent', color: 'var(--muted-foreground)' }

    // Task 174-d: 移动端 (<768px) 适配 — 断点判定沿用 base-layout.ts 的 matchMedia+change 监听模式
    // 初值同步判定, 避免手机端首帧先渲染桌面宽表再切换
    const isNarrow = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
    let narrowMql: MediaQueryList | null = null
    function resolveNarrow() {
      isNarrow.value = !!narrowMql?.matches
    }
    onMounted(() => {
      narrowMql = window.matchMedia('(max-width: 767px)')
      resolveNarrow()
      narrowMql.addEventListener('change', resolveNarrow)
    })
    onBeforeUnmount(() => narrowMql?.removeEventListener('change', resolveNarrow))
    // 小屏弹窗内容限高: naive n-modal 容器 overflow visible 且不自带滚动, 长表单会顶出屏幕且够不到底部按钮
    const modalScrollStyle = 'max-height: calc(100vh - 220px); overflow-y: auto'

    /** 状态切换标签 (桌面「状态」列与小屏「用户名」主列收纳行共用同一渲染) */
    function renderStatusToggle(u: UserItem) {
      return h(
        NButton,
        { text: true, disabled: u.role >= 100 && !isRoot, onClick: () => toggleStatus(u) },
        {
          default: () =>
            h(
              NTag,
              { size: 'small', bordered: false, type: u.status === 1 ? 'success' : 'error' },
              { default: () => (u.status === 1 ? '正常' : '已禁用') },
            ),
        },
      )
    }

    // Task 130: 用户详情弹窗 — 完整档案 + 今日调用 + 最近 6 条调用日志
    const detailOpen = ref(false)
    const detailUser = ref<UserItem | null>(null)
    const detailLogs = ref<Array<{ id: number; createdAt: string; modelName: string; quota: number; tokenName: string | null }>>([])
    const detailLoading = ref(false)
    async function openDetail(u: UserItem) {
      detailUser.value = u
      detailOpen.value = true
      detailLoading.value = true
      detailLogs.value = []
      try {
        const resp = await apiGet<{ data: { items: Array<{ id: number; createdAt: string; modelName: string; quota: number; tokenName: string | null }> } }>(
          `/api/console/log?userId=${u.id}&type=2&page=1&size=6`,
        )
        detailLogs.value = resp.data.items
      } catch {
        /* 详情日志拉取失败不打断弹窗, 静默展示档案 */
      } finally {
        detailLoading.value = false
      }
    }

    async function load() {
      loading.value = true
      try {
        const resp = await apiGet<{ data: { items: UserItem[]; total: number } }>(
          `/api/console/user?page=${page.value}&size=${pageSize.value}&keyword=${encodeURIComponent(keyword.value)}`,
        )
        users.value = resp.data.items
        total.value = resp.data.total
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => void load())
    function onSearch(v: string) {
      keyword.value = v
      page.value = 1
      void load()
    }

    function openCreate() {
      form.value = emptyForm()
      dialogOpen.value = true
    }

    function openEdit(u: UserItem) {
      form.value = {
        id: u.id,
        username: u.username,
        password: '',
        displayName: u.displayName,
        group: u.group,
        role: u.role,
        status: u.status,
        email: u.email,
      }
      curQuota.value = u.quota
      adjMode.value = 'add'
      adjAmt.value = 0
      dialogOpen.value = true
    }

    async function handleSave() {
      if (form.value.id && overSub.value) {
        message.error('减少的余额超过当前余额，请调整金额')
        return
      }
      saving.value = true
      try {
        if (form.value.id) {
          const payload: Record<string, unknown> = {
            displayName: form.value.displayName,
            group: form.value.group,
            role: form.value.role,
            status: form.value.status,
            email: form.value.email,
          }
          // Task 127: 增量语义 — 只在填写了调整金额时提交 quotaDelta (内部 quota 增量), 后端在原值上原子增减; 不填则余额不动
          if (adjQuota.value !== 0) payload.quotaDelta = adjQuota.value
          if (form.value.password) payload.password = form.value.password
          await apiPut(`/api/console/user/${form.value.id}`, payload)
          message.success('用户更新成功')
        } else {
          await apiPost('/api/console/user', form.value)
          message.success('用户创建成功')
        }
        dialogOpen.value = false
        void load()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        saving.value = false
      }
    }

    async function handleDelete(u: UserItem) {
      const ok = await confirmDelete(`删除用户「${u.username}」？`, '该用户的令牌与使用记录将一并删除，此操作不可恢复。')
      if (!ok) return
      try {
        await apiDelete(`/api/console/user/${u.id}`)
        message.success('删除成功')
        void load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    async function toggleStatus(u: UserItem) {
      try {
        await apiPut(`/api/console/user/${u.id}`, { status: u.status === 1 ? 2 : 1 })
        message.success(u.status === 1 ? '已禁用' : '已启用')
        void load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    const pagination = computed(() => ({
      page: page.value,
      pageSize: pageSize.value,
      itemCount: total.value,
      pageSizes: [10, 20, 50, 100],
      // Task 174-d: n-pagination 样式 flex-wrap:nowrap, 小屏收起「每页条数」并收敛页码槽 (pageSlot 桌面默认即 9) 防溢出卡片
      showSizePicker: !isNarrow.value,
      pageSlot: isNarrow.value ? 5 : 9,
      prefix: (p: { itemCount: number }) => `共 ${p.itemCount} 条`,
      onChange: (p: number) => {
        page.value = p
        void load()
      },
      onUpdatePageSize: (s: number) => {
        pageSize.value = s
        page.value = 1
        void load()
      },
    }))

    const roleOptions = [
      { value: 1, label: '普通用户' },
      { value: 10, label: '管理员' },
      ...(isRoot ? [{ value: 100, label: '超级管理员' }] : []),
    ]

    // Task 174-d: 列集响应式 — 桌面 (≥768px) 保持原 11 列观感不变; <768px 收敛为 3 列:
    // ID/分组/角色/状态收纳进「用户名」主列下方小字, 已用额度/请求次数/今日调用/邀请移入详情弹窗;
    // 表格横向滚动仍由 n-data-table 自带 scroll-x 容器承担 (与 logs/tokens/channels 同套路), 不产生 body 级溢出
    const columns = computed(() => {
      if (isNarrow.value) {
        return [
          {
            title: '用户名',
            key: 'username',
            render: (u: UserItem) =>
              h('div', { class: 'min-w-0 max-w-[130px]' }, [
                h('div', { class: 'flex items-center gap-2' }, [
                  h(
                    'span',
                    {
                      class: 'flex shrink-0 items-center justify-center text-xs font-bold',
                      style: { height: '28px', width: '28px', background: 'rgba(32,128,240,0.1)', color: 'var(--primary)' },
                    },
                    (u.displayName || u.username).charAt(0).toUpperCase(),
                  ),
                  h('div', { class: 'min-w-0' }, [
                    h('div', { class: 'truncate font-medium text-foreground' }, u.username),
                    u.displayName ? h('div', { class: 'truncate text-[11px] text-muted-foreground' }, u.displayName) : null,
                  ]),
                ]),
                h('div', { class: 'mt-1 text-[11px] leading-4 text-muted-foreground' }, `#${u.id} · ${u.group}`),
                h('div', { class: 'mt-1 flex items-center gap-1.5' }, [
                  renderStatusToggle(u),
                  h('span', { class: 'text-[11px] text-muted-foreground' }, u.role >= 100 ? '超级管理员' : u.role >= 10 ? '管理员' : '普通用户'),
                ]),
              ]),
          },
          {
            title: '剩余额度',
            key: 'quota',
            width: 116,
            render: (u: UserItem) => h('span', { class: 'whitespace-nowrap font-mono text-xs tabular-nums' }, renderQuota(u.quota, quotaPerUnit, true)),
          },
          {
            title: '操作',
            key: 'actions',
            width: 108,
            align: 'right' as const,
            // 小屏按钮升为 small (点击面积更大), 图标 14
            render: (u: UserItem) =>
              h('div', { class: 'inline-flex items-center gap-1' }, [
                h(NButton, { size: 'small', quaternary: true, title: '查看详情', onClick: () => openDetail(u) }, { icon: () => h(Eye, { size: 14 }) }),
                h(NButton, { size: 'small', quaternary: true, title: '编辑', onClick: () => openEdit(u) }, { icon: () => h(Pencil, { size: 14 }) }),
                isRoot && u.id !== me?.id
                  ? h(NButton, { size: 'small', quaternary: true, type: 'error', title: '删除', onClick: () => handleDelete(u) }, { icon: () => h(Trash2, { size: 14 }) })
                  : null,
              ]),
          },
        ]
      }
      return [
      { title: 'ID', key: 'id', width: 64, render: (u: UserItem) => h('span', { class: 'text-xs text-muted-foreground' }, String(u.id)) },
      {
        title: '用户名',
        key: 'username',
        render: (u: UserItem) =>
          h('div', { class: 'flex items-center gap-2' }, [
            h(
              'span',
              {
                class: 'flex items-center justify-center text-xs font-bold',
                style: { height: '28px', width: '28px', background: 'rgba(32,128,240,0.1)', color: 'var(--primary)' },
              },
              (u.displayName || u.username).charAt(0).toUpperCase(),
            ),
            h('div', {}, [
              h('div', { class: 'font-medium text-foreground' }, u.username),
              u.displayName ? h('div', { class: 'text-[11px] text-muted-foreground' }, u.displayName) : null,
            ]),
          ]),
      },
      {
        title: '角色',
        key: 'role',
        width: 100,
        render: (u: UserItem) =>
          h(NTag, { size: 'small', bordered: false }, { default: () => (u.role >= 100 ? '超级管理员' : u.role >= 10 ? '管理员' : '普通用户') }),
      },
      {
        title: '状态',
        key: 'status',
        render: renderStatusToggle,
      },
      {
        title: '剩余额度',
        key: 'quota',
        width: 110,
        render: (u: UserItem) => h('span', { class: 'font-mono text-xs' }, renderQuota(u.quota, quotaPerUnit, true)),
      },
      {
        title: '已用额度',
        key: 'usedQuota',
        width: 110,
        render: (u: UserItem) => h('span', { class: 'font-mono text-xs' }, renderQuota(u.usedQuota, quotaPerUnit, true)),
      },
      { title: '分组', key: 'group', width: 90, render: (u: UserItem) => h('span', { class: 'text-xs' }, u.group) },
      {
        title: '请求次数',
        key: 'requestCount',
        width: 96,
        render: (u: UserItem) => h('span', { class: 'text-xs tabular-nums' }, u.requestCount.toLocaleString()),
      },
      {
        // Task 130: 今日调用简略列 (次数 + 消耗, 详情弹窗可看更多)
        title: '今日调用',
        key: 'todayRequests',
        width: 120,
        render: (u: UserItem) =>
          h('div', { class: 'text-xs' }, [
            h('div', { class: 'tabular-nums' }, (u.todayRequests || 0).toLocaleString() + ' 次'),
            h(
              'div',
              { class: 'mt-0.5 font-mono text-[11px] text-muted-foreground' },
              '¥' + (Math.round(u.todayQuota / quotaPerUnit * 10000) / 10000).toFixed(4),
            ),
          ]),
      },
      { title: '邀请', key: 'affCount', width: 72, render: (u: UserItem) => h('span', { class: 'text-xs' }, u.affCount + ' 人') },
      {
        title: '操作',
        key: 'actions',
        width: 110,
        align: 'right' as const,
        render: (u: UserItem) =>
          h('div', { class: 'inline-flex items-center gap-1' }, [
            h(NButton, { size: 'tiny', quaternary: true, title: '查看详情', onClick: () => openDetail(u) }, { icon: () => h(Eye, { size: 13 }) }),
            h(NButton, { size: 'tiny', quaternary: true, onClick: () => openEdit(u) }, { icon: () => h(Pencil, { size: 13 }) }),
            isRoot && u.id !== me?.id
              ? h(NButton, { size: 'tiny', quaternary: true, type: 'error', onClick: () => handleDelete(u) }, { icon: () => h(Trash2, { size: 13 }) })
              : null,
          ]),
      },
      ]
    })

    return {
      me, users, total, page, pageSize, keyword, loading, dialogOpen, form, saving, isRoot, quotaPerUnit, getQuotaDisplayPrice,
      curQuota, adjMode, adjAmt, quickAdd, addAdj, adjQuota, overSub, segOnStyle, segOffStyle, renderQuota,
      isNarrow, modalScrollStyle,
      load, onSearch, openCreate, handleSave, pagination, columns, roleOptions,
      detailOpen, detailUser, detailLogs, detailLoading, openDetail,
      NButton, NDataTable, NModal, NInput, NInputNumber, NSelect, NTag,
      Plus, Trash2, RefreshCw, Search, Users2, Pencil, Eye,
    }
  },
  template: `
  <div>
    <page-header title="用户管理" description="管理系统用户、额度与权限">
      <template #extra>
        <n-button type="primary" @click="openCreate">
          <template #icon><plus :size="14" /></template>
          添加用户
        </n-button>
      </template>
    </page-header>

    <n-card :content-style="'padding: 0'">
    <!-- Task 174-d: 工具栏小屏纵向堆叠 (输入框占满整行, 刷新钮大点击面积); md: 起恢复原桌面单行布局 -->
      <div class="flex flex-col gap-2.5 border-b border-[var(--border)] p-3 md:flex-row md:items-center md:gap-2">
        <n-input :value="keyword" placeholder="搜索用户名..." class="w-full md:w-[280px]" clearable @update:value="onSearch">
          <template #prefix><search :size="14" /></template>
        </n-input>
        <n-button :size="isNarrow ? 'medium' : 'small'" quaternary class="w-full md:w-auto" @click="load">
          <template #icon><refresh-cw :size="13" /></template>
          刷新
        </n-button>
      </div>
      <n-data-table
        :columns="columns"
        :data="users"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        size="small"
        :scroll-x="isNarrow ? 344 : 900"
        :row-key="(r) => r.id"
      >
        <!-- Task 203-a: 空态换装 — 查询无结果语义, search 线稿 (原 naive 默认灰块) -->
        <template #empty>
          <n-empty description="暂无用户" style="--n-icon-size: 88px">
            <template #icon><EmptyState variant="search" :size="88" /></template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>

    <n-modal v-model:show="dialogOpen" :auto-focus="false">
      <n-card style="width: 512px; max-width: 92vw" :title="form.id ? ('编辑用户: ' + form.username) : '添加用户'" :bordered="false" size="huge" role="dialog" aria-modal="true">
        <template #header-extra><users2 :size="17" style="color: var(--primary)" /></template>
        <n-form label-placement="top" :show-feedback="false">
          <!-- Task 174-d: 小屏内容限高滚动 (footer 始终可见), 桌面不生效 -->
          <div class="flex flex-col gap-4" :style="isNarrow ? modalScrollStyle : ''">
            <template v-if="!form.id">
              <form-row label="用户名" :required="true">
                <n-input v-model:value="form.username" placeholder="3-20位字母数字下划线" />
              </form-row>
              <form-row label="密码" :required="true" hint="至少 6 位">
                <n-input v-model:value="form.password" type="password" show-password-on="click" />
              </form-row>
            </template>
            <form-row v-if="form.id > 0" label="重置密码" hint="留空表示不修改">
              <n-input v-model:value="form.password" type="password" show-password-on="click" placeholder="输入新密码" />
            </form-row>
            <form-row label="显示名称">
              <n-input v-model:value="form.displayName" />
            </form-row>
            <form-row v-if="form.id > 0" label="余额调整" hint="在当前余额基础上增加或减少（1 元 = 1 额度）；金额留空或为 0 则不改余额">
              <div class="flex items-center gap-3 mb-2">
                <span class="text-xs text-muted-foreground">当前余额</span>
                <span class="font-mono text-sm font-semibold" style="color: var(--primary)">{{ renderQuota(curQuota, quotaPerUnit, true) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex overflow-hidden rounded-md border border-[var(--border)]" style="flex-shrink: 0">
                  <button type="button" class="px-3 text-xs font-medium transition-colors" style="height: 34px"
                    :style="adjMode === 'add' ? segOnStyle : segOffStyle" @click="adjMode = 'add'">+ 增加</button>
                  <button type="button" class="px-3 text-xs font-medium transition-colors border-l border-[var(--border)]" style="height: 34px"
                    :style="adjMode === 'sub' ? segOnStyle : segOffStyle" @click="adjMode = 'sub'">- 减少</button>
                </div>
                <n-input-number v-model:value="adjAmt" :min="0" :step="1" placeholder="调整金额" style="flex: 1">
                  <template #prefix>¥</template>
                </n-input-number>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 mt-2">
                <n-button v-for="q in quickAdd" :key="q" size="small" secondary @click="addAdj(q)">{{ (adjMode === 'add' ? '+' : '-') + q }}</n-button>
                <span class="ml-auto font-mono text-xs" :style="{ color: overSub ? '#f5222d' : '#00b42a' }">
                  {{ overSub ? '余额不足，无法减少' : '调整后 ' + renderQuota(Math.max(curQuota + adjQuota, 0), quotaPerUnit, true) }}
                </span>
              </div>
            </form-row>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form-row label="分组">
                <n-input v-model:value="form.group" />
              </form-row>
              <form-row label="角色" :hint="isRoot ? '' : '仅超级管理员可设置管理员'">
                <n-select :value="form.role" :options="roleOptions" :disabled="!isRoot" @update:value="(v) => (form.role = v)" />
              </form-row>
            </div>
          </div>
        </n-form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <n-button @click="dialogOpen = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- Task 130: 用户详情弹窗 — 完整档案 + 今日调用 + 最近调用日志 -->
    <n-modal v-model:show="detailOpen">
      <n-card style="width: 560px; max-width: 92vw" :title="detailUser ? ('用户详情: ' + (detailUser.displayName || detailUser.username)) : '用户详情'" :bordered="false" size="huge" role="dialog" aria-modal="true">
        <template #header-extra><eye :size="17" style="color: var(--primary)" /></template>
        <div v-if="detailUser" class="flex flex-col gap-4" :style="isNarrow ? modalScrollStyle : ''">
          <div class="grid grid-cols-1 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-2">
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">用户名</span><span class="font-medium text-foreground">{{ detailUser.username }}</span></div>
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">显示名称</span><span class="font-medium text-foreground">{{ detailUser.displayName || '-' }}</span></div>
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">角色</span><span class="font-medium text-foreground">{{ detailUser.role >= 100 ? '超级管理员' : detailUser.role >= 10 ? '管理员' : '普通用户' }}</span></div>
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">状态</span><span class="font-medium" :style="detailUser.status === 1 ? 'color:#00b42a' : 'color:#f5222d'">{{ detailUser.status === 1 ? '正常' : '已禁用' }}</span></div>
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">分组</span><span class="font-medium text-foreground">{{ detailUser.group }}</span></div>
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">邮箱</span><span class="max-w-[160px] truncate font-medium text-foreground">{{ detailUser.email || '-' }}</span></div>
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">邀请码</span><span class="font-mono font-medium text-foreground">{{ detailUser.affCode }}</span></div>
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">邀请人数</span><span class="font-medium text-foreground">{{ detailUser.affCount }} 人</span></div>
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">注册时间</span><span class="font-mono text-[11px] text-foreground">{{ new Date(detailUser.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</span></div>
            <div class="flex justify-between gap-2 border-b border-dashed border-[var(--border)] pb-1.5"><span class="text-muted-foreground">最后登录</span><span class="font-mono text-[11px] text-foreground">{{ detailUser.lastLoginTime ? new Date(detailUser.lastLoginTime).toLocaleString('zh-CN', { hour12: false }) : '-' }}</span></div>
          </div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div class="border border-[var(--border)] p-2.5 text-center">
              <div class="text-[10.5px] text-muted-foreground">剩余额度</div>
              <div class="mt-1 font-mono text-[15px] font-bold" style="color: var(--primary)">{{ renderQuota(detailUser.quota, quotaPerUnit, true) }}</div>
            </div>
            <div class="border border-[var(--border)] p-2.5 text-center">
              <div class="text-[10.5px] text-muted-foreground">累计已用</div>
              <div class="mt-1 font-mono text-[15px] font-bold text-foreground">{{ renderQuota(detailUser.usedQuota, quotaPerUnit, true) }}</div>
            </div>
            <div class="border border-[var(--border)] p-2.5 text-center">
              <div class="text-[10.5px] text-muted-foreground">今日调用</div>
              <div class="mt-1 font-mono text-[15px] font-bold text-foreground">{{ (detailUser.todayRequests || 0).toLocaleString() }} 次</div>
            </div>
            <div class="border border-[var(--border)] p-2.5 text-center">
              <div class="text-[10.5px] text-muted-foreground">今日消耗</div>
              <div class="mt-1 font-mono text-[15px] font-bold" style="color: #f43f5e">{{ renderQuota(detailUser.todayQuota || 0, quotaPerUnit, true) }}</div>
            </div>
          </div>
          <div>
            <div class="mb-1.5 text-[12px] font-semibold text-foreground">最近调用 (最新 6 条)</div>
            <div v-if="detailLoading" class="py-4 text-center text-xs text-muted-foreground">加载中…</div>
            <div v-else-if="detailLogs.length === 0" class="py-4 text-center text-xs text-muted-foreground">暂无调用记录</div>
            <div v-else class="flex flex-col divide-y divide-[var(--border)] border border-[var(--border)]">
              <div v-for="lg in detailLogs" :key="lg.id" class="flex items-center justify-between gap-3 px-3 py-2 text-[11.5px]">
                <span class="font-mono text-muted-foreground">{{ new Date(lg.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</span>
                <code class="min-w-0 flex-1 truncate text-left font-mono text-foreground">{{ lg.modelName }}</code>
                <span class="shrink-0 font-mono" style="color: #f43f5e">-{{ renderQuota(lg.quota, quotaPerUnit, true) }}</span>
              </div>
            </div>
          </div>
        </div>
        <template #footer>
          <n-button @click="detailOpen = false">关闭</n-button>
        </template>
      </n-card>
    </n-modal>
  </div>
  `,
})
