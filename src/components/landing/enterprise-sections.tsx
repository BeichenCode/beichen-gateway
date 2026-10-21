'use client'

/**
 * 官网区块集 — Arco Design 实现 (Task 47, 配套 enterprise.tsx)
 * 全部区块基于 Arco 组件: Row/Col 栅格、Card、Table、Tag、Alert、
 * Steps、Typography、Input (Task 184-c: FAQ 手风琴改自实现, 去除 Collapse)。
 * 真实数据纪律: 模型广场直出 /api/public/models, 吞吐/延迟/调用列
 * 仅当存在真实统计数据时才渲染; 0 就显示 0, 不做任何编造回落。
 */
import Link from 'next/link'
import Image from 'next/image'
/* Task 176 流畅度: memo 隔离卡片重渲染 (搜索/切类型/5s 轮询不再整片重绘) */
import { memo, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Grid,
  Input,
  Steps,
  Tag,
  Typography,
} from '@arco-design/web-react'
import {
  IconCheck,
  IconCopy,
  IconDashboard,
  IconFile,
  IconHistory,
  IconLock,
  IconSafe,
  IconSearch,
  IconStorage,
  IconSwap,
} from '@arco-design/web-react/icon'
/* Task 174-c: Empty 移除 — 广场空态改为自绘 (区分筛选无匹配/暂无数据, 支持一键清除筛选) */
import type { PublicModel } from '@/app/api/public/models/route'
import { IconBoltGW, IconLayersGW, IconNodesGW } from './kit'
import { fmtNum, type Stats } from './sections'

const { Title, Paragraph } = Typography
const { Row, Col } = Grid

/* ───────────────────────── 区块骨架 ───────────────────────── */

function Section({
  id,
  tone = 'white',
  children,
}: {
  id: string
  tone?: 'white' | 'gray'
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={`arco-landing-section border-b border-[#e5e6eb]/60 ${
        tone === 'gray' ? 'bg-[#f7f8fa]' : 'bg-white'
      } py-16 md:py-24`}
    >
      <div className="mx-auto max-w-[1200px] px-6">{children}</div>
    </section>
  )
}

function SectionHead({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-[720px] text-center">
      <div className="flex items-center justify-center gap-2.5">
        <span
          aria-hidden
          className="h-px w-7"
          style={{ background: 'linear-gradient(90deg, transparent, #165DFF)' }}
        />
        <div className="text-[14px] font-medium tracking-[0.1em] text-[#165DFF]">{kicker}</div>
        <span
          aria-hidden
          className="h-px w-7"
          style={{ background: 'linear-gradient(270deg, transparent, #165DFF)' }}
        />
      </div>
      <Title style={{ fontSize: 32, lineHeight: 1.35, marginTop: 10, marginBottom: 0 }}>{title}</Title>
      {desc ? (
        <Paragraph
          style={{ fontSize: 15, lineHeight: 1.85, color: '#4E5969', marginTop: 14, marginBottom: 0 }}
        >
          {desc}
        </Paragraph>
      ) : null}
    </div>
  )
}


/* ───────────────────────── 产品能力 ───────────────────────── */

const FEATURES = [
  {
    icon: <IconSwap style={{ fontSize: 20 }} />,
    title: '统一协议接入',
    desc: '兼容 OpenAI / Claude / Gemini 请求格式，一处配置即可切换上游模型，业务侧零改造迁移。',
    c1: '#4080FF',
    c2: '#165DFF',
  },
  {
    icon: <IconStorage style={{ fontSize: 20 }} />,
    title: '渠道路由与负载均衡',
    desc: '多渠道权重分配、失败重试与故障转移，单渠道异常自动切换，保障调用连续性。',
    c1: '#4ADADA',
    c2: '#0FB8B8',
  },
  {
    icon: <IconLock style={{ fontSize: 20 }} />,
    title: '令牌与额度管控',
    desc: '按业务或团队签发独立令牌，支持额度上限、有效期与 IP 白名单等精细管控。',
    c1: '#A871E3',
    c2: '#722ED1',
  },
  {
    icon: <IconDashboard style={{ fontSize: 20 }} />,
    title: '精细计费体系',
    desc: '按 Token 或按次计费，模型倍率与分组差异化定价，账目实时可查、成本可核算。',
    c1: '#FFA656',
    c2: '#FF7D00',
  },
  {
    icon: <IconHistory style={{ fontSize: 20 }} />,
    title: '全量调用日志',
    desc: '记录每次请求的模型、耗时、Token 用量与状态码，支持回溯排障与用量对账。',
    c1: '#4CD263',
    c2: '#00B42A',
  },
  {
    icon: <IconSafe style={{ fontSize: 20 }} />,
    title: '安全与审计',
    desc: '上游密钥仅托管在服务端，调用方只接触网关令牌，可随时吊销轮换、操作留痕可审计。',
    c1: '#F968B0',
    c2: '#F5319D',
  },
]

/**
 * 能力卡 / 计费卡共用渐变图标底座 (Task 54: CSS 变量驱动, 每卡专属配色,
 * hover 弹性放大微倾由 .ld-feat:hover .ld-tile 联动)。
 */
