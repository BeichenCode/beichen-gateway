/**
 * GlobalTab — 官方页签系统全量移植 (第 9 轮: 「标签页也没有用他们的…全部都用」)
 *   蓝本 (逐字级别):
 *   - packages/materials/src/libs/page-tab/chrome-tab.vue + chrome-tab-bg.vue
 *     (浏览器风格斜切页签: 双 51% 镜像 SVG 填充 currentColor, 激活底色
 *     --soy-primary-color1/2, hover #dee1e6/暗 #333333, 右缘 1px 分隔线
 *     active/hover 隐藏) — 官方默认模式 mode=chrome
 *   - button-tab.vue (rounded-4px 1px 边框) / slider-tab.vue (底边 2px 滑块)
 *   - src/layouts/modules/global-tab/index.vue (滚轮横滚/激活页签居中/中键关闭)
 *   - src/layouts/modules/global-tab/context-menu.vue (右键菜单 7 项: 关闭当前/
 *     关闭其他/关闭左侧/关闭右侧/关闭全部/固定/取消固定, home 禁用关闭当前+左侧)
 *   - src/components/common/reload-button.vue + full-screen (内容区刷新/全屏)
 *   右侧仅官方 ReloadButton + FullScreen (官方无「更多」按钮, 已移除)
 */
import '../../flags'
import './tab.css'
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { NDropdown } from 'naive-ui'
import { useTabsStore } from '../../stores'
import { navigate, currentPath } from '../../router'
import { findMenuByKey } from '../../routes'
import { isDark, shadowOf, tabHeight, tabMiddleClose, tabMode } from '../../theme'
import { MENU_ICON_NAMES, HOME_ICON_NAME } from '../../icons'
import { SvgIcon } from '../../svg-icon'
import { ButtonIcon } from './button-icon'

/** 官方 SvgClose — packages/materials/src/libs/page-tab/svg-close.vue (markup 逐字) */
const SvgClose = defineComponent({
  name: 'SvgClose',
  template: `
  <div class="svg-close relative inline-flex h-4 w-4 items-center justify-center rounded-full text-[14px]">
    <svg width="1em" height="1em" viewBox="0 0 1024 1024">
      <path
        fill="currentColor"
        d="m563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8L295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512L196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1l216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z"
      />
    </svg>
  </div>
  `,
})

/** 官方 ChromeTabBg — packages/materials/src/libs/page-tab/chrome-tab-bg.vue (markup 逐字) */
const ChromeTabBg = defineComponent({
  name: 'ChromeTabBg',
  template: `
  <svg class="size-full">
    <defs>
      <symbol id="geometry-left" viewBox="0 0 214 36">
        <path d="M17 0h197v36H0v-2c4.5 0 9-3.5 9-8V8c0-4.5 3.5-8 8-8z" />
      </symbol>
      <symbol id="geometry-right" viewBox="0 0 214 36">
        <use xlink:href="#geometry-left" />
      </symbol>
      <clipPath>
        <rect width="100%" height="100%" x="0" />
      </clipPath>
    </defs>
    <svg width="51%" height="100%">
      <use xlink:href="#geometry-left" width="214" height="36" fill="currentColor" />
    </svg>
    <g transform="scale(-1, 1)">
      <svg width="51%" height="100%" x="-100%" y="0">
        <use xlink:href="#geometry-right" width="214" height="36" fill="currentColor" />
      </svg>
    </g>
  </svg>
  `,
})

