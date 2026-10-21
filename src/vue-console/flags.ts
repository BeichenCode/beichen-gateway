/**
 * Vue esm-bundler 特征旗标 — 必须先于 vue 模块求值
 * (esm-bundler 构建以裸全局引用读取这些旗标, 未定义会在运行时抛 ReferenceError)
 */
const g = globalThis as unknown as Record<string, unknown>
if (typeof g.__VUE_OPTIONS_API__ === 'undefined') g.__VUE_OPTIONS_API__ = true
if (typeof g.__VUE_PROD_DEVTOOLS__ === 'undefined') g.__VUE_PROD_DEVTOOLS__ = false
if (typeof g.__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ === 'undefined') g.__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ = false

export {}
