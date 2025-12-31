/**
 * 右键菜单 Hook
 * 统一管理右键菜单的显示和位置
 */

import { useState, useCallback, useEffect } from 'react'

interface Position {
  x: number
  y: number
}

interface UseContextMenuReturn<T> {
  isOpen: boolean
  position: Position
  data: T | null
  openMenu: (e: React.MouseEvent, data: T) => void
  closeMenu: () => void
}

export function useContextMenu<T = unknown>(): UseContextMenuReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [data, setData] = useState<T | null>(null)

  // 打开菜单
  const openMenu = useCallback((e: React.MouseEvent, menuData: T) => {
    e.preventDefault()
    e.stopPropagation()
    setPosition({ x: e.clientX, y: e.clientY })
    setData(menuData)
    setIsOpen(true)
  }, [])

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])

  // 点击其他地方关闭菜单
  useEffect(() => {
    if (!isOpen) return

    const handleClick = () => {
      closeMenu()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu()
      }
    }

    // 延迟添加监听器，避免右键点击事件在同一事件循环中立即触发关闭
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick)
      document.addEventListener('keydown', handleKeyDown)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeMenu])

  return {
    isOpen,
    position,
    data,
    openMenu,
    closeMenu
  }
}
