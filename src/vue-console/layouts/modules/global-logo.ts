/**
 * GlobalLogo — 移植自仓库 src/layouts/modules/global-logo/index.vue (第 11 轮官方化逐字段)
 *   <RouterLink w-full flex-center nowrap-hidden> + SystemLogo size-32px
 *   + 标题 pl-8px text-16px font-bold text-primary (整题主色, 官方形态; showTitle=false 折叠)
 */
import '../../flags'
import { computed, defineComponent } from 'vue'
import { useUserStore } from '../../stores'
import { primaryColor, THEME } from '../../theme'

export const GlobalLogo = defineComponent({
  name: 'GlobalLogo',
  props: {
    showTitle: { type: Boolean, default: true },
    /** 对齐: 'center' 官方默认 (桌面 sider); 'left' 移动端抽屉 (Task 104 用户指令 logo 偏左对齐菜单) */
    align: { type: String, default: 'center' },
  },
  setup() {
    const userStore = useUserStore()
    const siteName = computed(() => userStore.user?.systemName || '北辰中转站')
    const style = computed(() => ({ height: `${THEME.header.height}px` }))

    return { siteName, style, primaryColor }
  },
  template: `
  <a href="/" title="返回官网" class="flex w-full items-center justify-start overflow-hidden whitespace-nowrap pl-3" :style="style">
    <img src="/logo.png" alt="Logo" class="size-8 shrink-0 object-contain" />
    <h2
      v-show="showTitle"
      class="pl-2 text-base font-bold transition duration-300 ease-in-out"
      :style="{ color: primaryColor }"
    >
      {{ siteName }}
    </h2>
  </a>
  `,
})
