/**
 * Pinia stores (模板技术栈: Pinia) — 会话用户 / 多标签页
 */
import './flags'
import { defineStore } from 'pinia'
import { apiGet, apiPost, clearAuthToken, getAuthToken } from '@/lib/api'
import { setQuotaDisplayPrice } from '@/lib/quota-display'
import { findMenuByKey } from './routes'
import { tabCache } from './theme'

export interface UserInfo {
  id: number
  username: string
  displayName: string
  role: number
  email: string
  quota: number
  usedQuota: number
  requestCount: number
  group: string
  affCode: string
  affCount: number
  affHistoryQuota: number
  quotaPerUnit: number
  createdAt: string
  announcement: string
  systemName: string
  footer: string
  displayInCurrency: boolean
  price: number
}

export interface TabItem {
  key: string
  label: string
  icon: string
  /** 官方 fixedIndex: 固定页签序号 (home = 0, 固定页签物理排列在数组前部) */
  fixedIndex?: number
}

const HOME_TAB: TabItem = { key: '/dashboard', label: '数据看板', icon: 'dashboard', fixedIndex: 0 }

const TABS_CACHE_KEY = 'console-global-tabs'

function syncDisplayPrice(u: UserInfo | null) {
  if (u && typeof u.price === 'number' && u.price > 0) setQuotaDisplayPrice(u.price)
}

