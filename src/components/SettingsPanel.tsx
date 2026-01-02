import { useState, useEffect, useRef } from 'react'
import type { Settings, User, LocationInfo, OpenTarget } from '../types'
import { WALLPAPERS, SOLID_COLORS, SEARCH_ENGINES, OPEN_TARGET_OPTIONS, TEMPERATURE_UNIT_OPTIONS } from '../constants'
import { searchLocations, updateNickname, updatePortrait, changePassword, uploadImage } from '../services/api'
import './SettingsPanel.css'

// 防抖 hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  user: User | null
  onLoginClick: () => void
  onLogout: () => void
  onUserUpdate?: (user: User) => void  // 用户信息更新回调
}

// 设置面板选项卡类型
type SettingsTab = 'general' | 'theme' | 'appearance' | 'about'

// 壁纸选项卡类型
type WallpaperTab = 'official' | 'local' | 'solid'

// 编辑弹窗类型
type EditModalType = 'nickname' | 'avatar' | 'password' | null

// 密码强度等级
type PasswordStrength = 'weak' | 'medium' | 'strong'

// 计算密码强度
function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 6) return 'weak'

  let score = 0
  // 长度加分
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  // 包含数字
  if (/\d/.test(password)) score++
  // 包含小写字母
  if (/[a-z]/.test(password)) score++
  // 包含大写字母
  if (/[A-Z]/.test(password)) score++
  // 包含特殊字符
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

// 获取密码强度文本
function getPasswordStrengthText(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak': return '弱'
    case 'medium': return '中'
    case 'strong': return '强'
  }
}

