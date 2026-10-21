/**
 * GlobalFooter — 移植自仓库 src/layouts/modules/global-footer/index.vue
 *   版权栏: 高度 = footer.height(48), 系统名/站点自定义页脚
 */
import '../../flags'
import { computed, defineComponent } from 'vue'
import { useUserStore } from '../../stores'
import { THEME } from '../../theme'

export const GlobalFooter = defineComponent({
  name: 'GlobalFooter',
  setup() {
    const userStore = useUserStore()
    const text = computed(
      () => userStore.user?.footer || `Copyright © 2026 ${userStore.user?.systemName || '北辰中转站'}`,
    )
    return { text, THEME }
  },
  template: `
  <footer class="flex shrink-0 items-center justify-center px-4 text-center text-[11px] text-muted-foreground" :style="{ height: THEME.footer.height + 'px', background: 'rgb(var(--container-bg-color))' }">
    {{ text }}
  </footer>
  `,
})
