/**
 * ThemeDrawer — 移植自仓库 src/layouts/modules/theme-drawer/ (modules: general/appearance/layout)
 *   主题配置抽屉 (官方 themeDrawerTitle「主题配置」, 宽 300):
 *   - 主题色: NColorPicker + 官方 16 预设色板 (#646cff 置顶 = 官方 themeColor)
 *   - 其他主题色: success/warning/error 三色 (isInfoFollowPrimary → info 跟随主色, 与仓库一致)
 *   - 暗黑模式: 亮色/暗色/跟随系统 (官方 themeScheme 三态)
 *   - 辅助模式: 灰色模式/色弱模式 (官方 toggleAuxiliaryColorModes)
 *   - 界面显示: 组件圆角 (themeRadius 官方 token, 0-24)/页签/面包屑/页脚/页面动画开关
 *   - 侧边栏反转 (仓库 sider.inverted)
 *   全部为 naive 原生组件, 持久化于 console-theme-settings (不触前台 token)
 */
import '../../flags'
import { defineComponent } from 'vue'
import {
  NButton, NColorPicker, NDrawer, NDrawerContent, NInputNumber, NRadioButton, NRadioGroup,
  NSelect, NSlider, NSwitch,
} from 'naive-ui'
import { message } from '../../message'
import { OFFICIAL_SWATCHES } from '@/lib/theme-palette'
import {
  breadcrumbVisible, colourWeakness, footerVisible, grayscale, isDark, pageAnimate, pageAnimateMode,
  primaryColor, resetConsoleTheme, semanticColors, setAuxMode, setPageAnimateMode, setDisplayPref,
  setPrimary, setSemanticColor, setSiderInverted, setTabPref, setThemeModeWithReveal, setThemeRadius,
  siderInverted, tabCache, tabHeight, tabMiddleClose, tabMode, tabVisible, themeMode, themeRadius,
} from '../../theme'

/** 官方预设色板 (theme-color.vue swatches + 官方默认色置顶) */
const SWATCHES = ['#646cff', ...OFFICIAL_SWATCHES]

/** 官方 themeTabModeOptions (constants/app.ts: chrome/button/slider) */
const TAB_MODE_OPTIONS = [
  { label: 'Chrome 风格', value: 'chrome' },
  { label: '按钮风格', value: 'button' },
  { label: '滑块风格', value: 'slider' },
]

/** 官方 themePageAnimationModeOptions (constants/app.ts 七项, 文案 = 官方 zh-cn) */
const PAGE_ANIMATE_OPTIONS = [
  { label: '滑动', value: 'fade-slide' },
  { label: '淡入淡出', value: 'fade' },
  { label: '底部消退', value: 'fade-bottom' },
  { label: '缩放消退', value: 'fade-scale' },
  { label: '渐变', value: 'zoom-fade' },
  { label: '闪现', value: 'zoom-out' },
  { label: '无', value: 'none' },
]

