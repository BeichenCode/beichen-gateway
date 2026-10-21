/**
 * 联系我们页 (Task 111 → 114 企鹅标 → 115 官方 QQ 标 + 群卡整卡点击跳转) — QQ 交流群 + 客服 QQ
 *  交流群: 854928994 (点击卡片/按钮 → mqqapi 深链唤起 QQ 加群) · 客服 QQ: 615129803 (wpa 发起会话)
 *  图标: simple-icons:qq 官方现代 QQ 企鹅 (Task 115 替换 mdi:qqchat, 离线集合)
 * Task 130: 移除「其他求助渠道」静态卡片 (纯说明文字不可点击, 用户反馈没用)
 */
import '../flags'
import { defineComponent, ref } from 'vue'
import { NButton, NCard } from 'naive-ui'
import { copyText } from '@/lib/utils'
import { message } from '../message'
import { SvgIcon } from '../svg-icon'
import { Copy, Check } from 'lucide-vue-next'

export default defineComponent({
  name: 'ContactPage',
  components: { SvgIcon }, // 全局表 (icons.ts) 未含, 模板用须局部注册 (同 base-layout/global-search)
  setup() {
    const QQ_GROUP = '854928994'
    const QQ_SERVICE = '615129803'
    /** QQ 群深链: 唤起本机 QQ 客户端直达群名片 (免 owner 加群 key 的标准做法; 未装 QQ 时静默, 可走复制群号兜底) */
    const MQQ_GROUP_LINK =
      'mqqapi://card/show_pslcard?src_type=internal&version=1&uin=' + QQ_GROUP + '&card_type=group&source=qrcode'
    const copied = ref('')

    function jumpGroup() {
      window.location.href = MQQ_GROUP_LINK
    }

    function copy(text: string, tag: string) {
      void copyText(text).then((ok) => {
        if (ok) {
          copied.value = tag
          message.success('已复制：' + text)
          window.setTimeout(() => (copied.value = ''), 2000)
        } else message.error('复制失败，请手动复制')
      })
    }

    return {
      QQ_GROUP, QQ_SERVICE, copied, copy, jumpGroup,
      NButton, NCard,
      Copy, Check,
    }
  },
  template: `
  <div>
    <page-header title="联系我们" description="加入用户交流群，或直接联系在线客服 — 建议优先加群，群内响应更快" />

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <!-- QQ 交流群 (整卡可点 → mqqapi 一键跳转加群; 复制按钮 .stop 防误触跳转) -->
      <n-card size="small" style="cursor: pointer" @click="jumpGroup">
        <div class="flex items-start gap-4">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style="background: rgba(18,183,245,0.12); color: #12b7f5">
            <svg-icon icon="simple-icons:qq" :font-size="24" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-foreground">QQ 交流群</div>
            <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
              使用交流 · 状态同步 · 新模型与活动第一时间通知；点击卡片一键跳转加群（需已安装 QQ），也可复制群号在 QQ 内搜索加入
            </p>
            <div class="mt-3 flex items-center gap-2">
              <svg-icon icon="simple-icons:qq" :font-size="18" class="shrink-0" style="color: #12b7f5" />
              <code class="font-mono text-lg font-bold tracking-wide text-foreground">{{ QQ_GROUP }}</code>
              <n-button size="tiny" quaternary type="primary" @click.stop="copy(QQ_GROUP, 'group')">
                <template #icon>
                  <check v-if="copied === 'group'" :size="13" style="color:#52c41a" />
                  <copy v-else :size="13" />
                </template>
                {{ copied === 'group' ? '已复制' : '复制群号' }}
              </n-button>
              <n-button size="tiny" type="primary" @click.stop="jumpGroup">跳转加群</n-button>
            </div>
          </div>
        </div>
      </n-card>

      <!-- 客服 QQ -->
      <n-card size="small">
        <div class="flex items-start gap-4">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style="background: rgba(82,196,26,0.12); color: #52c41a">
            <svg-icon icon="simple-icons:qq" :font-size="24" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-foreground">客服 QQ</div>
            <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
              充值/调用异常等一对一问题；加好友请备注「北辰中转站 + 用户名」，方便快速定位账号
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <svg-icon icon="simple-icons:qq" :font-size="18" class="shrink-0" style="color: #52c41a" />
              <code class="font-mono text-lg font-bold tracking-wide text-foreground">{{ QQ_SERVICE }}</code>
              <n-button size="tiny" quaternary type="primary" @click="copy(QQ_SERVICE, 'service')">
                <template #icon>
                  <check v-if="copied === 'service'" :size="13" style="color:#52c41a" />
                  <copy v-else :size="13" />
                </template>
                {{ copied === 'service' ? '已复制' : '复制 QQ' }}
              </n-button>
              <n-button
                size="tiny" type="primary" ghost tag="a" target="_blank" rel="noopener noreferrer"
                :href="'https://wpa.qq.com/msgrd?v=3&uin=' + QQ_SERVICE + '&site=qq&menu=yes'"
              >
                发起会话
              </n-button>
            </div>
          </div>
        </div>
      </n-card>
    </div>
  </div>
  `,
})
