/**
 * 页面共享件: renderQuota / PageHeader / FormRow / 状态标签映射
 * 视觉全部交给 naive-ui 原生 (n-card / n-form-item / n-tag / n-empty / n-spin), 此处只承载结构与文案
 */
import './flags'
import { quotaToCNY } from '@/lib/quota-display'
import { defineComponent, type Ref } from 'vue'

/* Task 123: 大数字滚动补间 (rAF easeOutQuart) — 轮询/切页拉到新值时数字平滑
   滚动到新值而非瞬间跳变, 「实时更新」肉眼可见 (看板统计卡 + 钱包余额共用) */
const _twHandles = new Map<object, number>()

export function tweenNum(r: Ref<number>, target: number, dur = 750): void {
  if (!Number.isFinite(target)) return
  const from = r.value
  if (Math.abs(target - from) < 1e-9) return
  const prev = _twHandles.get(r)
  if (prev !== undefined) cancelAnimationFrame(prev)
  const t0 = performance.now()
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur)
    const e = 1 - Math.pow(1 - p, 4) // easeOutQuart: 快起步缓收尾, 利落不拖泥
    r.value = from + (target - from) * e
    if (p < 1) _twHandles.set(r, requestAnimationFrame(step))
    else _twHandles.delete(r)
  }
  _twHandles.set(r, requestAnimationFrame(step))
}

/** 金额/quota 展示 (Task 77: 用户侧全面人民币计价; Task 127: 精度自适应 —
 *  展示值按 4 位小数四舍五入 (quota 整数换算的微厘误差 0.999998 → ¥1.00, 1.000102 → ¥1.0001,
 *  与用户 4 位小数的「额度」心智一致), 极微值 (<¥0.0001) 仍走 6 位兜底不显示成零) */
export function renderQuota(quota: number, quotaPerUnit: number, displayInCurrency: boolean): string {
  if (displayInCurrency) {
    const cny = quotaToCNY(quota, quotaPerUnit)
    if (cny === 0) return '¥0.00'
    const r4 = Math.round(cny * 1e4) / 1e4
    if (r4 === 0) {
      // 极微值: 4 位小数下不可见, 保留 6 位兜底 (如 1 内部 quota ≈ ¥0.0000146)
      return `¥${cny.toFixed(6)}`
    }
    let dec = cny < 1 ? 3 : 2
    while (dec < 4 && Math.abs(parseFloat(r4.toFixed(dec)) - r4) > 1e-9) dec++
    return `¥${r4.toFixed(dec)}`
  }
  return quota.toLocaleString()
}

/**
 * 大数字简化 (Task 103: 「显示得简单一点，写多少万多少万即可」)
 * >= 1亿 → x.x亿; >= 1万 → x.x万 (去尾零); 其余原样。
 * 用于 Token/请求量等统计大数; 单笔小数值保留原样不损失精度。
 */
export function fmtWan(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1e8) return `${parseFloat((n / 1e8).toFixed(1))} 亿`
  if (Math.abs(n) >= 1e4) return `${parseFloat((n / 1e4).toFixed(1))} 万`
  return Math.round(n).toLocaleString()
}

/** 页面标题行 */
export const PageHeader = defineComponent({
  name: 'PageHeader',
  props: { title: { type: String, required: true }, description: { type: String, default: '' } },
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold text-foreground">{{ title }}</h1>
        <p v-if="description" class="mt-0.5 text-xs text-muted-foreground">{{ description }}</p>
      </div>
      <div class="flex items-center gap-2"><slot name="extra" /></div>
    </div>`,
})

/** 表单行 (naive n-form-item 原生 label + required 星标) */
export const FormRow = defineComponent({
  name: 'FormRow',
  props: {
    label: { type: String, required: true },
    hint: { type: String, default: '' },
    required: { type: Boolean, default: false },
  },
  template: `
    <n-form-item :show-feedback="false" :show-label="false">
      <div class="w-full">
        <div class="mb-1.5 text-sm font-medium text-foreground">
          <span v-if="required" class="mr-0.5 text-[#f5222d]">*</span>{{ label }}
        </div>
        <slot />
        <div v-if="hint" class="mt-1 text-[11px] leading-relaxed text-muted-foreground">{{ hint }}</div>
      </div>
    </n-form-item>`,
})

