/**
 * 颜色处理工具函数
 */

// 验证 hex 颜色格式
const isValidHex = (hex: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(hex)

// 将 hex 颜色转换为 rgba
export const hexToRgba = (hex: string, alpha: number): string => {
  if (!isValidHex(hex)) {
    return `rgba(0, 0, 0, ${alpha})`
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 判断颜色是否为浅色
export const isLightColor = (hex: string): boolean => {
  if (!isValidHex(hex)) {
    return false
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // 使用相对亮度公式
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

// 调整颜色亮度
export const adjustBrightness = (hex: string, percent: number): string => {
  if (!isValidHex(hex)) {
    return '#000000'
  }
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + percent))
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + percent))
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + percent))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
