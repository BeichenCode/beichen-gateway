/**
 * 兑换码 — 管理员生成/管理 (n-data-table + n-modal 全原生)
 */
import '../flags'
import { defineComponent, h, onMounted, ref , computed} from 'vue'
import { NButton, NDataTable, NInput, NInputNumber, NModal, NTag } from 'naive-ui'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { getQuotaDisplayPrice, cnyToQuota } from '@/lib/quota-display'
import { copyText } from '@/lib/utils'
import { message, confirmDelete } from '../message'
import { renderQuota } from '../shared'
import { useUserStore } from '../stores'
import { EmptyState } from '../components/empty-state'
import { Plus, Trash2, RefreshCw, Copy, Gift } from 'lucide-vue-next'

interface RedemptionItem {
  id: number
  name: string
  key: string
  quota: number
  status: number
  username: string
  createdAt: string
  usedAt: string | null
}

export default defineComponent({
  name: 'RedemptionsPage',
  components: { EmptyState },
  setup() {
    const userStore = useUserStore()
    const user = userStore.user
    const quotaPerUnit = user?.quotaPerUnit ?? 500000

    const items = ref<RedemptionItem[]>([])
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(20)
    const loading = ref(true)
    const dialogOpen = ref(false)
    // Task 126: 兑换面值改用人民币元 (1 元 = 1 额度), 保存时 cnyToQuota 换算入库; 之前直接填内部 quota (默认 100000), 管理员无法直观对应金额
    const form = ref({ name: '', cny: 10, count: 1 })
    const saving = ref(false)

    async function load() {
      loading.value = true
      try {
        const resp = await apiGet<{ data: { items: RedemptionItem[]; total: number } }>(
          `/api/console/redemption?page=${page.value}&size=${pageSize.value}`,
        )
        items.value = resp.data.items
        total.value = resp.data.total
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => void load())

    async function handleGenerate() {
      saving.value = true
      try {
        await apiPost('/api/console/redemption', {
          name: form.value.name,
          quota: cnyToQuota(form.value.cny || 0, quotaPerUnit),
          count: form.value.count,
        })
        message.success(`成功生成 ${form.value.count} 个 ¥${form.value.cny || 0} 兑换码`)
        dialogOpen.value = false
        page.value = 1
        void load()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        saving.value = false
      }
    }

    async function toggleStatus(r: RedemptionItem) {
      try {
        await apiPut(`/api/console/redemption/${r.id}`, { status: r.status === 1 ? 2 : 1 })
        message.success(r.status === 1 ? '已禁用' : '已启用')
        void load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    async function handleDelete(r: RedemptionItem) {
      const ok = await confirmDelete(
        '删除该兑换码？',
        r.status === 1 ? `未被使用的兑换码「${r.key.slice(0, 12)}...」删除后立即失效，此操作不可恢复。` : '此操作不可恢复。',
      )
      if (!ok) return
      try {
        await apiDelete(`/api/console/redemption/${r.id}`)
        message.success('删除成功')
        void load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    function copyOne(text: string) {
      void copyText(text).then((ok) => (ok ? message.success('已复制') : message.error('复制失败')))
    }

    function copyAllKeys() {
      const unused = items.value.filter((r) => r.status === 1)
      if (unused.length === 0) {
        message.info('当前没有未使用的兑换码')
        return
      }
      const keys = unused.map((r) => r.key).join('\n')
      void copyText(keys).then((ok) => (ok ? message.success(`已复制 ${unused.length} 个未使用兑换码`) : message.error('复制失败')))
    }

    const pagination = computed(() => ({
      page: page.value,
      pageSize: pageSize.value,
      itemCount: total.value,
      pageSizes: [10, 20, 50, 100],
      showSizePicker: true,
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

    const columns = [
      { title: 'ID', key: 'id', width: 64, render: (r: RedemptionItem) => h('span', { class: 'text-xs text-muted-foreground' }, String(r.id)) },
      { title: '名称', key: 'name', width: 120, render: (r: RedemptionItem) => h('span', { class: 'text-xs' }, r.name || '-') },
      {
        title: '兑换码',
        key: 'key',
        render: (r: RedemptionItem) =>
          h('div', { class: 'flex items-center gap-2' }, [
            h('code', { class: 'max-w-[180px] truncate font-mono text-xs text-foreground sm:max-w-[260px]', title: r.key }, r.key),
            h(NButton, { size: 'tiny', quaternary: true, onClick: () => copyOne(r.key) }, { default: () => '复制' }),
          ]),
      },
      {
        title: '额度',
        key: 'quota',
        width: 110,
        render: (r: RedemptionItem) => h('span', { class: 'font-mono text-xs' }, renderQuota(r.quota, quotaPerUnit, true)),
      },
      {
        title: '状态',
        key: 'status',
        render: (r: RedemptionItem) =>
          h(
            NButton,
            { text: true, disabled: r.status === 3, onClick: () => toggleStatus(r) },
            {
              default: () =>
                h(
                  NTag,
                  { size: 'small', bordered: false, type: r.status === 1 ? 'success' : 'default' },
                  { default: () => (r.status === 1 ? '未使用' : r.status === 2 ? '已禁用' : '已使用') },
                ),
            },
          ),
      },
      { title: '兑换人', key: 'username', width: 100, render: (r: RedemptionItem) => h('span', { class: 'text-xs' }, r.username || '-') },
      {
        title: '创建时间',
        key: 'createdAt',
        width: 110,
        render: (r: RedemptionItem) => h('span', { class: 'text-xs text-muted-foreground' }, new Date(r.createdAt).toLocaleDateString()),
      },
      {
        title: '操作',
        key: 'actions',
        width: 80,
        align: 'right' as const,
        render: (r: RedemptionItem) =>
          r.status !== 3
            ? h(NButton, { size: 'tiny', quaternary: true, type: 'error', onClick: () => handleDelete(r) }, { icon: () => h(Trash2, { size: 13 }) })
            : null,
      },
    ]

    return {
      user, items, total, page, pageSize, loading, dialogOpen, form, saving, quotaPerUnit,
      load, handleGenerate, copyAllKeys, pagination, columns, getQuotaDisplayPrice,
      NButton, NDataTable, NModal, NInput, NInputNumber,
      Plus, Trash2, RefreshCw, Copy, Gift,
    }
  },
  template: `
  <div>
    <page-header title="兑换码管理" description="生成兑换码供用户兑换额度">
      <template #extra>
        <n-button @click="copyAllKeys">
          <template #icon><copy :size="14" /></template>
          复制未使用
        </n-button>
        <n-button type="primary" @click="dialogOpen = true">
          <template #icon><plus :size="14" /></template>
          生成兑换码
        </n-button>
      </template>
    </page-header>

    <n-card :content-style="'padding: 0'">
      <div class="flex items-center gap-2 border-b border-[var(--border)] p-3">
        <n-button size="small" quaternary @click="load">
          <template #icon><refresh-cw :size="13" /></template>
          刷新
        </n-button>
      </div>
      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        size="small"
        :scroll-x="800"
        :row-key="(r) => r.id"
      >
        <!-- Task 203-b: 空态换装 — 礼品券/兑换码语义, coupon 线稿 (原 naive 默认灰块, 同 203-a 表格空态规范) -->
        <template #empty>
          <n-empty description="暂无兑换码" style="--n-icon-size: 88px">
            <template #icon><EmptyState variant="coupon" :size="88" /></template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>

    <n-modal v-model:show="dialogOpen">
      <n-card style="width: 448px; max-width: 92vw" title="生成兑换码" :bordered="false" size="huge" role="dialog" aria-modal="true">
        <template #header-extra><gift :size="17" class="text-muted-foreground" /></template>
        <n-form label-placement="top" :show-feedback="false">
          <div class="flex flex-col gap-4">
            <form-row label="兑换码名称" hint="批量生成时自动加序号">
              <n-input v-model:value="form.name" placeholder="例如: 促销活动" />
            </form-row>
            <form-row label="兑换面值（元）" :hint="'用户兑换后到账 ¥' + (form.cny || 0).toFixed(2) + ' = ' + (form.cny || 0) + ' 额度 · 1 元 = 1 额度'">
              <n-input-number v-model:value="form.cny" :min="0.01" :step="1" :precision="2" style="width: 100%">
                <template #prefix>¥</template>
              </n-input-number>
            </form-row>
            <form-row label="生成数量" hint="单次最多 100 个">
              <n-input-number v-model:value="form.count" :min="1" :max="100" style="width: 100%" />
            </form-row>
          </div>
        </n-form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <n-button @click="dialogOpen = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="handleGenerate">生成</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
  `,
})
