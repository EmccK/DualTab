import { memo } from 'react'
import type { Site, OpenTarget, IconLayout } from '../types'
import { ContextMenu } from './ContextMenu'
import { useContextMenu } from '../hooks'
import { hexToRgba, openInNewTab, openInCurrentTab, openInIncognito } from '../utils'

interface SiteCardProps {
  site: Site
  onEdit: (site: Site) => void
  onDelete: (siteId: string) => void
  openTarget?: OpenTarget  // 全局打开链接方式
  iconLayout?: IconLayout  // 图标布局: simple(只有标题) / particular(标题+描述)
  // 拖拽相关属性
  draggable?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  onDragLeave?: () => void
}

// 网站卡片组件
export const SiteCard = memo(function SiteCard({
  site,
  onEdit,
  onDelete,
  openTarget = 'currentTab',
  iconLayout = 'particular',
  // 拖拽相关属性
  draggable = false,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragLeave
}: SiteCardProps) {
  // 使用右键菜单 hook
  const { isOpen, position, openMenu, closeMenu } = useContextMenu<Site>()

  // 获取背景颜色（添加空值检查）
  const bgColor = site.backgroundColor?.data || '#ffffff'

  // 获取图标 URL
  const iconUrl = site.icoSrc?.data || ''

  // 获取图标显示内容
  const getIconContent = () => {
    // 如果是文字类型，显示文字
    if (site.type === 'text') {
      return (
        <span className="site-card-icon-text">
          {site.icoText || site.name.slice(0, 2)}
        </span>
      )
    }
    // 否则显示图片
    // 注意：全局缩放通过 CSS 的 --icon-scale 变量控制
    // 单个图标的 icoScalePercentage 会与全局缩放叠加
    const iconScale = site.icoScalePercentage || 100
    return (
      <img
        src={iconUrl}
        alt={site.name}
        loading="lazy"
        style={iconScale !== 100 ? {
          '--icon-individual-scale': iconScale / 100
        } as React.CSSProperties : undefined}
      />
    )
  }

  // 点击打开网站 - 根据设置决定打开方式
  const handleClick = () => {
    switch (openTarget) {
      case 'newTab':
        openInNewTab(site.url, true)
        break
      case 'backgroundTab':
        openInNewTab(site.url, false)
        break
      case 'currentTab':
      default:
        openInCurrentTab(site.url)
        break
    }
  }

  // 右键显示菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    openMenu(e, site)
  }

  // 在新标签页打开（切换到新标签）
  const handleOpenNewTab = () => {
    openInNewTab(site.url, true)
    closeMenu()
  }

  // 在后台打开（不切换标签）
  const handleOpenBackground = () => {
    openInNewTab(site.url, false)
    closeMenu()
  }

  // 在隐身窗口打开
  const handleOpenIncognito = () => {
    const success = openInIncognito(site.url)
    if (!success) {
      alert('隐身窗口功能仅在 Chrome 扩展中可用')
    }
    closeMenu()
  }

  // 编辑
  const handleEdit = () => {
    onEdit(site)
    closeMenu()
  }

  // 删除
  const handleDelete = () => {
    onDelete(site.id)
    closeMenu()
  }

  // 计算阴影颜色（基于书签背景色）
  const shadowColor = bgColor ? hexToRgba(bgColor, 0.4) : 'rgba(0, 0, 0, 0.2)'
  const hoverShadowColor = bgColor ? hexToRgba(bgColor, 0.5) : 'rgba(0, 0, 0, 0.35)'

  return (
    <>
      <div
        className={[
          'site-card',
          iconLayout === 'simple' ? 'site-card-simple' : 'site-card-particular',
          isDragging && 'site-card-dragging',
          isDragOver && 'site-card-drag-over'
        ].filter(Boolean).join(' ')}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragLeave={onDragLeave}
        style={{
          '--shadow-color': shadowColor,
          '--hover-shadow-color': hoverShadowColor,
          '--icon-border-radius': 'inherit'
        } as React.CSSProperties}
      >
        <div className="site-card-icon" style={{ backgroundColor: bgColor }}>
          {getIconContent()}
        </div>
        {/* simple 布局只显示标题，particular 布局显示标题和描述 */}
        {iconLayout === 'simple' ? (
          <div className="site-card-label">{site.name}</div>
        ) : (
          <div className="site-card-info">
            <div className="site-card-title">{site.name}</div>
            <div className="site-card-desc">{site.desc}</div>
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {isOpen && (
        <ContextMenu
          site={site}
          x={position.x}
          y={position.y}
          onClose={closeMenu}
          onOpenNewTab={handleOpenNewTab}
          onOpenBackground={handleOpenBackground}
          onOpenIncognito={handleOpenIncognito}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </>
  )
})

// 添加网站卡片 - Monknow 风格
interface AddSiteCardProps {
  onClick: () => void
}

export const AddSiteCard = memo(function AddSiteCard({ onClick }: AddSiteCardProps) {
  return (
    <div className="add-site-card" onClick={onClick}>
      <div className="add-site-icon">
        {/* 加号图标 */}
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </div>
    </div>
  )
})
