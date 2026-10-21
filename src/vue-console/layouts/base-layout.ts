/**
 * BaseLayout — 对齐仓库 src/layouts/base-layout/index.vue (@sa/materials AdminLayout)
 *   composition: GlobalSider + GlobalHeader + GlobalTab + GlobalContent + GlobalFooter
 *                + ThemeDrawer + 移动端抽屉菜单 + 系统公告强制弹窗
 *                (Task 105: GlobalSearch 已按用户指令移除)
 *   fixedHeaderAndTab = true (header/tab 常驻, 仅内容区滚动); sider 220/64 直角全高
 */
import '../flags'
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NDrawer, NDrawerContent } from 'naive-ui'
import { useUserStore, useTabsStore } from '../stores'
import { currentPath, currentPage, navigate } from '../router'
import { PAGE_MAP, findMenuByKey } from '../routes'
import { isDark, LAYOUT_BG, footerVisible, tabVisible, tabCache, pageAnimate, THEME } from '../theme'
import { GlobalSider } from './modules/global-sider'
import { GlobalHeader } from './modules/global-header'
import { GlobalTab } from './modules/global-tab'
import { GlobalContent } from './modules/global-content'
import { GlobalFooter } from './modules/global-footer'
import { ThemeDrawer } from './modules/theme-drawer'
import { SvgIcon } from '../svg-icon'

