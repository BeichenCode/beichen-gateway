/**
 * EmptyState — 全站空状态精美图标 (Task 184-b)
 *
 * 用户反馈 Naive UI 默认灰色空态图标丑 → 全站 5 处 n-empty 统一换装本组件:
 *   variant 语义 → 使用处
 *   - ticket  工单/收件箱 (来信落入托盘)  → 工单中心「暂无工单」
 *   - chart   消耗趋势 (折线+面积+端点)   → 数据看板「暂无消耗数据」
 *   - cube    模型 (等轴魔方三面)         → 模型广场「暂无匹配的模型」
 *   - coupon  礼品券 (票券缺口+百分比)    → 兑换中心「暂无兑换记录」
 *   - search  搜索 (放大镜+柔光晕)        → 全局搜索「无数据」
 *
 * 设计语言 (五图一套):
 *   - 96×96 画布细线稿, 主线 stroke 2 / 次线 1.5, 圆端点圆拐角;
 *   - 双色系: 主色 = 控制台主题色 (primaryColor ref, 默认 #646cff 系), 辅助柔和色 =
 *     主色两级 alpha (soft/wash) + 中性次级线稿 (ink) + 点缀 (dim);
 *   - 套装签名: 右上/左下两段虚线弧 + 左上四角星 + 右下柔点, 五图同款呼应;
 *   - 暗色适配: 全部颜色走 CSS 变量, 由 isDark/primaryColor 计算注入 svg 根,
 *     切主题/改主题色实时联动 (无需媒体查询, 与控制台主题通道同源)。
 *
 * 用法 (n-empty 的 #icon 插槽; 配套在 n-empty 上覆写 --n-icon-size 让容器随图放大):
 *   <n-empty description="暂无工单" style="--n-icon-size: 104px">
 *     <template #icon><EmptyState variant="ticket" :size="104" /></template>
 *   </n-empty>
 * 纯内联 SVG, 零外部图片/图标库依赖。
 */
import '../flags'
import { computed, defineComponent } from 'vue'
import type { PropType } from 'vue'
import { addColorAlpha } from '../theme/color'
import { isDark, primaryColor } from '../theme'

export type EmptyStateVariant = 'ticket' | 'chart' | 'cube' | 'coupon' | 'search'

