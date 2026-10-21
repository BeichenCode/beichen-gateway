/**
 * Vue 控制台入口 (挂载/卸载桥接)
 * 技术栈对齐 Soybean Admin NaiveUI 版: Vue3 + Pinia + Naive UI (原生组件 + 全局 themeOverrides)
 */
import './flags'
import './styles/scrollbar.css'
import './styles/live.css'
import './styles/tilt.css'
import { createApp } from 'vue'
import type { App, Component } from 'vue'
import { createPinia } from 'pinia'
import {
  NAlert, NBadge, NBreadcrumb, NBreadcrumbItem, NButton, NButtonGroup, NCard, NCheckbox, NCollapse, NCollapseItem, NColorPicker, NConfigProvider,
  NDataTable, NDatePicker, NDivider, NDrawer, NDrawerContent, NDropdown, NEmpty, NFlex, NForm,
  NFormItem, NGi, NGrid, NInput, NInputGroup, NInputNumber, NList, NListItem, NMenu, NModal,
  NPagination, NPopover, NPopconfirm, NProgress, NRadioButton, NRadioGroup, NResult, NSelect,
  NSkeleton, NSpin, NSwitch, NTabPane, NTabs, NTag, NThing, NTime, NTooltip, NUpload, zhCN, dateZhCN,
} from 'naive-ui'
import { registerIcons } from './icons'
import { PageHeader, FormRow } from './shared'
import { attachCardTilt, detachCardTilt } from './tilt'
import { initTheme } from './theme'
import { setupProgressGuard } from './loading-bar'
import { whenRouteReady } from './router'
import Root from './root'

const NAIVE_COMPONENTS: Record<string, Component> = {
  NAlert, NBadge, NBreadcrumb, NBreadcrumbItem, NButton, NButtonGroup, NCard, NCheckbox, NCollapse, NCollapseItem, NColorPicker, NConfigProvider,
  NDataTable, NDatePicker, NDivider, NDrawer, NDrawerContent, NDropdown, NEmpty, NFlex, NForm,
  NFormItem, NGi, NGrid, NInput, NInputGroup, NInputNumber, NList, NListItem, NMenu, NModal,
  NPagination, NPopover, NPopconfirm, NProgress, NRadioButton, NRadioGroup, NResult, NSelect,
  NSkeleton, NSpin, NSwitch, NTabPane, NTabs, NTag, NThing, NTime, NTooltip, NUpload,
}

function registerComponents(app: App) {
  for (const [name, comp] of Object.entries(NAIVE_COMPONENTS)) {
    app.component(name, comp)
  }
  app.component('PageHeader', PageHeader)
  app.component('FormRow', FormRow)
  registerIcons(app)
}

export interface ConsoleHandle {
  /** 初始路由就绪且应用已挂载 (React 侧据此撤 5 竖条加载动画) */
  ready: Promise<void>
  unmount: () => void
}

export function mountConsole(el: HTMLElement): ConsoleHandle {
  initTheme()
  setupProgressGuard()
  attachCardTilt() // Task 123: 卡片指针丝滑交互全局委托 (卸载时移除)
  const app = createApp(Root)
  app.use(createPinia())
  registerComponents(app)
  app.config.warnHandler = (msg, _inst, trace) => {
    // 运行期模板告警仅开发态打印, 避免污染生产控制台
    if (process.env.NODE_ENV !== 'production') console.warn('[vue-console]', msg, trace)
  }
  app.config.errorHandler = (err, _inst, info) => {
    console.error('[vue-console-error]', info, err)
  }
  // vue-router isReady 语义: 初始路由页面组件解析完成后再挂载,
  // 首屏即同步组件 (挂载期间宿主由 React 侧 RouteLoading 5 竖条动画接管)
  return {
    ready: whenRouteReady().then(() => {
      app.mount(el)
    }),
    unmount: () => {
      detachCardTilt()
      app.unmount()
      el.innerHTML = ''
    },
  }
}

export { zhCN, dateZhCN }