// 设置面板组件 - Monknow 风格居中弹窗
export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  user,
  onLoginClick,
  onLogout,
  onUserUpdate
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme')
  const [wallpaperTab, setWallpaperTab] = useState<WallpaperTab>('official')

  // 位置搜索相关状态
  const [locationSearch, setLocationSearch] = useState('')
  const [locationResults, setLocationResults] = useState<LocationInfo[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const locationWrapperRef = useRef<HTMLDivElement>(null)

  // 防抖处理位置搜索关键词
  const debouncedLocationSearch = useDebounce(locationSearch, 300)

  // 编辑弹窗状态
  const [editModal, setEditModal] = useState<EditModalType>(null)
  const [editNickname, setEditNickname] = useState('')
  const [editOldPassword, setEditOldPassword] = useState('')
  const [editNewPassword, setEditNewPassword] = useState('')
  const [editConfirmPassword, setEditConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')  // 成功提示
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // 头像预览状态
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  // 密码显示/隐藏状态
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // 更新设置
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  // 执行位置搜索（使用防抖后的关键词）
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedLocationSearch.length < 2) {
        setLocationResults([])
        setShowLocationDropdown(false)
        return
      }

      setIsSearchingLocation(true)
      try {
        const results = await searchLocations(debouncedLocationSearch)
        setLocationResults(results)
        setShowLocationDropdown(true)
      } catch (error) {
        console.error('搜索位置失败:', error)
        setLocationResults([])
      } finally {
        setIsSearchingLocation(false)
      }
    }

    performSearch()
  }, [debouncedLocationSearch])

  // 点击外部关闭位置下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationWrapperRef.current &&
        !locationWrapperRef.current.contains(event.target as Node)
      ) {
        setShowLocationDropdown(false)
      }
    }

    if (showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLocationDropdown])

  // 选择位置
  const handleSelectLocation = (location: LocationInfo) => {
    updateSetting('location', location)
    setLocationSearch(location.shortname)
    setShowLocationDropdown(false)
    setLocationResults([])
  }

  // 清除位置
  const handleClearLocation = () => {
    updateSetting('location', null)
    setLocationSearch('')
  }

  // 初始化位置搜索框的值
  useEffect(() => {
    if (settings.location) {
      setLocationSearch(settings.location.shortname)
    }
  }, [settings.location])

  // 组件卸载时清理头像预览 URL，防止内存泄漏
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  // 打开编辑昵称弹窗
  const openNicknameModal = () => {
    setEditNickname(user?.name || '')
    setEditError('')
    setEditModal('nickname')
  }

  // 打开编辑密码弹窗
  const openPasswordModal = () => {
    setEditOldPassword('')
    setEditNewPassword('')
    setEditConfirmPassword('')
    setEditError('')
    setEditSuccess('')
    setShowOldPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setEditModal('password')
  }

  // 打开头像预览弹窗
  const openAvatarModal = (file: File) => {
    // 创建预览 URL
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    setAvatarFile(file)
    setEditError('')
    setEditModal('avatar')
  }

  // 关闭编辑弹窗
  const closeEditModal = () => {
    setEditModal(null)
    setEditError('')
    setEditSuccess('')
    setIsSubmitting(false)
    // 清理头像预览
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
      setAvatarFile(null)
    }
    // 重置密码显示状态
    setShowOldPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  // 提交修改昵称
  const handleSubmitNickname = async () => {
    if (!user || !editNickname.trim()) {
      setEditError('昵称不能为空')
      return
    }
    if (editNickname.trim() === user.name) {
      closeEditModal()
      return
    }

    setIsSubmitting(true)
    setEditError('')

    try {
      const success = await updateNickname(user.secret, editNickname.trim())
      if (success) {
        // 更新本地用户信息
        const updatedUser = { ...user, name: editNickname.trim() }
        onUserUpdate?.(updatedUser)
        closeEditModal()
      } else {
        setEditError('修改昵称失败，请稍后重试')
      }
    } catch {
      setEditError('网络错误，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 提交修改密码
  const handleSubmitPassword = async () => {
    if (!user) return

    if (!editOldPassword) {
      setEditError('请输入当前密码')
      return
    }
    if (!editNewPassword) {
      setEditError('请输入新密码')
      return
    }
    if (editNewPassword.length < 6) {
      setEditError('新密码长度至少6位')
      return
    }
    if (editNewPassword !== editConfirmPassword) {
      setEditError('两次输入的密码不一致')
      return
    }

    setIsSubmitting(true)
    setEditError('')

    try {
      const result = await changePassword(user.secret, editOldPassword, editNewPassword)
      if (result.success) {
        closeEditModal()
      } else {
        setEditError(result.message)
      }
    } catch {
      setEditError('网络错误，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理头像文件选择 - 打开预览弹窗
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setEditError('请选择图片文件')
      return
    }

    // 检查文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      setEditError('图片大小不能超过 2MB')
      return
    }

    // 打开预览弹窗
    openAvatarModal(file)

    // 清空 input 以便再次选择同一文件
    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  // 确认上传头像
  const handleConfirmAvatar = async () => {
    if (!user || !avatarFile) return

    setIsSubmitting(true)
    setEditError('')

    try {
      // 上传图片到服务器
      const imageUrl = await uploadImage(user.secret, avatarFile)
      if (!imageUrl) {
        setEditError('上传图片失败')
        setIsSubmitting(false)
        return
      }

      // 更新头像
      const success = await updatePortrait(user.secret, imageUrl)
      if (success) {
        const updatedUser = { ...user, avatar: imageUrl }
        onUserUpdate?.(updatedUser)
        closeEditModal()
      } else {
        setEditError('更新头像失败')
      }
    } catch {
      setEditError('网络错误，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  // 选项卡配置
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: '常规' },
    { id: 'theme', label: '主题&壁纸' },
    { id: 'appearance', label: '外观' },
    { id: 'about', label: '反馈&其他' }
  ]

  return (
    <div className="settings-modal-wrapper">
      {/* 遮罩层 */}
      <div className="settings-modal-overlay" onClick={onClose} />

      {/* 弹窗容器 */}
      <div className="settings-modal">
        {/* 左侧导航 */}
        <div className="settings-nav">
          <h2 className="settings-title">设置</h2>
          <div className="settings-nav-list">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="settings-nav-label">{tab.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="settings-content">
          {/* 内容区域标题 */}
          <div className="settings-content-header">
            <h2 className="settings-content-title">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>
          <div className="settings-content-inner">
            {/* 常规设置 */}
            {activeTab === 'general' && (
              <div className="settings-panel-content">
                {/* 两列网格布局 - Monknow 风格 */}
                <div className="settings-grid">
                  {/* 左列 - 用户卡片 */}
                  <div className="settings-grid-left">
                    {user ? (
                      // 已登录状态 - Monknow 风格用户卡片
                      <div className="settings-card user-card-logged">
                        <div className="user-card-bg-image" />
                        <div className="user-card-content">
                          {/* 头像 - 可点击编辑 */}
                          <div
                            className="user-avatar-wrapper user-avatar-editable"
                            onClick={() => avatarInputRef.current?.click()}
                          >
                            <div
                              className="user-avatar-img"
                              style={{ backgroundImage: `url(${user.avatar})` }}
                            />
                            <div className="user-avatar-overlay">
                              <svg className="user-avatar-edit-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                              </svg>
                            </div>
                            <input
                              ref={avatarInputRef}
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={handleAvatarSelect}
                            />
                          </div>
                          {/* 用户名 */}
                          <p className="user-nickname">{user.name}</p>
                          {/* 邮箱 */}
                          <p className="user-email">{user.email}</p>
                        </div>
                        {/* 分隔线 */}
                        <div className="user-card-divider" />
                        {/* 用户操作项 */}
                        <div className="user-card-footer">
                          {/* 修改昵称 */}
                          <div className="user-action-item" onClick={openNicknameModal}>
                            <span className="user-action-label">修改昵称</span>
                            <svg className="user-action-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                          </div>
                          {/* 修改头像 */}
                          <div className="user-action-item" onClick={() => avatarInputRef.current?.click()}>
                            <span className="user-action-label">修改头像</span>
                            <svg className="user-action-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                            </svg>
                          </div>
                          {/* 修改密码 */}
                          <div className="user-action-item" onClick={openPasswordModal}>
                            <span className="user-action-label">修改密码</span>
                            <svg className="user-action-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                            </svg>
                          </div>
                          {/* 分隔线 */}
                          <div className="user-card-divider" style={{ margin: '4px 0' }} />
                          {/* 退出登录 */}
                          <div className="user-action-item" onClick={onLogout}>
                            <span className="user-action-label">退出登录</span>
                            <svg className="user-action-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // 未登录状态 - Monknow 风格
                      <div className="settings-card login-card">
                        <div className="login-card-image" />
                        <div className="login-card-bg">
                          <div className="login-card-content">
                            <p className="login-card-text">登录后可同步数据，支持多设备同步</p>
                            <button className="login-card-btn" onClick={onLoginClick}>登录</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 右列 - 设置项 */}
                  <div className="settings-grid-right">
                    {/* 基本设置 */}
                    <div className="settings-card">
                      <h3 className="settings-section-title">基本设置</h3>
                      <div className="settings-item">
                        <span className="settings-item-label">打开链接方式</span>
                        <select
                          className="settings-select"
                          value={settings.openTarget}
                          onChange={(e) => updateSetting('openTarget', e.target.value as OpenTarget)}
                        >
                          {OPEN_TARGET_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="settings-item">
                        <span className="settings-item-label">默认搜索引擎</span>
                        <select
                          className="settings-select"
                          value={settings.searchEngine}
                          onChange={(e) => updateSetting('searchEngine', e.target.value)}
                        >
                          {SEARCH_ENGINES.map(engine => (
                            <option key={engine.id} value={engine.id}>{engine.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 时钟设置 */}
                    <div className="settings-card">
                      <h3 className="settings-section-title">时钟设置</h3>
                      <div className="settings-item">
                        <span className="settings-item-label">时钟格式</span>
                        <select
                          className="settings-select"
                          value={settings.clockFormat}
                          onChange={(e) => updateSetting('clockFormat', e.target.value as '12h' | '24h')}
                        >
                          <option value="24h">24小时制</option>
                          <option value="12h">12小时制</option>
                        </select>
                      </div>
                      <div className="settings-item">
                        <span className="settings-item-label">显示秒</span>
                        <div
                          className={`settings-switch ${settings.showSeconds ? 'active' : ''}`}
                          onClick={() => updateSetting('showSeconds', !settings.showSeconds)}
                        >
                          <div className="settings-switch-thumb" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 天气设置 - 单独一行 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">天气设置</h3>
                  <div className="settings-item">
                    <span className="settings-item-label">显示天气</span>
                    <div
                      className={`settings-switch ${settings.showWeather ? 'active' : ''}`}
                      onClick={() => updateSetting('showWeather', !settings.showWeather)}
                    >
                      <div className="settings-switch-thumb" />
                    </div>
                  </div>
                  <div className="settings-item">
                    <span className="settings-item-label">温度单位</span>
                    <select
                      className="settings-select"
                      value={settings.temperatureUnit}
                      onChange={(e) => updateSetting('temperatureUnit', e.target.value as 'celsius' | 'fahrenheit')}
                    >
                      {TEMPERATURE_UNIT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="settings-item location-item">
                    <span className="settings-item-label">位置</span>
                    <div className="location-input-wrapper" ref={locationWrapperRef}>
                      <input
                        type="text"
                        className="settings-input"
                        placeholder="搜索城市..."
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        onFocus={() => locationResults.length > 0 && setShowLocationDropdown(true)}
                      />
                      {settings.location && (
                        <button className="location-clear-btn" onClick={handleClearLocation}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                            <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"/>
                          </svg>
                        </button>
                      )}
                      {isSearchingLocation && (
                        <span className="location-loading">搜索中...</span>
                      )}
                      {showLocationDropdown && locationResults.length > 0 && (
                        <div className="location-dropdown">
                          {locationResults.map((loc, index) => (
                            <div
                              key={index}
                              className="location-option"
                              onClick={() => handleSelectLocation(loc)}
                            >
                              <span className="location-option-name">{loc.shortname}</span>
                              <span className="location-option-fullname">{loc.fullname}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 主题&壁纸设置 */}
            {activeTab === 'theme' && (
              <div className="settings-panel-content">
                {/* 主题选择 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">主题</h3>
                  <div className="theme-grid">
                    <div
                      className={`theme-item ${settings.theme === 'dark' ? 'selected' : ''}`}
                      onClick={() => updateSetting('theme', 'dark')}
                    >
                      <div
                        className="theme-preview dark-preview"
                        style={{ backgroundImage: `url(${settings.wallpaperType === 'image' ? settings.wallpaper : ''})`, backgroundColor: settings.wallpaperType === 'color' ? settings.wallpaper : undefined }}
                      />
                      <span className="theme-label">深色</span>
                    </div>
                    <div
                      className={`theme-item ${settings.theme === 'light' ? 'selected' : ''}`}
                      onClick={() => updateSetting('theme', 'light')}
                    >
                      <div
                        className="theme-preview light-preview"
                        style={{ backgroundImage: `url(${settings.wallpaperType === 'image' ? settings.wallpaper : ''})`, backgroundColor: settings.wallpaperType === 'color' ? settings.wallpaper : undefined }}
                      />
                      <span className="theme-label">浅色</span>
                    </div>
                  </div>
                </div>

                {/* 壁纸选择 */}
                <div className="settings-card">
                  <div className="settings-section-header">
                    <h3 className="settings-section-title">壁纸</h3>
                    <div className="wallpaper-tabs">
                      <button
                        className={`wallpaper-tab ${wallpaperTab === 'official' ? 'active' : ''}`}
                        onClick={() => setWallpaperTab('official')}
                      >
                        官方
                      </button>
                      <button
                        className={`wallpaper-tab ${wallpaperTab === 'local' ? 'active' : ''}`}
                        onClick={() => setWallpaperTab('local')}
                      >
                        本地
                      </button>
                      <button
                        className={`wallpaper-tab ${wallpaperTab === 'solid' ? 'active' : ''}`}
                        onClick={() => setWallpaperTab('solid')}
                      >
                        纯色
                      </button>
                    </div>
                  </div>

                  {/* 官方壁纸 */}
                  {wallpaperTab === 'official' && (
                    <div className="wallpaper-grid">
                      {WALLPAPERS.map((wp, index) => (
                        <div
                          key={index}
                          className={`wallpaper-item ${settings.wallpaper === wp && settings.wallpaperType === 'image' ? 'selected' : ''}`}
                          style={{ backgroundImage: `url(${wp})` }}
                          onClick={() => {
                            updateSetting('wallpaper', wp)
                            updateSetting('wallpaperType', 'image')
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* 本地壁纸 */}
                  {wallpaperTab === 'local' && (
                    <div className="local-wallpaper-upload">
                      <label className="upload-area">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                const dataUrl = event.target?.result as string
                                updateSetting('wallpaper', dataUrl)
                                updateSetting('wallpaperType', 'image')
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <div className="upload-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 4V16M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M4 17V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="upload-text">点击上传本地图片</span>
                        <span className="upload-hint">支持 JPG、PNG 格式</span>
                      </label>
                    </div>
                  )}

                  {/* 纯色壁纸 */}
                  {wallpaperTab === 'solid' && (
                    <div className="solid-colors-grid">
                      {SOLID_COLORS.map((color, index) => (
                        <div
                          key={index}
                          className={`solid-color-item ${settings.wallpaper === color && settings.wallpaperType === 'color' ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            updateSetting('wallpaper', color)
                            updateSetting('wallpaperType', 'color')
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 外观设置 */}
            {activeTab === 'appearance' && (
              <div className="settings-panel-content">
                {/* 图标设置 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">图标设置</h3>

                  {/* 图标大小 */}
                  <div className="settings-item">
                    <span className="settings-item-label">图标大小</span>
                    <select
                      className="settings-select"
                      value={settings.iconSize}
                      onChange={(e) => updateSetting('iconSize', e.target.value as 'small' | 'medium' | 'large')}
                    >
                      <option value="small">小</option>
                      <option value="medium">中</option>
                      <option value="large">大</option>
                    </select>
                  </div>

                  {/* 显示网站标签 */}
                  <div className="settings-item">
                    <span className="settings-item-label">显示网站名称</span>
                    <div
                      className={`settings-switch ${settings.showSiteLabel ? 'active' : ''}`}
                      onClick={() => updateSetting('showSiteLabel', !settings.showSiteLabel)}
                    >
                      <div className="settings-switch-thumb" />
                    </div>
                  </div>

                  {/* 显示网站描述 */}
                  <div className="settings-item">
                    <span className="settings-item-label">显示网站描述</span>
                    <div
                      className={`settings-switch ${settings.showSiteDesc ? 'active' : ''}`}
                      onClick={() => updateSetting('showSiteDesc', !settings.showSiteDesc)}
                    >
                      <div className="settings-switch-thumb" />
                    </div>
                  </div>
                </div>

                {/* 布局设置 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">布局设置</h3>

                  {/* 侧边栏位置 */}
                  <div className="settings-item">
                    <span className="settings-item-label">侧边栏位置</span>
                    <select
                      className="settings-select"
                      value={settings.sidebarPosition}
                      onChange={(e) => updateSetting('sidebarPosition', e.target.value as 'left' | 'right')}
                    >
                      <option value="left">左侧</option>
                      <option value="right">右侧</option>
                    </select>
                  </div>
                </div>

                {/* 图标大小预览 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">预览</h3>
                  <div className="icon-size-preview">
                    <div className={`preview-icon ${settings.iconSize}`}>
                      <div className="preview-icon-img" style={{ backgroundColor: '#1890ff' }} />
                      {settings.showSiteLabel && <span className="preview-icon-label">示例网站</span>}
                      {settings.showSiteDesc && <span className="preview-icon-desc">这是网站描述</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 反馈&其他 */}
            {activeTab === 'about' && (
              <div className="settings-panel-content">
                {/* 关于 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">关于</h3>
                  <div className="about-info">
                    <p className="about-version">DualTab v1.0.0</p>
                    <p className="about-desc">一个简洁美观的新标签页扩展</p>
                    <p className="about-desc">灵感来自 Monknow 新标签页</p>
                  </div>
                </div>

                {/* 快捷键 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">快捷键</h3>
                  <div className="shortcuts-list">
                    <div className="shortcut-item">
                      <span className="shortcut-label">聚焦搜索框</span>
                      <span className="shortcut-key">/</span>
                    </div>
                    <div className="shortcut-item">
                      <span className="shortcut-label">关闭弹窗</span>
                      <span className="shortcut-key">Esc</span>
                    </div>
                  </div>
                </div>

                {/* 反馈 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">反馈与支持</h3>
                  <div className="feedback-actions">
                    <button
                      className="feedback-button"
                      onClick={() => window.open('https://github.com/EmccK/DualTab/issues', '_blank')}
                    >
                      反馈问题
                    </button>
                    <button
                      className="feedback-button secondary"
                      onClick={() => window.open('https://github.com/EmccK/DualTab', '_blank')}
                    >
                      查看源码
                    </button>
                  </div>
                </div>

                {/* 数据管理 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">数据管理</h3>
                  <div className="data-actions">
                    <button
                      className="data-button"
                      onClick={() => {
                        // 导出数据
                        const data = {
                          settings,
                          exportTime: new Date().toISOString()
                        }
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `dualtab-settings-${new Date().toISOString().split('T')[0]}.json`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      导出设置
                    </button>
                    <label className="data-button">
                      导入设置
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              try {
                                const data = JSON.parse(event.target?.result as string)
                                if (data.settings) {
                                  // 验证导入的设置字段
                                  const importedSettings = data.settings
                                  const validatedSettings: Partial<Settings> = {}

                                  // 验证主题设置
                                  if (importedSettings.theme === 'dark' || importedSettings.theme === 'light') {
                                    validatedSettings.theme = importedSettings.theme
                                  }
                                  if (typeof importedSettings.wallpaper === 'string') {
                                    validatedSettings.wallpaper = importedSettings.wallpaper
                                  }
                                  if (importedSettings.wallpaperType === 'image' || importedSettings.wallpaperType === 'color') {
                                    validatedSettings.wallpaperType = importedSettings.wallpaperType
                                  }

                                  // 验证常规设置
                                  const validOpenTargets = ['currentTab', 'newTab', 'backgroundTab', 'newWindow', 'newIncognitoWindow']
                                  if (validOpenTargets.includes(importedSettings.openTarget)) {
                                    validatedSettings.openTarget = importedSettings.openTarget
                                  }
                                  if (typeof importedSettings.searchEngine === 'string') {
                                    validatedSettings.searchEngine = importedSettings.searchEngine
                                  }
                                  if (importedSettings.clockFormat === '12h' || importedSettings.clockFormat === '24h') {
                                    validatedSettings.clockFormat = importedSettings.clockFormat
                                  }
                                  if (typeof importedSettings.showSeconds === 'boolean') {
                                    validatedSettings.showSeconds = importedSettings.showSeconds
                                  }
                                  if (typeof importedSettings.showWeather === 'boolean') {
                                    validatedSettings.showWeather = importedSettings.showWeather
                                  }
                                  if (importedSettings.temperatureUnit === 'celsius' || importedSettings.temperatureUnit === 'fahrenheit') {
                                    validatedSettings.temperatureUnit = importedSettings.temperatureUnit
                                  }
                                  if (importedSettings.location === null || (typeof importedSettings.location === 'object' && importedSettings.location.woeid)) {
                                    validatedSettings.location = importedSettings.location
                                  }

                                  // 验证外观设置
                                  if (['small', 'medium', 'large'].includes(importedSettings.iconSize)) {
                                    validatedSettings.iconSize = importedSettings.iconSize
                                  }
                                  if (typeof importedSettings.showSiteLabel === 'boolean') {
                                    validatedSettings.showSiteLabel = importedSettings.showSiteLabel
                                  }
                                  if (typeof importedSettings.showSiteDesc === 'boolean') {
                                    validatedSettings.showSiteDesc = importedSettings.showSiteDesc
                                  }
                                  if (importedSettings.sidebarPosition === 'left' || importedSettings.sidebarPosition === 'right') {
                                    validatedSettings.sidebarPosition = importedSettings.sidebarPosition
                                  }

                                  // 合并验证后的设置
                                  onSettingsChange({ ...settings, ...validatedSettings })
                                }
                              } catch (err) {
                                console.error('导入设置失败:', err)
                                alert('导入失败：文件格式不正确')
                              }
                            }
                            reader.readAsText(file)
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 关闭按钮 */}
        <button className="settings-close-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      {/* 修改昵称弹窗 */}
      {editModal === 'nickname' && (
        <div className="edit-modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3 className="edit-modal-title">修改昵称</h3>
              <button className="edit-modal-close" onClick={closeEditModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="edit-modal-body">
              <input
                type="text"
                className="edit-modal-input"
                placeholder="请输入新昵称"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                maxLength={20}
                autoFocus
              />
              {editError && <p className="edit-modal-error">{editError}</p>}
            </div>
            <div className="edit-modal-footer">
              <button className="edit-modal-btn secondary" onClick={closeEditModal}>
                取消
              </button>
              <button
                className="edit-modal-btn primary"
                onClick={handleSubmitNickname}
                disabled={isSubmitting}
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      {editModal === 'password' && (
        <div className="edit-modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3 className="edit-modal-title">修改密码</h3>
              <button className="edit-modal-close" onClick={closeEditModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="edit-modal-body">
              {/* 当前密码 */}
              <div className="edit-modal-field">
                <label className="edit-modal-label">当前密码</label>
                <div className="password-input-wrapper">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    className="edit-modal-input"
                    placeholder="请输入当前密码"
                    value={editOldPassword}
                    onChange={(e) => setEditOldPassword(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                  >
                    {showOldPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 新密码 */}
              <div className="edit-modal-field">
                <label className="edit-modal-label">新密码</label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="edit-modal-input"
                    placeholder="请输入新密码（至少6位）"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </button>
                </div>
                {/* 密码强度提示 */}
                {editNewPassword && (
                  <div className="password-strength">
                    <div className="password-strength-bar">
                      <div
                        className={`password-strength-fill ${getPasswordStrength(editNewPassword)}`}
                      />
                    </div>
                    <span className={`password-strength-text ${getPasswordStrength(editNewPassword)}`}>
                      密码强度: {getPasswordStrengthText(getPasswordStrength(editNewPassword))}
                    </span>
                  </div>
                )}
              </div>

              {/* 确认新密码 */}
              <div className="edit-modal-field">
                <label className="edit-modal-label">确认新密码</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="edit-modal-input"
                    placeholder="请再次输入新密码"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </button>
                </div>
                {/* 密码匹配提示 */}
                {editConfirmPassword && editNewPassword !== editConfirmPassword && (
                  <p className="password-mismatch-hint">两次输入的密码不一致</p>
                )}
              </div>

              {editError && <p className="edit-modal-error">{editError}</p>}
              {editSuccess && <p className="edit-modal-success">{editSuccess}</p>}
            </div>
            <div className="edit-modal-footer">
              <button className="edit-modal-btn secondary" onClick={closeEditModal}>
                取消
              </button>
              <button
                className="edit-modal-btn primary"
                onClick={handleSubmitPassword}
                disabled={isSubmitting}
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 头像预览弹窗 */}
      {editModal === 'avatar' && avatarPreview && (
        <div className="edit-modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal avatar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3 className="edit-modal-title">更换头像</h3>
              <button className="edit-modal-close" onClick={closeEditModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="edit-modal-body avatar-preview-body">
              <div className="avatar-preview-container">
                <div
                  className="avatar-preview-image"
                  style={{ backgroundImage: `url(${avatarPreview})` }}
                />
                <div className="avatar-preview-circle" />
              </div>
              <p className="avatar-preview-hint">头像将被裁剪为圆形显示</p>
              {editError && <p className="edit-modal-error">{editError}</p>}
            </div>
            <div className="edit-modal-footer">
              <button
                className="edit-modal-btn secondary"
                onClick={() => avatarInputRef.current?.click()}
              >
                重新选择
              </button>
              <button
                className="edit-modal-btn primary"
                onClick={handleConfirmAvatar}
                disabled={isSubmitting}
              >
                {isSubmitting ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 上传中提示 */}
      {isSubmitting && editModal === null && (
        <div className="upload-loading-overlay">
          <div className="upload-loading-content">
            <div className="upload-loading-spinner" />
            <p className="upload-loading-text">上传中...</p>
          </div>
        </div>
      )}
    </div>
  )
}
