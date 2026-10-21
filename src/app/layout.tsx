import type { Metadata, Viewport } from 'next'
import './globals.css'
/* Arco Design (Task 47): 在 Tailwind 之后加载, 组件样式可覆盖 preflight */
import '@arco-design/web-react/dist/css/arco.css'
import { themeBootstrapScript } from '@/lib/theme-palette'
import HydrationMarker from '@/components/hydration-marker'

/**
 * Task 65: CTA 点击反馈兜底 — 解析期即执行 (早于任何 React 水合) 的内联脚本。
 * 问题: 开屏经 CSS 兜底 ~1s 让位后, 远程弱网下 React 水合可能尚未完成,
 * 此窗口内点击 CTA 走原生 <a> 跳转, onClick/spinner 均未挂载, 用户感知「没有动画」。
 * 机制: document 捕获阶段统一接住 [data-launch] 点击 —
 *   · 无论水合与否: 立即加 .cta-launching (按压缩放 + 品牌白帷幕淡入, 纯 CSS)
 *   · 已水合 (window.__hydrated, HydrationMarker 置位): 不拦截, React 反馈链接管
 *   · 未水合: preventDefault + 450ms 兜底动画后原生跳转, 保证「必有动画」
 * 附: bfcache 恢复 (pageshow persisted) 时清理残留动画态, 防止帷幕/按压冻结在旧快照上
 */
const ctaFallbackScript = `(function(){
  if (window.__ctaInit) return
  window.__ctaInit = 1
  document.addEventListener('click', function(e){
    var t = e.target
    var a = t && t.closest ? t.closest('[data-launch]') : null
    if (!a) return
    if (window.__ctaLock) {
      if (a.classList.contains('cta-launching')) e.preventDefault()
      return
    }
    window.__ctaLock = true
    setTimeout(function(){ window.__ctaLock = false }, 1200)
    a.classList.add('cta-launching')
    if (!window.__hydrated) {
      e.preventDefault()
      var href = a.getAttribute('href') || '/'
      setTimeout(function(){ window.location.assign(href) }, 450)
    }
  }, true)
  window.addEventListener('pageshow', function(ev){
    if (ev.persisted) {
      window.__ctaLock = false
      var els = document.querySelectorAll('.cta-launching')
      for (var i = 0; i < els.length; i++) els[i].classList.remove('cta-launching')
    }
  })
})()`

/**
 * Task 113: chunk 死链自愈 — 内联捕获期全局监听资源加载失败。
 * 背景: CF zone 层强缓存页面 HTML (实测剥 Set-Cookie + 重写 TTL=4h, origin no-store 无法穿透),
 * 每次部署后 chunk hash 全换, 用户手里的旧 HTML 引用已替换的 /_next/static 文件 → 404:
 *   登录页/官网 = 半样式裸页 (用户报「退出后页面全乱」), 控制台 = 动画无限挂 (已另有自愈)。
 * 机制: SCRIPT/LINK 资源 error → 首次自动带 cb 强刷 (query 变化绕开边缘缓存拿新 HTML);
 * 带 cb 的页面刷新后仍坏则不再自动刷 (sessionStorage 防循环, 用户可手动强刷)。
 */
const chunkGuardScript = `(function(){
  try {
    var KEY = '__bz_chunk_reload'
    if (window.location.search.indexOf('cb=') !== -1) {
      try { sessionStorage.removeItem(KEY) } catch (e) {}
    }
    window.addEventListener('error', function(e){
      var t = e && e.target
      if (!t || !t.tagName) return
      var tag = t.tagName
      if (tag !== 'SCRIPT' && tag !== 'LINK') return
      var src = t.src || t.href || ''
      if (src.indexOf('/_next/static') === -1) return
      try {
        if (sessionStorage.getItem(KEY)) return
        sessionStorage.setItem(KEY, String(Date.now()))
      } catch (e2) {}
      var u = new URL(window.location.href)
      u.searchParams.set('cb', String(Date.now()))
      window.location.replace(u.toString())
    }, true)
  } catch (err) {}
})()`

export const metadata: Metadata = {
  title: {
    default: '北辰中转站 — 大模型统一网关 · 官网',
    template: '%s · 北辰中转站',
  },
  description:
    '高性能大模型网关与资产管理系统：统一 OpenAI/Claude/Gemini 协议接入、多渠道智能路由与负载均衡、令牌分发、精细计费与实时数据看板。',
  keywords: ['AI 网关', '大模型中转', 'OpenAI 兼容', 'Claude', 'Gemini', 'API 管理'],
}

/** 手机浏览器标题栏底色跟随站点 (亮白/暗黑) */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#101014' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 主题覆盖预注入 (SoybeanAdmin theme store 持久化): 首屏绘制前生效, 避免主题色/圆角闪烁 */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />
        {/* Task 113: chunk 死链自愈 — 捕获期注册, 先于任何资源加载完成 */}
        <script dangerouslySetInnerHTML={{ __html: chunkGuardScript }} />
      </head>
      <body className="antialiased">
        {/* Task 65: CTA 水合空窗兜底 — 内联脚本解析期即注册, 水合标记在 React 就绪后置位 */}
        <script dangerouslySetInnerHTML={{ __html: ctaFallbackScript }} />
        <HydrationMarker />
        {children}
      </body>
    </html>
  )
}
