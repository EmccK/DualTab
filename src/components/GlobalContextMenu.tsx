import { useEffect, useRef } from 'react'
import './GlobalContextMenu.css'

interface GlobalContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onAddIcon: () => void
  onNextWallpaper: () => void
  onDownloadWallpaper: () => void
  onSettings: () => void
}

// 全局右键菜单组件
export function GlobalContextMenu({
  x,
  y,
  onClose,
  onAddIcon,
  onNextWallpaper,
  onDownloadWallpaper,
  onSettings
}: GlobalContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // 延迟添加监听，避免立即触发
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('contextmenu', handleClickOutside)
    }, 0)

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
    }
  }, [onClose])

  // 调整菜单位置，避免超出屏幕
  const adjustedPosition = () => {
    const menuWidth = 160
    const menuHeight = 180
    let adjustedX = x
    let adjustedY = y

    if (x + menuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - 10
    }
    if (y + menuHeight > window.innerHeight) {
      adjustedY = window.innerHeight - menuHeight - 10
    }

    return { left: adjustedX, top: adjustedY }
  }

  const position = adjustedPosition()

  return (
    <div
      ref={menuRef}
      className="global-context-menu"
      style={{ left: position.left, top: position.top }}
    >
      <div className="global-context-menu-items">
        <div className="global-context-menu-item" onClick={() => { onAddIcon(); onClose() }}>
          添加图标
        </div>
        <div className="global-context-menu-divider" />
        <div className="global-context-menu-item" onClick={() => { onNextWallpaper(); onClose() }}>
          下一张壁纸
        </div>
        <div className="global-context-menu-item" onClick={() => { onDownloadWallpaper(); onClose() }}>
          下载壁纸
        </div>
        <div className="global-context-menu-divider" />
        <div className="global-context-menu-item" onClick={() => { onSettings(); onClose() }}>
          设置
        </div>
      </div>
    </div>
  )
}
