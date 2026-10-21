/**
 * NProgress 顶部加载进度条 — 官方完整移植
 *   蓝本:
 *   - src/plugins/nprogress.ts   → setupNProgress: NProgress.configure({ easing: 'ease', speed: 500 })
 *   - src/router/guard/progress.ts → createProgressGuard: beforeEach start / afterEach done
 *   - src/styles/css/nprogress.css → styles/nprogress.css (颜色 rgb(var(--nprogress-color)))
 * 触发语义与官方一致: 导航开始 (hashchange) start, 导航确认 (路由 ref 更新+内容切换) done。
 */
import './flags'
import { watch } from 'vue'
import NProgress from 'nprogress'
import './styles/nprogress.css'
import { currentPath } from './router'

/** Task 111: speed 500→200 — 用户反馈后台加载动画太长, 进度条收尾提速 (easing ease 保持) */
export function setupNProgress() {
  NProgress.configure({ easing: 'ease', speed: 200 })
}

let started = false

/** 官方 createProgressGuard beforeEach — 导航开始 */
export function progressStart() {
  started = true
  NProgress.start()
}

/** 官方 createProgressGuard afterEach — 导航确认后结束 (内容已切换) */
export function progressDone() {
  if (!started) return
  started = false
  NProgress.done()
}

/**
 * 官方守卫的等价安装: hashchange (导航开始) → start;
 * currentPath post-flush (导航确认+内容已渲染) → done。首次进入同样走一遍 (官方首次路由同)。
 */
export function setupProgressGuard() {
  setupNProgress()
  if (typeof window === 'undefined') return
  window.addEventListener('hashchange', () => {
    progressStart()
  })
  watch(
    currentPath,
    () => {
      // post 语义: 内容区重挂载已在同一 tick 完成排队, 再让出一帧确保 DOM 切换后结束进度条
      requestAnimationFrame(() => progressDone())
    },
    { flush: 'post' },
  )
}