export const EmptyState = defineComponent({
  name: 'EmptyState',
  props: {
    /** 图标语义 (五选一, 见文件头清单) */
    variant: { type: String as PropType<EmptyStateVariant>, default: 'ticket' },
    /** 渲染边长 px (n-empty 侧请同步覆写 --n-icon-size) */
    size: { type: Number, default: 96 },
  },
  setup(props) {
    /* 主题令牌 — 主色跟随控制台主题色; 柔和/次级色按亮暗分档 (alpha 暗色加深),
       computed 依赖 isDark/primaryColor ref, 明暗切换与主题色自定义均实时重绘 */
    const vars = computed(() => {
      const p = primaryColor.value || '#6467F2'
      const dark = isDark.value
      return {
        display: 'block',
        margin: '0 auto',
        '--es-primary': p,
        '--es-soft': addColorAlpha(p, dark ? 0.3 : 0.16),
        '--es-wash': addColorAlpha(p, dark ? 0.17 : 0.08),
        '--es-ink': dark ? 'rgba(228, 228, 228, 0.45)' : 'rgba(71, 85, 105, 0.52)',
        '--es-dim': dark ? 'rgba(228, 228, 228, 0.3)' : 'rgba(71, 85, 105, 0.34)',
      } as Record<string, string>
    })
    return { vars }
  },
  template: `
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      :style="vars"
    >
      <!-- 套装签名: 右上/左下两段虚线弧 (轨道感) -->
      <g stroke="var(--es-dim)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1.5 5.5" fill="none">
        <path d="M67 15A38 38 0 0 1 86 48" />
        <path d="M29 81A38 38 0 0 1 10 48" />
      </g>

      <!-- 工单/收件箱: 来信卡片落入托盘 -->
      <g v-if="variant === 'ticket'" stroke-linecap="round" stroke-linejoin="round">
        <path d="M25 14.5Q25 18 28.5 18Q25 18 25 21.5Q25 18 21.5 18Q25 18 25 14.5Z" fill="var(--es-primary)" />
        <circle cx="72" cy="30" r="2" fill="var(--es-dim)" />
        <circle cx="82" cy="62" r="2.5" fill="var(--es-soft)" />
        <g transform="rotate(-8 48 33)">
          <rect x="33" y="21" width="30" height="24" rx="5" fill="var(--es-wash)" stroke="var(--es-primary)" stroke-width="2" />
          <path d="M36.5 26.5L48 35.5L59.5 26.5" stroke="var(--es-primary)" stroke-width="2" fill="none" />
        </g>
        <path d="M37 49L34.5 52.5" stroke="var(--es-ink)" stroke-width="1.5" fill="none" />
        <path d="M59 49L61.5 52.5" stroke="var(--es-ink)" stroke-width="1.5" fill="none" />
        <path d="M20 54H36L42 64H54L60 54H76V70A6 6 0 0 1 70 76H26A6 6 0 0 1 20 70Z" fill="var(--es-wash)" stroke="var(--es-primary)" stroke-width="2" />
      </g>

      <!-- 消耗趋势: 柔底面板 + 折线面积 + 端点光晕 -->
      <g v-else-if="variant === 'chart'" stroke-linecap="round" stroke-linejoin="round">
        <path d="M25 14.5Q25 18 28.5 18Q25 18 25 21.5Q25 18 21.5 18Q25 18 25 14.5Z" fill="var(--es-primary)" />
        <circle cx="80" cy="46" r="2" fill="var(--es-dim)" />
        <circle cx="82" cy="62" r="2.5" fill="var(--es-soft)" />
        <rect x="26" y="24" width="48" height="52" rx="8" fill="var(--es-wash)" />
        <path d="M34 32V68H70" stroke="var(--es-ink)" stroke-width="1.5" fill="none" />
        <path d="M40 58L48 48L54 53L64 40V68H40Z" fill="var(--es-soft)" />
        <path d="M40 58L48 48L54 53L64 40" stroke="var(--es-primary)" stroke-width="2" fill="none" />
        <circle cx="64" cy="40" r="5.5" fill="var(--es-wash)" />
        <circle cx="64" cy="40" r="2.6" fill="var(--es-primary)" />
      </g>

      <!-- 模型: 等轴魔方 (顶面亮/左面柔/右面留白) -->
      <g v-else-if="variant === 'cube'" stroke-linecap="round" stroke-linejoin="round">
        <path d="M25 14.5Q25 18 28.5 18Q25 18 25 21.5Q25 18 21.5 18Q25 18 25 14.5Z" fill="var(--es-primary)" />
        <circle cx="36" cy="16" r="2" fill="var(--es-dim)" />
        <circle cx="82" cy="62" r="2.5" fill="var(--es-soft)" />
        <path d="M48 26L70 38L48 50L26 38Z" fill="var(--es-soft)" stroke="var(--es-primary)" stroke-width="2" />
        <path d="M26 38L48 50L48 70L26 58Z" fill="var(--es-wash)" stroke="var(--es-primary)" stroke-width="2" />
        <path d="M70 38L48 50L48 70L70 58Z" stroke="var(--es-primary)" stroke-width="2" fill="none" />
      </g>

      <!-- 礼品券: 缺口票券 + 虚线打孔线 + 百分比 -->
      <g v-else-if="variant === 'coupon'" stroke-linecap="round" stroke-linejoin="round">
        <path d="M25 14.5Q25 18 28.5 18Q25 18 25 21.5Q25 18 21.5 18Q25 18 25 14.5Z" fill="var(--es-primary)" />
        <circle cx="40" cy="22" r="2" fill="var(--es-dim)" />
        <circle cx="82" cy="62" r="2.5" fill="var(--es-soft)" />
        <path d="M28 32H68A6 6 0 0 1 74 38V44A4 4 0 0 0 74 52V58A6 6 0 0 1 68 64H28A6 6 0 0 1 22 58V52A4 4 0 0 1 22 44V38A6 6 0 0 1 28 32Z" fill="var(--es-wash)" stroke="var(--es-primary)" stroke-width="2" />
        <path d="M57 36V60" stroke="var(--es-ink)" stroke-width="1.5" stroke-dasharray="3 4" fill="none" />
        <circle cx="34.5" cy="43.5" r="3" stroke="var(--es-primary)" stroke-width="2" fill="none" />
        <circle cx="43.5" cy="52.5" r="3" stroke="var(--es-primary)" stroke-width="2" fill="none" />
        <path d="M45 40L33 56" stroke="var(--es-primary)" stroke-width="2" fill="none" />
      </g>

      <!-- 搜索: 柔光晕 + 放大镜 + 内壁高光 -->
      <g v-else-if="variant === 'search'" stroke-linecap="round" stroke-linejoin="round">
        <path d="M25 14.5Q25 18 28.5 18Q25 18 25 21.5Q25 18 21.5 18Q25 18 25 14.5Z" fill="var(--es-primary)" />
        <circle cx="68" cy="26" r="2" fill="var(--es-dim)" />
        <circle cx="82" cy="62" r="2.5" fill="var(--es-soft)" />
        <circle cx="42" cy="44" r="25" fill="var(--es-wash)" />
        <circle cx="42" cy="42" r="17" stroke="var(--es-primary)" stroke-width="2" fill="none" />
        <path d="M31.5 38A11.5 11.5 0 0 1 38 31.5" stroke="var(--es-ink)" stroke-width="1.5" fill="none" />
        <path d="M54.5 54.5L68 68" stroke="var(--es-primary)" stroke-width="2" fill="none" />
      </g>
    </svg>`,
})
