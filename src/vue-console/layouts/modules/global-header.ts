/**
 * GlobalHeader — 移植自仓库 src/layouts/modules/global-header/index.vue (第 11 轮官方化)
 *   左: MenuToggler(官方 line-md menu-fold 图标, 单实例 isMobile v-if 驱动) + GlobalBreadcrumb
 *   右: 全屏 / 主题模式 / 主题配置 / [系统公告 popover, 置于用户下拉前] / 用户下拉
 *        (Task 105: GlobalSearch 已按用户指令「不要显示搜索」整体移除, 含左上角搜索栏与 Ctrl+K)
 *   全部图标钮 = 官方 ButtonIcon (NTooltip + NButton quaternary h-36px)
 *   主题模式 = 官方 ThemeSchemaSwitch 语义: 点击循环 亮→暗→跟随系统 (非下拉)
 *   用户下拉退出 = 官方语义: dialog.info(提示/确认退出登录吗？/确定/取消) 确认后登出
 *   高度 = header.height(56), 阴影 shadow-header, 容器底色 = 官方 bg-container token
 */
import '../../flags'
import '../../styles/toggler.css'
import { computed, defineComponent, h, onBeforeUnmount, ref } from 'vue'
import { NDropdown, NPopover } from 'naive-ui'
import { useUserStore } from '../../stores'
import { navigate } from '../../router'
import { dialog } from '../../message'
import { breadcrumbVisible, isDark, shadowOf, themeMode, setThemeModeWithReveal } from '../../theme'
import { GlobalBreadcrumb } from './global-breadcrumb'
import { ButtonIcon } from './button-icon'
import { SvgIcon } from '../../svg-icon'
import { MENU_ICON_NAMES } from '../../icons'

/** Task 104: 主题模式图标 — ph 圆润家族 (与 ph:user-circle 同族; 用户反馈原 sunny/nightlight 不好看) */
const SCHEMA_ICONS = {
  light: 'ph:sun',
  dark: 'ph:moon-stars',
  system: 'ph:monitor',
} as const

/** 官方 MenuToggler 图标名 (menu-toggler.vue 逐字; Task 106 恢复官方 SMIL 描线,
 *  Task 107 放慢至 1.75s 四笔, 逐笔节奏见 soy-icons-data.ts line-md 段) */
const FOLD_LEFT = 'line-md:menu-fold-left'
const FOLD_RIGHT = 'line-md:menu-fold-right'

