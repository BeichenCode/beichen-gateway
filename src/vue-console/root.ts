/**
 * Vue 控制台根组件: 认证检测 + 哈希路由分发 + 全局 naive 主题配置 (themeOverrides)
 * 游客模式: 未登录仅可查看接入文档 (#/about), 其余跳转独立登录页
 */
import './flags'
import { computed, defineComponent, ref, watch } from 'vue'
import { useUserStore, fetchSiteStatus } from './stores'
import { currentPath, navigate } from './router'
import { ConsoleShell } from './shell'
import { isDark, themeOverrides, LAYOUT_BG, initTheme } from './theme'
import { NButton, NConfigProvider, NTag, darkTheme, zhCN, dateZhCN } from 'naive-ui'
import { PAGE_MAP } from './routes'
import { startSiteRevGuard } from './rev-guard'

const GuestAboutPage = PAGE_MAP['/about']

const Root = defineComponent({
  name: 'ConsoleRoot',
  components: { ConsoleShell, GuestAboutPage },
  setup() {
    initTheme()
    const userStore = useUserStore()
    const siteName = ref('')

    void userStore.refresh()
    fetchSiteStatus().then((s) => {
      if (s?.systemName) siteName.value = s.systemName
    })

    const theme = computed(() => (isDark.value ? darkTheme : null))

    // 路由守卫: 未登录跳登录页 / 已登录访问登录页跳看板 / 非管理员访问管理页跳看板
    watch(
      [() => userStore.loaded, () => userStore.user, currentPath],
      ([loaded, user, path]) => {
        if (!loaded) return
        if (!user) {
          if (path !== '/about') window.location.replace('/login')
        } else if (path === '/login') {
          navigate('/dashboard')
        } else if (['/channel', '/users', '/redemption', '/settings', '/orders'].includes(path) && user.role < 10) {
          navigate('/dashboard')
        }
      },
      { immediate: true },
    )

    // 站点版本看守: 登录后启用 (游客不提示)
    watch(
      () => !!userStore.user,
      (v) => startSiteRevGuard(v),
      { immediate: true },
    )

    const bg = computed(() => ({ background: isDark.value ? LAYOUT_BG.dark : LAYOUT_BG.light }))
    const guestBg = computed(() => ({ background: isDark.value ? LAYOUT_BG.dark : 'rgba(0,0,0,0.02)' }))

    function goHome() {
      window.location.href = '/'
    }
    function goLogin() {
      window.location.href = '/login'
    }

    return { userStore, siteName, theme, themeOverrides, zhCN, dateZhCN, bg, guestBg, currentPath, goHome, goLogin }
  },
  template: `
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN" style="height: 100%">
    <!-- 认证检测中: 全站统一加载动画 = 5 竖条依次跳跃点亮 (.loading-bar, 用户钦定原样保留,
         Task 44 语义: 全屏只留竖条动画本身, 白底与前台 boot-splash 同语言) -->
    <div
      v-if="!userStore.loaded"
      role="status"
      aria-label="页面加载中"
      style="position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: #fff"
    >
      <div class="loading-bar" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
    </div>

    <!-- 游客模式: 接入文档公开可看 -->
    <div v-else-if="!userStore.user" style="min-height: 100vh" :style="guestBg">
      <header class="sticky top-0 z-30 border-b border-[var(--border)]" :style="{ background: 'var(--card)' }">
        <div class="mx-auto flex h-14 max-w-6xl items-center gap-2.5 px-4">
          <img src="/logo.png" alt="" class="h-[26px] w-[26px] object-contain" />
          <span class="text-[15px] font-semibold text-foreground">{{ siteName || '接入文档' }}</span>
          <n-tag size="small" :bordered="false">游客模式</n-tag>
          <div class="ml-auto flex items-center gap-2">
            <n-button quaternary size="small" @click="goHome">返回首页</n-button>
            <n-button type="primary" size="small" @click="goLogin">登录</n-button>
          </div>
        </div>
      </header>
      <main class="mx-auto max-w-6xl px-4 py-6">
        <guest-about-page />
      </main>
      <footer class="pb-6 text-center text-xs text-muted-foreground">登录后可使用令牌管理、调用日志等完整功能</footer>
    </div>

    <!-- 已登录: 后台壳层 -->
    <console-shell v-else />
  </n-config-provider>
  `,
})

export default Root
