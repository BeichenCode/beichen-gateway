'use client'

/**
 * 共享认证表单 — 登录/注册双模式
 * 完全复刻 SoybeanAdmin 官方登录页 (v2.2.0 src/views/_builtin/login/index.vue):
 *  - 主题色淡染全屏背景 (mixColor(#fff, primary #2080f0, 0.2) = #d2e6fc)
 *  - WaveBg 双波浪 SVG 背景 (官方 path 原样复刻, 渐变 #c5e8ff → #4aa3fd)
 *  - 居中白卡 (方角化, padding 19px 24px 20px = 官方 NCard 内容边距, 内容宽 400px)
 *  - 卡片头: Logo + 主题色系统标题左对齐品牌组 (返回官网固定在页面左上角, 无主题切换钮)
 *  - 大号输入框 (40px) + 记住我 + 圆角(primary round block)按钮
 *  - 点击式人机验证 (Task 129): 一键验证条替换照片拼图弹层 — 点击→安全检测→精美绿勾成功动画;
 *    服务端一次性凭证链不变 (captcha/new 签发挑战 → captcha/confirm 核销 → login/register 消费)
 * Task 85: 登录/注册切换零延迟 — 「立即注册/直接登录」不再走路由跳转, 单实例
 *  内部模式切换 + history.replaceState 同步地址栏 (已填字段全保留)
 * Task 91: 演示账号快捷登录已移除; 字段校验改为输入框下内联红字 (狂点不再
 *  堆积 toast 卡顿), 提交加 busyRef 重入锁 + toast 同文案全局去重兜底
 */
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, ChevronLeft, Check } from '@/components/ph'
import { toast, Toaster } from '@/components/naive-message'
import { isWellKnownEmail, EMAIL_DOMAIN_HINT } from '@/lib/email-policy'
import NaiveWave from '@/components/auth/naive-wave'
import { setAuthToken, getAuthToken } from '@/lib/api'

interface Props {
  mode: 'login' | 'register'
}

/** 官方 WaveBg: getPaletteColorByNumber(themeColor, 100/400) 精确取值 (@sa/color antd 算法, themeColor #2080f0) */
const WAVE_LIGHT = '#c5e8ff'
const WAVE_DARK = '#4aa3fd'

function WaveBg() {
  return (
    <div className="auth-waves pointer-events-none absolute left-0 top-0 z-0 h-full w-full overflow-hidden">
      <div className="absolute -right-[300px] -top-[900px] max-sm:-right-[100px] max-sm:-top-[1170px]">
        <svg height="1337" width="1337">
          <defs>
            <path
              id="auth-wave-path-1"
              opacity="1"
              fillRule="evenodd"
              d="M1337,668.5 C1337,1037.455193874239 1037.455193874239,1337 668.5,1337 C523.6725684305388,1337 337,1236 370.50000000000006,1094 C434.03835568300906,824.6732385973953 6.906089672974592e-14,892.6277623047779 0,668.5000000000001 C0,299.5448061257611 299.5448061257609,1.1368683772161603e-13 668.4999999999999,0 C1037.455193874239,0 1337,299.544806125761 1337,668.5Z"
            />
            <linearGradient id="auth-wave-grad-1" x1="0.79" y1="0.62" x2="0.21" y2="0.86">
              <stop offset="0" stopColor={WAVE_LIGHT} stopOpacity="1" />
              <stop offset="1" stopColor={WAVE_DARK} stopOpacity="1" />
            </linearGradient>
          </defs>
          <g opacity="1">
            <use href="#auth-wave-path-1" fill="url(#auth-wave-grad-1)" fillOpacity="1" />
          </g>
        </svg>
      </div>
      <div className="absolute -bottom-[400px] -left-[200px] max-sm:-bottom-[760px] max-sm:-left-[100px]">
        <svg height="896" width="967.8852157128662">
          <defs>
            <path
              id="auth-wave-path-2"
              opacity="1"
              fillRule="evenodd"
              d="M896,448 C1142.6325445712241,465.5747656464056 695.2579309733121,896 448,896 C200.74206902668806,896 5.684341886080802e-14,695.2579309733121 0,448.0000000000001 C0,200.74206902668806 200.74206902668791,5.684341886080802e-14 447.99999999999994,0 C695.2579309733121,0 475,418 896,448Z"
            />
            <linearGradient id="auth-wave-grad-2" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0" stopColor={WAVE_DARK} stopOpacity="1" />
              <stop offset="1" stopColor={WAVE_LIGHT} stopOpacity="1" />
            </linearGradient>
          </defs>
          <g opacity="1">
            <use href="#auth-wave-path-2" fill="url(#auth-wave-grad-2)" fillOpacity="1" />
          </g>
        </svg>
      </div>
    </div>
  )
}

