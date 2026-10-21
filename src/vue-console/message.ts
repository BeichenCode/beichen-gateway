/**
 * 全局消息 / 确认框 — naive-ui createDiscreteApi (原生 Toast 弹窗与 Dialog, 主题随全局配置响应)
 */
import './flags'
import { createDiscreteApi } from 'naive-ui'
import { discreteConfigProps } from './theme'

export const { message, dialog } = createDiscreteApi(['message', 'dialog'], {
  configProviderProps: discreteConfigProps as never,
})

/** 命令式确认框 (对齐既有 confirmDialog 调用面) */
export function confirmDialog(opts: {
  title: string
  content?: string
  type?: 'warning' | 'error' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
}): Promise<boolean> {
  return new Promise((resolve) => {
    const t = opts.type ?? 'warning'
    dialog[t]({
      title: opts.title,
      content: opts.content ?? '',
      positiveText: opts.confirmText ?? '确认',
      negativeText: opts.cancelText ?? '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
      onMaskClick: () => resolve(false),
    })
  })
}

/** 删除场景快捷封装 */
export function confirmDelete(title: string, content?: string): Promise<boolean> {
  return confirmDialog({ title, content, type: 'error', confirmText: '删除' })
}
