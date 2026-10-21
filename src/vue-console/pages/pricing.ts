/**
 * 模型价格 — 所有用户可见, 管理员可编辑 (n-data-table + n-modal 全原生)
 * Task 119: 3 真实计数统计卡 (蓝/橙/紫) + 计费方式 tag 着色 (按量蓝/按次橙)
 */
import '../flags'
import { defineComponent, h, onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { NButton, NDataTable, NInput, NInputNumber, NModal, NTag } from 'naive-ui'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { fmtCNYPrice, getQuotaDisplayPrice } from '@/lib/quota-display'
import { message, confirmDelete } from '../message'
import { useUserStore } from '../stores'
import { EmptyState } from '../components/empty-state'
import { Plus, RefreshCw, Search, Tags, Trash2, Pencil } from 'lucide-vue-next'

interface PricingItem {
  id: number
  modelName: string
  ratio: number
  completionRatio: number
  modelPrice: number
  quotaType: number
  description: string
  enableGroup: string
}

const emptyForm = () => ({
  modelName: '',
  ratio: 1,
  completionRatio: 1,
  modelPrice: -1,
  quotaType: 0,
  description: '',
})

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

export default defineComponent({
  name: 'PricingPage',
  components: { EmptyState },
  setup() {
    const isNarrow = useNarrow()
    const userStore = useUserStore()
    const user = userStore.user
    const isAdmin = (user?.role ?? 0) >= 10

    const items = ref<PricingItem[]>([])
    const keyword = ref('')
    const loading = ref(true)
    const dialogOpen = ref(false)
    const form = ref(emptyForm())
    const saving = ref(false)

    async function load() {
      loading.value = true
      try {
        const resp = await apiGet<{ data: { items: PricingItem[] } }>(`/api/console/pricing?keyword=${encodeURIComponent(keyword.value)}`)
        items.value = resp.data.items
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => void load())

    /** Task 119: 计费方式统计 (真实计数, 与商城口径一致) */
    const ratioCount = () => items.value.filter((p) => !(p.quotaType === 1 && p.modelPrice >= 0)).length
    const timesCount = () => items.value.filter((p) => p.quotaType === 1 && p.modelPrice >= 0).length

    function onSearch(v: string) {
      keyword.value = v
      void load()
    }

    async function handleSave() {
      saving.value = true
      try {
        await apiPost('/api/console/pricing', form.value)
        message.success('定价保存成功')
        dialogOpen.value = false
        void load()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        saving.value = false
      }
    }

    async function handleDelete(p: PricingItem) {
      const ok = await confirmDelete(`删除模型「${p.modelName}」的定价？`, '删除后该模型将无法正常计费，请谨慎操作。')
      if (!ok) return
      try {
        await apiDelete(`/api/console/pricing?id=${p.id}`)
        message.success('删除成功')
        void load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    function openEdit(p: PricingItem) {
      form.value = {
        modelName: p.modelName,
        ratio: p.ratio,
        completionRatio: p.completionRatio,
        modelPrice: p.modelPrice,
        quotaType: p.quotaType,
        description: p.description,
      }
      dialogOpen.value = true
    }

    /* Task 204: 列集响应式 + 桌面防压瘪双修 —
     *   桌面: 模型名称/说明原无定宽, 说明长文把模型名挤成竖排断字 (移动端尤其惨烈);
     *         模型名称 minWidth 180 + 说明列定宽 210 + ellipsis tooltip 根治;
     *   窄屏 (<768px): 收敛为 名称/输入价/输出价(/操作) — 倍率与说明收进主列小字,
     *         计费方式由价格格式自明 (¥x/次 = 按次, ¥x/M = 按量) */
    const columns = computed(() => {
      if (isNarrow.value) {
        return [
          {
            title: '模型名称',
            key: 'modelName',
            minWidth: 168,
            render: (p: PricingItem) =>
              h('div', { class: 'min-w-0' }, [
                h('code', { class: 'block max-w-[150px] truncate font-mono text-xs font-medium', title: p.modelName }, p.modelName),
                h('div', { class: 'mt-0.5 flex min-w-0 items-center gap-1.5 text-[10.5px] text-muted-foreground' }, [
                  h(NTag, { size: 'tiny', class: 'shrink-0', bordered: false, type: p.quotaType === 1 && p.modelPrice >= 0 ? 'warning' : 'info' }, { default: () => (p.quotaType === 1 && p.modelPrice >= 0 ? '按次' : '按量') }),
                  /* Task 204: 倍率小字取 6 位有效 — String(ratio) 全精度长小数 (如 0.0013698630…) 会把 fixed 表格撑爆 */
                  h('span', { class: 'min-w-0 truncate font-mono tabular-nums' }, p.quotaType === 1 && p.modelPrice >= 0 ? '' : '倍率 ' + parseFloat(p.ratio.toFixed(6)) + (p.completionRatio !== p.ratio ? ' · 补全 ' + parseFloat(p.completionRatio.toFixed(6)) : '')),
                ]),
              ]),
          },
          {
            title: '输入价格',
            key: 'inPrice',
            width: 104,
            render: (p: PricingItem) =>
              h(
                'span',
                { class: 'whitespace-nowrap font-mono text-xs' },
                p.quotaType === 1 && p.modelPrice >= 0 ? `¥${fmtCNYPrice(p.modelPrice)}/次` : `¥${fmtCNYPrice(p.ratio * 0.002 * 1000)} / M`,
              ),
          },
          {
            title: '输出价格',
            key: 'outPrice',
            width: 104,
            align: 'right' as const,
            render: (p: PricingItem) =>
              h(
                'span',
                { class: 'whitespace-nowrap font-mono text-xs' },
                p.quotaType === 1 && p.modelPrice >= 0 ? `¥${fmtCNYPrice(p.modelPrice)}/次` : `¥${fmtCNYPrice(p.ratio * p.completionRatio * 0.002 * 1000)} / M`,
              ),
          },
          ...(isAdmin
            ? [
                {
                  title: '操作',
                  key: 'actions',
                  width: 92,
                  align: 'right' as const,
                  render: (p: PricingItem) =>
                    h('div', { class: 'inline-flex items-center gap-0.5' }, [
                      h(NButton, { size: 'tiny', quaternary: true, onClick: () => openEdit(p) }, { icon: () => h(Pencil, { size: 13 }) }),
                      h(NButton, { size: 'tiny', quaternary: true, type: 'error', onClick: () => handleDelete(p) }, { icon: () => h(Trash2, { size: 13 }) }),
                    ]),
                },
              ]
            : []),
        ]
      }
      return [
      {
        title: '模型名称',
        key: 'modelName',
        minWidth: 180,
        render: (p: PricingItem) => h('code', { class: 'font-mono text-xs font-medium' }, p.modelName),
      },
      {
        title: '说明',
        key: 'description',
        width: 210,
        ellipsis: { tooltip: true } as never,
        render: (p: PricingItem) => h('span', { class: 'text-xs text-muted-foreground' }, p.description || '-'),
      },
      { title: '模型倍率', key: 'ratio', width: 96, render: (p: PricingItem) => h('span', { class: 'font-mono text-xs' }, p.quotaType === 1 && p.modelPrice >= 0 ? '-' : String(p.ratio)) },
      { title: '补全倍率', key: 'completionRatio', width: 96, render: (p: PricingItem) => h('span', { class: 'font-mono text-xs' }, p.quotaType === 1 && p.modelPrice >= 0 ? '-' : String(p.completionRatio)) },
      {
        title: '输入价格',
        key: 'inPrice',
        width: 140,
        render: (p: PricingItem) =>
          h(
            'span',
            { class: 'font-mono text-xs' },
            p.quotaType === 1 && p.modelPrice >= 0 ? `¥${fmtCNYPrice(p.modelPrice)}/次` : `¥${fmtCNYPrice(p.ratio * 0.002 * 1000)} / M`,
          ),
      },
      {
        title: '输出价格',
        key: 'outPrice',
        width: 140,
        render: (p: PricingItem) =>
          h(
            'span',
            { class: 'font-mono text-xs' },
            p.quotaType === 1 && p.modelPrice >= 0 ? `¥${fmtCNYPrice(p.modelPrice)}/次` : `¥${fmtCNYPrice(p.ratio * p.completionRatio * 0.002 * 1000)} / M`,
          ),
      },
      {
        title: '计费方式',
        key: 'quotaType',
        width: 96,
        render: (p: PricingItem) => h(NTag, { size: 'small', bordered: false, type: p.quotaType === 1 && p.modelPrice >= 0 ? 'warning' : 'info' }, { default: () => (p.quotaType === 1 && p.modelPrice >= 0 ? '按次计费' : '按量计费') }),
      },
      ...(isAdmin
        ? [
            {
              title: '操作',
              key: 'actions',
              width: 110,
              align: 'right' as const,
              render: (p: PricingItem) =>
                h('div', { class: 'inline-flex items-center gap-1' }, [
                  h(NButton, { size: 'tiny', quaternary: true, onClick: () => openEdit(p) }, { icon: () => h(Pencil, { size: 13 }) }),
                  h(NButton, { size: 'tiny', quaternary: true, type: 'error', onClick: () => handleDelete(p) }, { icon: () => h(Trash2, { size: 13 }) }),
                ]),
            },
          ]
        : []),
      ]
    })

    return {
      user, items, keyword, loading, dialogOpen, form, saving, isAdmin, isNarrow, ratioCount, timesCount,
      load, onSearch, handleSave, columns, getQuotaDisplayPrice,
      NButton, NDataTable, NModal, NInput, NInputNumber, NTag,
      Plus, RefreshCw, Search, Tags,
    }
  },
  template: `
  <div>
    <page-header title="模型价格" description="按量计费: 1 倍率 = $0.002 / 1K tokens；按次计费优先于按量计费">
      <template #extra>
        <n-button v-if="isAdmin" type="primary" @click="form = { modelName: '', ratio: 1, completionRatio: 1, modelPrice: -1, quotaType: 0, description: '' }; dialogOpen = true">
          <template #icon><plus :size="14" /></template>
          添加定价
        </n-button>
      </template>
    </page-header>

    <!-- Task 119: 计费总览 (真实计数) -->
    <div class="mb-4 grid grid-cols-3 gap-3">
      <n-card size="small" style="background: linear-gradient(135deg, rgba(32,128,240,0.09), rgba(32,128,240,0.015) 60%)">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(32,128,240,0.14); color: #2080f0"><tags :size="15" /></span>
          <div>
            <div class="text-[11.5px] text-muted-foreground">收录模型</div>
            <div class="mt-0.5 font-mono text-lg font-bold leading-none tabular-nums text-foreground">{{ items.length }}</div>
          </div>
        </div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(250,140,22,0.10), rgba(250,140,22,0.015) 60%)">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(250,140,22,0.15); color: #fa8c16"><zap :size="15" /></span>
          <div>
            <div class="text-[11.5px] text-muted-foreground">按量计费</div>
            <div class="mt-0.5 font-mono text-lg font-bold leading-none tabular-nums text-foreground">{{ ratioCount() }}</div>
          </div>
        </div>
      </n-card>
      <n-card size="small" style="background: linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.015) 60%)">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center" style="border-radius: 8px; background: rgba(124,58,237,0.14); color: #7c3aed"><badge-percent :size="15" /></span>
          <div>
            <div class="text-[11.5px] text-muted-foreground">按次计费</div>
            <div class="mt-0.5 font-mono text-lg font-bold leading-none tabular-nums text-foreground">{{ timesCount() }}</div>
          </div>
        </div>
      </n-card>
    </div>

    <n-card :content-style="'padding: 0'">
      <div class="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
        <n-input :value="keyword" placeholder="搜索模型..." style="width: 280px" clearable @update:value="onSearch">
          <template #prefix><search :size="14" /></template>
        </n-input>
        <n-button size="small" quaternary @click="load">
          <template #icon><refresh-cw :size="13" /></template>
          刷新
        </n-button>
      </div>
      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        size="small"
        :scroll-x="isNarrow ? 470 : 800"
        :row-key="(r) => r.id"
      >
        <!-- Task 203-b: 空态换装 — 模型定价语义, cube 线稿 (原 naive 默认灰块, 同 203-a 表格空态规范) -->
        <template #empty>
          <n-empty description="暂无定价" style="--n-icon-size: 88px">
            <template #icon><EmptyState variant="cube" :size="88" /></template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>

    <n-modal v-model:show="dialogOpen">
      <n-card style="width: 512px; max-width: 92vw" title="模型定价" :bordered="false" size="huge" role="dialog" aria-modal="true">
        <template #header-extra><tags :size="17" class="text-muted-foreground" /></template>
        <n-form label-placement="top" :show-feedback="false">
          <div class="flex flex-col gap-4">
            <form-row label="模型名称" :required="true">
              <n-input v-model:value="form.modelName" placeholder="gpt-4o" />
            </form-row>
            <form-row label="计费方式">
              <div class="flex gap-2">
                <n-button size="small" :type="form.quotaType === 0 ? 'primary' : 'default'" :secondary="form.quotaType !== 0" @click="form.quotaType = 0">按量计费</n-button>
                <n-button size="small" :type="form.quotaType === 1 ? 'primary' : 'default'" :secondary="form.quotaType !== 1" @click="form.quotaType = 1">按次计费</n-button>
              </div>
            </form-row>
            <div v-if="form.quotaType === 0" class="grid grid-cols-2 gap-4">
              <form-row label="模型倍率" hint="1 倍率 = $0.002/1K tokens">
                <n-input-number v-model:value="form.ratio" :step="0.001" style="width: 100%" />
              </form-row>
              <form-row label="补全倍率" hint="输出价格相对输入的倍数">
                <n-input-number v-model:value="form.completionRatio" :step="0.001" style="width: 100%" />
              </form-row>
            </div>
            <form-row v-else label="单次价格 (¥)" hint="每次调用收取固定费用（人民币，按当前汇率换算存储）">
              <n-input-number
                :value="form.modelPrice < 0 ? 0 : Number((form.modelPrice * getQuotaDisplayPrice()).toFixed(4))"
                :step="0.001"
                style="width: 100%"
                @update:value="(v) => (form.modelPrice = (v || 0) / getQuotaDisplayPrice())"
              />
            </form-row>
            <form-row label="说明">
              <n-input v-model:value="form.description" placeholder="选填" />
            </form-row>
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
  </div>
  `,
})