/**
 * naive NCheckbox 同款: 方框 + primary 选中 + 官方 hover/focus 态
 *  - hover (未选中): 边框变主题色实色 (官方 borderChecked)
 *  - focus 键盘可见: 边框主题色 + 0 0 0 2px primary@30% (官方 boxShadowFocus)
 *  - 对勾: scale(.5)↔scale(1) + opacity, 0.3s (官方 iconSwitchTransition)
 *  - 点击波纹: n-wave 同源, 从方框扩散一圈主题色方形波纹 (16px 方框收紧版)
 */
function AuthCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const [waveKey, setWaveKey] = useState(0)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => {
        onChange(!checked)
        setWaveKey((k) => k + 1)
      }}
      className="auth-checkbox group flex cursor-pointer select-none items-center gap-2 text-sm text-foreground/80 transition-colors duration-300 hover:text-foreground"
    >
      <span
        className={`auth-checkbox-box relative flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          checked ? 'auth-checkbox-box--checked' : ''
        }`}
      >
        <Check
          size={12}
          className={`text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        />
        {waveKey > 0 && <span key={waveKey} aria-hidden className="n-wave" />}
      </span>
      记住我
    </button>
  )
}

/** 人机验证条右侧盾形徽标 (拼图状态条; idle 弱化态, verified 由父级绿色继承) */
function ShieldMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-auto h-[18px] w-[18px] shrink-0 opacity-45"
      aria-hidden
    >
      <path d="M12 2.5l7.5 2.8v5.9c0 4.9-3.2 9.2-7.5 10.6-4.3-1.4-7.5-5.7-7.5-10.6V5.3L12 2.5z" />
      <path d="M8.8 12l2.2 2.2 4.2-4.2" />
    </svg>
  )
}

export default function AuthForm({ mode }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [affCode, setAffCode] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [siteName, setSiteName] = useState('北辰中转站')
  const [announcement, setAnnouncement] = useState('')
  const [registerEnabled, setRegisterEnabled] = useState(true)
  // 邮箱验证码 (Task 80): 站点开启后注册需邮箱+验证码
  const [emailVerification, setEmailVerification] = useState(false)
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  // Task 130: 已登录检测命中后置位 (UI 呈现「正在进入控制台」反馈, 防闪表单)
  const [checking, setChecking] = useState(false)
  // 无感人机防护 (Task 90): 蜜罐字段 + 驻留计时 (字段保留, 供后端 antibot 兼容)
  const hpRef = useRef<HTMLInputElement>(null)
  const openedAtRef = useRef(0)
  // 人机验证条 (Task 129 点击式): idle(点击验证)/verifying(检测中)/verified(成功动画)/error(重试) 四态;
  // captchaId 为服务端一次性凭证 (captcha/new 签发挑战 → captcha/confirm 核销)
  const [hcState, setHcState] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle')
  const [hcErr, setHcErr] = useState('')
  const captchaIdRef = useRef('')
  const verifyingRef = useRef(false)
  // 提交重入锁 (Task 91): ref 同步生效, 狂点/狂按 Enter 在网络往返期间只放行一次
  const busyRef = useRef(false)
  // 字段级内联错误 (Task 91): 取代 toast 弹窗, 狂点只刷新红字不堆积提示卡
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Task 85: 登录/注册同卡即时切换 — 内部模式覆盖 + history.replaceState 同步地址栏。
  // 免 RSC 导航/整卡重挂载/状态接口重拉, 点击即切零延迟。
  const [modeOverride, setModeOverride] = useState<Props['mode'] | null>(null)
  const effMode = modeOverride ?? mode
  const isLogin = effMode === 'login'

  /** 即时切换登录/注册 (零网络往返): 更新内部态 + 保留 Next 历史状态同步地址栏 */
  function switchMode(next: Props['mode']) {
    if (next === effMode) return
    setModeOverride(next)
    try {
      window.history.replaceState(window.history.state, '', next === 'login' ? '/login' : '/register')
    } catch {}
  }

  /** 清除某字段内联错误 (输入即纠错) */
  function clearErr(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  /** 点击式人机验证 (Task 129): 领挑战 → 节奏停顿 → 核销签发凭证 → 绿勾成功动画; 失败红字抖动后自动回 idle */
  async function runHumanCheck(): Promise<boolean> {
    if (verifyingRef.current) return false
    verifyingRef.current = true
    setHcErr('')
    setHcState('verifying')
    const t0 = Date.now()
    try {
      const r1 = await fetch('/api/captcha/new', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const j1 = (await r1.json().catch(() => ({}))) as { data?: { id?: string }; message?: string }
      const id = j1?.data?.id
      if (!r1.ok || !id) throw new Error(j1?.message || '验证服务暂不可用，请稍后重试')
      // 感知节奏: 验证条至少转 900ms (过渡动画时长, 同时满足服务端 durationMs 门槛)
      const wait = Math.max(0, 900 - (Date.now() - t0))
      await new Promise((r) => setTimeout(r, wait))
      const r2 = await fetch('/api/captcha/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, durationMs: Date.now() - t0 }),
      })
      const j2 = (await r2.json().catch(() => ({}))) as { success?: boolean; message?: string }
      if (!r2.ok || j2?.success === false) throw new Error(j2?.message || '验证未通过，请重试')
      captchaIdRef.current = id
      setHcState('verified')
      return true
    } catch (e) {
      setHcErr((e as Error).message || '验证未通过，请重试')
      setHcState('error')
      setTimeout(() => {
        setHcState((s) => (s === 'error' ? 'idle' : s))
        setHcErr('')
      }, 1800)
      return false
    } finally {
      verifyingRef.current = false
    }
  }

  /** 验证条点击 (手动触发; 提交时若未验证也会自动触发) */
  function handleHumanCheck() {
    if (busyRef.current) return
    void runHumanCheck()
  }

  useEffect(() => {
    // 驻留计时起点 (Task 90): 客户端时间, 提交时算差值, 无时钟漂移问题
    openedAtRef.current = Date.now()
    // Task 130: 已登录检测 — 携带有效会话访问登录/注册页不再重复登录,
    // 校验通过直接送回控制台 (历史行为: 已登录仍要求重新点登录, 被用户指出)
    const existing = getAuthToken()
    if (existing) {
      let dead = false
      fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + existing } })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!dead && j?.data) {
            setChecking(true)
            window.location.replace('/console#/dashboard')
          }
        })
        .catch(() => {})
      return () => {
        dead = true
      }
    }
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setSiteName(j.data.systemName || '北辰中转站')
          setAnnouncement(j.data.announcement || '')
          setRegisterEnabled(j.data.registerEnabled !== false)
          setEmailVerification(j.data.emailVerification === true)
        }
      })
      .catch(() => {})
    const params = new URLSearchParams(window.location.search)
    const aff = params.get('aff')
    if (aff) setAffCode(aff)
    // 记住我: 回填上次登录用户名
    try {
      const saved = localStorage.getItem('newapi_remember_username')
      if (saved) {
        setUsername(saved)
        setRemember(true)
      }
    } catch {}
  }, [])

  /** 提交登录/注册 (Task 91: busyRef 重入锁 + 字段内联校验) */
  async function handleSubmit() {
    if (busyRef.current) return // 防连点: 上一次提交未结束前忽略一切触发 (按钮/Enter)
    const u = username
    const p = password
    // 字段校验 (Task 91): 内联红字取代 toast — 狂点只刷新错误提示, 不再堆积弹窗卡顿
    const errs: Record<string, string> = {}
    if (!u.trim()) errs.username = '请输入用户名'
    // Task 95-⑤: 注册模式同步后端放宽规则 (汉字+字母+数字+下划线, 2-20 位) 内联红字提前拦截
    if (effMode === 'register' && u.trim() && !/^[\p{Script=Han}a-zA-Z0-9_]{2,20}$/u.test(u.trim())) {
      errs.username = '用户名支持中文、字母、数字、下划线，长度 2-20 位'
    }
    if (!p) errs.password = '请输入密码'
    if (effMode === 'register' && emailVerification) {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
        errs.email = '请输入正确的邮箱地址'
      } else if (!isWellKnownEmail(email.trim().toLowerCase())) {
        // Task 95-⑥: 白名单内联提前拦截, 文案与后端一致
        errs.email = `暂仅支持主流邮箱（${EMAIL_DOMAIN_HINT}）`
      }
      if (!emailCode.trim()) errs.emailCode = '请输入邮箱验证码'
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    if (effMode === 'register' && !registerEnabled) {
      toast.warning('当前站点已关闭注册，请联系管理员开通账号')
      return
    }
    busyRef.current = true
    setLoading(true)
    const loadingId = toast.loading(isLogin ? '正在验证身份 …' : '正在创建账号 …', { duration: 0 })
    try {
      // 点击式人机验证 (Task 129): 未验证 → 收起 loading 自动跑验证条动画, 成功后重新进入提交
      if (!captchaIdRef.current) {
        toast.dismiss(loadingId)
        setLoading(false)
        busyRef.current = false
        const ok = await runHumanCheck()
        if (!ok) return
        void handleSubmit()
        return
      }
      const url = effMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload: Record<string, unknown> = { username: u.trim(), password: p }
      payload.hp = hpRef.current?.value ?? ''
      if (openedAtRef.current > 0) payload.dwellMs = Date.now() - openedAtRef.current
      if (captchaIdRef.current) payload.captchaId = captchaIdRef.current
      if (effMode === 'register' && affCode) payload.affCode = affCode
      if (effMode === 'register' && emailVerification) {
        payload.email = email.trim()
        payload.emailCode = emailCode.trim()
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await resp.json().catch(() => ({}))) as {
        success?: boolean
        message?: string
        data?: { token?: string }
      }
      if (!resp.ok || json.success === false) {
        throw new Error(json.message || '操作失败，请稍后重试')
      }
      // 记住我: 保存/清除用户名
      try {
        if (remember && effMode === 'login') localStorage.setItem('newapi_remember_username', u.trim())
        else localStorage.removeItem('newapi_remember_username')
      } catch {}
      // Bearer token 持久化 (兼容 iframe/三方 cookie 受限场景)
      if (json.data?.token) setAuthToken(json.data.token)
      toast.dismiss(loadingId)
      toast.success(isLogin ? '登录成功，正在进入控制台 …' : '注册成功，正在进入控制台 …')
      setTimeout(() => {
        window.location.href = '/console#/dashboard'
      }, 650)
    } catch (err) {
      toast.dismiss(loadingId)
      const msg = (err as Error).message || '操作失败'
      toast.error(msg)
      setLoading(false)
      busyRef.current = false
      // 凭证失效 (过期/已消费/后端重启) → 重置验证态, 用户点击验证条重验
      if (msg.includes('安全验证') || msg.includes('人机验证')) {
        captchaIdRef.current = ''
        setHcState('idle')
      }
    }
  }

  /** 发送邮箱验证码: 60s 冷却倒计时由后端响应与本地状态共同控制 */
  async function handleSendCode() {
    const mail = email.trim()
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(mail)) {
      setErrors((prev) => ({ ...prev, email: '请先输入正确的邮箱地址' }))
      return
    }
    // Task 95-⑥: 白名单发码前拦截 (后端 email-code 路由同规则为准)
    if (!isWellKnownEmail(mail.toLowerCase())) {
      setErrors((prev) => ({ ...prev, email: `暂仅支持主流邮箱（${EMAIL_DOMAIN_HINT}）` }))
      return
    }
    setSending(true)
    try {
      // 无感防护上送 (Task 90): 蜜罐原值 + 驻留耗时 (从表单挂载起算)
      const resp = await fetch('/api/auth/email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mail,
          hp: hpRef.current?.value ?? '',
          ...(openedAtRef.current > 0 ? { dwellMs: Date.now() - openedAtRef.current } : {}),
        }),
      })
      const json = (await resp.json().catch(() => ({}))) as { success?: boolean; message?: string }
      if (!resp.ok || json.success === false) throw new Error(json.message || '发送失败，请稍后重试')
      toast.success(`验证码已发送至 ${mail}，请查收邮件（5 分钟内有效）`)
      setCooldown(60)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  // 验证码冷却倒计时
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const inputCls = 'sb-input h-10 w-full rounded-[2px]'

  return (
    <div className="auth-page relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-5 py-10">
      <WaveBg />
      <NaiveWave />
      <Toaster />

      {/* Task 130: 已登录命中 — 全屏过渡层 (转圈 + 文案), 避免跳转前闪现登录表单 */}
      {checking && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm">
          <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-label="加载中">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-muted-foreground">检测到登录状态，正在进入控制台 …</p>
        </div>
      )}

      {/* 无感蜜罐 (Task 90): 真人不可见不可聚焦; 无差别填表的脚本会一并提交从而被拒 */}
      <input
        ref={hpRef}
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] -top-[9999px] h-0 w-0 opacity-0"
      />

      {/* 页面左上角: 返回官网
          Task 66: ① 改用原生 <a> + data-launch — 点击立即触发按压缩放+全屏白帷幕
          (Task 65 兑底体系), 随后原生整页跳转: 弱网下 SPA 拉取 RSC 的数秒死亡窗口
          消失, 且落地后开屏动画自然承接, 「点了没反应」根因消除; ② 移动端不再隐藏
          文字, 热区从 ~34px 加大到 h-10+px-3 */}
      <a
        href="/"
        data-launch
        aria-label="返回官网"
        title="返回官网"
        className="cta-veil-ok absolute left-3 top-3 z-20 flex h-10 cursor-pointer items-center gap-0.5 rounded-[3px] px-3 text-sm text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground sm:left-6 sm:top-6"
      >
        <ChevronLeft size={18} />
        <span>返回官网</span>
      </a>

      {/* ============ 居中卡片 (锐利直角, 官方结构 + 方角化) ============ */}
      <div className="auth-card auth-card-in relative z-10 w-[448px] max-w-[calc(100vw-2.5rem)]">
        <div className="w-full">
          {/* 卡片头: Logo + 系统标题紧凑左对齐
              Task 66: Logo 可点击返回官网 (原生跳转 + 按压反馈; 卡内 transform
              动画会使 fixed 帷幕被劫持为局部, 故不挂 cta-veil-ok), 并加 hover 提示 */}
          <header className="flex min-w-0 items-center gap-3 sm:gap-4">
            <a
              href="/"
              data-launch
              title="点击返回官网"
              className="shrink-0 cursor-pointer transition-opacity duration-200 hover:opacity-85"
            >
              <Image
                src="/logo.png"
                alt="Logo"
                width={64}
                height={64}
                priority
                className="h-10 w-10 object-contain sm:h-16 sm:w-16"
              />
            </a>
            <h3 className="min-w-0 truncate text-lg font-medium text-primary sm:text-[28px]">
              {siteName}
            </h3>
          </header>

          {/* 模块标题 + 表单 (官方 fade-slide 入场) */}
          <main className="pt-6">
            <h3 className="text-lg font-medium text-primary">{isLogin ? '登录' : '注册'}</h3>
            <div className="auth-slide-in pt-6">
              <div className={isLogin ? 'flex flex-col gap-6' : 'flex flex-col gap-5'}>
                {/* 用户名 */}
                <div>
                  <input
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      clearErr('username')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder={isLogin ? '请输入用户名' : '2-20 位，支持中文、字母、数字'}
                    autoComplete="username"
                    autoFocus
                    aria-invalid={!!errors.username}
                    className={`${inputCls} ${errors.username ? 'sb-input--error' : ''}`}
                  />
                  {errors.username && <p className="sb-field-err mt-1.5 text-xs">{errors.username}</p>}
                </div>

                {/* 密码 */}
                <div>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        clearErr('password')
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder={isLogin ? '请输入密码' : '请输入密码 (至少 6 位)'}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      aria-invalid={!!errors.password}
                      className={`${inputCls} pr-11 ${errors.password ? 'sb-input--error' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[2px] text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                      aria-label="显示/隐藏密码"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="sb-field-err mt-1.5 text-xs">{errors.password}</p>}
                </div>

                {/* 登录附加行: 记住我 + 忘记密码 */}
                {isLogin && (
                  <div className="flex items-center justify-between">
                    <AuthCheckbox checked={remember} onChange={setRemember} />
                    <button
                      type="button"
                      onClick={() => toast.info('请联系管理员重置密码')}
                      className="n-btn n-btn-quaternary h-8 cursor-pointer px-2 text-[13px] text-muted-foreground"
                    >
                      忘记密码?
                    </button>
                  </div>
                )}

                {/* 注册附加字段 */}
                {!isLogin && (
                  <>
                    {/* 邮箱验证码 (Task 80): 站点开启后展示 */}
                    {!isLogin && emailVerification && (
                      <>
                        <div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              clearErr('email')
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="请输入邮箱"
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                            className={`${inputCls} ${errors.email ? 'sb-input--error' : ''}`}
                          />
                          {errors.email && <p className="sb-field-err mt-1.5 text-xs">{errors.email}</p>}
                        </div>
                        <div>
                          <div className="flex gap-2">
                            <input
                              value={emailCode}
                              onChange={(e) => {
                                setEmailCode(e.target.value)
                                clearErr('emailCode')
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                              placeholder="邮箱验证码"
                              autoComplete="one-time-code"
                              inputMode="numeric"
                              maxLength={6}
                              aria-invalid={!!errors.emailCode}
                              className={`${inputCls} flex-1 font-mono tracking-[0.3em] ${errors.emailCode ? 'sb-input--error' : ''}`}
                            />
                            <button
                              type="button"
                              onClick={handleSendCode}
                              disabled={sending || cooldown > 0}
                              className="n-btn n-btn-quaternary inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 px-3 text-[13px] text-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {sending ? (
                                // Task 130: 发送中改为转圈动画 (用户反馈「发送中」干文字不好看)
                                <svg
                                  className="h-4 w-4 animate-spin"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-label="发送中"
                                >
                                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                              ) : cooldown > 0 ? (
                                `${cooldown}s 后重发`
                              ) : (
                                '获取验证码'
                              )}
                            </button>
                          </div>
                          {errors.emailCode && <p className="sb-field-err mt-1.5 text-xs">{errors.emailCode}</p>}
                        </div>
                      </>
                    )}
                    <input
                      value={affCode}
                      onChange={(e) => setAffCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="邀请码 (选填)"
                      className={inputCls}
                    />
                  </>
                )}

                {/* 主按钮 (官方 round block) + 注册入口文字链 / 返回登录 */}
                <div className={isLogin ? 'flex flex-col gap-6' : 'flex flex-col gap-[18px]'}>
                  {/* 点击式人机验证条 (Task 129): 点击→安全检测→绿勾描边成功动画; 提交未验证时自动触发 */}
                  <button
                    type="button"
                    onClick={handleHumanCheck}
                    disabled={hcState === 'verifying' || hcState === 'verified'}
                    aria-live="polite"
                    className={`hc-bar relative flex h-10 w-full select-none items-center gap-2.5 overflow-hidden rounded-[2px] border px-3 text-sm transition-colors duration-200 ${
                      hcState === 'verified'
                        ? 'hc-pop border-[#18a058]/40 bg-[#18a058]/[0.06] text-[#18a058]'
                        : hcState === 'error'
                          ? 'hc-shake-x border-[#d03050]/50 bg-[#d03050]/[0.05] text-[#d03050]'
                          : 'hc-bar--idle border-[var(--input)] bg-card text-muted-foreground hover:border-[var(--primary-hover)]'
                    } ${hcState === 'idle' || hcState === 'error' ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {hcState === 'idle' && (
                      <>
                        <span aria-hidden className="hc-ring shrink-0" />
                        <span>点击进行安全验证</span>
                        <ShieldMark />
                      </>
                    )}
                    {hcState === 'verifying' && (
                      <>
                        <span aria-hidden className="hc-spinner" />
                        <span>安全检测中 …</span>
                      </>
                    )}
                    {hcState === 'verified' && (
                      <>
                        <span aria-hidden className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center">
                          <span className="hc-halo absolute inset-0 rounded-full bg-[#18a058]/25" />
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="hc-check-svg h-[22px] w-[22px]"
                          >
                            <circle className="hc-c" cx="12" cy="12" r="8" />
                            <path className="hc-k" d="M8.6 12.2l2.2 2.2 4.4-4.6" />
                          </svg>
                        </span>
                        <span>安全验证成功</span>
                        <span className="ml-auto text-xs opacity-60">已完成</span>
                      </>
                    )}
                    {hcState === 'error' && (
                      <>
                        <span aria-hidden className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-[#d03050]/60" />
                        <span className="truncate">{hcErr || '验证未通过，请重试'}</span>
                        <span className="ml-auto shrink-0 text-xs opacity-60">点击重试</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="n-btn n-btn-primary h-10 w-full cursor-pointer rounded-[2px] tracking-wide"
                  >
                    {loading && (
                      <span className="flex items-center gap-1">
                        <span className="btn-dot h-1.5 w-1.5 rounded-full bg-white/90" />
                        <span className="btn-dot h-1.5 w-1.5 rounded-full bg-white/90" style={{ animationDelay: '0.12s' }} />
                        <span className="btn-dot h-1.5 w-1.5 rounded-full bg-white/90" style={{ animationDelay: '0.24s' }} />
                      </span>
                    )}
                    <span>{isLogin ? '登 录' : '注 册'}</span>
                  </button>

                  {/* 免责声明 (Task 103): 注册模式常驻提示, 合规底线 */}
                  {!isLogin && (
                    <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
                      点击注册即表示您已阅读并同意
                      <a href="/#disclaimer" target="_blank" rel="noreferrer" className="mx-0.5 text-primary hover:underline">
                        《服务条款与免责声明》
                      </a>
                      —— 本服务仅供合法合规用途，严禁用于任何违法活动，违规将封号处理。
                    </p>
                  )}

                  {isLogin ? (
                    /* 注册入口: 常规文字链 (Task 85: 点击即时切换, 不再走路由跳转) */
                    <p className="text-center text-sm text-muted-foreground">
                      还没有账号？
                      <a
                        href="/register"
                        draggable={false}
                        onClick={(e) => {
                          e.preventDefault()
                          switchMode('register')
                        }}
                        className="ml-1 inline-flex cursor-pointer items-center font-medium text-primary transition-colors duration-200 hover:text-[var(--primary-hover)]"
                      >
                        立即注册
                      </a>
                    </p>
                  ) : (
                    /* 返回登录: 与登录页同款文字链 (Task 85: 点击即时切换) */
                    <p className="text-center text-sm text-muted-foreground">
                      已有账号？
                      <a
                        href="/login"
                        draggable={false}
                        onClick={(e) => {
                          e.preventDefault()
                          switchMode('login')
                        }}
                        className="ml-1 inline-flex cursor-pointer items-center font-medium text-primary transition-colors duration-200 hover:text-[var(--primary-hover)]"
                      >
                        直接登录
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* 站点公告 */}
              {announcement && isLogin && (
                <div className="mt-6 border-l-2 border-primary/50 bg-muted/60 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  <span className="mr-1.5 font-medium text-foreground">公告</span>
                  {announcement}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* 页脚 (Task 66: 新增第二个明确可点的返回官网入口) */}
      <p className="relative z-10 mt-8 flex select-none items-center gap-3 text-xs text-primary/50 max-sm:mt-6">
        <span>© 2026 {siteName}</span>
        <span aria-hidden className="h-3 w-px bg-primary/25" />
        <a
          href="/"
          data-launch
          className="cta-veil-ok inline-flex cursor-pointer items-center gap-0.5 text-primary/70 transition-colors duration-200 hover:text-primary"
        >
          <ChevronLeft size={12} />
          返回官网
        </a>
      </p>
    </div>
  )
}