export const ThemeDrawer = defineComponent({
  name: 'ThemeDrawer',
  props: {
    show: { type: Boolean, required: true },
  },
  emits: ['update:show'],
  setup() {
    function handleReset() {
      resetConsoleTheme()
      message.success('已恢复官方默认主题配置')
    }

    /** Task 104: 亮暗切换同样走 View Transitions 圆形揭示 — 记录点击点为圆心 */
    let modeClick = { x: 0, y: 0 }
    function onModeClick(e: MouseEvent) {
      modeClick = { x: e.clientX, y: e.clientY }
    }
    function onModeUpdate(v: 'light' | 'dark' | 'system') {
      setThemeModeWithReveal(v, modeClick.x, modeClick.y)
    }

    return {
      isDark, themeMode, primaryColor, themeRadius, siderInverted, semanticColors,
      grayscale, colourWeakness, tabVisible, breadcrumbVisible, footerVisible, pageAnimate,
      pageAnimateMode, PAGE_ANIMATE_OPTIONS,
      tabCache, tabMode, tabHeight, tabMiddleClose, TAB_MODE_OPTIONS,
      setPrimary, setThemeRadius, setSiderInverted, setSemanticColor,
      setAuxMode, setDisplayPref, setPageAnimateMode, setTabPref, handleReset, SWATCHES,
      onModeClick, onModeUpdate,
    }
  },
  components: { NDrawer, NDrawerContent, NColorPicker, NSwitch, NButton, NRadioGroup, NRadioButton, NSlider, NSelect, NInputNumber },
  template: `
  <n-drawer :show="show" :width="300" @update:show="(v) => $emit('update:show', v)">
    <n-drawer-content title="主题配置" closable>
      <div class="flex flex-col gap-6">
        <!-- 主题色 (官方 appearance/theme-color) -->
        <div>
          <div class="mb-2 text-sm font-medium">主题色</div>
          <n-color-picker
            :value="primaryColor"
            :show-alpha="false"
            :swatches="SWATCHES"
            size="small"
            @update:value="(v) => setPrimary(v)"
          />
        </div>

        <!-- 其他主题色 (官方 otherColor; info 跟随主色与仓库一致) -->
        <div>
          <div class="mb-2 text-sm font-medium">其他主题色</div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-3">
              <span class="w-12 shrink-0 text-xs text-muted-foreground">成功</span>
              <n-color-picker class="flex-1" :value="semanticColors.success" :show-alpha="false" size="small" @update:value="(v) => setSemanticColor('success', v)" />
            </div>
            <div class="flex items-center gap-3">
              <span class="w-12 shrink-0 text-xs text-muted-foreground">警告</span>
              <n-color-picker class="flex-1" :value="semanticColors.warning" :show-alpha="false" size="small" @update:value="(v) => setSemanticColor('warning', v)" />
            </div>
            <div class="flex items-center gap-3">
              <span class="w-12 shrink-0 text-xs text-muted-foreground">错误</span>
              <n-color-picker class="flex-1" :value="semanticColors.error" :show-alpha="false" size="small" @update:value="(v) => setSemanticColor('error', v)" />
            </div>
          </div>
        </div>

        <!-- 暗黑模式 (官方 themeScheme: light/dark/auto) -->
        <div>
          <div class="mb-2 text-sm font-medium">暗黑模式</div>
          <n-radio-group :value="themeMode" size="small" @click="onModeClick" @update:value="onModeUpdate">
            <n-radio-button value="light">亮色</n-radio-button>
            <n-radio-button value="dark">暗色</n-radio-button>
            <n-radio-button value="system">跟随系统</n-radio-button>
          </n-radio-group>
        </div>

        <!-- 辅助模式 (官方 toggleAuxiliaryColorModes) -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">灰色模式</div>
            <n-switch :value="grayscale" size="small" @update:value="(v) => setAuxMode('grayscale', v)" />
          </div>
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">色弱模式</div>
            <n-switch :value="colourWeakness" size="small" @update:value="(v) => setAuxMode('colourWeakness', v)" />
          </div>
        </div>

        <!-- 页签 (官方 layout 模块 tab-settings 五项) -->
        <div class="flex flex-col gap-3">
          <div class="text-sm font-medium">页签</div>
          <div class="flex items-center justify-between">
            <span class="text-sm">显示页签</span>
            <n-switch :value="tabVisible" size="small" @update:value="(v) => setDisplayPref('tabVisible', v)" />
          </div>
          <template v-if="tabVisible">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm">页签缓存</div>
                <div class="mt-0.5 text-[11px] text-muted-foreground">刷新后保留已打开的页签</div>
              </div>
              <n-switch :value="tabCache" size="small" @update:value="(v) => setTabPref('tabCache', v)" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">页签高度</span>
              <n-input-number
                :value="tabHeight"
                size="small"
                :step="1"
                :min="28"
                :max="72"
                class="w-30"
                @update:value="(v) => setTabPref('tabHeight', v ?? 44)"
              />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">页签风格</span>
              <n-select
                :value="tabMode"
                :options="TAB_MODE_OPTIONS"
                size="small"
                class="w-30"
                @update:value="(v) => setTabPref('tabMode', v)"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm">中键关闭页签</div>
                <div class="mt-0.5 text-[11px] text-muted-foreground">鼠标中键点击页签将其关闭</div>
              </div>
              <n-switch :value="tabMiddleClose" size="small" @update:value="(v) => setTabPref('tabMiddleClose', v)" />
            </div>
          </template>
        </div>

        <!-- 界面显示 (官方 layout 模块可生效项) -->
        <div class="flex flex-col gap-3">
          <div class="text-sm font-medium">界面显示</div>
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <span class="text-xs text-muted-foreground">组件圆角 (themeRadius)</span>
              <span class="text-xs tabular-nums text-muted-foreground">{{ themeRadius }} px</span>
            </div>
            <n-slider :value="themeRadius" :min="0" :max="24" :step="1" @update:value="(v) => setThemeRadius(v)" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">显示面包屑</span>
            <n-switch :value="breadcrumbVisible" size="small" @update:value="(v) => setDisplayPref('breadcrumbVisible', v)" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">显示页脚</span>
            <n-switch :value="footerVisible" size="small" @update:value="(v) => setDisplayPref('footerVisible', v)" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">页面切换动画</span>
            <n-switch :value="pageAnimate" size="small" @update:value="(v) => setDisplayPref('pageAnimate', v)" />
          </div>
          <!-- 官方 content-settings: 动画开启时才显示类型选择 -->
          <div v-if="pageAnimate" class="flex items-center justify-between">
            <span class="text-sm">切换动画类型</span>
            <n-select
              :value="pageAnimateMode"
              :options="PAGE_ANIMATE_OPTIONS"
              size="small"
              class="w-30"
              @update:value="(v) => setPageAnimateMode(v)"
            />
          </div>
        </div>

        <!-- 侧边栏 (官方 sider.inverted) -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">侧边栏反转</div>
            <div class="mt-0.5 text-[11px] text-muted-foreground">深色侧边栏 (亮色模式生效)</div>
          </div>
          <n-switch :value="siderInverted" size="small" @update:value="(v) => setSiderInverted(v)" />
        </div>

        <n-button secondary @click="handleReset">恢复官方默认主题</n-button>
      </div>
    </n-drawer-content>
  </n-drawer>
  `,
})
