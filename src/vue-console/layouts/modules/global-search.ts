/**
 * GlobalSearch — 官方仓库 src/layouts/modules/global-search 全量移植 (第 11 轮官方化)
 *   蓝本逐字段: index.vue (ButtonIcon 触发) + search-modal.vue + search-result.vue + search-footer.vue
 *   - SearchModal: NModal preset=card, segmented{footer:'soft'}, closable=false, auto-focus
 *     桌面 w-630px top-50px, 移动端全屏 + 取消钮
 *   - NInputGroup: NInput clearable placeholder「请输入关键词搜索」+ 搜索前缀图标, 300ms 防抖,
 *     关键词为空不出结果 (官方语义)
 *   - SearchResult: 项 h-56px rounded-4px px-14px mt-8px, 底 #e5e7eb (暗 #1c1c1c = 官方 dark:bg-dark
 *     容器色), 激活 = 主题色底白字 + 右侧回车图标, mouseenter 激活; 空态 NEmpty 无数据
 *   - 键盘: Enter 确认 / ArrowUp·ArrowDown 切换 / Escape 关闭; 关窗 200ms 延迟清态 (官方 handleClose)
 *   - SearchFooter: h-44px px-24px gap-14px [↵ 确认] [↑ ↓ 切换] [Esc 关闭],
 *     键帽样式 = 官方 operate-shadow (inset 0 -2px #cdcde6, inset 0 0 1px 1px #fff, 0 1px 2px 1px #1e235a66)
 */
import '../../flags'
import '../../styles/scrollbar.css'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NButton, NEmpty, NInput, NInputGroup, NModal } from 'naive-ui'
import { visibleMenus, type MenuItem } from '../../routes'
import { navigate } from '../../router'
import { MENU_ICON_NAMES, HOME_ICON_NAME } from '../../icons'
import { SvgIcon } from '../../svg-icon'
import { useUserStore } from '../../stores'
import { EmptyState } from '../../components/empty-state'
import { isDark, primaryColor } from '../../theme'

