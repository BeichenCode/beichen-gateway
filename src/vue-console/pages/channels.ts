/**
 * 渠道管理 — 列表 (n-data-table) + 新增/编辑 (n-modal) + 测试 + 启用/禁用/删除
 */
import '../flags'
import { defineComponent, h, onMounted, ref , computed} from 'vue'
import { NButton, NDataTable, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSwitch, NTag } from 'naive-ui'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { CHANNEL_TYPES, getChannelTypeMeta } from '@/lib/channel-types'
import { message, confirmDelete } from '../message'
import { renderQuota } from '../shared'
import { EmptyState } from '../components/empty-state'
import { useUserStore } from '../stores'
import { Plus, Play, RefreshCw, Search, Cable, Pencil, Trash2, Eye, EyeOff } from 'lucide-vue-next'

interface Channel {
  id: number
  name: string
  type: number
  baseUrl: string
  key: string
  models: string
  groups: string
  priority: number
  weight: number
  status: number
  autoBan: number
  usedQuota: number
  responseTime: number
  testTime: string | null
  remark: string
  createdAt: string
}

interface TestResult {
  channelId: number
  channelName: string
  success: boolean
  time: number
  message: string
}

const emptyForm = () => ({
  id: 0,
  name: '',
  type: 1,
  baseUrl: '',
  key: '',
  models: 'gpt-4o-mini,gpt-4o',
  groups: 'default',
  priority: 0,
  weight: 0,
  autoBan: 1,
  remark: '',
})

const QUICK_MODELS = ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'claude-3-5-sonnet-20241022', 'gemini-2.0-flash', 'deepseek-chat', 'qwen-plus', 'glm-4-flash']

// Task 174: 密钥池按换行/中英文逗号/分号拆分计数与掩码 (编辑弹窗回显/计数用)
const splitKeys = (raw: string): string[] => raw.split(/[\n,，;；]/).map((s) => s.trim()).filter(Boolean)
// 掩码: 前8位 + *** + 后4位 (过短密钥只留前4位, 避免首尾重叠泄露)
const maskKey = (k: string): string => (k.length <= 12 ? k.slice(0, 4) + '****' : k.slice(0, 8) + '***' + k.slice(-4))

