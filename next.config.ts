import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* 关闭 dev 调试徽标 (左下角黑色圆点, 会压住登录页公告等内容) */
  devIndicators: false,
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  /* 后台控制台 = Vue3 + Naive UI (Soybean Admin NaiveUI 版架构):
   * 'vue' 别名指向含运行时模板编译器的 esm-bundler 构建 (页面组件使用 template 选项) */
  turbopack: {
    resolveAlias: {
      vue: "vue/dist/vue.esm-bundler.js",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      vue$: "vue/dist/vue.esm-bundler.js",
    };
    return config;
  },
  /* Task 82 性能与加固: */
  compress: true, // gzip 压缩响应 (文本类资源传输体积 ↓70%+)
  poweredByHeader: false, // 不外泄 X-Powered-By: Next.js 指纹
  productionBrowserSourceMaps: false, // 浏览器端不发布 sourcemap (不暴露源码结构)
  images: {
    formats: ["image/avif", "image/webp"], // 现代格式优先, 减小图片传输
  },
  async rewrites() {
    // OpenAI/Claude 兼容路径: /v1/* -> /api/v1/*
    // Task 128: /v1 根路径显式映射 → 网关信息 JSON (用户把网关地址贴进浏览器校验时不再看到 Next 404 页)
    return [
      { source: '/v1', destination: '/api/v1' },
      { source: '/v1/:path*', destination: '/api/v1/:path*' },
    ];
  },
  async headers() {
    // 安全响应头 (Task 80 渗透加固):
    //  - nosniff: 防 MIME 嗅探
    //  - Referrer-Policy: 防控制台路径经 Referer 泄漏到三方
    //  - 不加 X-Frame-Options/CSP frame-ancestors: 预览代理需跨域 iframe 嵌入本站
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
      {
        // Task 113: HTML 文档禁缓存 — CF 给无 CC 头的 HTML 默认套 max-age=14400 (4h 浏览器缓存),
        // 部署后 chunk hash 全换, 用户手里的旧 HTML 引用旧 hash chunk → 404 →
        // 控制台 import reject 动画永不撤 / 登录页半样式「全乱」; 显式 no-store 根除
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
      {
        // 后应用覆盖前规则: 含 hash 指纹的静态资源保持长缓存 (CF/浏览器命中零回源)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icon/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        // Task 113: 页面 HTML 附加 Set-Cookie — CF 核心缓存规则「带 Set-Cookie 的响应不进边缘缓存」,
        // 实测 zone 的 Browser/Edge TTL Override 会把 origin no-store 强改为 max-age=14400 且边缘
        // 缓存 HTML (cf-cache-status HIT), 部署后 4h 内访客拿旧 HTML 引用死 chunk (登录页乱/控制台
        // 动画无限挂); Set-Cookie 强制边缘回源, 浏览器复用率也大降。同值重复下发无副作用。
        source: '/',
        headers: [{ key: 'Set-Cookie', value: 'bz_page=1; Path=/; Max-Age=3600; SameSite=Lax' }],
      },
      {
        source: '/console/:path*',
        headers: [{ key: 'Set-Cookie', value: 'bz_page=1; Path=/; Max-Age=3600; SameSite=Lax' }],
      },
      {
        source: '/login/:path*',
        headers: [{ key: 'Set-Cookie', value: 'bz_page=1; Path=/; Max-Age=3600; SameSite=Lax' }],
      },
      {
        source: '/register/:path*',
        headers: [{ key: 'Set-Cookie', value: 'bz_page=1; Path=/; Max-Age=3600; SameSite=Lax' }],
      },
      {
        source: '/tab-lab/:path*',
        headers: [{ key: 'Set-Cookie', value: 'bz_page=1; Path=/; Max-Age=3600; SameSite=Lax' }],
      },
    ];
  },
};

export default nextConfig;