export const GlobalSearch = defineComponent({
  name: 'GlobalSearch',
  props: {
    show: { type: Boolean, required: true },
    role: { type: Number, required: true },
  },
  emits: ['update:show'],
  setup(props, { emit }) {
    const userStore = useUserStore()
    const kw = ref('')
    const activePath = ref('')
    const results = ref<MenuItem[]>([])
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    /* 官方 useDebounceFn(search, 300) */
    function onInput() {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(doSearch, 300)
    }

    /** 官方 search(): 关键词为空无结果 (resultOptions 仅由输入驱动) */
    function doSearch() {
      const trimKeyword = kw.value.toLocaleLowerCase().trim()
      const menus = visibleMenus(props.role || userStore.user?.role || 0)
      results.value = trimKeyword
        ? menus.filter((m) => m.label.toLocaleLowerCase().includes(trimKeyword))
        : []
      activePath.value = results.value[0]?.key ?? ''
    }

    /** 官方 handleClose: 200ms 延迟关窗, 防止用户看见清空过程 */
    function handleClose() {
      setTimeout(() => {
        emit('update:show', false)
        results.value = []
        kw.value = ''
        activePath.value = ''
      }, 200)
    }

    function handleEnter() {
      if (results.value.length === 0 || activePath.value === '') return
      const target = activePath.value
      handleClose()
      navigate(target)
    }

    function getActiveIndex() {
      return results.value.findIndex((item) => item.key === activePath.value)
    }

    function handleUp() {
      const { length } = results.value
      if (length === 0) return
      const index = getActiveIndex()
      if (index === -1) return
      activePath.value = results.value[index === 0 ? length - 1 : index - 1].key
    }

    function handleDown() {
      const { length } = results.value
      if (length === 0) return
      const index = getActiveIndex()
      if (index === -1) return
      activePath.value = results.value[index === length - 1 ? 0 : index + 1].key
    }

    /* 官方 onKeyStroke 注册 (窗口级, 弹窗打开期间生效) */
    function onKeydown(e: KeyboardEvent) {
      if (!props.show) return
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleEnter()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        handleUp()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleDown()
      }
    }
    watch(
      () => props.show,
      (v) => {
        if (v) window.addEventListener('keydown', onKeydown)
        else window.removeEventListener('keydown', onKeydown)
      },
      { immediate: true },
    )
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

    /* Ctrl/Cmd+K 唤起 (保留既有快捷键契约) */
    function onGlobalKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        emit('update:show', !props.show)
      }
    }
    window.addEventListener('keydown', onGlobalKeydown)
    onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

    /** 官方 useMenuSearch: 结果项图标 = 菜单图标名 (SvgIcon, fontSize 20) */
    const iconOf = (key: string) => {
      const menus = visibleMenus(props.role || userStore.user?.role || 0)
      const m = menus.find((x) => x.key === key)
      return (m ? MENU_ICON_NAMES[m.icon] : undefined) ?? HOME_ICON_NAME
    }

    const itemBg = computed(() => (isDark.value ? '#1c1c1c' : '#e5e7eb'))

    /* 官方 isMobile = appStore.isMobile (断点 1024, 响应式跟随窗口) */
    const isMobile = ref(false)
    function resolveMobile() {
      isMobile.value = window.innerWidth < 1024
    }
    onMounted(() => {
      resolveMobile()
      window.addEventListener('resize', resolveMobile)
    })
    onBeforeUnmount(() => window.removeEventListener('resize', resolveMobile))

    return {
      kw, activePath, results, onInput, handleClose, handleEnter,
      setActive: (m: MenuItem) => (activePath.value = m.key), iconOf, itemBg,
      primaryColor, isMobile,
      /** 官方定位 (fixed left-0 right-0 top-50px w-630px) — 用内联样式落地,
       *  避免 naive 运行时注入的 .n-card 宽度规则压过 Tailwind 工具类 */
      modalStyle: computed(() =>
        isMobile.value
          ? { position: 'fixed' as const, left: '0', top: '0', width: '100%', height: '100%', maxWidth: '100%', borderRadius: '0' }
          : { position: 'fixed' as const, left: '0', right: '0', top: '50px', margin: '0 auto', width: '630px', maxWidth: '92vw' },
      ),
    }
  },
  components: { NModal, NInput, NInputGroup, NButton, NEmpty, SvgIcon, EmptyState },
  template: `
  <!-- 官方 GlobalSearch 触发钮 (ButtonIcon) — 嵌在 header 右侧由父级占位使用不便,
       官方触发钮在 header; 此处仅渲染弹窗本体, 触发钮见 global-header -->
  <n-modal
    :show="show"
    preset="card"
    :segmented="{ footer: 'soft' }"
    :closable="false"
    auto-focus
    footer-style="padding: 0; margin: 0"
    :style="modalStyle"
    @update:show="(v) => { if (!v) handleClose() }"
  >
    <n-input-group>
      <n-input v-model:value="kw" clearable placeholder="请输入关键词搜索" @input="onInput">
        <template #prefix><svg-icon icon="uil:search" class="text-[15px]" style="color:#c2c2c2" :font-size="15" /></template>
      </n-input>
      <n-button v-if="isMobile" type="primary" ghost @click="handleClose">取消</n-button>
    </n-input-group>

    <div class="mt-5">
      <n-empty v-if="results.length === 0" description="无数据" style="--n-icon-size: 88px">
        <!-- Task 184-b: 空态图标换装 — 放大镜语义线稿 (弹层内小尺寸) -->
        <template #icon><EmptyState variant="search" :size="88" /></template>
      </n-empty>
      <!-- 官方 SearchResult: NScrollbar + pb-12px + 项 56px -->
      <div v-else class="soy-scrollbar overflow-y-auto pb-3" style="max-height: 380px">
        <div
          v-for="m in results"
          :key="m.key"
          class="mt-2 flex h-14 cursor-pointer items-center justify-between rounded px-3.5 transition-colors"
          :style="{
            background: m.key === activePath ? primaryColor : itemBg,
            color: m.key === activePath ? '#fff' : ''
          }"
          @mouseenter="setActive(m)"
          @click="handleEnter"
        >
          <div class="flex items-center">
            <svg-icon :icon="iconOf(m.key)" :font-size="20" />
            <span class="ml-[5px] flex-1">{{ m.label }}</span>
          </div>
          <!-- 官方 search-result.vue: ant-design:enter-outlined (mr-3px p-2px text-20px) -->
          <svg-icon icon="ant-design:enter-outlined" class="mr-[3px] p-[2px]" :font-size="20" />
        </div>
      </div>
    </div>

    <template #footer>
      <!-- 官方 SearchFooter: mdi:keyboard-return / arrow-up-thin / arrow-down-thin / keyboard-esc
           (operate-item = mr-6px p-2px text-20px, 键帽 operate-shadow) -->
      <div v-if="!isMobile" class="flex h-11 items-center gap-3.5 px-6">
        <span class="flex items-center">
          <span class="sf-key"><svg-icon icon="mdi:keyboard-return" :font-size="20" /></span>
          <span>确认</span>
        </span>
        <span class="flex items-center">
          <span class="sf-key"><svg-icon icon="mdi:arrow-up-thin" :font-size="20" /></span>
          <span class="sf-key"><svg-icon icon="mdi:arrow-down-thin" :font-size="20" /></span>
          <span>切换</span>
        </span>
        <span class="flex items-center">
          <span class="sf-key"><svg-icon icon="mdi:keyboard-esc" :font-size="20" /></span>
          <span>关闭</span>
        </span>
      </div>
    </template>
  </n-modal>
  `,
})

/* 官方 search-footer.vue operate-shadow 键帽样式 (scoped 段逐字段) */
const styleEl = document.createElement('style')
styleEl.textContent = `
.sf-key {
  margin-right: 6px;
  padding: 2px;
  font-size: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 -2px #cdcde6, inset 0 0 1px 1px #fff, 0 1px 2px 1px #1e235a66;
}
.sf-key--text { font-size: 12px; padding: 2px 6px; border-radius: 2px; }
`
document.head.appendChild(styleEl)