export default defineComponent({
  name: 'ChannelsPage',
  components: { EmptyState },
  setup() {
    const userStore = useUserStore()
    const user = userStore.user
    const quotaPerUnit = user?.quotaPerUnit ?? 500000

    const channels = ref<Channel[]>([])
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(20)
    const keyword = ref('')
    const loading = ref(true)
    const dialogOpen = ref(false)
    const form = ref(emptyForm())
    const saving = ref(false)
    const testingAll = ref(false)
    const testingId = ref<number | null>(null)
    // Task 174: 密钥默认明文展开 (管理员页面, 用户要求可直接看到), 可切换为掩码态; 计数/掩码随输入实时变化
    const keyVisible = ref(true)
    const keyCount = computed(() => splitKeys(form.value.key).length)
    const maskedKeys = computed(() => splitKeys(form.value.key).map(maskKey).join('\n'))

    async function load() {
      loading.value = true
      try {
        const resp = await apiGet<{ data: { items: Channel[]; total: number } }>(
          `/api/console/channel?page=${page.value}&size=${pageSize.value}&keyword=${encodeURIComponent(keyword.value)}`,
        )
        channels.value = resp.data.items
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

    function openEdit(c: Channel) {
      // Task 174: 回显已存密钥池 (key 为逗号/换行分隔的多把密钥), 编辑时不再置空
      form.value = {
        id: c.id,
        name: c.name,
        type: c.type,
        baseUrl: c.baseUrl,
        key: c.key ?? '',
        models: c.models,
        groups: c.groups,
        priority: c.priority,
        weight: c.weight,
        autoBan: c.autoBan,
        remark: c.remark,
      }
      dialogOpen.value = true
    }

    async function handleSave() {
      if (!form.value.name.trim()) {
        message.error('请输入渠道名称')
        return
      }
      if (!form.value.id && !form.value.key.trim()) {
        message.error('请输入密钥')
        return
      }
      saving.value = true
      try {
        if (form.value.id) {
          // key 提交语义对齐后端 PUT: 非空 → 整体覆盖; 空串 → 后端跳过不覆盖
          await apiPut(`/api/console/channel/${form.value.id}`, form.value)
          message.success('渠道更新成功')
        } else {
          await apiPost('/api/console/channel', form.value)
          message.success('渠道创建成功')
        }
        dialogOpen.value = false
        void load()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        saving.value = false
      }
    }

    async function toggleStatus(c: Channel) {
      const newStatus = c.status === 1 ? 2 : 1
      try {
        await apiPut(`/api/console/channel/${c.id}`, { status: newStatus })
        message.success(newStatus === 1 ? '已启用' : '已禁用')
        void load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    async function handleDelete(c: Channel) {
      const ok = await confirmDelete(`删除渠道「${c.name}」？`, '删除后使用该渠道的请求将不再被路由，且此操作不可恢复。')
      if (!ok) return
      try {
        await apiDelete(`/api/console/channel/${c.id}`)
        message.success('删除成功')
        void load()
      } catch (e) {
        message.error((e as Error).message)
      }
    }

    // Task 142: 延迟显示人性化 — <1000ms 裸毫秒, ≥1000ms 折算秒, 不再出现 11456ms 这种离谱裸数字
    function fmtLatency(ms: number): string {
      if (!ms || ms <= 0) return '-'
      return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`
    }

    async function testOne(c: Channel) {
      testingId.value = c.id
      try {
        const resp = await apiPost<{ data: TestResult[] }>('/api/console/channel/test', { id: c.id })
        const r = resp.data[0]
        if (r.success) message.success(`${r.channelName}: ${r.message} (${fmtLatency(r.time)})`)
        else message.error(`${r.channelName}: ${r.message}`)
        void load()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        testingId.value = null
      }
    }

    async function testAll() {
      testingAll.value = true
      message.info('正在测试所有渠道，请稍候...')
      try {
        const resp = await apiPost<{ data: TestResult[] }>('/api/console/channel/test', { all: true })
        if (resp.data.length === 0) {
          message.info('还没有渠道可测试，先添加一个吧')
          return
        }
        const ok = resp.data.filter((r) => r.success).length
        if (ok === resp.data.length) message.success(`测试完成: ${ok}/${resp.data.length} 个渠道可用`)
        else message.warning(`测试完成: ${ok}/${resp.data.length} 个渠道可用`)
        void load()
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        testingAll.value = false
      }
    }

    const typeOptions = CHANNEL_TYPES.map((t) => ({ value: t.value, label: t.label }))
    const typeMeta = () => getChannelTypeMeta(form.value.type)

    function onTypeChange(v: number) {
      const meta = getChannelTypeMeta(v)
      form.value = { ...form.value, type: v, baseUrl: meta.defaultBaseUrl }
    }

    function addQuickModel(m: string) {
      const list = form.value.models.split(',').map((s) => s.trim()).filter(Boolean)
      if (!list.includes(m)) list.push(m)
      form.value = { ...form.value, models: list.join(',') }
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
      { title: 'ID', key: 'id', width: 64, render: (c: Channel) => h('span', { class: 'text-xs text-muted-foreground' }, String(c.id)) },
      {
        title: '名称',
        key: 'name',
        render: (c: Channel) =>
          h('div', {}, [
            h('div', { class: 'font-medium text-foreground' }, c.name),
            c.baseUrl ? h('div', { class: 'mt-0.5 max-w-[200px] truncate text-[11px] text-muted-foreground' }, c.baseUrl) : null,
          ]),
      },
      {
        title: '类型',
        key: 'type',
        render: (c: Channel) => h(NTag, { size: 'small', bordered: false }, { default: () => getChannelTypeMeta(c.type).label }),
      },
      {
        title: '状态',
        key: 'status',
        render: (c: Channel) =>
          h(
            NButton,
            { text: true, onClick: () => toggleStatus(c), title: '点击切换状态' },
            {
              default: () =>
                h(
                  NTag,
                  { size: 'small', bordered: false, type: c.status === 1 ? 'success' : c.status === 3 ? 'warning' : 'default' },
                  { default: () => (c.status === 1 ? '已启用' : c.status === 3 ? '自动禁用' : '手动禁用') },
                ),
            },
          ),
      },
      {
        title: '模型',
        key: 'models',
        render: (c: Channel) => h('div', { class: 'max-w-[240px] truncate font-mono text-[11px] text-muted-foreground', title: c.models }, c.models || '-'),
      },
      { title: '分组', key: 'groups', width: 90, render: (c: Channel) => h('span', { class: 'text-xs' }, c.groups) },
      { title: '优先级', key: 'priority', width: 76 },
      { title: '权重', key: 'weight', width: 64 },
      {
        title: '响应时间',
        key: 'responseTime',
        width: 96,
        render: (c: Channel) =>
          c.responseTime > 0
            ? h(
                'span',
                { style: { color: c.responseTime < 1000 ? '#52c41a' : c.responseTime < 3000 ? '#faad14' : '#f5222d' } },
                fmtLatency(c.responseTime),
              )
            : h('span', { class: 'text-muted-foreground' }, '-'),
      },
      {
        title: '已用额度',
        key: 'usedQuota',
        width: 110,
        render: (c: Channel) => h('span', { class: 'font-mono text-xs' }, renderQuota(c.usedQuota, quotaPerUnit, true)),
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        align: 'right' as const,
        render: (c: Channel) =>
          h('div', { class: 'inline-flex items-center gap-1' }, [
            h(NButton, { size: 'tiny', quaternary: true, loading: testingId.value === c.id, onClick: () => testOne(c) }, { default: () => '测试' }),
            h(NButton, { size: 'tiny', quaternary: true, onClick: () => openEdit(c) }, { icon: () => h(Pencil, { size: 13 }) }),
            h(
              NButton,
              { size: 'tiny', quaternary: true, type: 'error', onClick: () => handleDelete(c) },
              { icon: () => h(Trash2, { size: 13 }) },
            ),
          ]),
      },
    ]

    return {
      user, channels, total, page, pageSize, keyword, loading, dialogOpen, form, saving, testingAll,
      load, onSearch, openCreate, openEdit, handleSave, toggleStatus, handleDelete, testOne, testAll,
      typeOptions, typeMeta, onTypeChange, addQuickModel, pagination, columns,
      keyVisible, keyCount, maskedKeys,
      QUICK_MODELS, NButton, NDataTable, NModal, NInput, NInputNumber, NSelect, NSwitch, NTag, NForm, NFormItem,
      Plus, Play, RefreshCw, Search, Cable, Eye, EyeOff,
    }
  },
  template: `
  <div>
    <page-header title="渠道管理" description="管理上游模型渠道，支持多渠道负载均衡、优先级路由与故障自动禁用">
      <template #extra>
        <n-button :loading="testingAll" @click="testAll">
          <template #icon><play :size="14" /></template>
          测试所有
        </n-button>
        <n-button type="primary" @click="openCreate">
          <template #icon><plus :size="14" /></template>
          添加渠道
        </n-button>
      </template>
    </page-header>

    <n-card :content-style="'padding: 0'">
      <div class="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
        <n-input :value="keyword" placeholder="搜索渠道名称/模型..." style="width: 280px" clearable @update:value="onSearch">
          <template #prefix><search :size="14" /></template>
        </n-input>
        <n-button size="small" quaternary @click="load">
          <template #icon><refresh-cw :size="13" /></template>
          刷新
        </n-button>
      </div>
      <n-data-table
        :columns="columns"
        :data="channels"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        size="small"
        :scroll-x="1100"
        :row-key="(r) => r.id"
      >
        <!-- Task 203-a: 空态换装 — 渠道=基础设施, 语义最近的 cube 线稿 (原 naive 默认灰块) -->
        <template #empty>
          <n-empty description="暂无渠道" style="--n-icon-size: 88px">
            <template #icon><EmptyState variant="cube" :size="88" /></template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>

    <n-modal v-model:show="dialogOpen">
      <n-card
        style="width: 672px; max-width: 92vw"
        :title="(form.id ? '编辑渠道' : '添加渠道')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <template #header-extra><cable :size="17" class="text-muted-foreground" /></template>
        <n-form label-placement="top" :show-feedback="false">
          <div class="flex flex-col gap-4">
            <form-row label="渠道名称" :required="true">
              <n-input v-model:value="form.name" placeholder="例如: OpenAI 官方" />
            </form-row>
            <form-row label="渠道类型" :required="true">
              <n-select :value="form.type" :options="typeOptions" @update:value="onTypeChange" />
            </form-row>
            <form-row label="代理地址 (Base URL)" :hint="typeMeta().keyNote || '留空使用默认官方地址'">
              <n-input v-model:value="form.baseUrl" :placeholder="typeMeta().defaultBaseUrl || 'https://api.openai.com'" />
            </form-row>
            <form-row label="密钥（多把用换行/逗号分隔）" :required="form.id === 0" hint="支持填多个 Key（逗号或换行分隔），系统将随机轮询使用">
              <div class="mb-1.5 flex flex-wrap items-center gap-2">
                <n-tag v-if="keyCount > 0" size="small" :bordered="false" type="info">池内 {{ keyCount }} 把密钥</n-tag>
                <n-button v-if="form.id" size="tiny" quaternary @click="keyVisible = !keyVisible">
                  <template #icon>
                    <eye-off v-if="keyVisible" :size="13" />
                    <eye v-else :size="13" />
                  </template>
                  {{ keyVisible ? '隐藏' : '显示' }}
                </n-button>
                <span v-if="form.id && !keyVisible" class="text-[11px] text-muted-foreground">掩码展示（前8位+***+后4位），点「显示」编辑明文</span>
              </div>
              <n-input v-if="keyVisible || !form.id" v-model:value="form.key" type="textarea" :rows="5" :placeholder="form.id ? '多把密钥用换行或逗号分隔；清空则不修改' : 'sk-...（多把用换行或逗号分隔）'" />
              <n-input v-else :value="maskedKeys" type="textarea" :rows="5" readonly />
            </form-row>
            <form-row label="模型列表" :required="true" hint="逗号分隔，可点击下方快捷填入常用模型">
              <n-input v-model:value="form.models" type="textarea" :rows="2" placeholder="gpt-4o, gpt-4o-mini" />
              <div class="mt-2 flex flex-wrap gap-1.5">
                <n-button v-for="m in QUICK_MODELS" :key="m" size="tiny" secondary @click="addQuickModel(m)">+ {{ m }}</n-button>
              </div>
            </form-row>
            <form-row label="分组" hint="用户分组需与渠道分组匹配才能调用">
              <n-input v-model:value="form.groups" placeholder="default" />
            </form-row>
            <div class="grid grid-cols-2 gap-4">
              <form-row label="优先级" hint="越大越优先调用">
                <n-input-number v-model:value="form.priority" style="width: 100%" />
              </form-row>
              <form-row label="权重" hint="同优先级下按权重随机">
                <n-input-number v-model:value="form.weight" style="width: 100%" />
              </form-row>
            </div>
            <form-row label="失败自动禁用" hint="连续失败时自动禁用该渠道">
              <n-switch :value="form.autoBan === 1" @update:value="(v) => (form.autoBan = v ? 1 : 0)" />
            </form-row>
            <form-row label="备注">
              <n-input v-model:value="form.remark" placeholder="选填" />
            </form-row>
          </div>
        </n-form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <n-button @click="dialogOpen = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="handleSave">{{ form.id ? '保存' : '创建' }}</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
  `,
})
