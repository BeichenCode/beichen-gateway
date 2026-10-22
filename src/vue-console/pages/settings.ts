/**
 * 系统设置 — 多分组设置 (管理员, n-tabs + n-form 原生)
 */
import '../flags'
import { defineComponent, onMounted, ref } from 'vue'
import { NButton, NCard, NInput, NInputNumber, NSelect, NSwitch, NTabs, NTabPane, NAlert, NCollapse, NCollapseItem } from 'naive-ui'
import { apiGet, apiPut } from '@/lib/api'
import { message } from '../message'
import { useUserStore } from '../stores'
import { Save, Settings2, MonitorCheck, ShieldCheck, Wallet, BellRing, CreditCard } from 'lucide-vue-next'

type SettingsMap = Record<string, string>

export default defineComponent({
  name: 'SettingsPage',
  setup() {
    const options = ref<SettingsMap | null>(null)
    const tab = ref('system')
    const saving = ref(false)
    const advOpen = ref(false)

    onMounted(() => {
      apiGet<{ data: SettingsMap }>('/api/console/option')
        .then((r) => (options.value = r.data))
        .catch((e) => message.error((e as Error).message))
    })

    function set(key: string, value: string | boolean) {
      if (!options.value) return
      options.value = { ...options.value, [key]: typeof value === 'boolean' ? String(value) : value }
    }
    const val = (k: string, d = '') => options.value?.[k] ?? d
    const boolOf = (k: string) => options.value?.[k] === 'true'
    const numOf = (k: string, d = 0) => {
      const p = parseFloat(options.value?.[k] ?? '')
      return isFinite(p) ? p : d
    }

    async function handleSave() {
      if (!options.value) return
      saving.value = true
      try {
        await apiPut('/api/console/option', { data: options.value })
        message.success('设置已保存')
      } catch (e) {
        message.error((e as Error).message)
      } finally {
        saving.value = false
      }
    }

    const mailOptions = [
      { value: 'tencent-ses', label: '腾讯云 SES (推荐)' },
      { value: 'smtp', label: 'SMTP (回退)' },
    ]

    return {
      options, tab, saving, handleSave, set, val, boolOf, numOf, mailOptions, advOpen,
      NButton, NCard, NInput, NInputNumber, NSelect, NSwitch, NTabs, NTabPane, NAlert, NCollapse, NCollapseItem,
      Save, Settings2, MonitorCheck, ShieldCheck, Wallet, BellRing, CreditCard,
    }
  },
  template: `
  <div v-if="options">
    <page-header title="系统设置" description="配置站点信息、注册策略、计费参数与监控规则">
      <template #extra>
        <n-button type="primary" :loading="saving" @click="handleSave">
          <template #icon><save :size="14" /></template>
          保存全部设置
        </n-button>
      </template>
    </page-header>
    <n-card :content-style="'padding: 20px'">
      <n-tabs v-model:value="tab" type="line" animated>
        <!-- 系统设置 -->
        <n-tab-pane name="system" tab="系统设置">
          <div class="flex max-w-xl flex-col gap-4">
            <form-row label="系统名称"><n-input :value="val('SystemName')" @update:value="(v) => set('SystemName', v)" /></form-row>
            <form-row label="服务器地址" hint="用于生成 API 调用示例，例如 https://api.example.com">
              <n-input :value="val('ServerAddress')" placeholder="https://" @update:value="(v) => set('ServerAddress', v)" />
            </form-row>
            <form-row label="页脚 HTML" hint="支持 HTML，显示在页面底部">
              <n-input :value="val('FooterHTML')" type="textarea" :rows="2" @update:value="(v) => set('FooterHTML', v)" />
            </form-row>
            <form-row label="About 内容" hint="支持 Markdown，展示在关于页">
              <n-input :value="val('About')" type="textarea" :rows="5" @update:value="(v) => set('About', v)" />
            </form-row>
          </div>
        </n-tab-pane>

        <!-- 注册与登录 -->
        <n-tab-pane name="register" tab="注册与登录">
          <div class="flex max-w-xl flex-col gap-5">
            <div class="flex items-center justify-between gap-4 border border-[var(--border)] p-4">
              <div>
                <div class="text-sm font-medium text-foreground">允许新用户注册</div>
                <div class="mt-0.5 text-xs text-muted-foreground">关闭后登录页将无法注册</div>
              </div>
              <n-switch :value="boolOf('RegisterEnabled')" @update:value="(v) => set('RegisterEnabled', v)" />
            </div>
            <div class="flex items-center justify-between gap-4 border border-[var(--border)] p-4">
              <div>
                <div class="text-sm font-medium text-foreground">注册需要邮箱验证码</div>
                <div class="mt-0.5 text-xs text-muted-foreground">开启后注册需填写邮箱并完成验证码校验 (需先配置邮件服务)</div>
              </div>
              <n-switch :value="boolOf('EmailVerificationEnabled')" @update:value="(v) => set('EmailVerificationEnabled', v)" />
            </div>
            <div class="bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              防刷防护：登录 / 注册 / 发码均为无感校验（蜜罐字段 + 驻留时间），真人零感知零打扰。
              硬限流兜底：登录同 IP 10 分钟 60 次 + 撞库锁定（同账号 15 分钟失败 10 次即锁），
              注册同 IP 每小时 5 个，发码同邮箱 60s 冷却 / 每小时 5 封、同 IP 每小时 10 封。
            </div>
            <div class="bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              邮件服务：配置后系统才能发送验证码邮件。推荐「腾讯云 SES」通道 —— 邮件经腾讯中转投递，
              邮件头不暴露源站 IP，发件人为平台自有域名地址；SMTP 通道为回退方案 (端口 465 隐式 TLS / 587 STARTTLS)。
              邮件版式已全面重做为品牌精美版：验证码/工单通知/工单回复三款模版与 SMTP 通道同源同观感，
              模版 ID 预填 226046/226047/226048（管理员工单回复通知需同时配工单回复模版）。
              发件频率限制：同邮箱 60s 冷却 / 每小时 5 封，同 IP 每小时 10 封。
            </div>
            <form-row label="发信通道" hint="腾讯云 SES 为推荐通道 (防源站 IP 暴露)；SMTP 为通用回退">
              <n-select :value="val('MailProvider') === 'tencent-ses' ? 'tencent-ses' : 'smtp'" :options="mailOptions" @update:value="(v) => set('MailProvider', v)" />
            </form-row>
            <template v-if="val('MailProvider') === 'tencent-ses'">
              <form-row label="腾讯云 SecretId" hint="访问管理 API 密钥 ( SES 发信权限 )">
                <n-input :value="val('TCSecretId')" type="password" show-password-on="click" placeholder="AKIDxxxxxxxxxxxxxxxxxx" @update:value="(v) => set('TCSecretId', v)" />
              </form-row>
              <form-row label="腾讯云 SecretKey" hint="与 SecretId 成对, 请妥善保管">
                <n-input :value="val('TCSecretKey')" type="password" show-password-on="click" placeholder="••••••••" @update:value="(v) => set('TCSecretKey', v)" />
              </form-row>
              <form-row label="SES 地域" hint="发信域名/地址所在地域, 如 ap-hongkong">
                <n-input :value="val('SESRegion')" placeholder="ap-hongkong" @update:value="(v) => set('SESRegion', v)" />
              </form-row>
              <form-row label="SES 发件人地址" hint="须为 SES 控制台已创建的发信地址 (发信域名需验证通过)">
                <n-input :value="val('SESFromEmail')" placeholder="noreply@example.com" @update:value="(v) => set('SESFromEmail', v)" />
              </form-row>
              <form-row label="SES 发件人别名" hint="收件方显示的发件人名称">
                <n-input :value="val('SESFromName')" placeholder="北辰中转站" @update:value="(v) => set('SESFromName', v)" />
              </form-row>
              <form-row label="SES 验证码模版 ID" hint="验证码邮件模版 (需已审核)。精美版 v1 = 226046，占位符 {{code}}/{{minutes}}">
                <n-input :value="val('SESTemplateId')" placeholder="226046" @update:value="(v) => set('SESTemplateId', v)" />
              </form-row>
              <form-row label="工单通知模版 ID" hint="可选。新工单通知管理员的模版，精美版 v1 = 226047；留空则 SES 下工单通知跳过">
                <n-input :value="val('SESTicketTemplateId')" placeholder="226047" @update:value="(v) => set('SESTicketTemplateId', v)" />
              </form-row>
              <form-row label="工单回复模版 ID" hint="可选。工单回复通知用户的模版，精美版 v1 = 226048；留空则 SES 下回复通知跳过">
                <n-input :value="val('SESTicketReplyTemplateId')" placeholder="226048" @update:value="(v) => set('SESTicketReplyTemplateId', v)" />
              </form-row>
            </template>
            <template v-else>
              <form-row label="SMTP 服务器地址" hint="例如 smtp.qq.com / smtpdm.aliyun.com">
                <n-input :value="val('SMTPServer')" placeholder="smtp.example.com" @update:value="(v) => set('SMTPServer', v)" />
              </form-row>
              <form-row label="SMTP 端口" hint="465 (SSL) / 587 (STARTTLS) / 25">
                <n-input :value="val('SMTPPort')" placeholder="465" @update:value="(v) => set('SMTPPort', v)" />
              </form-row>
              <form-row label="SMTP 账号" hint="登录 SMTP 服务的邮箱账号">
                <n-input :value="val('SMTPAccount')" placeholder="noreply@example.com" @update:value="(v) => set('SMTPAccount', v)" />
              </form-row>
              <form-row label="SMTP 密码/授权码" hint="邮箱服务商提供的授权码 (非登录密码)，请妥善保管">
                <n-input :value="val('SMTPToken')" type="password" show-password-on="click" placeholder="••••••••" @update:value="(v) => set('SMTPToken', v)" />
              </form-row>
              <form-row label="发件人地址" hint="收件方显示的发件邮箱，通常与 SMTP 账号一致">
                <n-input :value="val('SMTPFrom')" placeholder="noreply@example.com" @update:value="(v) => set('SMTPFrom', v)" />
              </form-row>
            </template>
            <div class="flex items-center justify-between gap-4 border border-[var(--border)] p-4">
              <div>
                <div class="text-sm font-medium text-foreground">启用邀请奖励</div>
                <div class="mt-0.5 text-xs text-muted-foreground">新用户通过邀请码注册时，邀请人获得额度奖励</div>
              </div>
              <n-switch :value="boolOf('AffInviteEnabled')" @update:value="(v) => set('AffInviteEnabled', v)" />
            </div>
            <form-row label="邀请奖励 (¥)" hint="每邀请一位新用户注册，邀请人获得的人民币面值额度（按当前充值汇率实时折算为内部额度）">
              <n-input-number :value="numOf('AffQuota')" :step="0.01" style="width: 100%" @update:value="(v) => set('AffQuota', String(v ?? 0))" />
            </form-row>
            <form-row label="新用户注册赠送 (¥)" hint="新用户注册即赠送的人民币面值额度，0 表示不赠送（按当前充值汇率实时折算）">
              <n-input-number :value="numOf('QuotaForNewUser')" :step="0.01" style="width: 100%" @update:value="(v) => set('QuotaForNewUser', String(v ?? 0))" />
            </form-row>
          </div>
        </n-tab-pane>

        <!-- 计费设置 (Task 126 重做: 1:1 计价直读, 内部参数收进高级折叠不再曝露) -->
        <n-tab-pane name="billing" tab="计费设置">
          <div class="flex max-w-xl flex-col gap-4">
            <div class="relative overflow-hidden border border-[var(--border)] p-5" style="border-radius: 8px; background: linear-gradient(135deg, rgba(67,56,202,0.07), rgba(124,58,237,0.05))">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">额度计价方式</span>
                <span class="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style="background: linear-gradient(135deg, #4338ca, #7c3aed)">1 : 1</span>
              </div>
              <div class="mt-2 text-2xl font-bold" style="color: #4338ca">1 额度 = ¥1</div>
              <div class="mt-3 flex flex-col gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <div class="flex items-center gap-1.5"><wallet :size="13" style="color: #4338ca; flex-shrink: 0" />充值：支付 ¥1 到账 1 额度，充多少到多少</div>
                <div class="flex items-center gap-1.5"><creditcard :size="13" style="color: #4338ca; flex-shrink: 0" />消费：按模型实际用量以人民币实时计费</div>
                <div class="flex items-center gap-1.5"><shield-check :size="13" style="color: #4338ca; flex-shrink: 0" />余额：钱包 / 看板 / 用户管理里显示的金额就是人民币</div>
              </div>
            </div>
            <div class="flex items-center justify-between gap-4 border border-[var(--border)] p-4">
              <div>
                <div class="text-sm font-medium text-foreground">余额与消耗按人民币显示</div>
                <div class="mt-0.5 text-xs text-muted-foreground">关闭后将显示内部原始数值（如 68493），普通站点请保持开启</div>
              </div>
              <n-switch :value="boolOf('DisplayInCurrencyEnabled')" @update:value="(v) => set('DisplayInCurrencyEnabled', v)" />
            </div>
            <form-row label="分组充值加量" hint='JSON，如 {"default":1,"vip":0.8}；仅影响充值到账：倍率 0.8 表示该组用户充 ¥1 到账 1.25 额度（越低越优惠），保持 {"default":1} 即 1:1'>
              <n-input :value="val('TopupGroupRatio', '{}')" type="textarea" :rows="3" @update:value="(v) => set('TopupGroupRatio', v)" />
            </form-row>
            <div class="border border-[var(--border)]">
              <button type="button" class="flex w-full items-center justify-between gap-2 p-4" @click="advOpen = !advOpen">
                <span class="text-sm font-medium text-foreground">高级参数（系统内部换算 · 请勿修改）</span>
                <span class="text-xs text-muted-foreground">{{ advOpen ? '收起 ▲' : '展开 ▼' }}</span>
              </button>
              <div v-show="advOpen" class="flex flex-col gap-4 border-t border-[var(--border)] p-4">
                <form-row label="内部换算基数 (QuotaPerUnit)" hint="模型 USD 标价与内部额度的固定换算基数，与「1 额度 = ¥1」的展示计价无关，保持默认即可">
                  <n-input-number :value="numOf('QuotaPerUnit', 500000)" disabled style="width: 100%" />
                </form-row>
                <form-row label="计价汇率 (Price)" hint="内部换算参数，系统已自动配好 1 元 = 1 额度，修改会导致充值与显示不一致">
                  <n-input-number :value="numOf('Price', 7.3)" disabled style="width: 100%" />
                </form-row>
                <div class="bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  这两项是系统内部换算参数，不会展示给用户；用户侧始终按「1 额度 = ¥1」展示与充值，无需修改。
                </div>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 支付设置 -->
        <n-tab-pane name="payment" tab="支付设置">
          <div class="flex max-w-xl flex-col gap-4">
            <div class="flex items-center justify-between gap-4 border border-[var(--border)] p-4">
              <div>
                <div class="text-sm font-medium text-foreground">开启在线充值</div>
                <div class="mt-0.5 text-xs text-muted-foreground">开启后用户可在「钱包充值」页通过易支付下单充值</div>
              </div>
              <n-switch :value="boolOf('EnableOnlineTopUp')" @update:value="(v) => set('EnableOnlineTopUp', v)" />
            </div>
            <form-row label="支付网关地址 (PayAddress)" hint="易支付商户网关地址，在商户后台查看">
              <n-input :value="val('PayAddress')" placeholder="https://" @update:value="(v) => set('PayAddress', v)" />
            </form-row>
            <div class="grid grid-cols-2 gap-4">
              <form-row label="商户 ID (PayEpayId)">
                <n-input :value="val('PayEpayId')" placeholder="1000" @update:value="(v) => set('PayEpayId', v)" />
              </form-row>
              <form-row label="最低充值金额 (¥)">
                <n-input-number :value="numOf('MinTopUp', 0.01)" :min="0.01" :step="0.01" style="width: 100%" @update:value="(v) => set('MinTopUp', String(v ?? 0))" />
              </form-row>
            </div>
            <div class="flex items-center justify-between gap-4 border border-[var(--border)] p-4">
              <div>
                <div class="text-sm font-medium text-foreground">充值比例</div>
                <div class="mt-0.5 text-xs text-muted-foreground">固定 1:1 — 支付 ¥1 到账 1 额度，系统自动换算，无需配置</div>
              </div>
              <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" style="background: rgba(67,56,202,0.08); color: #4338ca">1 元 = 1 额度</span>
            </div>
            <form-row label="商户密钥 (PayEpayKey)" hint="用于支付签名验证，请妥善保管，泄露后请立即在商户后台重置">
              <n-input :value="val('PayEpayKey')" placeholder="商户密钥" @update:value="(v) => set('PayEpayKey', v)" />
            </form-row>
            <div class="bg-muted/50 p-3.5 text-[11px] leading-relaxed text-muted-foreground">
              <div class="mb-1 font-medium text-foreground">回调地址（在易支付商户后台无需配置，系统自动携带）</div>
              异步通知：{{ val('ServerAddress') || 'https://你的域名' }}/api/pay/notify
              <br />
              同步跳转：{{ val('ServerAddress') || 'https://你的域名' }}/api/pay/return
              <br />
              配置「服务器地址」后系统将以此生成回调地址，请确保该地址可被公网访问。
            </div>
          </div>
        </n-tab-pane>

        <!-- 监控与限流 -->
        <n-tab-pane name="monitor" tab="监控与限流">
          <div class="flex max-w-xl flex-col gap-5">
            <div class="flex items-center justify-between gap-4 border border-[var(--border)] p-4">
              <div>
                <div class="text-sm font-medium text-foreground">失败自动禁用渠道</div>
                <div class="mt-0.5 text-xs text-muted-foreground">渠道请求失败时自动禁用，避免持续影响用户</div>
              </div>
              <n-switch :value="boolOf('AutomaticDisableChannelEnabled')" @update:value="(v) => set('AutomaticDisableChannelEnabled', v)" />
            </div>
            <form-row label="最大重试次数" hint="请求失败时自动切换到下一个渠道的最大次数">
              <n-input-number :value="numOf('RetryTimes', 3)" style="width: 100%" @update:value="(v) => set('RetryTimes', String(v ?? 0))" />
            </form-row>
            <div class="flex items-center justify-between gap-4 border border-[var(--border)] p-4">
              <div>
                <div class="text-sm font-medium text-foreground">启用 API 请求频率限制</div>
                <div class="mt-0.5 text-xs text-muted-foreground">限制单令牌每分钟的请求数</div>
              </div>
              <n-switch :value="boolOf('ModelRequestRateLimitEnabled')" @update:value="(v) => set('ModelRequestRateLimitEnabled', v)" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <form-row label="频率限制次数">
                <n-input-number :value="numOf('ModelRequestRateLimitCount', 1000)" style="width: 100%" @update:value="(v) => set('ModelRequestRateLimitCount', String(v ?? 0))" />
              </form-row>
              <form-row label="限流周期 (分钟)">
                <n-input-number :value="numOf('ModelRequestRateLimitDurationMinutes', 1)" style="width: 100%" @update:value="(v) => set('ModelRequestRateLimitDurationMinutes', String(v ?? 0))" />
              </form-row>
            </div>
          </div>
        </n-tab-pane>

        <!-- 公告与文案 -->
        <n-tab-pane name="notify" tab="公告与文案">
          <div class="flex max-w-xl flex-col gap-4">
            <form-row label="系统公告" hint="展示在登录页与顶栏通知，支持较长的文本">
              <n-input :value="val('Announcement')" type="textarea" :rows="4" placeholder="欢迎使用..." @update:value="(v) => set('Announcement', v)" />
            </form-row>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
  <div v-else class="flex justify-center py-16"><n-spin size="large" /></div>
  `,
})
