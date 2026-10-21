import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 生成邀请码: 8 位大写字母数字, 剔除易混淆字符 (0/O/1/I/L)
 * Task 82 性能修复: 不再 import node "crypto" — 该顶层导入会把整个
 * crypto-browserify polyfill 栈 (~456KB) 打进客户端包 (landing 引用 copyText 即中招)。
 * WebCrypto getRandomValues 在 Node 19+ 与浏览器全域可用, 零打包代价。
 */
const AFF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function genAffCode(): string {
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += AFF_ALPHABET[bytes[i] % AFF_ALPHABET.length]
  }
  return code
}

/**
 * 复制文本到剪贴板 (兼容 http / 跨站 iframe 等非安全上下文, clipboard API 不可用时降级 execCommand)
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 降级 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    ta.style.pointerEvents = 'none'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
