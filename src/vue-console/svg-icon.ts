/**
 * SvgIcon — 官方 src/components/custom/svg-icon.vue 等价移植 + 离线 Iconify 注册
 *   官方渲染链: SvgIcon → @iconify/vue <Icon> (iconify 名) — fontSize 经 style 落地 (1em 语义)
 *   官方注册链: hooks/common/icon.ts useSvgIconRender(SvgIcon).SvgIconVNode
 *   本模块: SOY_ICON_COLLECTIONS 逐字 addCollection 离线注册 (零运行时网络请求),
 *           图标名与官方模板逐字一致 (material-symbols:xxx / ant-design:xxx / mdi:xxx …)
 */
import './flags'
import { addCollection, Icon } from '@iconify/vue'
import { defineComponent, h, type Component, type CSSProperties } from 'vue'
import { SOY_ICON_COLLECTIONS } from './soy-icons-data'

for (const collection of SOY_ICON_COLLECTIONS) {
  addCollection(collection as never)
}

export const SvgIcon = defineComponent({
  name: 'SvgIcon',
  props: {
    /** Iconify 图标名 (官方离线集合内) */
    icon: { type: String, required: true },
    /** 官方语义: style.fontSize = `${fontSize}px` (缺省 1em 随容器字号) */
    fontSize: { type: Number, default: undefined },
    color: { type: String, default: undefined },
  },
  setup(props) {
    return () =>
      h(Icon, {
        icon: props.icon,
        style: {
          fontSize: props.fontSize ? `${props.fontSize}px` : undefined,
          color: props.color,
        } as CSSProperties,
      })
  },
})

/** 官方 packages/hooks/src/use-svg-icon-render.ts 等价 */
export interface SvgIconConfig {
  icon?: string
  color?: string
  fontSize?: number
}

export function SvgIconVNode(config: SvgIconConfig): (() => ReturnType<typeof h>) | undefined {
  const { color, fontSize, icon } = config
  const style: CSSProperties = {}
  if (color) style.color = color
  if (fontSize) style.fontSize = `${fontSize}px`
  if (!icon) return undefined
  return () => h(SvgIcon as Component, { icon, style })
}
