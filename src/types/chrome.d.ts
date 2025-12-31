/**
 * Chrome Extension API 类型声明
 * 补充 @types/chrome 中缺失的类型
 */

// Chrome API 类型定义
interface ChromeAPI {
  storage?: {
    local: {
      get: (keys: string | string[]) => Promise<Record<string, unknown>>
      set: (items: Record<string, unknown>) => Promise<void>
      remove: (keys: string | string[]) => Promise<void>
    }
  }
  tabs?: {
    create: (options: { url: string; active?: boolean }) => void
    update: (options: { url: string }) => void
  }
  windows?: {
    create: (options: { url: string; incognito?: boolean }) => void
  }
}

declare global {
  interface Window {
    chrome?: ChromeAPI
  }
  // 确保 chrome 全局变量在非扩展环境下也能被识别
  var chrome: ChromeAPI | undefined
}

export {}
