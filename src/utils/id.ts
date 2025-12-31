/**
 * ID 生成工具函数
 */

// 生成唯一ID，使用 crypto API 提高唯一性
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // 保留 16 位以确保足够的唯一性
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  }
  // 降级方案：使用 crypto.getRandomValues 提高随机性
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(8)
    crypto.getRandomValues(array)
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
  }
  // 最终降级方案
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
}