function IconTile({ children, c1, c2 }: { children: React.ReactNode; c1: string; c2: string }) {
  return (
    <div
      className="ld-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white"
      style={{ '--ld-c1': c1, '--ld-c2': c2 } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

export function FeatureSection() {
  return (
    <Section id="features">
      <SectionHead
        kicker="PRODUCT"
        title="为生产环境而生的大模型网关"
        desc="从协议接入到计费审计的完整链路能力，开箱即用。"
      />
      <Row gutter={[24, 24]}>
        {FEATURES.map((f) => (
          <Col key={f.title} xs={24} sm={12} lg={8}>
            <Card
              hoverable
              className="landing-card ld-feat h-full"
              bodyStyle={{ padding: 26, height: '100%' }}
              style={{ '--ld-c1': f.c1, '--ld-c2': f.c2 } as React.CSSProperties}
            >
              <IconTile c1={f.c1} c2={f.c2}>{f.icon}</IconTile>
              <div className="mt-5 text-[16px] font-semibold text-[#1D2129]">{f.title}</div>
              <p className="mb-0 mt-2.5 text-[14px] leading-[1.8] text-[#86909C]">{f.desc}</p>
            </Card>
          </Col>
        ))}
      </Row>
    </Section>
  )
}

/* ───────────────────── 多渠道路由全景 (暗色配图段) ───────────────────── */

/**
 * 暗色全景段: 全球网络配图为底 + 真实读数玻璃卡。
 * 真实数据纪律: 三个数字直出 /api/public/stats, 0 就显示 0;
 * 描述的能力 (权重负载均衡 / 失败转移 / 健康探活) 均为中继引擎已实现能力,
 * 不含任何编造指标。
 */
export function NetworkBand({ stats }: { stats: Stats }) {
  const items = [
    {
      label: '预置计价模型', value: stats.models,
      icon: <IconLayersGW size={17} />, c1: '#4080FF', c2: '#165DFF', glow: 'rgba(22, 93, 255, 0.32)',
    },
    {
      label: '启用渠道', value: stats.channels,
      icon: <IconNodesGW size={17} />, c1: '#3FD1CE', c2: '#0FB8B8', glow: 'rgba(15, 184, 184, 0.30)',
    },
    {
      label: '累计请求', value: fmtNum(stats.requests),
      icon: <IconBoltGW size={17} />, c1: '#A871E3', c2: '#722ED1', glow: 'rgba(114, 46, 209, 0.30)',
    },
  ]
  const bullets = ['多渠道权重负载均衡', '失败自动重试与故障转移', '渠道异常自动禁用与恢复']
  return (
    <section
      className="arco-landing-section relative overflow-hidden border-y border-[#e5e6eb]/60 py-16 md:py-24"
      style={{ background: 'linear-gradient(180deg, #F2F6FF 0%, #FFFFFF 100%)' }}
    >
      {/* Task 54 装饰: 渐隐网格 + 青色光斑, 打破渐变底的平淡 */}
      <div aria-hidden className="ld-grid-tex pointer-events-none absolute inset-0 opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-8 h-[300px] w-[300px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(20,201,201,0.12), transparent 65%)' }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6">
        <Row gutter={[56, 40]} align="center">
          <Col xs={24} lg={13}>
            <div className="text-[14px] font-medium tracking-wide text-[#165DFF]">
              ROUTING · 多渠道路由
            </div>
            <Title style={{ fontSize: 32, lineHeight: 1.35, marginTop: 10, marginBottom: 0 }}>
              一处接入，全网模型一跳可达
            </Title>
            <Paragraph
              style={{
                fontSize: 15,
                lineHeight: 1.9,
                color: '#4E5969',
                marginTop: 16,
                marginBottom: 0,
                maxWidth: 520,
              }}
            >
              为每个模型配置多条上游渠道，网关按优先级与权重自动分流；单渠道异常时自动重试并切换到备用渠道，调用方无感知。
            </Paragraph>
            <ul className="mb-0 mt-7 flex flex-col gap-3 pl-0">
              {bullets.map((b) => (
                <li key={b} className="flex list-none items-center gap-2.5 text-[14px] text-[#1D2129]">
                  <span
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg, #4080FF, #165DFF)' }}
                    aria-hidden
                  >
                    <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                      <path
                        d="M2.5 6.2 5 8.7l4.5-5.4"
                        stroke="#fff"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Col>
          <Col xs={24} lg={11}>
            <div className="overflow-hidden rounded-2xl border border-[#e5e6eb] bg-white shadow-[0_40px_80px_-40px_rgba(29,33,41,0.35)]">
              <Image
                src="/images/landing/security-db.png"
                alt="渠道路由与故障转移示意：守护数据库与服务的稳定调用"
                width={800}
                height={457}
                className="h-auto w-full"
              />
            </div>
          </Col>
        </Row>
        <div className="mt-12">
          <Row gutter={[16, 16]}>
            {items.map((it) => (
              <Col key={it.label} xs={24} sm={8}>
                <div
                  className="ld-netcard"
                  style={{ '--c1': it.c1, '--c2': it.c2, '--glow': it.glow } as React.CSSProperties}
                >
                  <div className="flex items-center justify-between gap-3">
                    <b className="ld-num-grad ld-netcard-num tabular-nums">{it.value}</b>
                    <span className="ld-stat-ico ld-stat-ico--sm" aria-hidden>
                      {it.icon}
                    </span>
                  </div>
                  <div className="mt-3 text-[13px] text-[#86909C]">{it.label}</div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── 模型类型配色 ───────────────────────── */

/** 类型 → Arco Tag 色 (语义分组用色, 与跑马灯圆点同一套映射) */
const KIND_TAG_COLOR: Record<string, string> = {
  对话: 'arcoblue',
  推理: 'orange',
  编码: 'green',
  多模态: 'cyan',
  绘图: 'magenta',
  语音: 'purple',
  向量: 'gold',
}
const KIND_DOT_COLOR: Record<string, string> = {
  对话: '#165DFF',
  推理: '#FF7D00',
  编码: '#00B42A',
  多模态: '#14C9C9',
  绘图: '#F5319D',
  语音: '#722ED1',
  向量: '#F7BA1E',
}
/** 类型筛选 chips 的固定展示顺序 (广场只渲染 modelStats 中实际出现的类型) */
const KIND_ORDER = ['对话', '推理', '编码', '多模态', '绘图', '语音', '向量']

/* ───────────────────────── 模型名跑马灯 ───────────────────────── */

/**
 * Hero 下方的模型名跑马灯 (Task 54 去单调: 给首屏加入有节奏的动态元素)。
 * 真实数据纪律: 模型名全部来自 /api/public/models 预置计价表, 左侧标签
 * 明确标注「已预置计价」, 不暗示可用性; 无数据时整条隐藏。
 */
export function ModelTicker({ models }: { models: PublicModel[] }) {
  if (models.length === 0) return null
  const row = [...models, ...models] // 双份拼接 → translateX(-50%) 无缝循环
  return (
    <div className="relative border-b border-[#e5e6eb]/60 bg-white py-3.5">
      <div className="ld-ticker overflow-hidden">
        <div className="ld-ticker-track" aria-hidden>
          {row.map((m, i) => (
            <span
              key={`${m.name}-${i}`}
              className="flex shrink-0 items-center gap-2.5 px-4 font-mono text-[12.5px] text-[#4E5969]"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: KIND_DOT_COLOR[modelKind(m.name)] ?? '#C9CDD4' }}
              />
              {m.name}
            </span>
          ))}
        </div>
      </div>
      {/* 左侧悬浮标签: 白底渐变盖住滚动内容, 明确「预置计价」语义 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-white via-white/95 to-transparent pl-6 pr-12">
        <Tag color="arcoblue" size="small">
          已预置计价 {models.length} 款模型
        </Tag>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />
    </div>
  )
}

/* ───────────────────────── 模型广场 ───────────────────────── */

/** 按名称推断模型类型 (纯语义分组, 不含任何编造数据) */
function modelKind(name: string): string {
  const n = name.toLowerCase()
  if (/embed|bge|rerank/.test(n)) return '向量'
  if (/tts|asr|whisper|speech|audio/.test(n)) return '语音'
  if (/image|flux|dall|seedream|sd3|diffusion|mj/.test(n)) return '绘图'
  if (/vision|-vl-|-vl$|4o|omni/.test(n)) return '多模态'
  if (/reasoner|thinking|r1|o1|o3/.test(n)) return '推理'
  if (/coder|code/.test(n)) return '编码'
  return '对话'
}

/** 价格格式化: USD 语义数值 → 人民币字符串 (× 站点汇率, 去尾零, 全站人民币口径) */
function fmtPrice(n: number, rate: number): string {
  const cny = n * rate
  return cny >= 1 ? `¥${cny.toFixed(2)}` : `¥${parseFloat(cny.toFixed(4))}`
}

/* Task 174-f: TPS/延迟格式化逐字复刻 QuantumNous/new-api
 * web/src/features/performance-metrics/lib/format.ts 的 formatThroughput / formatLatency
 * (单位与小数位与 new-api 模型详情页 OverviewSummaryGrid 完全一致) */
/** formatThroughput: ≤0/非有限 → '—'; ≥1000 → 'x.xK t/s'; <10 保留 2 位小数, 否则 1 位, 后缀 ' t/s' */
function fmtThroughput(tps: number): string {
  if (!Number.isFinite(tps) || tps <= 0) return '—'
  if (tps >= 1000) return `${(tps / 1000).toFixed(1)}K t/s`
  return `${tps.toFixed(tps < 10 ? 2 : 1)} t/s`
}

/** formatLatency (端到端全程均值口径): ≤0/非有限 → '—'; <1000ms → 取整 'ms'; ≥1000ms → 2 位小数 's' */
function fmtLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.round(ms)}ms`
}

/** 复制按钮: 点击复制模型名, 成功变绿勾 1.6s (clipboard API, 非 HTTPS 环境回退 execCommand)
 *  Task 176: memo 化 — 卡片重渲染时同名按钮不重绘 (复制状态自持, 不依赖外部回调闭包) */
const CopyModelButton = memo(function CopyModelButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async (): Promise<void> => {
    let done = false
    try {
      await navigator.clipboard.writeText(name)
      done = true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = name
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        done = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        done = false
      }
    }
    if (done) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }
  return (
    <button
      type="button"
      aria-label={`复制模型名 ${name}`}
      title={copied ? '已复制' : `复制模型名 ${name}`}
      onClick={() => void copy()}
      className={`flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent transition-colors hover:border-[#e5e6eb] hover:bg-[#f7f8fa] ${
        copied ? 'text-[#00B42A]' : 'text-[#86909C] hover:text-[#1D2129]'
      }`}
    >
      {copied ? <IconCheck style={{ fontSize: 14 }} /> : <IconCopy style={{ fontSize: 14 }} />}
    </button>
  )
})

/** 指标板块: 卡内 hairline 细分的单元块; 空态文案沿 Task 166 纪律, 不裸 "—"
 *  (Task 174-f: 窗口改为近 24 小时; Task 176: 空态对齐「真实调用」口径, memo 化) */
const MetricTile = memo(function MetricTile({
  label,
  value,
  empty = '近24小时无真实调用',
  live = false,
}: {
  label: string
  value: string | null
  empty?: string
  live?: boolean
}) {
  return (
    <div className="bg-white px-3.5 py-2.5">
      <div className="text-[11px] leading-4 text-[#86909C]">{label}</div>
      {value != null ? (
        <div
          className={`mt-0.5 text-[13px] font-medium leading-5 tabular-nums ${live ? 'text-[#165DFF]' : 'text-[#1D2129]'}`}
        >
          {value}
        </div>
      ) : (
        <div className="mt-0.5 text-[12px] leading-5 text-[#86909C]">{empty}</div>
      )}
    </div>
  )
})

/** ModelCard props — 抽出供 memo 比较器复用 */
type ModelCardProps = {
  m: PublicModel
  cnyRate: number
  hasCalls: boolean
  maxCalls: number
}

/** Task 176: 值比较器 — 官网每 5s 轮询会重建 modelStats 数组 (对象引用全变),
 *  浅比较 memo 拦不住这种「数据没变但引用变了」的重渲染; 这里逐一比较卡片实际
 *  渲染用到的全部字段 (名称/三价/tps/首字/端到端/调用数 + 上游聚合量),
 *  字段全等时跳过重渲染 → 轮询与键入期间卡片静默, 交互不再被整片重绘打断 */
function areModelCardsEqual(prev: ModelCardProps, next: ModelCardProps): boolean {
  return (
    prev.m === next.m ||
    (prev.m.name === next.m.name &&
      prev.m.inputPrice === next.m.inputPrice &&
      prev.m.outputPrice === next.m.outputPrice &&
      prev.m.perCallPrice === next.m.perCallPrice &&
      prev.m.tps === next.m.tps &&
      prev.m.avgTtftMs === next.m.avgTtftMs &&
      prev.m.avgLatencyMs === next.m.avgLatencyMs &&
      prev.m.calls === next.m.calls &&
      prev.cnyRate === next.cnyRate &&
      prev.hasCalls === next.hasCalls &&
      prev.maxCalls === next.maxCalls)
  )
}

/** 模型卡: 头部名称+类型+复制, 中部四指标 hairline 网格, 底部 24 小时热度渐变条 (仅有调用时)
 *  Task 176: memo + 值比较器 (见 areModelCardsEqual) — 网格不向卡片传任何回调闭包,
 *  复制按钮状态自持, memo 不因内联闭包失效 */
const ModelCard = memo(function ModelCard({ m, cnyRate, hasCalls, maxCalls }: ModelCardProps) {
  const kind = modelKind(m.name)
  const inPrice =
    m.inputPrice != null
      ? `${fmtPrice(m.inputPrice, cnyRate)} / 1M`
      : m.perCallPrice != null
        ? `${fmtPrice(m.perCallPrice, cnyRate)} / 次`
        : null
  const outPrice = m.outputPrice != null ? `${fmtPrice(m.outputPrice, cnyRate)} / 1M` : null
  return (
    <Card
      bordered
      bodyStyle={{ padding: 0 }}
      /* Task 176 流畅度: hover 过渡收窄为 transform/box-shadow/border-color —
         原 transition-all 会连带过渡 width/height 等布局属性, 触发无谓 reflow */
      className="landing-table-card overflow-hidden transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#bedaff]! hover:shadow-[0_16px_36px_-16px_rgba(29,33,41,0.25)]"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: KIND_DOT_COLOR[kind] ?? '#C9CDD4' }}
          />
          <span className="truncate font-mono text-[13px] font-medium text-[#1D2129]" title={m.name}>
            {m.name}
          </span>
          <Tag color={KIND_TAG_COLOR[kind] ?? undefined} size="small">
            {kind}
          </Tag>
        </span>
        <CopyModelButton name={m.name} />
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-[#f0f1f3] bg-[#f0f1f3]">
        <MetricTile label="输入价格" value={inPrice} empty="—" />
        <MetricTile label="输出价格" value={outPrice} empty="—" />
        {/* Task 174-f: TPS — 近 24h 真实调用统计, 口径 1:1 对齐 new-api pkg/perf_metrics,
            格式逐字复刻 new-api formatThroughput; ≤0 视为无样本走空态文案 */}
        <MetricTile
          label="TPS"
          value={m.tps != null && m.tps > 0 ? fmtThroughput(m.tps) : null}
          live
        />
        {/* Task 176: 平均延迟 → 首字延迟 (avgTtftMs = 真实用户流式调用「发出请求 → 收到第一个字」均值);
            端到端均值改在底部热度行以小字展示, 不占指标格 */}
        <MetricTile
          label="首字延迟"
          value={m.avgTtftMs != null && m.avgTtftMs > 0 ? fmtLatency(m.avgTtftMs) : null}
          empty="近24小时无真实调用"
          live
        />
      </div>
      {hasCalls ? (
        <div className="border-t border-[#f0f1f3] px-4 py-2.5">
          {/* Task 176: 右侧追加端到端均值小字; 右组 min-w-0 + 端到端文案 truncate,
              移动端窄卡时优先省略文案、保留调用次数 (不换行不溢出) */}
          <div className="flex items-center justify-between gap-2 text-[11px] leading-4 text-[#86909C]">
            <span className="shrink-0">近 24 小时调用</span>
            <span className="flex min-w-0 items-center gap-2 font-mono tabular-nums">
              {m.avgLatencyMs != null ? (
                <span className="truncate">端到端均值 {fmtLatency(m.avgLatencyMs)}</span>
              ) : null}
              <span className="shrink-0">{m.calls > 0 ? `${m.calls.toLocaleString()} 次` : '—'}</span>
            </span>
          </div>
          {/* Task 174-c: 热度渐变条 — 相对全场最大调用量的比例宽度, 纯视觉装饰不改数值语义;
              Task 176: 宽度为一次性内联样式, 刻意不加 transition (数据刷新不播宽度动画) */}
          {m.calls > 0 && maxCalls > 0 ? (
            <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-[#f2f3f5]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(6, Math.min(100, (m.calls / maxCalls) * 100))}%`,
                  background: 'linear-gradient(90deg, #4080FF, #165DFF 58%, #14C9C9)',
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}, areModelCardsEqual)

export function ModelSquare({
  modelStats,
  loadingModels,
  cnyRate = 7.3,
}: {
  stats: Stats
  modelStats: PublicModel[]
  loadingModels: boolean
  cnyRate?: number
}) {
  // Task 176 流畅度: 搜索防抖 — 输入框即时回显 (kwInput 受控), 过滤计算防抖 ~180ms (kw);
  // 每敲一个字符只重渲染本组件轻量部分, rows/卡片网格在停顿后才重算
  const [kwInput, setKwInput] = useState('')
  const [kw, setKw] = useState('')
  const [kindFilter, setKindFilter] = useState('全部')

  useEffect(() => {
    const t = window.setTimeout(() => setKw(kwInput), 180)
    return () => window.clearTimeout(t)
  }, [kwInput])

  const onlineCount = useMemo(() => modelStats.filter((m) => m.online).length, [modelStats])
  const hasCalls = useMemo(() => modelStats.some((m) => m.calls > 0), [modelStats])

  // Task 174-a: 按固定顺序统计 modelStats 中实际出现的类型与数量 (未出现的类型不渲染 chip)
  const kindChips = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of modelStats) {
      const k = modelKind(m.name)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return KIND_ORDER.filter((k) => counts.has(k)).map((k) => ({ kind: k, count: counts.get(k) ?? 0 }))
  }, [modelStats])

  // Task 174-a: 先按类型筛选, 再按关键词过滤 (AND 组合, 与搜索框叠加生效)
  const rows = useMemo(() => {
    const list =
      kindFilter === '全部' ? modelStats : modelStats.filter((m) => modelKind(m.name) === kindFilter)
    const k = kw.trim().toLowerCase()
    return k ? list.filter((m) => m.name.toLowerCase().includes(k)) : list
  }, [kw, kindFilter, modelStats])
  // Task 174-c: 全场最大 24 小时调用量, 供热度渐变条做相对比例 (0 时不出条, 口径与卡片文字一致)
  const maxCalls = useMemo(
    () => modelStats.reduce((acc, m) => Math.max(acc, m.calls), 0),
    [modelStats],
  )
  const isFiltered = kw.trim() !== '' || kindFilter !== '全部'

  return (
    <Section id="models" tone="gray">
      <SectionHead
        kicker="MODELS"
        title="模型广场"
        desc="仅展示当前在线可用的模型，全部直出平台真实数据 —— 新模型接入渠道后自动上线，无需手动刷新。"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Tag color="green" size="large">
            在线模型 {onlineCount}
          </Tag>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#86909C]">
            <span className="ld-live-dot" aria-hidden />
            实时数据 · 每 5 秒刷新
          </span>
        </div>
        <Input
          allowClear
          placeholder="搜索模型名称"
          prefix={<IconSearch style={{ color: '#86909C' }} />}
          value={kwInput}
          onChange={setKwInput}
          style={{ width: 260 }}
        />
      </div>

      {/* Task 174-a/174-c: 类型筛选 chips — 「全部」+ 实际出现的类型 (含数量角标 + 类型色点),
          选中态 Arco 蓝高亮; 移动端整行横向滑动 (不换行), sm 起恢复换行; 无模型数据时整行隐藏 */}
      {kindChips.length > 0 ? (
        <div className="-mx-6 mb-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-6 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
          {[{ kind: '全部', count: modelStats.length }, ...kindChips].map(({ kind, count }) => {
            const active = kindFilter === kind
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => setKindFilter(kind)}
                className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[12px] leading-none transition-[color,background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF]/25 ${
                  active
                    ? 'border-[#165DFF] bg-[#165DFF] text-white shadow-[0_4px_12px_-4px_rgba(22,93,255,0.55)]'
                    : 'border-[#e5e6eb] bg-white text-[#4E5969] hover:border-[#C9CDD4] hover:bg-[#f7f8fa] hover:text-[#1D2129]'
                }`}
              >
                {kind !== '全部' ? (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background: active ? 'rgba(255,255,255,0.92)' : (KIND_DOT_COLOR[kind] ?? '#C9CDD4'),
                    }}
                  />
                ) : null}
                {kind}
                <span
                  className={`rounded-full px-1.5 font-mono text-[10.5px] leading-[15px] tabular-nums ${
                    active ? 'bg-white/20 text-white/90' : 'bg-[#f2f3f5] text-[#86909C]'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {!loadingModels && onlineCount === 0 ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          content="当前没有启用中的渠道承载任何模型 —— 管理员接入并启用渠道后，可用模型将自动在此展示。"
        />
      ) : null}

      {/* Task 173: 统一响应式卡片网格 (手机1列/平板2列/桌面3列) — 取代旧「桌面表格+移动卡片」双态,
          无分页无横滑全量直出; 每卡右上角一键复制模型名, 供接入时填 model 参数 */}
      {/* Task 176 流畅度: 网格不向卡片传任何回调闭包 (复制按钮状态自持),
          ModelCard memo + 值比较器 — 键入/切换/轮询期间未受影响的卡片不重绘 */}
      {/* Task 174-c: 自绘优雅空态 — 区分「筛选无匹配」(一键清除) 与「暂无数据」两种文案, 不白屏 */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e5e6eb] bg-white/60 px-6 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f2f3f5] text-[#86909C]">
            {isFiltered ? <IconSearch style={{ fontSize: 18 }} /> : <IconStorage style={{ fontSize: 18 }} />}
          </span>
          <div className="mt-3.5 text-[14px] font-medium text-[#1D2129]">
            {isFiltered ? '没有匹配的模型' : '暂无模型数据'}
          </div>
          <div className="mt-1 text-[12.5px] leading-5 text-[#86909C]">
            {isFiltered
              ? '换个类型或关键词试试，或清除筛选查看全部模型'
              : '管理员接入并启用渠道后，可用模型将自动在此展示'}
          </div>
          {isFiltered ? (
            <button
              type="button"
              onClick={() => {
                setKwInput('')
                setKw('')
                setKindFilter('全部')
              }}
              className="mt-4 inline-flex h-8 cursor-pointer items-center rounded-full border border-[#bedaff] bg-[#f2f6ff] px-4 text-[12.5px] font-medium text-[#165DFF] transition-colors hover:bg-[#e8f1ff]"
            >
              清除筛选条件
            </button>
          ) : null}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-3.5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
            loadingModels ? 'opacity-50' : 'opacity-100'
          }`}
        >
          {rows.map((m) => (
            <ModelCard key={m.name} m={m} cnyRate={cnyRate} hasCalls={hasCalls} maxCalls={maxCalls} />
          ))}
        </div>
      )}

      {/* Task 174-f/176: 脚注重写 — 口径自证 (对齐 New API perf_metrics, 无 P50/封顶/地板等自创逻辑;
          统计仅认真实用户调用, 平台自动探测流量已排除) */}
      <p className="mt-3 px-1 text-[12px] leading-5 text-[#86909C]">
        首字延迟为<strong className="font-medium text-[#4E5969]">真实用户调用「发出请求 → 收到第一个字」耗时的均值</strong>；
        TPS 与端到端均值为<strong className="font-medium text-[#4E5969]">近 24 小时真实用户调用统计</strong>
        （口径对齐 New API，已排除平台自动探测流量）：TPS = 补全 tokens 总量 ÷ 生成段总时长（流式扣除首字等待，非流式按全程计）；
        在线状态为平台实时探测结果；价格为人民币口径 (¥ / 1M tokens)。
      </p>
    </Section>
  )
}

/* ───────────────────────── 计费方式 ───────────────────────── */

const BILLING = [
  {
    icon: <IconDashboard style={{ fontSize: 20 }} />,
    title: '按 Token 计费',
    desc: '适合对话、补全类模型。输入与输出分别计价，倍率体系与主流上游对齐，用多少扣多少。',
    c1: '#4080FF',
    c2: '#165DFF',
  },
  {
    icon: <IconFile style={{ fontSize: 20 }} />,
    title: '按次计费',
    desc: '适合绘图、视频等按调用次数收费的模型，每次调用扣除固定单价，成本一目了然。',
    c1: '#F968B0',
    c2: '#F5319D',
  },
  {
    icon: <IconLock style={{ fontSize: 20 }} />,
    title: '额度与令牌',
    desc: '预充值额度分发至令牌，支持限额、限速与有效期，超出额度自动停用、不会透支。',
    c1: '#4ADADA',
    c2: '#0FB8B8',
  },
]

export function BillingSection() {
  return (
    <Section id="billing">
      <SectionHead
        kicker="BILLING"
        title="透明计费"
        desc="价格与平台计价表实时一致，公式公开、用量可查，不做任何隐性加价。"
      />
      <Row gutter={[56, 40]} align="center">
        <Col xs={24} lg={12}>
          {BILLING.map((b, i) => (
            <div
              key={b.title}
              className={`flex gap-5 py-7 first:pt-0 last:pb-0 ${
                i < BILLING.length - 1 ? 'border-b border-[#e5e6eb]' : ''
              }`}
            >
              <IconTile c1={b.c1} c2={b.c2}>{b.icon}</IconTile>
              <div className="min-w-0">
                <div className="text-[16.5px] font-semibold text-[#1D2129]">{b.title}</div>
                <p className="mb-0 mt-2 text-[14px] leading-[1.85] text-[#86909C]">{b.desc}</p>
              </div>
            </div>
          ))}
        </Col>
        <Col xs={24} lg={12}>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-[#e5e6eb] bg-white shadow-[0_40px_80px_-40px_rgba(29,33,41,0.35)]">
              <Image
                src="/images/landing/billing-laptop.png"
                alt="透明计费：按 Token 结算，用量与账目实时可查"
                width={800}
                height={457}
                className="h-auto w-full"
              />
            </div>
            <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3.5 py-1.5 shadow-[0_10px_28px_-10px_rgba(29,33,41,0.35)] backdrop-blur-md">
              <IconDashboard style={{ fontSize: 14, color: '#165DFF' }} />
              <span className="text-[12.5px] font-medium text-[#1D2129]">账目实时可查 · 用量可对账</span>
            </div>
          </div>
        </Col>
      </Row>
      <Card
        className="landing-card mt-10"
        bodyStyle={{ padding: '20px 26px' }}
        style={{
          background: 'linear-gradient(120deg, #f2f6ff 0%, #f7f4ff 58%, #effcff 100%)',
          borderColor: 'rgba(22, 93, 255, 0.18)',
        }}
      >
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
          <span className="text-[14px] font-medium text-[#1D2129]">平台计价公式（与控制台计价表一致）</span>
          <code
            className="rounded bg-white px-2.5 py-1 font-mono text-[#165DFF] shadow-[0_4px_12px_-6px_rgba(22,93,255,0.4)]"
            style={{ fontSize: 12.5 }}
          >
            输入价 = 模型倍率 × $2 / 1M tokens
          </code>
          <code
            className="rounded bg-white px-2.5 py-1 font-mono text-[#722ED1] shadow-[0_4px_12px_-6px_rgba(114,46,209,0.4)]"
            style={{ fontSize: 12.5 }}
          >
            输出价 = 模型倍率 × 补全倍率 × $2 / 1M tokens
          </code>
        </div>
      </Card>
    </Section>
  )
}

/* ───────────────────────── 接入指南 ───────────────────────── */

export function StepsSection() {
  return (
    <Section id="start" tone="gray">
      <SectionHead
        kicker="QUICK START"
        title="四步完成接入"
        desc="任意 OpenAI 兼容 SDK 无需改造，替换 base_url 与密钥即可切换到网关。"
      />
      <Row gutter={[64, 40]} align="center">
        <Col xs={24} lg={14}>
          <Card className="landing-card" bodyStyle={{ padding: '26px 32px' }}>
            <Steps current={0} direction="vertical">
              <Steps.Step title="注册账号" description="进入控制台，完成注册与登录" />
              <Steps.Step title="创建令牌" description="在「令牌」页签发 sk- 开头的访问令牌" />
              <Steps.Step title="替换 Base URL" description="SDK 的 base_url 指向网关地址，密钥替换为令牌" />
              <Steps.Step title="发起调用" description="按 OpenAI 协议发起请求，支持流式响应" />
            </Steps>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <div className="relative flex justify-center lg:justify-end">
            {/* Task 54: 右图背后双色光晕 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-4 rounded-full"
              style={{
                background:
                  'radial-gradient(46% 46% at 40% 40%, rgba(22,93,255,0.14), transparent 70%), radial-gradient(40% 40% at 72% 68%, rgba(20,201,201,0.13), transparent 70%)',
              }}
            />
            <Image
              src="/images/landing/purchase-phone.png"
              alt="四步接入：注册、创建令牌、替换 Base URL、发起调用"
              width={445}
              height={445}
              className="relative h-auto w-full max-w-[380px]"
            />
          </div>
        </Col>
      </Row>
    </Section>
  )
}

/* ───────────────────────── 常见问题 ───────────────────────── */

const FAQS: [string, string][] = [
  [
    '模型广场为什么只有这几个模型？',
    '模型广场仅展示当前有启用渠道承载、真实可调用的在线模型。管理员接入并启用新渠道后，对应模型会实时自动出现在列表中，无需任何手动刷新。',
  ],
  [
    '可以用哪些 SDK 或客户端接入？',
    '任何兼容 OpenAI Chat Completions 协议的 SDK 与客户端均可使用，例如 openai-python、openai-node、LobeChat、ChatGPT-Next-Web 等：把 base_url 指向网关地址、密钥替换为令牌即可。',
  ],
  [
    '如何计费与扣费？',
    '调用按平台计价表实时扣费：文本模型按输入 / 输出 Token 分别计价，部分多模态模型按次计价。价格与用量可在控制台实时查询，公式见上方「透明计费」。',
  ],
  [
    '支持流式输出吗？',
    '支持。网关完整透传 SSE 流式响应，行为与 OpenAI 协议一致，客户端按标准方式解析即可。',
  ],
  [
    '调用日志会记录哪些内容？',
    '记录调用时间、模型、令牌、Token 用量、耗时与状态码等元数据，用于对账与排障；具体留存周期与可见范围由管理员在控制台配置。',
  ],
  [
    '上游渠道密钥安全吗？',
    '上游密钥仅保存在服务端，调用方只接触网关令牌；令牌可随时吊销与轮换，敏感操作均有审计记录。',
  ],
]

/* Task 184-c: FAQ 手风琴自实现 — 弃用 Arco Collapse。
   生硬根因: Arco 内容区是 JS 显式 height 过渡 (onEntering 读 scrollHeight 快照、
   onExit 强制 reflow、onExited 置 display:none), 收尾靠 transitionend — 来回快切时
   高度重测互相覆盖、结束回调丢失, 且无内容淡入、头部无 hover 反馈。
   改用项目内 Task 133 已验证范式: grid-template-rows 0fr↔1fr 纯 CSS 过渡,
   中途改状态从当前值续走 (天然可中断), 快速连点不抖。样式见 globals.css「Task 184-c」段。 */
function FaqItem({
  q,
  a,
  id,
  open,
  onToggle,
}: {
  q: string
  a: string
  id: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className={`landing-faq-item${open ? ' landing-faq-item-open' : ''}`}>
      <button
        type="button"
        className="landing-faq-head"
        aria-expanded={open}
        aria-controls={`faq-panel-${id}`}
        onClick={onToggle}
      >
        <span className="landing-faq-q">{q}</span>
        {/* 右侧箭头: 收起 ▶ → 展开 ▼, 旋转过渡由 CSS 承担 */}
        <svg
          className="landing-faq-arrow"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3.5L10.5 8L6 12.5" />
        </svg>
      </button>
      <div id={`faq-panel-${id}`} className="landing-faq-wrap" aria-hidden={!open}>
        <div className="landing-faq-clip">
          <div className="landing-faq-body text-[14px] leading-[1.85] text-[#4E5969]">{a}</div>
        </div>
      </div>
    </div>
  )
}

export function FaqSection() {
  /* 与原 Collapse defaultActiveKey={['q1']} 对齐: 首条默认展开, 首帧即 1fr 不闪动; 保留多开语义 */
  const [openKeys, setOpenKeys] = useState<string[]>(['q1'])
  const toggle = (key: string) =>
    setOpenKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]))
  return (
    <Section id="faq">
      <SectionHead kicker="FAQ" title="常见问题" />
      <Row gutter={[56, 24]} align="center">
        <Col xs={24} lg={16}>
          <div className="landing-faq">
            {FAQS.map(([q, a], i) => {
              const key = `q${i + 1}`
              return (
                <FaqItem
                  key={key}
                  id={key}
                  q={q}
                  a={a}
                  open={openKeys.includes(key)}
                  onToggle={() => toggle(key)}
                />
              )
            })}
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="relative mt-4 flex items-end justify-center gap-5 lg:mt-0">
            {/* 装饰光斑: 蓝紫双色衬托人物拼贴, 纯装饰无数据含义 */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[16%] top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(22,93,255,0.11), transparent 65%)' }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute right-[4%] top-[38%] h-[240px] w-[240px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(114,46,209,0.1), transparent 65%)' }}
            />
            <Image
              src="/images/landing/helper-1.png"
              alt=""
              aria-hidden
              width={136}
              height={238}
              className="relative h-auto w-[120px] shrink-0 lg:w-[136px]"
            />
            <div className="relative flex flex-col items-center gap-5">
              <Image
                src="/images/landing/query-doc.png"
                alt=""
                aria-hidden
                width={124}
                height={124}
                className="h-auto w-[110px] lg:w-[124px]"
              />
              <Image
                src="/images/landing/helper-2.png"
                alt=""
                aria-hidden
                width={108}
                height={189}
                className="h-auto w-[96px] lg:w-[108px]"
              />
            </div>
          </div>
        </Col>
      </Row>
    </Section>
  )
}

/* ───────────────────────── 免责声明 (Task 103) ───────────────────────── */

/** 合规使用要点 — 静态文案 (非统计数据), 与控制台公告/注册页同口径 */
const DISCLAIMER_ITEMS: [string, string][] = [
  ['合法用途', '本平台提供的模型接口服务仅供学习研究、内容创作、软件开发等合法合规用途。'],
  ['禁止行为', '严禁用于任何违反法律法规的活动，包括但不限于：危害国家安全、恐怖主义、淫秽色情、赌博诈骗、侵犯他人权益、恶意网络攻击、批量注册薅羊毛、生成与传播违法有害信息等。'],
  ['违规后果', '一经发现违规使用，平台有权立即封禁账号与全部令牌、不予退还剩余额度，并依法保留相关记录；情节严重者将配合有关部门调查处理。'],
  ['内容责任', '用户对其输入指令及调用输出内容的使用承担全部责任。AI 生成内容可能存在错误，请自行甄别核验，不构成专业建议。'],
]

export function DisclaimerSection() {
  return (
    <Section id="disclaimer">
      <SectionHead kicker="LEGAL" title="免责声明" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {DISCLAIMER_ITEMS.map(([t, d]) => (
          <div key={t} className="border border-[#e5e6eb] bg-white p-5">
            <div className="text-[14px] font-semibold text-[#1D2129]">{t}</div>
            <p className="mb-0 mt-2 text-[13px] leading-[1.85] text-[#4E5969]">{d}</p>
          </div>
        ))}
      </div>
      <p className="mb-0 mt-5 text-[12.5px] leading-[1.8] text-[#86909C]">
        注册或使用本平台服务，即表示您已阅读并同意上述条款。条款如有更新，将在本页面与站内公告同步公示，继续使用视为接受更新后的内容。
      </p>
    </Section>
  )
}

/* ───────────────────────── CTA 与页脚 ───────────────────────── */

export function CtaBand() {
  return (
    <section
      className="ld-cta-shine relative overflow-hidden"
      style={{ background: 'linear-gradient(128deg, #0A2EB3 0%, #165DFF 46%, #2E8AFF 74%, #14C9C9 128%)' }}
    >
      {/* 装饰: CSS 圆弧环与径向光斑 (Task 52 以 CSS 替代原 PNG 弧图), 纯装饰无数据含义 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-28 -top-32 h-[380px] w-[380px] rounded-full border-[30px]"
        style={{ borderColor: 'rgba(255,255,255,0.14)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-10 h-[210px] w-[210px] rounded-full border-2"
        style={{ borderColor: 'rgba(255,255,255,0.25)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -bottom-32 h-[340px] w-[340px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 65%)' }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6 py-16 md:py-20">
        <Row gutter={[56, 40]} align="center">
          <Col xs={24} lg={14}>
            <Title
              style={{
                fontSize: 34,
                lineHeight: 1.35,
                marginTop: 0,
                marginBottom: 0,
                color: '#fff',
              }}
            >
              准备好接入了吗？
            </Title>
            <Paragraph
              style={{
                fontSize: 15,
                lineHeight: 1.85,
                color: 'rgba(255,255,255,0.82)',
                marginTop: 14,
                marginBottom: 0,
                maxWidth: 480,
              }}
            >
              注册账号并创建令牌，替换 base_url 后即可调用平台全部在线模型。
            </Paragraph>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* Task 65: 与 Hero CTA 同一兜底体系 (data-launch + 帷幕) */}
              <Link href="/register" data-launch className="cta-veil-ok">
                <Button size="large" className="landing-cta-white">
                  免费注册
                </Button>
              </Link>
              <Link href="/login" data-launch className="cta-veil-ok">
                <Button size="large" className="landing-cta-ghost">
                  登录控制台
                </Button>
              </Link>
            </div>
          </Col>
          <Col xs={24} lg={10}>
            <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-[0_48px_90px_-40px_rgba(4,16,64,0.55)]">
              <Image
                src="/images/landing/community.png"
                alt="注册加入：多端协同使用大模型网关"
                width={460}
                height={460}
                className="h-auto w-full rounded-xl"
              />
            </div>
          </Col>
        </Row>
      </div>
    </section>
  )
}

export function SiteFooter({ siteName }: { siteName: string }) {
  const year = new Date().getFullYear()
  const groups: [string, [string, string][]][] = [
    ['产品', [['模型广场', '#models'], ['计费方式', '#billing'], ['控制台', '/console']]],
    ['资源', [['接入指南', '#start'], ['常见问题', '#faq'], ['接入文档', '/console#/about']]],
    ['账号', [['登录', '/login'], ['注册', '/register']]],
    ['合规', [['免责声明', '#disclaimer'], ['工单支持', '/console#/ticket']]],
  ]

  return (
    <footer className="ld-footer relative overflow-hidden text-[#9aa1b8]">
      {/* 顶部品牌渐变发丝线 (深浅对比收尾) */}
      <div aria-hidden className="ld-footer-hairline w-full" />
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <Row gutter={32}>
          <Col xs={24} sm={12} md={9}>
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className="text-[16px] font-semibold text-white">{siteName}</span>
            </div>
            <p className="mb-0 mt-4 max-w-[340px] text-[13.5px] leading-[1.8] text-[#8a91a8]">
              企业级大模型统一网关：统一协议接入、渠道路由、令牌分发、精细计费与调用日志。
            </p>
          </Col>
          {groups.map(([title, links]) => (
            <Col key={title} xs={24} sm={4} md={5} className="mt-10 sm:mt-0">
              <div className="text-[14px] font-semibold text-white">{title}</div>
              <ul className="mb-0 mt-4 space-y-3 pl-0">
                {links.map(([label, href]) => (
                  <li key={label} className="list-none">
                    <Link
                      href={href}
                      className="text-[13.5px] text-[#8a91a8] transition-colors hover:text-[#4aa3fd]"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Col>
          ))}
        </Row>
      </div>
      <div className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-6 py-5 text-[13px] text-[#7c8296]">
          <span>
            © {year} {siteName}
          </span>
          <span>OpenAI 兼容 · 大模型统一网关</span>
        </div>
      </div>
    </footer>
  )
}