export const GlobalHeader = defineComponent({
  name: 'GlobalHeader',
  props: {
    path: { type: String, required: true },
    collapsed: { type: Boolean, default: false },
    isMobile: { type: Boolean, default: false },
  },
  emits: ['select', 'toggle-collapse', 'toggle-mobile', 'open-theme-drawer'],
  setup(props, { emit }) {
    const userStore = useUserStore()
    const fullscreen = ref(false)

    const user = computed(() => userStore.user!)

    /* 官方 ThemeSchemaSwitch: 三态循环 (light → dark → system → light), 图标随当前态;
       Task 104: 切换动画 = View Transitions 圆形揭示 (以点击点为圆心, 全元素单次合成) */
    const schemaIcon = computed(() => SCHEMA_ICONS[themeMode.value] ?? SCHEMA_ICONS.light)
    function toggleThemeScheme(e?: MouseEvent) {
      const order = ['light', 'dark', 'system'] as const
      const next = order[(order.indexOf(themeMode.value) + 1) % order.length]
      setThemeModeWithReveal(next, e?.clientX, e?.clientY)
    }

    /** 官方 UserAvatar dropdown 图标家族 (SvgIconVNode, ph:sign-out fontSize 18 逐字) */
    const userOptions = [
      { label: '个人中心', key: 'profile', icon: () => h(SvgIcon, { icon: MENU_ICON_NAMES.profile, fontSize: 18 }) },
      { label: '关于系统', key: 'about', icon: () => h(SvgIcon, { icon: MENU_ICON_NAMES.about, fontSize: 18 }) },
      { label: '访问官网', key: 'home', icon: () => h(SvgIcon, { icon: 'material-symbols:language-outline', fontSize: 18 }) },
      { type: 'divider' as const, key: 'd1' },
      {
        label: () => h('span', { style: 'color:#f5222d' }, '退出登录'),
        key: 'logout',
        icon: () => h(SvgIcon, { icon: 'ph:sign-out', fontSize: 18, color: '#f5222d' }),
      },
    ]

    function handleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => (fullscreen.value = true)).catch(() => {})
      } else {
        document.exitFullscreen().then(() => (fullscreen.value = false)).catch(() => {})
      }
    }

    async function doLogout() {
      await userStore.logout()
      window.location.href = '/login'
    }

    /** 官方 UserAvatar logout 语义: dialog.info 确认后登出 */
    function handleLogout() {
      dialog.info({
        title: '提示',
        content: '确认退出登录吗？',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: () => void doLogout(),
      })
    }

    function onUserSelect(key: string) {
      if (key === 'profile') navigate('/profile')
      else if (key === 'about') navigate('/about')
      else if (key === 'home') window.location.href = '/'
      else if (key === 'logout') handleLogout()
    }

    /** 系统公告未读数 (真实数据语义: 全局公告存在即 1 条; 打开弹层记已读; 公告内容变更重新计未读) */
    const ANNOUNCE_READ_KEY = 'console-announce-read'
    const announceRead = ref<string | null>(null)
    try {
      announceRead.value = localStorage.getItem(ANNOUNCE_READ_KEY)
    } catch { /* 隐身模式等 storage 不可用场景: 每次都算未读 */ }
    const announceCount = computed(() => {
      const a = user.value.announcement || ''
      if (!a) return 0
      return announceRead.value === a ? 0 : 1
    })
    function onAnnounceShow(show: boolean) {
      if (!show) return
      const a = user.value.announcement || ''
      if (a && announceRead.value !== a) {
        announceRead.value = a
        try {
          localStorage.setItem(ANNOUNCE_READ_KEY, a)
        } catch { /* storage 不可用: 仅本次会话生效 */ }
      }
    }
    /** Task 105: 公告强制弹窗确认后广播已读 (base-layout confirmAnnounce 派发),
     *  铃铛红点即时清除并持久化, 无需等下一次刷新 */
    function onAnnounceReadEvent() {
      const a = user.value.announcement || ''
      announceRead.value = a
      try {
        localStorage.setItem(ANNOUNCE_READ_KEY, a)
      } catch { /* storage 不可用: 仅本次会话生效 */ }
    }
    window.addEventListener('console-announce-read', onAnnounceReadEvent)
    onBeforeUnmount(() => window.removeEventListener('console-announce-read', onAnnounceReadEvent))

    return {
      user, fullscreen, schemaIcon, userOptions, onUserSelect, toggleThemeScheme,
      handleFullscreen, isDark, themeMode, shadowHeader: shadowOf('header'), breadcrumbVisible,
      FOLD_LEFT, FOLD_RIGHT, announceCount, onAnnounceShow,
    }
  },
  components: { NDropdown, NPopover, GlobalBreadcrumb, ButtonIcon, SvgIcon },
  template: `
  <header
    class="flex shrink-0 items-center justify-between px-3"
    :style="{ height: '56px', boxShadow: shadowHeader, background: 'rgb(var(--container-bg-color))' }"
  >
    <div class="flex h-full min-w-0 flex-1 items-center">
      <!-- Task 108: 用户反馈芯片白框难看 → 盒子整体撤除 (toggler.css 无痕形态:
           透明无边框只见图标, hover 主色渐染+轻放大, active 按压回弹, 颜色走控制台
           主题变量自动联动暗色); 尺寸维持 107 定稿: 桌面 34px 钮/16px 图标,
           移动端 36px 钮/20px 图标; 显隐仍由 isMobile v-if 驱动 (官方 MenuToggler 单实例语义) -->
      <button
        v-if="isMobile"
        type="button"
        class="menu-toggler-btn"
        style="width: 36px; height: 36px"
        aria-label="打开菜单"
        @click="$emit('toggle-mobile')"
      >
        <svg-icon :icon="FOLD_LEFT" :font-size="20" />
      </button>
      <!-- 桌面端官方 :key 重挂载语义 (menu-toggler.vue 逐字): collapsed 翻转即重播描线 -->
      <button
        v-else
        :key="String(collapsed)"
        type="button"
        class="menu-toggler-btn"
        style="width: 34px; height: 34px"
        aria-label="折叠菜单"
        @click="$emit('toggle-collapse')"
      >
        <svg-icon :icon="collapsed ? FOLD_RIGHT : FOLD_LEFT" :font-size="16" />
      </button>

      <!-- Task 105: 原左上角搜索栏已按用户指令「不要显示搜索」移除,
           面包屑直接跟随折叠钮 (GlobalSearch 弹窗与 Ctrl+K 一并下线) -->
      <global-breadcrumb
        v-if="!isMobile && breadcrumbVisible"
        class="ml-3"
        :path="path"
        @select="(k) => $emit('select', k)"
      />
    </div>

    <!-- 右侧: 全屏 / 主题模式(循环) / 主题配置 / [公告(业务)] / 用户 -->
    <div class="flex h-full shrink-0 items-center gap-1">
      <!-- 官方 full-screen.vue: gridicons:fullscreen / fullscreen-exit -->
      <button-icon v-if="!isMobile" :tooltip-content="fullscreen ? '退出全屏' : '全屏'" @click="handleFullscreen">
        <svg-icon v-if="fullscreen" icon="gridicons:fullscreen-exit" />
        <svg-icon v-else icon="gridicons:fullscreen" />
      </button-icon>
      <!-- 官方 ThemeSchemaSwitch: 点击循环 亮/暗/跟随系统 (sunny/nightlight-rounded/hdr-auto) -->
      <button-icon tooltip-content="主题模式" @click="toggleThemeScheme">
        <svg-icon :icon="schemaIcon" />
      </button-icon>
      <!-- 官方 theme-button.vue: majesticons:color-swatch-line -->
      <button-icon tooltip-content="主题配置" @click="$emit('open-theme-drawer')">
        <svg-icon icon="majesticons:color-swatch-line" />
      </button-icon>
      <n-popover trigger="click" placement="bottom-end" @update:show="onAnnounceShow">
        <template #trigger>
          <!-- 官方 UserAvatar 语义: 弹层触发器必须包一层原生 div — ButtonIcon 根节点是 NTooltip
               (多根 Fragment), Vue 运行时指令无法绑定非元素根 → VBinder targetRef 失效 →
               弹层定位失败落在 (0,0)。官方 UserAvatar.vue 正是以 <div> 包裹 ButtonIcon 规避 -->
          <div class="flex items-center">
            <button-icon tooltip-content="系统公告">
              <n-badge :value="announceCount" :show="announceCount > 0" :offset="[3, -3]">
                <svg-icon icon="ant-design:bell-outlined" />
              </n-badge>
            </button-icon>
          </div>
        </template>
        <!-- 宽度钳制: naive Popover 无 shift 属性, bottom-end 钉在铃铛右缘,
             固定 288px 在手机端 (铃铛右缘距视口右 ~90px) 会左溢出视口被截断 →
             min(288, 100vw-130) 保证任意屏宽都在视口内 -->
        <div style="width: min(288px, calc(100vw - 130px))">
          <div class="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <svg-icon icon="ant-design:bell-outlined" :font-size="15" />
            系统公告
          </div>
          <p
            v-if="user.announcement"
            class="max-h-[240px] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground"
          >{{ user.announcement }}</p>
          <div v-else class="py-6 text-center text-xs text-muted-foreground">暂无公告</div>
        </div>
      </n-popover>
      <!-- 官方 UserAvatar: NDropdown 触发器 = 原生 div 包 ButtonIcon(ph:user-circle) -->
      <n-dropdown :options="userOptions" trigger="click" placement="bottom" @select="onUserSelect">
        <div class="flex items-center">
          <button-icon>
            <svg-icon icon="ph:user-circle" :font-size="18" />
            <span class="hidden max-w-[110px] truncate text-base font-medium md:block">{{ user.displayName || user.username }}</span>
          </button-icon>
        </div>
      </n-dropdown>
    </div>
  </header>
  `,
})