export const useUserStore = defineStore('console-user', {
  state: () => ({
    user: null as UserInfo | null,
    loaded: false,
  }),
  actions: {
    async refresh() {
      try {
        const token = getAuthToken()
        // Task 105: 优先消费 console/page.tsx 的会话预取 (与 Vue chunk 下载并行的那次请求,
        // 单次消费后置空; 无预取场景 — 二次刷新等 — 走原串行 fetch, 语义不变)
        const w = window as unknown as { __mePrefetch?: Promise<Response> }
        let resp: Response
        if (w.__mePrefetch) {
          resp = await w.__mePrefetch
          w.__mePrefetch = undefined
        } else {
          resp = await fetch('/api/auth/me', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
        }
        if (resp.status === 401) {
          this.user = null
          this.loaded = true
          return
        }
        const json = (await resp.json()) as { success: boolean; data: UserInfo | null }
        syncDisplayPrice(json.data)
        this.user = json.data
        this.loaded = true
      } catch {
        this.user = null
        this.loaded = true
      }
    },
    async logout() {
      try {
        const token = getAuthToken()
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
      } catch {
        /* ignore */
      }
      clearAuthToken()
    },
  },
})

/**
 * 页签 store — 官方 src/store/modules/tab/index.ts 语义移植:
 *   removeTab(关闭后激活相邻页签) / clearTabs(excludes, 固定页签保留) /
 *   clearLeftTabs / clearRightTabs / fixTab / unfixTab (官方 splice 移位 +
 *   reorderFixedTabs 重排序号) / tab.cache 持久化 (console-global-tabs)。
 *   home 页签 = fixedIndex 0, isTabRetain(固定) 页签不可关闭/中键关闭跳过。
 */
export const useTabsStore = defineStore('console-tabs', {
  state: () => ({
    tabs: [HOME_TAB] as TabItem[],
    active: '/dashboard',
  }),
  getters: {
    /** 官方 isTabRetain: 固定页签不可关闭 */
    isTabRetain(state) {
      return (key: string) => state.tabs.find((t) => t.key === key)?.fixedIndex !== undefined
    },
  },
  actions: {
    addTab(key: string, label: string, icon: string) {
      const exists = this.tabs.find((t) => t.key === key)
      if (!exists) {
        this.tabs.push({ key, label, icon })
      } else if (exists.label !== label) {
        exists.label = label
      }
      this.active = key
      this.persist()
    },
    /** 官方 removeTab: 关闭后激活其后一个, 没有则前一个, 兜底 home */
    removeTab(key: string): string | null {
      const idx = this.tabs.findIndex((t) => t.key === key)
      if (idx === -1 || this.isTabRetain(key)) return null
      const nextTab = this.tabs[idx + 1] || this.tabs[idx - 1] || HOME_TAB
      this.tabs.splice(idx, 1)
      if (this.active === key) {
        this.active = nextTab.key
        this.persist()
        return nextTab.key
      }
      this.persist()
      return null
    },
    /** 官方 clearTabs(excludes): 固定页签 + excludes 保留; active 被清时激活剩余最后一个 */
    clearTabs(excludes: string[] = []): string | null {
      const remainIds = new Set([...this.tabs.filter((t) => t.fixedIndex !== undefined).map((t) => t.key), ...excludes])
      const removed = this.tabs.filter((t) => !remainIds.has(t.key))
      if (!removed.length) return null
      const updatedTabs = this.tabs.filter((t) => remainIds.has(t.key))
      const isActiveRemoved = removed.some((t) => t.key === this.active)
      this.tabs = updatedTabs.length ? updatedTabs : [HOME_TAB]
      if (isActiveRemoved) {
        this.active = updatedTabs[updatedTabs.length - 1]?.key || HOME_TAB.key
        this.persist()
        return this.active
      }
      this.persist()
      return null
    },
    /** 官方 clearLeftTabs: 保留目标及其右侧 */
    clearLeftTabs(key: string) {
      const ids = this.tabs.map((t) => t.key)
      const index = ids.indexOf(key)
      if (index === -1) return null
      return this.clearTabs(ids.slice(index))
    },
    /** 官方 clearRightTabs: home 触发时等价 clearTabs 全清 */
    clearRightTabs(key: string) {
      if (key === HOME_TAB.key) return this.clearTabs()
      const ids = this.tabs.map((t) => t.key)
      const index = ids.indexOf(key)
      if (index === -1) return null
      return this.clearTabs(ids.slice(0, index + 1))
    },
    /** 官方 fixTab: fixedIndex = 当前固定数, splice 移到固定区末尾, 重排序号 */
    fixTab(key: string) {
      const tabIndex = this.tabs.findIndex((t) => t.key === key)
      if (tabIndex === -1) return
      const tab = this.tabs[tabIndex]
      const fixedCount = this.tabs.filter((t) => t.fixedIndex !== undefined).length
      tab.fixedIndex = fixedCount
      if (tabIndex !== fixedCount) {
        this.tabs.splice(tabIndex, 1)
        this.tabs.splice(fixedCount, 0, tab)
      }
      this.reorderFixedTabs()
      this.persist()
    },
    /** 官方 unfixTab: 移出固定区 (放固定区末尾位置), 重排序号 */
    unfixTab(key: string) {
      const tabIndex = this.tabs.findIndex((t) => t.key === key)
      if (tabIndex === -1) return
      const tab = this.tabs[tabIndex]
      tab.fixedIndex = undefined
      const fixedCount = this.tabs.filter((t) => t.fixedIndex !== undefined).length
      if (tabIndex !== fixedCount) {
        this.tabs.splice(tabIndex, 1)
        this.tabs.splice(fixedCount, 0, tab)
      }
      this.reorderFixedTabs()
      this.persist()
    },
    /** 官方 reorderFixedTabs: 固定页签 fixedIndex 重排 0..n */
    reorderFixedTabs() {
      this.tabs.filter((t) => t.fixedIndex !== undefined).forEach((t, i) => {
        t.fixedIndex = i
      })
    },
    /** 官方 tab.cache 持久化 (tabCache 关闭时清除缓存) */
    persist() {
      if (typeof window === 'undefined') return
      try {
        if (!tabCache.value) {
          window.localStorage.removeItem(TABS_CACHE_KEY)
          return
        }
        const payload = { tabs: this.tabs, active: this.active }
        window.localStorage.setItem(TABS_CACHE_KEY, JSON.stringify(payload))
      } catch {
        /* storage 不可用忽略 */
      }
    },
    /** 官方 initTabStore: 恢复缓存页签 (仅合法路由, home 兜底) */
    restore() {
      if (typeof window === 'undefined' || !tabCache.value) return
      try {
        const raw = window.localStorage.getItem(TABS_CACHE_KEY)
        if (!raw) return
        const payload = JSON.parse(raw) as { tabs?: TabItem[]; active?: string }
        const cached = (payload.tabs || []).filter(
          (t) => t && typeof t.key === 'string' && !!findMenuByKey(t.key),
        )
        if (!cached.length) return
        const home = cached.find((t) => t.key === HOME_TAB.key)
        const fixed = cached.filter((t) => t.key !== HOME_TAB.key && t.fixedIndex !== undefined)
        const remain = cached.filter((t) => t.key !== HOME_TAB.key && t.fixedIndex === undefined)
        fixed.forEach((t, i) => {
          t.fixedIndex = i + 1
        })
        this.tabs = [
          home ? { ...HOME_TAB, ...home, fixedIndex: 0 } : { ...HOME_TAB },
          ...fixed,
          ...remain.map((t) => ({ ...t, fixedIndex: undefined })),
        ]
        const active = payload.active && findMenuByKey(payload.active) ? payload.active : HOME_TAB.key
        this.active = this.tabs.some((t) => t.key === active) ? active : HOME_TAB.key
      } catch {
        /* 缓存损坏忽略 */
      }
    },
  },
})

/** 站点公开信息 (游客模式壳用) */
export async function fetchSiteStatus(): Promise<{ systemName?: string; announcement?: string } | null> {
  try {
    const resp = await apiGet<{ data: { systemName?: string } }>('/api/auth/status')
    return resp.data ?? null
  } catch {
    return null
  }
}

export { apiPost }
