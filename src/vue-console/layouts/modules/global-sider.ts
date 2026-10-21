/**
 * GlobalSider — 移植自仓库 src/layouts/modules/global-sider/index.vue
 *   DarkModeContainer(flex-col-stretch, shadow-sider, 底色 = 官方 bg-container token) + GlobalLogo(高=header.height) + n-menu
 *   n-menu 参数对齐官方 vertical-menu.vue: collapsed-icon-size 22 / indent 18
 *   菜单分两组: 控制台平铺 + 运营管理 group (n-menu 原生 group), 全部交互为 naive 原生
 */
import '../../flags'
import { computed, defineComponent, h } from 'vue'
import { NMenu } from 'naive-ui'
import { visibleMenus, SECTION_LABELS, type MenuItem } from '../../routes'
import { isDark, siderInverted, shadowOf, THEME, CONTAINER_BG } from '../../theme'
import '../../styles/scrollbar.css'
import { GlobalLogo } from './global-logo'
import { MENU_ICON_NAMES } from '../../icons'
import { SvgIcon } from '../../svg-icon'

export function buildMenuOptions(menus: MenuItem[]) {
  const map = (list: MenuItem[]) =>
    list.map((m) => ({
      label: m.label,
      key: m.key,
      /** 官方菜单渲染链 route/shared.ts: SvgIconVNode({ icon, fontSize: 20 }) */
      icon: () => h(SvgIcon, { icon: MENU_ICON_NAMES[m.icon] ?? MENU_ICON_NAMES.about, fontSize: 20 }),
    }))
  const consoleItems = map(menus.filter((m) => m.section === 'console'))
  const adminItems = map(menus.filter((m) => m.section === 'admin'))
  if (adminItems.length === 0) return consoleItems
  return [...consoleItems, { type: 'group' as const, label: SECTION_LABELS.admin, key: 'g-admin', children: adminItems }]
}

export const GlobalSider = defineComponent({
  name: 'GlobalSider',
  props: {
    /** 当前激活菜单 key (哈希路由路径) */
    value: { type: String, required: true },
    collapsed: { type: Boolean, default: false },
    role: { type: Number, required: true },
    /** logo 对齐: 桌面 sider 居中(官方); 移动端抽屉传 left (Task 104) */
    logoAlign: { type: String, default: 'center' },
  },
  emits: ['select'],
  setup(props, { emit }) {
    const menus = computed(() => visibleMenus(props.role))
    const menuOptions = computed(() => buildMenuOptions(menus.value))
    const darkSider = computed(() => siderInverted.value)
    /** 官方 AdminLayout sider = DarkModeContainer bg-container (白 / 暗 rgb(28,28,28)); 反转 = tokens.inverted */
    const siderBg = computed(() =>
      darkSider.value ? THEME.sider.inverted : isDark.value ? CONTAINER_BG.dark : CONTAINER_BG.light,
    )
    const shadowSider = shadowOf('sider')

    function onSelect(key: string) {
      emit('select', key)
    }

    return { menuOptions, darkSider, siderBg, shadowSider, onSelect, THEME, logoAlign: props.logoAlign }
  },
  components: { NMenu, GlobalLogo },
  template: `
  <div class="flex size-full flex-col" :style="{ background: siderBg, boxShadow: shadowSider }">
    <global-logo :show-title="!collapsed" :align="logoAlign" />
    <n-menu
      class="soy-scrollbar flex-1 overflow-y-auto"
      :value="value"
      :options="menuOptions"
      :inverted="darkSider"
      :collapsed="collapsed"
      :collapsed-width="THEME.sider.collapsedWidth"
      :collapsed-icon-size="22"
      :indent="18"
      @update:value="onSelect"
    />
  </div>
  `,
})
