'use client'

/**
 * 官网共享视觉件 — 精简版 (Task 40)
 * 只保留: Stats 类型 / fmtNum / ConsoleShot(控制台大截图)
 * 官网本体见 enterprise.tsx — AI 大厂 DNA 单页设计 (DeepSeek/Z.ai/BigModel/Moonshot 调研)
 * 去 AI 味纪律: 零渐变字 / 零极光 / 零光晕 / 零 Bento / 零漂浮动画
 */
import {
  BarChart3,
  Cable,
  Gift,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Search,
  Settings,
  Users,
} from '@/components/ph'

export interface Stats {
  models: number
  channels: number
  requests: number
  users: number
  tokens: number
  modelNames: string[]
}

export function fmtNum(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)} 亿`
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)} 万`
  return Math.round(n).toLocaleString()
}

const KPIS = [
  { label: '今日请求', value: '128,409', delta: '+12.4%', good: true },
  { label: '今日 Tokens', value: '4.2 亿', delta: '+8.2%', good: true },
  { label: '今日消费', value: '¥1,284.02', delta: '-3.1%', good: null },
  { label: '活跃令牌', value: '3,207', delta: '+86', good: true },
]

const TOP_MODELS = [
  { name: 'gpt-5', reqs: '48.2K', pct: 72 },
  { name: 'claude-sonnet-4-5', reqs: '31.6K', pct: 54 },
  { name: 'gemini-2.5-pro', reqs: '22.1K', pct: 38 },
  { name: 'deepseek-v3.2', reqs: '14.8K', pct: 24 },
]

const LOG_ROWS = [
  { time: '14:32:08', model: 'gpt-5', token: 'sk-prod-7f2…9d', tok: '1,284', ms: '412ms', ok: true, st: '正常' },
  { time: '14:32:05', model: 'claude-sonnet-4-5', token: 'sk-prod-7f2…9d', tok: '9,412', ms: '388ms', ok: true, st: '正常' },
  { time: '14:31:58', model: 'gemini-2.5-pro', token: 'sk-test-2b8…41', tok: '3,204', ms: '455ms', ok: true, st: '正常' },
  { time: '14:31:52', model: 'deepseek-v3.2', token: 'sk-prod-7f2…9d', tok: '8,110', ms: '620ms', ok: false, st: '重试' },
  { time: '14:31:44', model: 'qwen3-max', token: 'sk-etl-9c4…77', tok: '2,051', ms: '401ms', ok: true, st: '正常' },
]

const SIDE_NAV = [
  { icon: LayoutDashboard, label: '数据看板', active: true },
  { icon: Cable, label: '渠道', badge: '18' },
  { icon: KeyRound, label: '令牌', badge: '4' },
  { icon: ScrollText, label: '调用日志' },
  { icon: Gift, label: '兑换码' },
  { icon: Users, label: '用户' },
  { icon: BarChart3, label: '模型价格' },
  { icon: Settings, label: '系统设置' },
]

/* ================= 控制台大截图: 浏览器 chrome + 侧边栏 + 工作区 ================= */

