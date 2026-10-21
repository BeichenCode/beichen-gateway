/**
 * GlobalContent — 官方仓库 src/layouts/modules/global-content/index.vue 全量移植
 *   官方结构三件套 (逐字段):
 *   <Transition :name="page.animate ? page.animateMode : ''" mode="out-in"
 *               @before-leave=contentXScrollable(true) @after-leave=resetScroll @after-enter=(false)>
 *     <KeepAlive :include="cacheRoutes">
 *       <component v-if="reloadFlag" :key="tabId" class="flex-grow bg-layout transition-300" />
 *     </KeepAlive>
 *   </Transition>
 *   - 页面切换动画六套: styles/transition.css (官方 transition.css 逐字)
 *   - 页签缓存: tab.cache → base-layout 传入 cacheRoutes (组件 name 名单), KeepAlive include
 *   - reloadFlag: v-if 驱动内容区重建 (官方 appStore.reloadFlag)
 *   - 滚动锁: leave 期间 overflow-x hidden + after-leave 回滚顶部 (官方 setContentXScrollable/resetScroll)
 */
import '../../flags'
import '../../styles/transition.css'
import '../../styles/scrollbar.css'
import { computed, defineComponent, ref, type PropType, type Component } from 'vue'
import { pageAnimate, pageAnimateMode, THEME } from '../../theme'

export const GlobalContent = defineComponent({
  name: 'GlobalContent',
  props: {
    /** 当前路由页面组件 */
    page: { type: Object as PropType<Component>, required: true },
    /** 路由 key (变化时重挂载并触发过渡, 官方 tabStore.getTabIdByRoute) */
    routeKey: { type: String, required: true },
    /** 官方 appStore.reloadPage 递增计数 (内容区刷新重建) */
    reloadKey: { type: Number, default: 0 },
    /** 官方 routeStore.cacheRoutes — KeepAlive include 名单 (tab.cache 开关) */
    cacheRoutes: { type: Array as PropType<string[]>, default: () => [] },
    /** 官方 appStore.reloadFlag: false = 内容区刷新中 (v-if 卸载) */
    reloadFlag: { type: Boolean, default: true },
  },
  setup(props) {
    /** 官方 transitionName = page.animate ? page.animateMode : '' */
    const transitionName = computed(() => (pageAnimate.value ? pageAnimateMode.value : ''))

    /* 官方 appStore.setContentXScrollable / resetScroll (滚动容器 = main 自身, 等价语义) */
    const scroller = ref<HTMLElement | null>(null)
    function onBeforeLeave() {
      if (scroller.value) scroller.value.style.overflowX = 'hidden'
    }
    function onAfterLeave() {
      scroller.value?.scrollTo({ left: 0, top: 0 })
    }
    function onAfterEnter() {
      if (scroller.value) scroller.value.style.overflowX = ''
    }

    return {
      transitionName, scroller, onBeforeLeave, onAfterLeave, onAfterEnter,
      contentPadding: THEME.content.padding,
    }
  },
  template: `
  <main
    ref="scroller"
    class="soy-scrollbar min-h-0 flex-1 overflow-y-auto"
    style="-webkit-overflow-scrolling: touch; overscroll-behavior: contain"
    :style="{ padding: contentPadding + 'px' }"
  >
    <transition
      :name="transitionName"
      mode="out-in"
      @before-leave="onBeforeLeave"
      @after-leave="onAfterLeave"
      @after-enter="onAfterEnter"
    >
      <keep-alive :include="cacheRoutes">
        <component
          :is="page"
          v-if="reloadFlag"
          :key="routeKey + ':' + reloadKey"
          class="flex-grow bg-layout"
          style="background: rgb(var(--layout-bg-color))"
        />
      </keep-alive>
    </transition>
  </main>
  `,
})
