/**
 * GlobalBreadcrumb — 移植自仓库 src/layouts/modules/global-breadcrumb/index.vue (第 11 轮官方化)
 *   官方 BreadcrumbContent: 图标 (showIcon, mr-4px) + 文本; 每级菜单项均带图标
 *   结构: 首页 / [运营管理(分组)] / 当前页 (n-breadcrumb 原生, 首页可点击回看板)
 */
import '../../flags'
import { computed, defineComponent } from 'vue'
import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui'
import { findMenuByKey } from '../../routes'
import { MENU_ICON_NAMES, HOME_ICON_NAME } from '../../icons'
import { SvgIcon } from '../../svg-icon'

export const GlobalBreadcrumb = defineComponent({
  name: 'GlobalBreadcrumb',
  props: {
    /** 当前路由路径 */
    path: { type: String, required: true },
  },
  emits: ['select'],
  setup(props, { emit }) {
    const menu = computed(() => findMenuByKey(props.path))
    const isAdminSection = computed(() => menu.value?.section === 'admin')
    /** 官方 BreadcrumbContent: 菜单项图标经 SvgIcon (mr-4px) */
    const menuIconName = computed(() =>
      menu.value ? MENU_ICON_NAMES[menu.value.icon] ?? HOME_ICON_NAME : undefined,
    )

    function goHome() {
      emit('select', '/dashboard')
    }

    return { menu, menuIconName, isAdminSection, goHome, homeIconName: HOME_ICON_NAME }
  },
  components: { NBreadcrumb, NBreadcrumbItem, SvgIcon },
  template: `
  <n-breadcrumb>
    <n-breadcrumb-item @click="goHome">
      <div class="flex items-center">
        <svg-icon :icon="homeIconName" class="mr-1" :font-size="14" />
        首页
      </div>
    </n-breadcrumb-item>
    <n-breadcrumb-item v-if="isAdminSection">运营管理</n-breadcrumb-item>
    <n-breadcrumb-item v-if="menu">
      <div class="flex items-center">
        <svg-icon :icon="menuIconName" class="mr-1" :font-size="14" />
        {{ menu.label }}
      </div>
    </n-breadcrumb-item>
  </n-breadcrumb>
  `,
})
