import { useEffect, useRef } from 'react'
import type { Site } from '../types'
import './ContextMenu.css'

interface ContextMenuProps {
  site: Site
  x: number
  y: number
  onClose: () => void
  onOpenNewTab: () => void
  onOpenBackground: () => void
  onOpenIncognito: () => void
  onEdit: () => void
  onDelete: () => void
}

// 右键菜单组件
export function ContextMenu({
  site,
  x,
  y,
  onClose,
  onOpenNewTab,
  onOpenBackground,
  onOpenIncognito,
  onEdit,
  onDelete
}: ContextMenuProps) {
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
    const menuWidth = 180
    const menuHeight = 220
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
      className="context-menu"
      style={{ left: position.left, top: position.top }}
    >
      {/* 网站信息头部 */}
      <div className="context-menu-header">
        <div className="context-menu-icon" style={{ backgroundColor: site.backgroundColor?.data || '#ffffff' }}>
          {site.type === 'text' ? (
            <span className="site-card-icon-text">{site.icoText || site.name.slice(0, 2)}</span>
          ) : (
            <img src={site.icoSrc?.data} alt={site.name} />
          )}
        </div>
        <div className="context-menu-info">
          <div className="context-menu-title">{site.name}</div>
          <div className="context-menu-desc">{site.desc}</div>
        </div>
      </div>
      
      {/* 菜单项 */}
      <div className="context-menu-items">
        <div className="context-menu-item" onClick={onOpenNewTab}>
          在新标签页中打开
        </div>
        <div className="context-menu-item" onClick={onOpenBackground}>
          在后台页中打开
        </div>
        <div className="context-menu-item" onClick={onOpenIncognito}>
          在隐身窗口中打开
        </div>
        <div className="context-menu-divider" />
        <div className="context-menu-item" onClick={onEdit}>
          编辑
        </div>
        <div className="context-menu-item context-menu-item-danger" onClick={onDelete}>
          删除
        </div>
      </div>
    </div>
  )
}
