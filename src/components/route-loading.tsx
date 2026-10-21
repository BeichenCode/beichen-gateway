/**
 * 路由级加载骨架 (Task 60) — 用户反馈「点击跳转后按钮 loading 陪跑全程, 动画时间太长」
 * ─────────────────────────────────────────────────────────────
 * 根因: 全站此前没有 loading.tsx, App Router 导航要等目标页 chunk 下载执行完才切换,
 * 旧页按钮的 spinner 一直转。补上路由骨架后, 点击瞬间即切白屏竖条页 (与 BootSplash
 * 「竖条依次跳动点亮」同一视觉语言, 用户 Task 44/52 钦定的全站加载规范), 感知等待趋近于零。
 * 纯静态标记 (无 hooks), 服务端组件即可渲染; .loading-bar 样式定义于 globals.css。
 */
export default function RouteLoading() {
  return (
    <div
      role="status"
      aria-label="页面加载中"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-white"
    >
      <div className="loading-bar" aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
