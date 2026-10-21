/**
 * Task 131: 上游密钥逐请求轮换 (Key Ring)
 *
 * 背景: 上游按「每密钥每分钟」限流 (RPM)。历史 pickKey 为随机选取 (Task 112),
 * 突发请求短时间内仍可能反复命中同一把 key 触发 429。改为确定性轮转 (round-robin):
 * 每渠道一个持久游标, 每次取 key 游标 +1, 连续请求依次使用不同密钥,
 * 把每分钟配额均匀摊到整个 key 池, 从源头尽量不触发上游限流。
 *
 * - 游标持久于进程内存 (单实例部署, 与验证码挑战表同语义); 重启从 0 重计无副作用
 * - 重试路径 (avoid 排除上一跳) 在剩余池内继续轮转, 仍保证逐跳换 key
 * - 渠道 key 池增删无需迁移: 游标对当前池长取模天然自适应
 */

/** 渠道级游标: channelId -> 已消耗次数 */
const cursors = new Map<number, number>()

/** 按轮转序取一把 key (avoid 优先排除, 用于同请求重试换 key) */
export function rotateKey(channelId: number, keys: string[], avoid?: string): string {
  if (keys.length === 0) return ''
  if (keys.length === 1) return keys[0]
  const pool = avoid ? keys.filter((k) => k !== avoid) : keys
  if (pool.length === 0) return keys[0] ?? ''
  const n = cursors.get(channelId) ?? 0
  cursors.set(channelId, n + 1)
  return pool[n % pool.length]
}

/** 测试辅助: 读取渠道当前游标 */
export function keyRingCursor(channelId: number): number {
  return cursors.get(channelId) ?? 0
}

// ==================== Task 151: 会话粘性选 key (Prompt-Cache 友好) ====================
//
// 背景: agent 场景输入输出比 ~100:1, 且逐请求轮换 key 会让上游的前缀缓存 (Prompt
// Cache / 自动前缀 KV 复用) 永远 miss — 每个请求都在替上游重新 prefill 几万 token 的
// 重复上下文, 这是大上下文 agent 首字延迟的大头。同一 (令牌,模型) 组合在窗口期内
// 粘住同一把 key, 上游同账号重复前缀即可命中缓存, prefill 大幅缩短; 窗口到期或
// 429 重试 (avoid) 时右移换 key, 兼顾每密钥 RPM 摊薄。
//
// - 分片: channelId|token|model → 各自独立粘性位, 多用户/多模型互不挤占
// - 窗口到期 idx+1 (轮换补位), avoid 触发的换 key 在窗口内保持 (失败 key 窗口内歇)
// - 内存有界: 分片数超阈值时清理过期窗口

const stickyMap = new Map<string, { idx: number; since: number }>()

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 粘性选 key: 同 seed 在 windowMs 内粘住同一把; avoid 时窗口内右移跳开失败 key */
export function stickyRotate(channelId: number, keys: string[], seed: string, windowMs: number, avoid?: string): string {
  if (keys.length === 0) return ''
  if (keys.length === 1) return keys[0]
  const shard = `${channelId}|${seed}`
  const now = Date.now()
  let st = stickyMap.get(shard)
  if (!st) {
    st = { idx: hashStr(shard) % keys.length, since: now }
    stickyMap.set(shard, st)
  } else if (now - st.since > windowMs) {
    st.idx = (st.idx + 1) % keys.length
    st.since = now
  }
  if (avoid) {
    for (let i = 0; i < keys.length && keys[st.idx] === avoid; i++) {
      st.idx = (st.idx + 1) % keys.length
    }
  }
  if (stickyMap.size > 4096) {
    for (const [k, v] of stickyMap) {
      if (now - v.since > windowMs * 10) stickyMap.delete(k)
    }
  }
  return keys[st.idx]
}

// ==================== Task 164: 单 key 在途并发感知溢出 ====================
//
// 背景: 粘性轮换把同一 (令牌,IP,模型) 的并发请求都钉在同一把上游 key 上 (Prompt Cache
// 友好), 但用户多任务并行时单 key 瞬时并发过高 — 上游免费档按「每密钥 RPM/并发」限流,
// 挤爆即整组 429 (用户实测多任务同发报错, 要求"不要逮着一个密钥干")。
//
// 方案: 记录每把 key 最近 SPREAD_WINDOW_MS 内的选取时刻 (对在途并发的近似 — 请求耗时
// 通常秒级, 10s 窗口内的选取数即并发上界)。粘性首选 key 若窗口内选取数已达阈值, 本次
// 请求溢出到下一把还有余量的 key; 窗口滑过后自动回归粘性首选。
// - 串行使用 (间隔 > 窗口) 永远命中粘性首选 → Prompt Cache 行为不变
// - 无需精确 release/生命周期挂钩: 时间戳自剪枝, 流式/hedge/异常中断均零泄漏
// - 全部 key 都忙时退回粘性首选, 由上游限流语义裁决 (不引入额外故障模式)
const SPREAD_WINDOW_MS = 10_000
const SPREAD_MAX_PICKS = 2

/** channelId -> 按池序的选取时刻数组 (池长变动自适应重建) */
const pickRing = new Map<number, number[][]>()

export function spreadTestProbe(channelId: number): number[] {
  return (pickRing.get(channelId) || []).map((r) => r.length)
}

export function spreadOnBusy(channelId: number, keys: string[], preferred: string, avoid?: string): string {
  if (keys.length <= 1) return preferred
  const now = Date.now()
  let ring = pickRing.get(channelId)
  if (!ring || ring.length !== keys.length) {
    ring = keys.map(() => [] as number[])
    pickRing.set(channelId, ring)
  }
  const start = Math.max(keys.indexOf(preferred), 0)
  for (let off = 0; off < keys.length; off++) {
    const i = (start + off) % keys.length
    if (avoid && keys[i] === avoid) continue
    const rec = ring[i].filter((t) => now - t < SPREAD_WINDOW_MS)
    ring[i] = rec
    if (rec.length < SPREAD_MAX_PICKS) {
      rec.push(now)
      if (off > 0) {
        // 溢出可观测: 仅在首选忙触发换 key 时记一行 (journalctl 按此排查单 key 挤压)
        console.error(`[relay] key-spread ch=${channelId} 首选 key 10s 窗口内已 ≥${SPREAD_MAX_PICKS} 发 → 溢出第 ${off} 跳`)
      }
      return keys[i]
    }
  }
  return preferred
}
