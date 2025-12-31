import { useState, useEffect } from 'react'
import type { NavGroup } from '../types'
import { GROUP_ICONS, generateId } from '../constants'
import './GroupModal.css'

interface GroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (group: NavGroup) => void
  onDelete?: () => void
  group?: NavGroup | null
  // 弹窗位置（用于显示在添加按钮旁边）
  position?: { x: number; y: number } | null
}

// 添加/编辑分组弹窗
export function GroupModal({ isOpen, onClose, onSave, onDelete, group, position }: GroupModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(GROUP_ICONS[0])

  // 编辑模式时填充数据
  useEffect(() => {
    if (group) {
      setName(group.name)
      setIcon(group.icon)
    } else {
      setName('')
      setIcon(GROUP_ICONS[0])
    }
  }, [group, isOpen])

  // 保存
  const handleSave = () => {
    if (!name.trim()) return

    onSave({
      id: group?.id || generateId(),
      name: name.trim(),
      icon,
      sites: group?.sites || [],
      isCustom: true
    })
    onClose()
  }

  if (!isOpen) return null

  // 计算弹窗位置样式
  const modalStyle = position 
    ? { left: position.x, top: position.y, transform: 'none' }
    : {}

  return (
    <>
      <div className="group-modal-overlay" onClick={onClose} />
      <div 
        className={`group-modal ${position ? 'positioned' : ''}`}
        style={modalStyle}
      >
        {/* 标题和关闭按钮 */}
        <div className="group-modal-header">
          <div className="group-modal-title">
            {group ? '编辑分组' : '添加分组'}
          </div>
          <button className="group-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* 图标选择 */}
        <div className="group-modal-section">
          <label>图标</label>
          <div className="group-icon-picker">
            {GROUP_ICONS.map((ic, index) => (
              <div
                key={index}
                className={`group-icon-item ${icon === ic ? 'active' : ''}`}
                onClick={() => setIcon(ic)}
              >
                <img src={ic} alt={`图标${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        {/* 名称输入 */}
        <div className="group-modal-section">
          <label>名称</label>
          <input
            type="text"
            placeholder="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>

        {/* 按钮 */}
        <div className="group-modal-actions">
          {group && onDelete && (
            <button className="group-btn-delete" onClick={onDelete}>删除</button>
          )}
          <button className="group-btn-primary" onClick={handleSave}>
            {group ? '保存' : '添加'}
          </button>
          <button className="group-btn-secondary" onClick={onClose}>取消</button>
        </div>
      </div>
    </>
  )
}
