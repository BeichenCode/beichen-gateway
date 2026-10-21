/**
 * ButtonIcon — 官方 src/components/custom/button-icon.vue 逐字段等价移植
 *   NTooltip (placement bottom / zIndex 98 / 无内容 disabled)
 *   + NButton quaternary (h-36px, 内容 flex-center gap-8px)
 *   官方 GlobalHeader / ReloadButton / FullScreen / ThemeSchemaSwitch / UserAvatar /
 *   ThemeButton 全部经由该组件承载 — 后台头部与页签栏图标钮统一换装此件
 */
import '../../flags'
import { defineComponent, h } from 'vue'
import { NButton, NTooltip } from 'naive-ui'

export const ButtonIcon = defineComponent({
  name: 'ButtonIcon',
  props: {
    /** tooltip 内容 (空串禁用 tooltip, 官方 :disabled="!tooltipContent") */
    tooltipContent: { type: String, default: '' },
    tooltipPlacement: { type: String, default: 'bottom' },
    /** Task 106: 补齐官方 18px 图标 token (font-size 落在 NButton, svg-icon 默认继承) */
    height: { type: Number, default: 36 },
    iconSize: { type: Number, default: 18 },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        NTooltip,
        {
          placement: props.tooltipPlacement as never,
          zIndex: 98,
          disabled: !props.tooltipContent,
        },
        {
          trigger: () =>
            h(
              NButton,
              {
                quaternary: true,
                class: 'sb-button-icon',
                style: `height: ${props.height}px; font-size: ${props.iconSize}px`,
                onClick: (e: MouseEvent) => emit('click', e),
              },
              {
                default: () => [
                  h('div', { class: 'flex items-center justify-center gap-2' }, slots.default?.()),
                ],
              },
            ),
          default: () => props.tooltipContent,
        },
      )
  },
})