export const ConsoleShell = defineComponent({
  name: 'BaseLayout',
  components: { NDrawer, NDrawerContent, GlobalSider, GlobalHeader, GlobalTab, GlobalContent, GlobalFooter, ThemeDrawer, SvgIcon },
  setup() {
    const userStore = useUserStore()
    const tabsStore = useTabsStore()
    const user = computed(() => userStore.user!)

    const collapsed = ref(false)
    const mobileOpen = ref(false)
    const drawerOpen = ref(false)
    /** 官方 appStore.fullContent — 内容区全屏 (header/footer 隐藏, 页签保留) */
    const fullContent = ref(false)
    /** 官方 appStore.reloadFlag / reloadPage — 内容区刷新 (非整页, v-if 驱动) */
    const reloadFlag = ref(true)
    const reloadCount = ref(0)

    /** 官方 routeStore.cacheRoutes — KeepAlive include 名单 (tab.cache 开启时 = 全部页面组件 name) */
    const cacheRoutes = ref<string[]>([])
    function fillCacheRoutes() {
      cacheRoutes.value = tabCache.value
        ? Object.values(PAGE_MAP)
            .map((c) => (c as { name?: string }).name)
            .filter((n): n is string => !!n)
        : []
    }
    watch(tabCache, fillCacheRoutes, { immediate: true })

    /** 官方 routeStore.resetRouteCache — 清空 include 丢弃全部缓存后再恢复名单 */
    function resetRouteCache() {
      cacheRoutes.value = []
      nextTick(fillCacheRoutes)
    }

    /** 官方 appStore.reloadPage(duration=300): 隐藏内容 → 等待(animate?duration:40) → 恢复 + resetRouteCache */
    function reloadPage() {
      reloadFlag.value = false
      const d = pageAnimate.value ? 300 : 40
      setTimeout(() => {
        reloadCount.value += 1
        reloadFlag.value = true
        resetRouteCache()
      }, d)
    }

    // 移动端判定 (与仓库 appStore.isMobile 同职责, 断点 lg=1024)
    const isMobile = ref(false)
    let mql: MediaQueryList | null = null
    function resolveMobile() {
      isMobile.value = !!mql?.matches
    }
    onMounted(() => {
      mql = window.matchMedia('(max-width: 1023px)')
      resolveMobile()
      mql.addEventListener('change', resolveMobile)
    })
    onBeforeUnmount(() => mql?.removeEventListener('change', resolveMobile))

    // 标签页与路由同步 (官方 watch route.fullPath → addTab); 先恢复缓存页签
    tabsStore.restore()
    watch(
      currentPath,
      (p) => {
        const m = findMenuByKey(p)
        if (m) tabsStore.addTab(m.key, m.label, m.icon)
      },
      { immediate: true },
    )

    /** 当前页面组件 (Task 99: 路由预解析后的同步组件; 理论上恒非空 —
     *  main.ts 等待初始 land() 才挂载, hashchange 落地前 currentPath 不变) */
    const page = computed(() => currentPage.value ?? PAGE_MAP[currentPath.value] ?? PAGE_MAP['/dashboard'])
    const layoutBg = computed(() => (isDark.value ? LAYOUT_BG.dark : LAYOUT_BG.light))
    const siderWidth = computed(() => (collapsed.value ? THEME.sider.collapsedWidth : THEME.sider.width))

    function navigateTo(key: string) {
      navigate(key)
      // 官方 switchRouteByTab 语义: 页签切换即激活
      tabsStore.active = key
    }

    function onMenuSelect(key: string) {
      // Task 161: 模型广场菜单改为跳转官网前端模型广场 (/#models, 新标签页打开, 不离开控制台)
      if (key === '/mall') {
        window.open('/#models', '_blank')
        mobileOpen.value = false
        return
      }
      navigateTo(key)
      mobileOpen.value = false
    }

    /** Task 105: 系统公告强制弹窗 (用户指令) — 每次进入控制台必弹 (可勾选「今日不再弹出」),
     *  强制留 5 秒阅读时间 (确认钮倒计时禁用), 点击「我知道了」= 已阅读并同意公告内容
     *  与本站《免责声明》; 确认后广播已读事件同步铃铛红点 (global-header 监听) */
    const ANNOUNCE_MODAL_KEY = 'console-announce-modal-day'
    const announceModal = ref(false)
    const announceTodayOff = ref(false)
    const announceLeft = ref(5)
    let announceTimer: ReturnType<typeof setInterval> | null = null
    function announceToday() {
      const d = new Date()
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    }
    function confirmAnnounce() {
      if (announceLeft.value > 0) return
      announceModal.value = false
      if (announceTimer) {
        clearInterval(announceTimer)
        announceTimer = null
      }
      try {
        if (announceTodayOff.value) {
          localStorage.setItem(ANNOUNCE_MODAL_KEY, `${announceToday()}::${user.value.announcement || ''}`)
        }
        window.dispatchEvent(new CustomEvent('console-announce-read'))
      } catch { /* storage 不可用: 仅本次会话生效 */ }
    }
    // 进入控制台即判定: 有公告且今日未勾选跳过 → 强制弹出 + 5s 阅读倒计时
    {
      const ann = user.value.announcement || ''
      let skipped = false
      try {
        skipped = localStorage.getItem(ANNOUNCE_MODAL_KEY) === `${announceToday()}::${ann}`
      } catch { /* storage 不可用: 每次都弹 */ }
      if (ann && !skipped) {
        announceModal.value = true
        announceTimer = setInterval(() => {
          if (announceLeft.value > 1) {
            announceLeft.value -= 1
          } else {
            announceLeft.value = 0
            if (announceTimer) {
              clearInterval(announceTimer)
              announceTimer = null
            }
          }
        }, 1000)
      }
    }
    onBeforeUnmount(() => {
      if (announceTimer) clearInterval(announceTimer)
    })

    return {
      user, tabsStore, collapsed, mobileOpen, drawerOpen, fullContent, isMobile,
      currentPath, page, layoutBg, siderWidth, navigateTo, onMenuSelect, reloadPage,
      reloadFlag, reloadCount, cacheRoutes, tabVisible, footerVisible,
      announceModal, announceTodayOff, announceLeft, confirmAnnounce,
    }
  },
  template: `
  <!-- Task 137: 100dvh 动态视口 — iOS Safari 的 100vh 按大视口计算, 底部 ~96px 被工具栏
       遮住且页面滚不出来; dvh 跟随工具栏收展, 控制台壳始终恰好铺满可视区 (vh 兜底旧内核) -->
  <div class="flex w-full overflow-hidden" style="height: 100vh; height: 100dvh">
    <!-- 桌面侧边栏 (GlobalSider: GlobalLogo + n-menu, 直角全高) -->
    <aside
      class="hidden shrink-0 lg:block"
      :style="{ width: siderWidth + 'px', transition: 'width .3s ease' }"
    >
      <global-sider :value="currentPath" :collapsed="collapsed" :role="user.role" @select="onMenuSelect" />
    </aside>

    <!-- 移动端抽屉菜单 (n-drawer 原生; Task 106: 宽 220→280 — 用户反馈「左上角的功能栏
         有点小」, 对齐官网 LandingDrawer 280px 同宽, 手机端更从容; logo 左对齐菜单列 Task 104) -->
    <n-drawer v-model:show="mobileOpen" placement="left" :width="280">
      <n-drawer-content :body-content-style="'padding: 0; height: 100%'">
        <div style="height: 100%">
          <global-sider :value="currentPath" :collapsed="false" :role="user.role" logo-align="left" @select="onMenuSelect" />
        </div>
      </n-drawer-content>
    </n-drawer>

    <!-- 右侧主体: fixedHeaderAndTab (header/tab 常驻, 内容区独立滚动) -->
    <div class="flex min-w-0 flex-1 flex-col" :style="{ background: layoutBg }">
      <global-header
        v-show="!fullContent"
        :path="currentPath"
        :collapsed="collapsed"
        :is-mobile="isMobile"
        @select="navigateTo"
        @toggle-collapse="collapsed = !collapsed"
        @toggle-mobile="mobileOpen = true"
        @open-theme-drawer="drawerOpen = true"
      />
      <global-tab
        v-show="tabVisible"
        :full-content="fullContent"
        :reload-flag="reloadFlag"
        @reload="reloadPage"
        @toggle-full-content="fullContent = !fullContent"
      />
      <global-content
        :page="page"
        :route-key="currentPath"
        :reload-key="reloadCount"
        :cache-routes="cacheRoutes"
        :reload-flag="reloadFlag"
      />
      <global-footer v-show="!fullContent && footerVisible" />
    </div>

    <!-- 主题配置抽屉 -->
    <theme-drawer v-model:show="drawerOpen" />

    <!-- Task 105: 系统公告强制弹窗 — 无 × / 遮罩点击不关 / Esc 不关, 必须阅读 5 秒后
         点「我知道了」确认 (确认即同意公告内容与《免责声明》); 宽度视口自适应钳制 -->
    <n-modal
      :show="announceModal"
      preset="card"
      :closable="false"
      :mask-closable="false"
      :close-on-esc="false"
      :auto-focus="false"
      :segmented="{ footer: 'soft' }"
      :style="{ width: 'min(560px, calc(100vw - 48px))' }"
    >
      <template #header>
        <div class="flex items-center gap-1.5 text-base font-semibold">
          <svg-icon icon="ant-design:bell-outlined" :font-size="16" />
          系统公告
        </div>
      </template>
      <div class="soy-scrollbar max-h-[46vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{{ user.announcement }}</div>
      <p class="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-relaxed text-muted-foreground">
        点击「我知道了」即代表您已完整阅读并同意以上全部内容，承诺遵守本站《免责声明》，仅将本服务用于合法合规用途；违规使用所产生的一切后果由使用者自行承担。
      </p>
      <template #footer>
        <div class="flex items-center justify-between gap-3">
          <n-checkbox v-model:checked="announceTodayOff">今日不再弹出</n-checkbox>
          <n-button type="primary" :disabled="announceLeft > 0" @click="confirmAnnounce">
            {{ announceLeft > 0 ? '我知道了（' + announceLeft + 's）' : '我知道了' }}
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
  `,
})
