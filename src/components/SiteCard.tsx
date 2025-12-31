import { useState } from 'react'
import type { Site } from '../types'
import { ContextMenu } from './ContextMenu'

interface SiteCardProps {
  site: Site
  openInNewTab: boolean
  onEdit: (site: Site) => void
  onDelete: (siteId: string) => void
}

// 网站卡片组件
export function SiteCard({ site, onEdit, onDelete }: SiteCardProps) {
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // 点击打开网站 - 默认在当前页打开
  const handleClick = () => {
    window.location.href = site.url
  }

  // 右键显示菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  // 关闭菜单
  const closeContextMenu = () => setContextMenu(null)

  // 在新标签页打开（切换到新标签）
  const handleOpenNewTab = () => {
    // @ts-expect-error chrome API 在扩展环境下可用
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      // Chrome 扩展环境：打开新标签并激活
      // @ts-expect-error chrome API
      chrome.tabs.create({ url: site.url, active: true })
    } else {
      // 普通网页环境
      window.open(site.url, '_blank')
    }
    closeContextMenu()
  }

  // 在后台打开（不切换标签）
  const handleOpenBackground = () => {
    // Chrome 扩展环境：打开新标签但不激活
    // @ts-expect-error chrome API 在扩展环境下可用
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      // @ts-expect-error chrome API
      chrome.tabs.create({ url: site.url, active: false })
    } else {
      // 普通网页环境：使用 window.open 并尝试保持焦点
      window.open(site.url, '_blank')
    }
    closeContextMenu()
  }

  // 在隐身窗口打开
  const handleOpenIncognito = () => {
    // Chrome 扩展环境：在隐身窗口打开
    // @ts-expect-error chrome API 在扩展环境下可用
    if (typeof chrome !== 'undefined' && chrome.windows?.create) {
      // @ts-expect-error chrome API
      chrome.windows.create({ url: site.url, incognito: true })
    } else {
      // 普通网页环境：无法打开隐身窗口，提示用户
      alert('隐身窗口功能仅在 Chrome 扩展中可用')
    }
    closeContextMenu()
  }

  // 编辑
  const handleEdit = () => {
    onEdit(site)
    closeContextMenu()
  }

  // 删除
  const handleDelete = () => {
    onDelete(site.id)
    closeContextMenu()
  }

  // 将 hex 颜色转换为 rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // 计算阴影颜色（基于书签背景色）
  const shadowColor = site.color ? hexToRgba(site.color, 0.4) : 'rgba(0, 0, 0, 0.2)'
  const hoverShadowColor = site.color ? hexToRgba(site.color, 0.5) : 'rgba(0, 0, 0, 0.35)'

  return (
    <>
      <div 
        className="site-card" 
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          '--shadow-color': shadowColor,
          '--hover-shadow-color': hoverShadowColor
        } as React.CSSProperties}
      >
        <div className="site-card-icon" style={{ backgroundColor: site.color }}>
          <img src={site.icon} alt={site.name} />
        </div>
        <div className="site-card-info">
          <div className="site-card-title">{site.name}</div>
          <div className="site-card-desc">{site.desc}</div>
        </div>
      </div>
      
      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          site={site}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onOpenNewTab={handleOpenNewTab}
          onOpenBackground={handleOpenBackground}
          onOpenIncognito={handleOpenIncognito}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}

// 添加网站卡片
interface AddSiteCardProps {
  onClick: () => void
}

export function AddSiteCard({ onClick }: AddSiteCardProps) {
  return (
    <div className="site-card add-site-card" onClick={onClick}>
      <div className="site-card-icon add-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </div>
      <div className="site-card-info">
        <div className="site-card-title">添加网站</div>
        <div className="site-card-desc">点击添加新的网站书签</div>
      </div>
    </div>
  )
}
