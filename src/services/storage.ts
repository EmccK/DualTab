/**
 * 存储服务
 * 在 Chrome 扩展环境中使用 chrome.storage.local
 * 在开发环境中使用 localStorage
 */

// 检查是否在 Chrome 扩展环境中
const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage?.local

/**
 * 获取存储数据
 */
export async function getStorage<T>(key: string): Promise<T | null> {
  if (isChromeExtension) {
    const data = await chrome.storage.local.get(key)
    return (data[key] as T) || null
  } else {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  }
}

/**
 * 设置存储数据
 */
export async function setStorage<T>(key: string, value: T): Promise<void> {
  if (isChromeExtension) {
    await chrome.storage.local.set({ [key]: value })
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

/**
 * 删除存储数据
 */
export async function removeStorage(key: string): Promise<void> {
  if (isChromeExtension) {
    await chrome.storage.local.remove(key)
  } else {
    localStorage.removeItem(key)
  }
}

// 存储键名常量
export const STORAGE_KEYS = {
  GROUPS: 'monknow_groups',
  SETTINGS: 'monknow_settings',
  USER: 'monknow_user'
}
