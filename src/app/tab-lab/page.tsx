'use client'

/**
 * Tab Lab — 页签条方案对比实验室 (Task 73)
 * 用户连否四版页签条后, 一次性提供 7 套可交互方案供选型;
 * 选定后按所选方案重写后台 sb-tabs-bar。
 */
import { useEffect, useState } from 'react'
import { Moon, Sun } from '@/components/ph'
import { TabBar, type VSpec } from './lab'
import './lab.css'

const SPECS: VSpec[] = [
  {
    n: 'V1', name: '滑标 Slider', from: 'SoybeanAdmin 原生 slider 模式',
    desc: '左侧品牌滑标 + 淡蓝染底，激活语言与侧边栏选中态完全统一，官方同款气质。',
    bar: 'tv1', tab: 'tv1-tab', active: 'tv1-tab--active', slider: 'tv1-slider',
  },
  {
    n: 'V2', name: '实底按钮 Button', from: 'SoybeanAdmin button / Arco 实底',
    desc: '品牌蓝实底白字，激活态对比度最高、一眼锁定，与站内主按钮同语言。',
    bar: 'tv2', tab: 'tv2-tab', active: 'tv2-tab--active', xInvert: true,
  },
  {
    n: 'V3', name: '经典卡片 Card', from: 'Arco / Element 卡片页签',
    desc: '竖线分隔 + 白底激活 + 顶部品牌线，结构感最强，经典后台气质。',
    bar: 'tv3', tab: 'tv3-tab', active: 'tv3-tab--active',
  },
  {
    n: 'V4', name: '浮起卡片 Float', from: 'VS Code / Linear 编辑器材质',
    desc: '灰色轨道上白卡浮起，用阴影而非颜色表达激活，最克制高级的一版。',
    bar: 'tv4', tab: 'tv4-tab', active: 'tv4-tab--active', iconActive: true,
  },
  {
    n: 'V5', name: '墨块反转 Ink', from: 'Vercel / shadcn 风',
    desc: '激活页签变墨色块反白（暗色下反转为浅块），高对比、极客感强。',
    bar: 'tv5', tab: 'tv5-tab', active: 'tv5-tab--active', xInvert: true,
  },
  {
    n: 'V6', name: '浅染胶囊 Tint', from: 'Notion / 轻量协作工具风',
    desc: '全圆角胶囊 + 品牌浅染描边，柔和亲和，与分隔线白条相安无事。',
    bar: 'tv6', tab: 'tv6-tab', active: 'tv6-tab--active',
  },
  {
    n: 'V7', name: '凹槽分段 Segmented', from: '已定版 · Task 74 同款',
    desc: '整条页签收进凹槽轨道，激活白卡量测驱动跨页签滑动，hover 幽灵白片预览 — 已应用到后台。',
    bar: 'tv7', tab: 'tv7-tab', active: 'tv7-tab--active', iconActive: true,
    thumb: 'tv7-thumb', track: 'tv7-track',
  },
]

export default function TabLabPage() {
  const [dark, setDark] = useState(false)

  // 挂载时跟随当前 html 主题 (避免与 next-themes 注入的类冲突)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="tl-scope min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-4xl px-5 pt-12 sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">页签条方案实验室</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              后台多标签页条重设计 — 7 套方向各异的方案，全部按后台真实菜单渲染。
            </p>
          </div>
          <button
            onClick={() => setDark((v) => !v)}
            title={dark ? '切亮色' : '切暗色'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:text-foreground"
            style={{ borderColor: 'var(--divider)' }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <div
          className="mt-5 rounded-xl px-4 py-3 text-[13px] leading-relaxed"
          style={{ border: '1px solid var(--tl-tint-bd)', background: 'var(--tl-tint)', color: 'var(--tl-ink)' }}
        >
          每套方案都可真实交互：点击切换、悬停预览、关闭页签（「数据看板」为固定页签不可关）。
          也请各切一次右上角明暗主题对比。选定后回复编号（如「选 V4」），我将原样应用到后台。
        </div>

        <main className="mt-6 space-y-6">
          {SPECS.map((v) => (
            <TabBar key={v.n} v={v} />
          ))}
        </main>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          数据看板 / 渠道管理 / 令牌管理 / 调用日志 / 模型价格 / 用户管理 / 系统设置 — 与后台菜单一致，仅用于演示页签形态
        </p>
      </div>
    </div>
  )
}
