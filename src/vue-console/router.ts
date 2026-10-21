/**
 * Hash 路由 (#/dashboard 等, 与全站既有 hash 路由同构)
 *
 * vue-router isReady 语义 (Task 99 白屏卡死根因修复):
 *   异步页面组件在「导航确认前」预解析 (resolvePage await loader),
 *   currentPath 只在组件就绪后更新 → GlobalContent 的 <Transition mode="out-in">
 *   进入的永远是同步组件, 不再出现冷 chunk 加载完成后内部根元素替换、
 *   fade-slide-enter-from (opacity 0) 永不移除的白屏。
 *   竞态防护: 连续导航以 seq 令牌裁决, 只有最后一次导航有权落地。
 */
import './flags'
import { ref, shallowRef } from 'vue'
import type { Component } from 'vue'
import { getHashPath } from '@/lib/router'
import { resolvePage, PAGE_MAP } from './routes'

/** 当前路由路径 (仅在页面组件解析完成后更新) */
export const currentPath = ref(typeof window !== 'undefined' ? getHashPath() : '/dashboard')

/** 当前路由页面组件 (同步引用, 与 currentPath 同步更新; null = 初始解析中) */
export const currentPage = shallowRef<Component | null>(null)

/** 落地一次导航: 解析目标页组件 → 同步写入 path + page; 未知路径回退看板 */
async function land(path: string, seq: number) {
  const comp = (await resolvePage(path)) ?? (await resolvePage('/dashboard'))
  if (seq !== navSeq) return // 已被更新的导航超越, 放弃落地
  currentPage.value = comp ?? PAGE_MAP['/dashboard']
  currentPath.value = comp ? path : '/dashboard'
}

let navSeq = 0

/** 初始路由就绪 (vue-router isReady 等价): 首个 land() 完成后 resolve */
let readyPromise: Promise<void> | null = null
export function whenRouteReady(): Promise<void> {
  readyPromise ??= new Promise((resolve) => {
    if (currentPage.value) return resolve()
    const timer = setInterval(() => {
      if (currentPage.value) {
        clearInterval(timer)
        resolve()
      }
    }, 16)
  })
  return readyPromise
}

/** 程序内导航 (与 window.location.hash 赋值同义, hashchange 驱动落地) */
export function navigate(path: string) {
  window.location.hash = '#' + path
}

/** 初始解析 + hashchange 落地 (typeof window 守卫: SSR/构建期零副作用) */
if (typeof window !== 'undefined') {
  void land(getHashPath(), ++navSeq)
  window.addEventListener('hashchange', () => {
    void land(getHashPath(), ++navSeq)
  })
}
