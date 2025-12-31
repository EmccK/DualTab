/**
 * Chrome API 封装工具函数
 */

// 检查是否在 Chrome 扩展环境中
export const isChromeExtension = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local
}

// 安全地获取 Chrome API
export const getChromeAPI = () => {
  if (isChromeExtension()) {
    return chrome
  }
  return null
}

// 在新标签页打开链接
export const openInNewTab = (url: string, active: boolean = true): void => {
  const chromeAPI = getChromeAPI()
  if (chromeAPI?.tabs) {
    chromeAPI.tabs.create({ url, active })
  } else {
    window.open(url, '_blank')
  }
}

// 在当前标签页打开链接
export const openInCurrentTab = (url: string): void => {
  const chromeAPI = getChromeAPI()
  if (chromeAPI?.tabs) {
    chromeAPI.tabs.update({ url })
  } else {
    window.location.href = url
  }
}

// 在隐身窗口打开链接
export const openInIncognito = (url: string): boolean => {
  const chromeAPI = getChromeAPI()
  if (chromeAPI?.windows?.create) {
    chromeAPI.windows.create({ url, incognito: true })
    return true
  }
  return false
}
