/**
 * 无感人机防护 (Task 90) — 取代行为验证卡 (SmartCaptcha, Task 90 移除)
 *
 * 设计取舍 (轻量、零打扰、零外部依赖):
 *   - 不再有验证卡片、4.5s 节奏持握与上游验证服务单点 (此前 yz.013.ltd
 *     不可达时, 全站登录/注册/发码全部受阻)。
 *   - 两道无感软防线, 专过滤「无差别模拟表单提交」的廉价脚本:
 *     1) 蜜罐字段: 表单里真人不可见、不可聚焦的 input, 正常用户恒为空;
 *        抓 HTML 后无差别填满全部字段的脚本会把它一并提交 → 拒绝。
 *     2) 驻留时间: 前端记录表单挂载 → 提交 的耗时 (客户端自算差值,
 *        无时钟漂移问题), 低于人类下限 (登录 0.8s / 注册与发码 1.2s) → 拒绝。
 *   - 零误伤原则: 两项字段缺失/畸形一律放行 (兼容旧缓存页面与脚本调用),
 *     硬防护仍由限流体系兜底 — 登录同 IP 10 分钟 60 次 + 撞库锁定,
 *     注册同 IP 每小时 5 个, 发码同邮箱 60s 冷却/每小时 5 封 + 同 IP 每小时 10 封。
 *   - 可见验证条 (auth-form 内联 UI): Turnstile 式极简形态, 点击/提交即绿勾,
 *     签发 ht 令牌随表单上送; 服务端仅做存在性格式校验 (缺失放行, 零误伤),
 *     提供验证存在感而不增加真人负担。
 */
import { AuthError } from '@/lib/auth'

/** 防护场景 → 最短驻留 (毫秒): 人类填表下限, 含余量 */
export type AntiBotScene = 'login' | 'register' | 'email-code'

const MIN_DWELL: Record<AntiBotScene, number> = {
  login: 800, // 自动填充 + 习惯性秒点也需 ~1s, 0.8s 不误伤真人
  register: 1200, // 需填 用户名+密码×2+邮箱+验证码, 真人实际 >20s
  'email-code': 1200, // 需先填合法邮箱再点发送
}

/**
 * 无感校验 (login / register / email-code 调用):
 * 蜜罐非空或驻留低于人类下限即拒绝; 字段缺失/畸形一律放行 (零误伤)。
 */
export function assertHuman(
  body: { hp?: unknown; dwellMs?: unknown; ht?: unknown },
  scene: AntiBotScene
): void {
  // 蜜罐: 真人不可见不可聚焦, 任何非空字符串即脚本特征
  if (typeof body.hp === 'string' && body.hp.trim() !== '') {
    throw new AuthError(403, '人机校验未通过，请刷新页面后重试')
  }
  // 驻留时间: 客户端自算的挂载→提交耗时; 负数视为时钟异常放行
  if (typeof body.dwellMs === 'number' && Number.isFinite(body.dwellMs)) {
    const dwell = Math.round(body.dwellMs)
    if (dwell >= 0 && dwell < MIN_DWELL[scene]) {
      throw new AuthError(403, '操作过快，请稍候再试')
    }
  }
  // 可见验证条令牌 (Task 90): 前端点击/自动通过后签发; 上送了才校验格式,
  // 缺失一律放行 (零误伤, 兼容旧缓存页面) — 真防线仍是蜜罐 + 驻留 + 限流体系
  if (body.ht !== undefined && body.ht !== null) {
    if (typeof body.ht !== 'string' || body.ht.length < 8 || body.ht.length > 128) {
      throw new AuthError(403, '人机校验未通过，请刷新页面后重试')
    }
  }
}
