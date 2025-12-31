import { useState } from 'react'
import type { NavGroup, User } from '../types'

interface SidebarProps {
  groups: NavGroup[]
  activeGroupId: string
  onGroupSelect: (groupId: string) => void
  onAddGroup: (position: { x: number; y: number }) => void
  onEditGroup: (group: NavGroup) => void
  onDeleteGroup: (group: NavGroup) => void
  onOpenAllSites: (group: NavGroup) => void
  onOpenSettings: () => void
  user: User | null
  onLoginClick: () => void
  onLogout: () => void
}

// 右键菜单状态
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  group: NavGroup | null
}

// 侧边栏组件
export function Sidebar({ 
  groups, 
  activeGroupId, 
  onGroupSelect, 
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
  onOpenAllSites,
  onOpenSettings,
  user,
  onLoginClick,
  onLogout
}: SidebarProps) {
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    group: null
  })

  // 显示右键菜单
  const handleContextMenu = (e: React.MouseEvent, group: NavGroup) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      group
    })
  }

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false, group: null }))
  }

  // 打开所有书签
  const handleOpenAll = () => {
    if (contextMenu.group) {
      onOpenAllSites(contextMenu.group)
    }
    closeContextMenu()
  }

  // 编辑分组
  const handleEdit = () => {
    if (contextMenu.group) {
      onEditGroup(contextMenu.group)
    }
    closeContextMenu()
  }

  // 删除分组
  const handleDelete = () => {
    if (contextMenu.group) {
      onDeleteGroup(contextMenu.group)
    }
    closeContextMenu()
  }

  return (
    <aside className="sidebar">
      {/* 用户头像 */}
      <div className="sidebar-header">
        {user?.isLoggedIn ? (
          <div className="user-avatar logged-in" onClick={onLogout} title="点击登出">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder" />
            )}
            <span className="user-name">{user.name || 'Guest'}</span>
          </div>
        ) : (
          <div className="user-avatar" onClick={onLoginClick}>
            <div className="avatar-placeholder" />
            <span className="login-text">登录</span>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="nav-menu">
        {groups.map(group => (
          <div
            key={group.id}
            className={`nav-item ${activeGroupId === group.id ? 'active' : ''}`}
            onClick={() => onGroupSelect(group.id)}
            onContextMenu={(e) => handleContextMenu(e, group)}
          >
            <img className="nav-icon-svg" src={group.icon} alt={group.name} />
            <span className="nav-label">{group.name}</span>
            {group.badge && <span className="badge">{group.badge}</span>}
          </div>
        ))}

        {/* 添加分组按钮 - 只显示图标 */}
        <div 
          className="nav-item add-btn" 
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            onAddGroup({ x: rect.right + 8, y: rect.top })
          }}
        >
          <svg className="nav-icon-svg add-icon-svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </div>
      </nav>

      {/* 设置按钮 */}
      <div className="nav-item settings-btn" onClick={onOpenSettings}>
        <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
        <span className="nav-label">设置</span>
      </div>

      {/* 分组右键菜单 */}
      {contextMenu.visible && contextMenu.group && (
        <>
          <div className="group-context-overlay" onClick={closeContextMenu} />
          <div 
            className="group-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="group-context-item" onClick={handleOpenAll}>
              打开所有 ({contextMenu.group.sites.length})
            </div>
            <div className="group-context-divider" />
            <div className="group-context-item" onClick={handleEdit}>
              编辑
            </div>
            <div className="group-context-item" onClick={handleDelete}>
              删除
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