export const GlobalTab = defineComponent({
  name: 'GlobalTab',
  props: {
    /** 内容区全屏状态 (官方 appStore.fullContent, 切换时隐藏 header/footer) */
    fullContent: { type: Boolean, default: false },
    /** 官方 appStore.reloadFlag: false = 内容区刷新中 (ReloadButton 旋转) */
    reloadFlag: { type: Boolean, default: true },
  },
  emits: ['reload', 'toggle-full-content'],
  setup() {
    const tabsStore = useTabsStore()
    const scrollEl = ref<HTMLElement | null>(null)

    /* ---------------- 官方右键菜单 (context-menu.vue 7 项) ---------------- */
    type MenuKey = 'closeCurrent' | 'closeOther' | 'closeLeft' | 'closeRight' | 'closeAll' | 'pin' | 'unpin'
    const menu = reactive({ visible: false, x: 0, y: 0, tabId: '' })
    let isClickContextMenu = false

    const menuOptions = () => {
      const isHome = menu.tabId === '/dashboard'
      const retained = tabsStore.isTabRetain(menu.tabId)
      /** 官方 context-menu.vue 图标逐字 (ant-design/mdi 家族, fontSize 18) */
      const opts: { key: MenuKey; label: string; icon: () => ReturnType<typeof h>; disabled?: boolean }[] = [
        { key: 'closeCurrent', label: '关闭', icon: () => h(SvgIcon, { icon: 'ant-design:close-outlined', fontSize: 18 }) },
        { key: 'closeOther', label: '关闭其它', icon: () => h(SvgIcon, { icon: 'ant-design:column-width-outlined', fontSize: 18 }) },
        { key: 'closeLeft', label: '关闭左侧', icon: () => h(SvgIcon, { icon: 'mdi:format-horizontal-align-left', fontSize: 18 }) },
        { key: 'closeRight', label: '关闭右侧', icon: () => h(SvgIcon, { icon: 'mdi:format-horizontal-align-right', fontSize: 18 }) },
        { key: 'closeAll', label: '关闭所有', icon: () => h(SvgIcon, { icon: 'ant-design:line-outlined', fontSize: 18 }) },
      ]
      // 官方: home 页签不出现固定项; 固定页签显示「取消固定」
      if (!isHome) {
        opts.push(
          retained
            ? { key: 'unpin', label: '取消固定', icon: () => h(SvgIcon, { icon: 'mdi:pin-off-outline', fontSize: 18 }) }
            : { key: 'pin', label: '固定', icon: () => h(SvgIcon, { icon: 'mdi:pin-outline', fontSize: 18 }) },
        )
      }
      // 官方 getContextMenuDisabledKeys: 固定页签 (含 home) 禁用 关闭当前/关闭左侧
      if (retained) {
        for (const o of opts) {
          if (o.key === 'closeCurrent' || o.key === 'closeLeft') o.disabled = true
        }
      }
      return opts
    }

    function navIfNext(next: string | null) {
      if (next && next !== currentPath.value) navigate(next)
    }

    function handleMenuSelect(key: MenuKey) {
      menu.visible = false
      const id = menu.tabId
      const actions: Record<MenuKey, () => void> = {
        closeCurrent: () => navIfNext(tabsStore.removeTab(id)),
        closeOther: () => navIfNext(tabsStore.clearTabs([id])),
        closeLeft: () => navIfNext(tabsStore.clearLeftTabs(id)),
        closeRight: () => navIfNext(tabsStore.clearRightTabs(id)),
        closeAll: () => navIfNext(tabsStore.clearTabs()),
        pin: () => tabsStore.fixTab(id),
        unpin: () => tabsStore.unfixTab(id),
      }
      actions[key]?.()
    }

    /** 官方 handleContextMenu: 已显示时先隐藏再 150ms 重展 (重定位) */
    function openMenu(e: MouseEvent, tabId: string) {
      e.preventDefault()
      const { clientX, clientY } = e
      isClickContextMenu = true
      const DURATION = menu.visible ? 150 : 0
      menu.visible = false
      setTimeout(() => {
        menu.visible = true
        menu.x = clientX
        menu.y = clientY
        menu.tabId = tabId
        isClickContextMenu = false
      }, DURATION)
    }

    /* ---------------- 官方交互: 切换/中键关闭/滚轮横滚/激活居中 ---------------- */

    /** 官方 switchTab: 中键/右键不切换 */
    function onPointerDown(e: PointerEvent, key: string) {
      if (e.button === 1 || e.button === 2) return
      navigate(key)
    }

    /** 官方 handleMousedown: 中键关闭 (tab.closeTabByMiddleClick, 固定页签跳过) */
    function onMouseDown(e: MouseEvent, key: string) {
      if (e.button !== 1 || !tabMiddleClose.value) return
      if (tabsStore.isTabRetain(key)) return
      e.preventDefault()
      navIfNext(tabsStore.removeTab(key))
    }

    /** 官方 handleWheel: 纵向滚轮 → 页签横向滚动 (无横向空间时不拦截) */
    function handleWheel(e: WheelEvent) {
      const el = scrollEl.value
      if (!el || el.scrollWidth <= el.clientWidth) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    /* Task 204: 两端渐隐 — 滚动/页签变化/视口变化时动态判断左/右是否还有未展示内容,
     * 对应挂 .tab-mask-l / .tab-mask-r (28px 渐隐带, 见 tab.css); 拖到边缘自动撤除 */
    const maskL = ref(false)
    const maskR = ref(false)
    function updateTabMasks() {
      const el = scrollEl.value
      if (!el) return
      maskL.value = el.scrollLeft > 2
      maskR.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    }
    onMounted(() => {
      updateTabMasks()
      window.addEventListener('resize', updateTabMasks)
    })
    onBeforeUnmount(() => window.removeEventListener('resize', updateTabMasks))

    /** 官方 scrollToActiveTab 等价 (官方用 BetterScroll scrollByClientX 居中数学):
     *  目标中心对齐容器中心 — 不用 scrollIntoView (会连带滚动祖先滚动链,
     *  且过渡期布局未稳时静默失效, 激活页签被右缘截断) */
    watch(
      () => tabsStore.active,
      () => {
        nextTick(() => {
          setTimeout(() => {
            const el = scrollEl.value
            if (!el) return
            const target = el.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(tabsStore.active)}"]`)
            if (!target) return
            const er = el.getBoundingClientRect()
            const tr = target.getBoundingClientRect()
            const delta = tr.left + tr.width / 2 - (er.left + er.width / 2)
            if (Math.abs(delta) > 1) el.scrollTo({ left: el.scrollLeft + delta, behavior: 'smooth' })
            updateTabMasks()
          }, 50)
        })
      },
      { immediate: true },
    )

    /** 官方页签图标: 菜单图标经 SvgIcon (text-16px) */
    const iconNameOf = (key: string) => {
      const m = findMenuByKey(key)
      return (m ? MENU_ICON_NAMES[m.icon] : undefined) ?? HOME_ICON_NAME
    }

    function closeTab(key: string) {
      navIfNext(tabsStore.removeTab(key))
    }

    return {
      tabsStore, menu, menuOptions, handleMenuSelect, openMenu,
      onPointerDown, onMouseDown, handleWheel, closeTab, iconNameOf,
      isDark, shadowTab: shadowOf('tab'), tabMode, tabHeight,
      maskL, maskR, updateTabMasks,
      /** 模板 ref 必须显式返回 (runtime compiler 按名绑定; 漏返 = ref 恒 null,
       *  滚轮横滚与激活页签居中全部静默失效 — Task 99 页签右缘截断根因) */
      scrollEl,
    }
  },
  components: { NDropdown, SvgClose, ChromeTabBg, ButtonIcon, SvgIcon },
  template: `
  <div
    class="flex shrink-0 items-center px-4"
    :style="{ height: tabHeight + 'px', boxShadow: shadowTab, background: 'rgb(var(--container-bg-color))' }"
  >
    <div
      ref="scrollEl"
      class="tab-scroll h-full min-w-0 flex-1 overflow-x-auto"
      :class="[{ 'tab-mask-l': maskL, 'tab-mask-r': maskR }]"
      @wheel="handleWheel"
      @scroll="updateTabMasks"
    >
      <!-- 官方: chrome/slider 模式 items-end (页签贴底), button 模式 items-center gap-12px -->
      <div
        class="flex h-full"
        :class="tabMode === 'button' ? 'items-center gap-3' : 'items-end pr-[18px]'"
      >
        <div
          v-for="t in tabsStore.tabs"
          :key="t.key"
          :data-tab-id="t.key"
          class="page-tab relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap transition-all duration-300"
          :class="[
            tabMode === 'chrome'
              ? 'chrome-tab -mr-[18px] gap-4 px-6 py-1.5' + (isDark ? ' chrome-tab_dark' : '')
              : '',
            tabMode === 'button'
              ? 'button-tab gap-3 border border-solid px-3 py-1 text-[13px]' + (isDark ? ' button-tab_dark' : '')
              : '',
            tabMode === 'slider'
              ? 'slider-tab gap-1.5 px-3 py-1 text-[13px]' + (isDark ? ' slider-tab_dark' : '')
              : '',
            tabsStore.active === t.key
              ? (tabMode === 'chrome'
                  ? 'chrome-tab_active' + (isDark ? ' chrome-tab_active_dark' : '')
                  : tabMode === 'button'
                    ? 'button-tab_active' + (isDark ? ' button-tab_active_dark' : '')
                    : 'slider-tab_active' + (isDark ? ' slider-tab_active_dark' : ''))
              : '',
          ]"
          @pointerdown="onPointerDown($event, t.key)"
          @mousedown="onMouseDown($event, t.key)"
          @contextmenu="openMenu($event, t.key)"
        >
          <!-- chrome 斜切背景 (官方 chrome-tab__bg, 置于内容之下) -->
          <div
            v-if="tabMode === 'chrome'"
            class="chrome-tab__bg pointer-events-none absolute left-0 top-0 -z-[1] h-full w-full"
          >
            <chrome-tab-bg />
          </div>
          <svg-icon :icon="iconNameOf(t.key)" :font-size="16" class="inline-block shrink-0 align-text-bottom" />
          <div class="max-w-[240px] truncate">{{ t.label }}</div>
          <!-- 官方 SvgClose: pointerdown.stop (固定页签无关闭钮) -->
          <span v-if="!tabsStore.isTabRetain(t.key)" @pointerdown.stop="closeTab(t.key)">
            <svg-close />
          </span>
          <!-- chrome 右缘分隔线 (官方 right-7px 1px 竖线, active/hover 隐藏) -->
          <div
            v-if="tabMode === 'chrome'"
            class="chrome-tab-divider absolute right-[7px] h-4 w-px"
            style="background-color: #1f2225"
          />
        </div>
      </div>
    </div>
    <!-- 官方页签栏右侧: ReloadButton + FullScreen (ButtonIcon, 无更多按钮) -->
    <div class="flex shrink-0 items-center gap-1">
      <button-icon tooltip-content="刷新页面" @click="$emit('reload')">
        <!-- 官方 reload-button.vue: ant-design:reload-outlined + animate-spin 750ms -->
        <svg-icon icon="ant-design:reload-outlined" :font-size="16" :class="!reloadFlag ? 'animate-spin' : ''" :style="!reloadFlag ? 'animation-duration: 0.75s' : ''" />
      </button-icon>
      <!-- 官方 full-screen.vue: gridicons:fullscreen / fullscreen-exit -->
      <button-icon :tooltip-content="fullContent ? '退出全屏' : '全屏'" @click="$emit('toggle-full-content')">
        <svg-icon v-if="fullContent" icon="gridicons:fullscreen-exit" :font-size="16" />
        <svg-icon v-else icon="gridicons:fullscreen" :font-size="16" />
      </button-icon>
    </div>

    <!-- 官方 ContextMenu (manual 定位 NDropdown) -->
    <n-dropdown
      :show="menu.visible"
      trigger="manual"
      placement="bottom-start"
      :x="menu.x"
      :y="menu.y"
      :options="menuOptions()"
      @clickoutside="menu.visible = false"
      @select="handleMenuSelect"
    />
  </div>
  `,
})