export function ConsoleShot() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-[0_1px_2px_rgba(9,9,11,0.05),0_40px_90px_-40px_rgba(9,9,11,0.25)]">
      {/* 浏览器 chrome */}
      <div className="flex h-11 items-center gap-4 border-b border-zinc-200 bg-zinc-50/70 px-4">
        <span className="flex shrink-0 gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#f6a9a5]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f5d38f]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#9fd8a4]" />
        </span>
        <span className="mx-auto flex h-7 w-full max-w-sm items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white font-code text-[11px] text-zinc-400">
          console.example.com/console
        </span>
        <span className="hidden w-14 shrink-0 justify-end font-code text-[10.5px] text-zinc-300 sm:flex">HTTPS</span>
      </div>

      <div className="flex">
        {/* ===== 侧边栏 ===== */}
        <aside className="hidden w-[178px] shrink-0 flex-col border-r border-zinc-100 bg-zinc-50/50 sm:flex">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-zinc-950">
              <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
                <circle cx="3.6" cy="12.4" r="1.6" fill="#fff" />
                <path d="M3.6 10.8V8.2C3.6 6.4 5 5.4 6.8 5.4h4.1M8.9 3.5l2 1.9-2 1.9" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[12.5px] font-semibold tracking-tight text-zinc-950">New API</span>
            <span className="ml-auto font-code text-[9.5px] text-zinc-300">v2.18</span>
          </div>
          <div className="px-3 pt-3">
            <span className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[10.5px] text-zinc-400">
              <Search size={11} /> 搜索…
            </span>
          </div>
          <nav className="flex-1 space-y-0.5 px-3 py-3">
            {SIDE_NAV.map((n) => (
              <span
                key={n.label}
                className={`flex items-center gap-2 rounded-md px-2 py-[5.5px] text-[11.5px] ${
                  n.active ? 'bg-white font-medium text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,0.06)] ring-1 ring-zinc-200' : 'text-zinc-500'
                }`}
              >
                <n.icon size={12.5} className={n.active ? 'text-blue-600' : 'text-zinc-400'} />
                {n.label}
                {n.badge && (
                  <span className="ml-auto rounded-full bg-zinc-100 px-1.5 font-code text-[9px] tabular-nums text-zinc-400">{n.badge}</span>
                )}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-2 border-t border-zinc-100 px-4 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[9.5px] font-semibold text-zinc-600">R</span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-zinc-800">root</span>
              <span className="block truncate font-code text-[9px] text-zinc-400">root@beichen</span>
            </span>
          </div>
        </aside>

        {/* ===== 工作区 ===== */}
        <div className="min-w-0 flex-1">
          {/* 产品顶栏 */}
          <div className="flex h-12 items-center justify-between gap-3 border-b border-zinc-100 px-4 md:px-5">
            <span className="text-[12px] text-zinc-400">
              控制台 <span className="mx-1 text-zinc-300">/</span> <span className="font-medium text-zinc-800">数据看板</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[10.5px] text-zinc-500 md:flex">
                近 7 天 <span className="text-zinc-300">▾</span>
              </span>
              <span className="rounded-md bg-zinc-950 px-2.5 py-1 text-[10.5px] font-medium text-white">导出报表</span>
            </span>
          </div>

          <div className="p-4 md:p-5">
            {/* KPI 四卡 */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {KPIS.map((k) => (
                <div key={k.label} className="rounded-lg border border-zinc-200 bg-white px-3.5 py-3">
                  <div className="text-[10.5px] text-zinc-500">{k.label}</div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[19px] font-semibold tracking-tight text-zinc-950 tabular-nums">{k.value}</span>
                    <span
                      className={`rounded px-1 py-px font-code text-[9.5px] tabular-nums ${
                        k.good === true ? 'bg-emerald-50 text-emerald-600' : k.good === false ? 'bg-rose-50 text-rose-600' : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      {k.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 图表行: 趋势 + 模型 TOP */}
            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_236px]">
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-zinc-800">请求趋势</span>
                  <span className="flex items-center gap-3 text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 rounded-full bg-blue-600" />今日</span>
                    <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 rounded-full bg-zinc-300" />昨日</span>
                  </span>
                </div>
                <svg viewBox="0 0 560 168" className="mt-3 block w-full" role="img" aria-label="七日请求趋势">
                  {[38, 76, 114].map((y, i) => (
                    <g key={y}>
                      <line x1="34" x2="556" y1={y} y2={y} stroke="#f4f4f5" strokeWidth="1" />
                      <text x="0" y={y + 3} fontSize="9" fill="#a1a1aa" className="font-code">{['6万', '4万', '2万'][i]}</text>
                    </g>
                  ))}
                  <path d="M34 150 L122 118 L210 126 L298 90 L386 100 L474 64 L556 54 L556 152 L34 152 Z" fill="rgba(32,128,240,0.07)" />
                  <path d="M34 156 L122 136 L210 130 L298 114 L386 106 L474 98 L556 86" fill="none" stroke="#d4d4d8" strokeWidth="1.5" strokeDasharray="4 4" strokeLinejoin="round" />
                  <path d="M34 150 L122 118 L210 126 L298 90 L386 100 L474 64 L556 54" fill="none" stroke="#2080f0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx="474" cy="64" r="3" fill="#2080f0" stroke="#fff" strokeWidth="1.5" />
                  {['10-08', '10-09', '10-10', '10-11', '10-12', '10-13', '10-14'].map((d, i) => (
                    <text key={d} x={34 + i * 87} y={166} fontSize="9" fill="#a1a1aa" className="font-code">{d}</text>
                  ))}
                </svg>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="text-[12px] font-medium text-zinc-800">模型调用 TOP</div>
                <div className="mt-3.5 space-y-3">
                  {TOP_MODELS.map((m, i) => (
                    <div key={m.name}>
                      <div className="flex items-baseline justify-between gap-2 font-code text-[10.5px]">
                        <span className="truncate text-zinc-600">{m.name}</span>
                        <span className="shrink-0 tabular-nums text-zinc-400">{m.reqs}</span>
                      </div>
                      <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${m.pct}%`, opacity: 1 - i * 0.22 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 border-t border-zinc-100 pt-2.5 font-code text-[9.5px] text-zinc-400">共 41 个模型 · 近 24h</div>
              </div>
            </div>

            {/* 最近调用日志 */}
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
                <span className="text-[12px] font-medium text-zinc-800">最近调用</span>
                <span className="font-code text-[10px] text-zinc-400">查看全部 →</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[11px]">
                  <thead>
                    <tr className="bg-zinc-50/60 text-left text-[10px] text-zinc-400">
                      <th className="px-4 py-2 font-medium">时间</th>
                      <th className="px-3 py-2 font-medium">模型</th>
                      <th className="hidden px-3 py-2 font-medium sm:table-cell">令牌</th>
                      <th className="px-3 py-2 text-right font-medium">Tokens</th>
                      <th className="px-3 py-2 text-right font-medium">耗时</th>
                      <th className="px-4 py-2 text-right font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LOG_ROWS.map((r) => (
                      <tr key={r.time} className="border-t border-zinc-100">
                        <td className="whitespace-nowrap px-4 py-2 font-code tabular-nums text-zinc-500">{r.time}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-code text-zinc-800">{r.model}</td>
                        <td className="hidden whitespace-nowrap px-3 py-2 font-code text-zinc-400 sm:table-cell">{r.token}</td>
                        <td className="px-3 py-2 text-right font-code tabular-nums text-zinc-600">{r.tok}</td>
                        <td className="px-3 py-2 text-right font-code tabular-nums text-zinc-600">{r.ms}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={`inline-flex items-center gap-1.5 ${r.ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${r.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {r.st}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部渐隐: 内容向下延伸的刻意裁切 */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/80 to-transparent" />
    </div>
  )
}
