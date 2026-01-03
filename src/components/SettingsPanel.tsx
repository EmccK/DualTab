import { useState, useEffect, useRef } from 'react'
import type { Settings, User, OpenTarget, WallpaperSource, WallpaperCategory, WallpaperInterval, ViewLayout, StandbySettings, StandbyInactiveDelay, LocationInfo } from '../types'
import { WALLPAPERS, SEARCH_ENGINES, OPEN_TARGET_OPTIONS, WALLPAPER_COLORS, WALLPAPER_CATEGORIES, WALLPAPER_INTERVALS, VIEW_LAYOUT_PRESETS, STANDBY_INACTIVE_DELAYS } from '../constants'
import { updateNickname, updatePortrait, changePassword, uploadImage, uploadWallpaper, getSearchEngines, searchLocations } from '../services/api'
import { OptionSelect } from './OptionSelect'
import './SettingsPanel.css'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  user: User | null
  onLoginClick: () => void
  onLogout: () => void
  onUserUpdate?: (user: User) => void  // 用户信息更新回调
  currentWallpaper?: string | null     // 当前显示的壁纸URL（官方库）
  onNextWallpaper?: () => void         // 切换下一张壁纸
}

// 设置面板选项卡类型
type SettingsTab = 'general' | 'theme' | 'appearance'

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

// 主题预览卡片组件 - 减少重复代码
function ThemePreviewCard({ variant }: { variant: 'light' | 'dark' }) {
  return (
    <div className={`theme-preview ${variant}-theme-preview`}>
      <div className={`theme-preview-sidebar ${variant}`}>
        <div className="theme-preview-dot" />
        <div className="theme-preview-lines">
          <div className="theme-preview-line" />
          <div className="theme-preview-line" />
          <div className="theme-preview-line" />
        </div>
      </div>
      <div className={`theme-preview-content ${variant}`}>
        <div className="theme-preview-cards">
          <div className="theme-preview-card" />
          <div className="theme-preview-card" />
          <div className="theme-preview-card" />
          <div className="theme-preview-card" />
        </div>
      </div>
    </div>
  )
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
  onUserUpdate,
  currentWallpaper,
  onNextWallpaper
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme')
  // 壁纸选项卡根据当前设置初始化
  const [wallpaperTab, setWallpaperTab] = useState<WallpaperSource>(settings.wallpaperSource || 'lib')

  // 壁纸上传状态
  const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false)
  const wallpaperInputRef = useRef<HTMLInputElement>(null)

  // 颜色输入状态
  const [colorInputValue, setColorInputValue] = useState(settings.wallpaperColor || '#276ce6')

  // 同步外部设置变化到颜色输入
  useEffect(() => {
    setColorInputValue(settings.wallpaperColor || '#276ce6')
  }, [settings.wallpaperColor])

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

  // 外观子菜单状态: null | 'width' | 'search' | 'icon'
  const [appearanceSubMenu, setAppearanceSubMenu] = useState<'width' | 'search' | 'icon' | null>(null)

  // 搜索引擎列表状态
  const [searchEngineOptions, setSearchEngineOptions] = useState(
    SEARCH_ENGINES.map(engine => ({ value: engine.id, label: engine.name }))
  )

  // 位置搜索状态
  const [locationInput, setLocationInput] = useState('')
  const [locationResults, setLocationResults] = useState<LocationInfo[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const locationSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 从后端获取搜索引擎列表
  useEffect(() => {
    const fetchEngines = async () => {
      const engines = await getSearchEngines()
      if (engines.length > 0) {
        setSearchEngineOptions(engines.map(e => ({ value: e.id, label: e.name })))
      }
    }
    fetchEngines()
  }, [])

  // 组件卸载时清理位置搜索定时器
  useEffect(() => {
    return () => {
      if (locationSearchTimeout.current) {
        clearTimeout(locationSearchTimeout.current)
      }
    }
  }, [])

  // 更新设置
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  // 更新待机页设置
  const updateStandbySetting = <K extends keyof StandbySettings>(key: K, value: StandbySettings[K]) => {
    const currentStandby = settings.standby || {
      display: true,
      openAfterAppReady: false,
      openAfterAppInactiveDelaySeconds: 30 as StandbyInactiveDelay,
      blurredBackground: true,
      displayClock: true,
      displayWeather: true
    }
    onSettingsChange({
      ...settings,
      standby: {
        ...currentStandby,
        [key]: value
      }
    })
  }

  // 处理位置搜索输入
  const handleLocationInputChange = (value: string) => {
    // 输入验证：限制长度和字符，防止 XSS
    const sanitized = value.slice(0, 100).replace(/[<>]/g, '')
    setLocationInput(sanitized)

    // 清除之前的定时器
    if (locationSearchTimeout.current) {
      clearTimeout(locationSearchTimeout.current)
    }

    if (!sanitized.trim()) {
      setLocationResults([])
      setShowLocationDropdown(false)
      return
    }

    // 防抖搜索
    locationSearchTimeout.current = setTimeout(async () => {
      setIsSearchingLocation(true)
      try {
        const results = await searchLocations(sanitized.trim())
        setLocationResults(results)
        setShowLocationDropdown(results.length > 0)
      } catch (err) {
        console.error('搜索位置失败:', err)
        setLocationResults([])
      } finally {
        setIsSearchingLocation(false)
      }
    }, 300)
  }

  // 选择位置
  const handleSelectLocation = (location: LocationInfo) => {
    updateSetting('location', location)
    setLocationInput(location.shortname)
    setShowLocationDropdown(false)
    setLocationResults([])
  }

  // 清除位置
  const handleClearLocation = () => {
    updateSetting('location', null)
    setLocationInput('')
    setLocationResults([])
    setShowLocationDropdown(false)
  }

  // 切换主视图布局时，同时更新多个相关设置
  const handleViewLayoutChange = (layout: ViewLayout) => {
    const preset = VIEW_LAYOUT_PRESETS[layout]
    if (!preset) return

    // 合并预设参数到当前设置
    const newSettings: Settings = {
      ...settings,
      viewLayout: layout,
      // 应用 icons 预设
      iconLayout: preset.icons.iconLayout,
      iconSizePercentage: preset.icons.sizePercentage,
      iconBorderRadius: preset.icons.borderRadiusPercentage,
      iconOpacity: preset.icons.opacityPercentage,
      iconShadow: preset.icons.displayShadow,
      iconRowGap: preset.icons.rowGapPercentage,
      iconColumnGap: preset.icons.columnGapPercentage
    }

    onSettingsChange(newSettings)
  }

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
    { id: 'appearance', label: '外观' }
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
                    {/* 打开方式设置 - Monknow 风格下拉框 */}
                    <div className="settings-card">
                      <h3 className="settings-section-title">打开方式</h3>
                      {/* 图标打开方式 */}
                      <div className="settings-item">
                        <span className="settings-item-label">图标</span>
                        <OptionSelect
                          options={OPEN_TARGET_OPTIONS}
                          value={settings.openTarget}
                          onChange={(value) => updateSetting('openTarget', value as OpenTarget)}
                        />
                      </div>
                      {/* 搜索结果打开方式 */}
                      <div className="settings-item">
                        <span className="settings-item-label">搜索结果</span>
                        <OptionSelect
                          options={OPEN_TARGET_OPTIONS}
                          value={settings.searchOpenTarget}
                          onChange={(value) => updateSetting('searchOpenTarget', value as OpenTarget)}
                        />
                      </div>
                    </div>

                    {/* 搜索设置 */}
                    <div className="settings-card">
                      <h3 className="settings-section-title">搜索</h3>
                      <div className="settings-item">
                        <span className="settings-item-label">搜索引擎</span>
                        <OptionSelect
                          options={searchEngineOptions}
                          value={settings.searchEngine}
                          onChange={(value) => updateSetting('searchEngine', value)}
                        />
                      </div>
                    </div>

                    {/* 分组设置 - Monknow 风格 */}
                    <div className="settings-card">
                      <h3 className="settings-section-title">分组</h3>
                      {/* 滚动以切换分组 */}
                      <div className="settings-item">
                        <span className="settings-item-label">滚动以切换分组</span>
                        <div
                          className={`settings-switch ${settings.scrollToSwitchGroup ? 'active' : ''}`}
                          onClick={() => updateSetting('scrollToSwitchGroup', !settings.scrollToSwitchGroup)}
                        >
                          <div className="settings-switch-thumb" />
                        </div>
                      </div>
                      {/* 记住最后访问的分组 */}
                      <div className="settings-item">
                        <span className="settings-item-label">记住最后访问的分组</span>
                        <div
                          className={`settings-switch ${settings.rememberLastGroup ? 'active' : ''}`}
                          onClick={() => updateSetting('rememberLastGroup', !settings.rememberLastGroup)}
                        >
                          <div className="settings-switch-thumb" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 主题&壁纸设置 */}
            {activeTab === 'theme' && (
              <div className="settings-panel-content">
                {/* 两列网格布局 - Monknow 风格 */}
                <div className="theme-wallpaper-grid">
                  {/* 左列 - 主题 + 侧边栏 */}
                  <div className="theme-wallpaper-left">
                    {/* 主题选择 - Monknow 风格 */}
                    <div className="settings-card">
                      <h3 className="settings-section-title">主题</h3>
                      <div className="theme-grid">
                        {/* 浅色主题 */}
                        <div
                          className={`theme-item ${settings.theme === 'light' ? 'selected' : ''} ${settings.theme === 'auto' ? 'disabled' : ''}`}
                          onClick={() => {
                            if (settings.theme !== 'auto') {
                              updateSetting('theme', 'light')
                            }
                          }}
                        >
                          <ThemePreviewCard variant="light" />
                          <span className="theme-label">浅色</span>
                        </div>
                        {/* 深色主题 */}
                        <div
                          className={`theme-item ${settings.theme === 'dark' ? 'selected' : ''} ${settings.theme === 'auto' ? 'disabled' : ''}`}
                          onClick={() => {
                            if (settings.theme !== 'auto') {
                              updateSetting('theme', 'dark')
                            }
                          }}
                        >
                          <ThemePreviewCard variant="dark" />
                          <span className="theme-label">深色</span>
                        </div>
                      </div>
                      {/* 跟随系统开关 */}
                      <div className="settings-item">
                        <span className="settings-item-label">跟随系统</span>
                        <div
                          className={`settings-switch ${settings.theme === 'auto' ? 'active' : ''}`}
                          onClick={() => {
                            if (settings.theme === 'auto') {
                              // 关闭跟随系统时，根据当前系统主题设置
                              const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                              updateSetting('theme', isDark ? 'dark' : 'light')
                            } else {
                              // 开启跟随系统
                              updateSetting('theme', 'auto')
                            }
                          }}
                        >
                          <div className="settings-switch-thumb" />
                        </div>
                      </div>
                    </div>

                    {/* 侧边栏设置 - Monknow 风格 */}
                    <div className="settings-card">
                      <h3 className="settings-section-title">侧边栏</h3>
                      <div className="sidebar-position-grid">
                        {/* 左侧 */}
                        <div
                          className={`sidebar-position-item ${settings.sidebarPosition === 'left' ? 'selected' : ''}`}
                          onClick={() => updateSetting('sidebarPosition', 'left')}
                        >
                          <div className="sidebar-position-preview">
                            <div className="sidebar-preview-bar left" />
                            <div className="sidebar-preview-content">
                              <div className="sidebar-preview-cards">
                                <div className="sidebar-preview-card" />
                                <div className="sidebar-preview-card" />
                                <div className="sidebar-preview-card" />
                                <div className="sidebar-preview-card" />
                              </div>
                            </div>
                          </div>
                          <span className="sidebar-position-label">左侧</span>
                        </div>
                        {/* 右侧 */}
                        <div
                          className={`sidebar-position-item ${settings.sidebarPosition === 'right' ? 'selected' : ''}`}
                          onClick={() => updateSetting('sidebarPosition', 'right')}
                        >
                          <div className="sidebar-position-preview">
                            <div className="sidebar-preview-content">
                              <div className="sidebar-preview-cards">
                                <div className="sidebar-preview-card" />
                                <div className="sidebar-preview-card" />
                                <div className="sidebar-preview-card" />
                                <div className="sidebar-preview-card" />
                              </div>
                            </div>
                            <div className="sidebar-preview-bar right" />
                          </div>
                          <span className="sidebar-position-label">右侧</span>
                        </div>
                      </div>
                      {/* 自动隐藏开关 */}
                      <div className="settings-item">
                        <span className="settings-item-label">自动隐藏</span>
                        <div
                          className={`settings-switch ${settings.sidebarAutoHide ? 'active' : ''}`}
                          onClick={() => updateSetting('sidebarAutoHide', !settings.sidebarAutoHide)}
                        >
                          <div className="settings-switch-thumb" />
                        </div>
                      </div>
                      {/* 窄距菜单开关 */}
                      <div className="settings-item">
                        <span className="settings-item-label">窄距菜单</span>
                        <div
                          className={`settings-switch ${settings.sidebarCollapsed ? 'active' : ''}`}
                          onClick={() => updateSetting('sidebarCollapsed', !settings.sidebarCollapsed)}
                        >
                          <div className="settings-switch-thumb" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 右列 - 壁纸 */}
                  <div className="theme-wallpaper-right">
                    {/* 壁纸选择 */}
                    <div className="settings-card wallpaper-card">
                      <h3 className="settings-section-title">壁纸</h3>
                      {/* 壁纸类型选择 - 使用预览卡片 */}
                      <div className="wallpaper-type-grid">
                        {/* 官方库 */}
                        <div
                          className={`wallpaper-type-item ${wallpaperTab === 'lib' ? 'selected' : ''}`}
                          onClick={() => {
                            setWallpaperTab('lib')
                            updateSetting('wallpaperSource', 'lib')
                          }}
                        >
                          <div
                            className="wallpaper-type-preview"
                            style={{
                              backgroundImage: currentWallpaper ? `url(${currentWallpaper})` : `url(${WALLPAPERS[0]})`,
                              filter: settings.wallpaperSource === 'lib' && settings.wallpaperBlurred ? 'blur(3px)' : 'none'
                            }}
                          />
                          <span className="wallpaper-type-label">官方库</span>
                        </div>
                        {/* 本地 */}
                        <div
                          className={`wallpaper-type-item ${wallpaperTab === 'local' ? 'selected' : ''}`}
                          onClick={() => {
                            setWallpaperTab('local')
                            updateSetting('wallpaperSource', 'local')
                          }}
                        >
                          <div
                            className="wallpaper-type-preview local-preview"
                            style={settings.localWallpaper ? {
                              backgroundImage: `url(${settings.localWallpaper})`,
                              filter: settings.wallpaperSource === 'local' && settings.wallpaperBlurred ? 'blur(3px)' : 'none'
                            } : {}}
                          />
                          <span className="wallpaper-type-label">本地</span>
                        </div>
                        {/* 纯色 */}
                        <div
                          className={`wallpaper-type-item ${wallpaperTab === 'color' ? 'selected' : ''}`}
                          onClick={() => {
                            setWallpaperTab('color')
                            updateSetting('wallpaperSource', 'color')
                          }}
                        >
                          <div
                            className="wallpaper-type-preview"
                            style={{ backgroundColor: settings.wallpaperColor || '#276ce6' }}
                          />
                          <span className="wallpaper-type-label">纯色</span>
                        </div>
                      </div>

                      {/* 分隔线 */}
                      <div className="wallpaper-divider" />

                      {/* 官方库选项 */}
                      {wallpaperTab === 'lib' && (
                        <div className="wallpaper-options">
                          {/* 类别选择 */}
                          <div className="settings-item">
                            <span className="settings-item-label">类别</span>
                            <OptionSelect
                              options={WALLPAPER_CATEGORIES.map(cat => ({ value: String(cat.value), label: cat.label }))}
                              value={String(settings.wallpaperCategory)}
                              onChange={(value) => updateSetting('wallpaperCategory', Number(value) as WallpaperCategory)}
                            />
                          </div>
                          {/* 下一个按钮 */}
                          <div
                            className="settings-item settings-item-clickable"
                            onClick={onNextWallpaper}
                          >
                            <span className="settings-item-label">下一个</span>
                            <svg className="settings-item-arrow" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                          {/* 更换频率 */}
                          <div className="settings-item">
                            <span className="settings-item-label">更换频率</span>
                            <OptionSelect
                              options={WALLPAPER_INTERVALS.map(int => ({ value: String(int.value), label: int.label }))}
                              value={String(settings.wallpaperInterval)}
                              onChange={(value) => updateSetting('wallpaperInterval', Number(value) as WallpaperInterval)}
                            />
                          </div>
                          {/* 模糊开关 */}
                          <div className="settings-item">
                            <span className="settings-item-label">模糊</span>
                            <div
                              className={`settings-switch ${settings.wallpaperBlurred ? 'active' : ''}`}
                              onClick={() => updateSetting('wallpaperBlurred', !settings.wallpaperBlurred)}
                            >
                              <div className="settings-switch-thumb" />
                            </div>
                          </div>
                          {/* 下载按钮 */}
                          <div
                            className="settings-item settings-item-clickable"
                            onClick={async () => {
                              if (currentWallpaper) {
                                try {
                                  // 使用 fetch + Blob 方式下载跨域图片
                                  const response = await fetch(currentWallpaper)
                                  const blob = await response.blob()
                                  const url = URL.createObjectURL(blob)
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = 'wallpaper.jpg'
                                  link.click()
                                  URL.revokeObjectURL(url)
                                } catch {
                                  // 如果 fetch 失败，回退到直接打开
                                  window.open(currentWallpaper, '_blank')
                                }
                              }
                            }}
                          >
                            <span className="settings-item-label">下载</span>
                            <svg className="settings-item-arrow" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      )}

                      {/* 本地壁纸选项 */}
                      {wallpaperTab === 'local' && (
                        <div className="wallpaper-options">
                          {/* 更换按钮 */}
                          <div
                            className={`settings-item settings-item-clickable ${isUploadingWallpaper ? 'disabled' : ''}`}
                            onClick={() => !isUploadingWallpaper && wallpaperInputRef.current?.click()}
                          >
                            <span className="settings-item-label">
                              {isUploadingWallpaper ? '上传中...' : '更换'}
                            </span>
                            {!isUploadingWallpaper && (
                              <svg className="settings-item-arrow" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            )}
                          </div>
                          <input
                            ref={wallpaperInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return

                              // 验证文件类型
                              const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
                              if (!allowedTypes.includes(file.type)) {
                                alert('请选择 JPG、PNG、WebP 或 GIF 格式的图片')
                                return
                              }

                              // 验证文件大小（最大 10MB）
                              const maxSize = 10 * 1024 * 1024
                              if (file.size > maxSize) {
                                alert('图片大小不能超过 10MB')
                                return
                              }

                              // 如果已登录，上传到服务器
                              if (user?.secret) {
                                setIsUploadingWallpaper(true)
                                try {
                                  const result = await uploadWallpaper(user.secret, file)
                                  if (result) {
                                    // 批量更新设置，store 会自动同步到服务器
                                    onSettingsChange({
                                      ...settings,
                                      localWallpaper: result.url,
                                      localWallpaperBlurred: result.blurUrl,
                                      wallpaperSource: 'local'
                                    })
                                  }
                                } catch (err) {
                                  console.error('上传壁纸失败:', err)
                                } finally {
                                  setIsUploadingWallpaper(false)
                                }
                              } else {
                                // 未登录，使用本地 DataURL
                                const reader = new FileReader()
                                reader.onload = (event) => {
                                  const dataUrl = event.target?.result as string
                                  onSettingsChange({
                                    ...settings,
                                    localWallpaper: dataUrl,
                                    wallpaperSource: 'local'
                                  })
                                }
                                reader.readAsDataURL(file)
                              }

                              // 清空 input
                              if (wallpaperInputRef.current) {
                                wallpaperInputRef.current.value = ''
                              }
                            }}
                          />
                          {/* 模糊开关 */}
                          <div className="settings-item">
                            <span className="settings-item-label">模糊</span>
                            <div
                              className={`settings-switch ${settings.wallpaperBlurred ? 'active' : ''}`}
                              onClick={() => updateSetting('wallpaperBlurred', !settings.wallpaperBlurred)}
                            >
                              <div className="settings-switch-thumb" />
                            </div>
                          </div>
                          {/* 下载按钮 */}
                          <div
                            className="settings-item settings-item-clickable"
                            onClick={async () => {
                              if (settings.localWallpaper) {
                                try {
                                  // 使用 fetch + Blob 方式下载跨域图片
                                  const response = await fetch(settings.localWallpaper)
                                  const blob = await response.blob()
                                  const url = URL.createObjectURL(blob)
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = 'wallpaper.jpg'
                                  link.click()
                                  URL.revokeObjectURL(url)
                                } catch {
                                  // 如果 fetch 失败，回退到直接打开
                                  window.open(settings.localWallpaper, '_blank')
                                }
                              }
                            }}
                          >
                            <span className="settings-item-label">下载</span>
                            <svg className="settings-item-arrow" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      )}

                      {/* 纯色壁纸选项 */}
                      {wallpaperTab === 'color' && (
                        <div className="wallpaper-options">
                          {/* 背景颜色标题 */}
                          <div className="color-section-title">背景颜色</div>
                          {/* 预设颜色网格 */}
                          <div className="wallpaper-colors-grid">
                            {WALLPAPER_COLORS.map((color, index) => (
                              <div
                                key={index}
                                className={`wallpaper-color-item ${settings.wallpaperColor === color ? 'selected' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  updateSetting('wallpaperColor', color)
                                  setColorInputValue(color)
                                }}
                              />
                            ))}
                            {/* 自定义颜色选择器 */}
                            <div className="wallpaper-color-item custom-color">
                              <input
                                type="color"
                                value={settings.wallpaperColor}
                                onChange={(e) => {
                                  updateSetting('wallpaperColor', e.target.value)
                                  setColorInputValue(e.target.value)
                                }}
                                className="color-picker-input"
                              />
                              <div className="custom-color-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                  <rect x="3" y="3" width="7" height="7" fill="#f44336"/>
                                  <rect x="14" y="3" width="7" height="7" fill="#4caf50"/>
                                  <rect x="3" y="14" width="7" height="7" fill="#2196f3"/>
                                  <rect x="14" y="14" width="7" height="7" fill="#ffeb3b"/>
                                </svg>
                              </div>
                            </div>
                          </div>
                          {/* 颜色值输入框 */}
                          <div className="color-input-wrapper">
                            <input
                              type="text"
                              className="color-input"
                              value={colorInputValue}
                              onChange={(e) => {
                                setColorInputValue(e.target.value)
                                // 验证颜色格式
                                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                  updateSetting('wallpaperColor', e.target.value)
                                }
                              }}
                              onBlur={() => {
                                // 失焦时如果格式不对，恢复为当前设置值
                                if (!/^#[0-9A-Fa-f]{6}$/.test(colorInputValue)) {
                                  setColorInputValue(settings.wallpaperColor)
                                }
                              }}
                              placeholder="#276ce6"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 壁纸上传中提示 */}
                {isUploadingWallpaper && (
                  <div className="upload-loading-overlay">
                    <div className="upload-loading-content">
                      <div className="upload-loading-spinner" />
                      <p className="upload-loading-text">上传壁纸中...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 外观设置 - Monknow 风格两列布局 */}
            {activeTab === 'appearance' && (
              <div className="settings-panel-content">
                <div className="appearance-grid">
                  {/* 左列 - 主视图 + 菜单项 */}
                  <div className="appearance-left">
                    {/* 主视图选择 - 完全复刻 Monknow */}
                    <div className="settings-card">
                      <h3 className="settings-section-title">主视图</h3>
                      <div className="view-layout-grid">
                        {/* 经典布局 */}
                        <div
                          className={`view-layout-item ${settings.viewLayout === 'classic' ? 'selected' : ''}`}
                          onClick={() => handleViewLayoutChange('classic')}
                        >
                          <div className="view-layout-preview">
                            <svg width="102" height="66" viewBox="0 0 96 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="96" height="60" rx="2" className="view-layout-bg" />
                              <rect x="24" y="8" width="48" height="8" rx="1" className="view-layout-search-bar" />
                              <rect x="12" y="24" width="20" height="10" rx="2" className="view-layout-card-bg" />
                              <rect x="12" y="40" width="20" height="10" rx="2" className="view-layout-card-bg" />
                              <rect x="38" y="24" width="20" height="10" rx="2" className="view-layout-card-bg" />
                              <rect x="38" y="40" width="20" height="10" rx="2" className="view-layout-card-bg" />
                              <rect x="64" y="24" width="20" height="10" rx="2" className="view-layout-card-bg" />
                              <rect x="64" y="40" width="20" height="10" rx="2" className="view-layout-card-bg" />
                              <path d="M14,24 L22,24 L22,34 L14,34 C12.895,34 12,33.105 12,32 L12,26 C12,24.895 12.895,24 14,24 Z" className="view-layout-icon" />
                              <path d="M14,40 L22,40 L22,50 L14,50 C12.895,50 12,49.105 12,48 L12,42 C12,40.895 12.895,40 14,40 Z" className="view-layout-icon" />
                              <path d="M40,24 L48,24 L48,34 L40,34 C38.895,34 38,33.105 38,32 L38,26 C38,24.895 38.895,24 40,24 Z" className="view-layout-icon" />
                              <path d="M40,40 L48,40 L48,50 L40,50 C38.895,50 38,49.105 38,48 L38,42 C38,40.895 38.895,40 40,40 Z" className="view-layout-icon" />
                              <path d="M66,24 L74,24 L74,34 L66,34 C64.895,34 64,33.105 64,32 L64,26 C64,24.895 64.895,24 66,24 Z" className="view-layout-icon" />
                              <path d="M66,40 L74,40 L74,50 L66,50 C64.895,50 64,49.105 64,48 L64,42 C64,40.895 64.895,40 66,40 Z" className="view-layout-icon" />
                              <rect x="24" y="26" width="6" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="24" y="42" width="6" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="50" y="26" width="6" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="50" y="42" width="6" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="76" y="26" width="6" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="76" y="42" width="6" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="24" y="29" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="24" y="45" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="50" y="29" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="50" y="45" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="76" y="29" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="76" y="45" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="24" y="31" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="24" y="47" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="50" y="31" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="50" y="47" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="76" y="31" width="6" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="76" y="47" width="6" height="1" rx="0.5" className="view-layout-text" />
                            </svg>
                          </div>
                          <span className="view-layout-label">经典</span>
                        </div>
                        {/* 高效布局 */}
                        <div
                          className={`view-layout-item ${settings.viewLayout === 'efficient' ? 'selected' : ''}`}
                          onClick={() => handleViewLayoutChange('efficient')}
                        >
                          <div className="view-layout-preview">
                            <svg width="102" height="66" viewBox="0 0 96 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="96" height="60" rx="2" className="view-layout-bg" />
                              <rect x="22" y="10" width="52" height="8" rx="1" className="view-layout-search-bar" />
                              <rect x="7" y="26" width="16" height="8" rx="2" className="view-layout-card-bg" />
                              <rect x="7" y="40" width="16" height="8" rx="2" className="view-layout-card-bg" />
                              <rect x="29" y="26" width="16" height="8" rx="2" className="view-layout-card-bg" />
                              <rect x="29" y="40" width="16" height="8" rx="2" className="view-layout-card-bg" />
                              <rect x="51" y="26" width="16" height="8" rx="2" className="view-layout-card-bg" />
                              <rect x="51" y="40" width="16" height="8" rx="2" className="view-layout-card-bg" />
                              <rect x="73" y="26" width="16" height="8" rx="2" className="view-layout-card-bg" />
                              <rect x="73" y="40" width="16" height="8" rx="2" className="view-layout-card-bg" />
                              <path d="M9,26 L15,26 L15,34 L9,34 C7.895,34 7,33.105 7,32 L7,28 C7,26.895 7.895,26 9,26 Z" className="view-layout-icon" />
                              <path d="M9,40 L15,40 L15,48 L9,48 C7.895,48 7,47.105 7,46 L7,42 C7,40.895 7.895,40 9,40 Z" className="view-layout-icon" />
                              <path d="M31,26 L37,26 L37,34 L31,34 C29.895,34 29,33.105 29,32 L29,28 C29,26.895 29.895,26 31,26 Z" className="view-layout-icon" />
                              <path d="M31,40 L37,40 L37,48 L31,48 C29.895,48 29,47.105 29,46 L29,42 C29,40.895 29.895,40 31,40 Z" className="view-layout-icon" />
                              <path d="M53,26 L59,26 L59,34 L53,34 C51.895,34 51,33.105 51,32 L51,28 C51,26.895 51.895,26 53,26 Z" className="view-layout-icon" />
                              <path d="M53,40 L59,40 L59,48 L53,48 C51.895,48 51,47.105 51,46 L51,42 C51,40.895 51.895,40 53,40 Z" className="view-layout-icon" />
                              <path d="M75,26 L81,26 L81,34 L75,34 C73.895,34 73,33.105 73,32 L73,28 C73,26.895 73.895,26 75,26 Z" className="view-layout-icon" />
                              <path d="M75,40 L81,40 L81,48 L75,48 C73.895,48 73,47.105 73,46 L73,42 C73,40.895 73.895,40 75,40 Z" className="view-layout-icon" />
                              <rect x="17" y="28" width="4" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="17" y="42" width="4" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="39" y="28" width="4" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="39" y="42" width="4" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="61" y="28" width="4" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="61" y="42" width="4" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="83" y="28" width="4" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="83" y="42" width="4" height="2" rx="0.5" className="view-layout-text" />
                              <rect x="17" y="31" width="4" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="17" y="45" width="4" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="39" y="31" width="4" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="39" y="45" width="4" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="61" y="31" width="4" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="61" y="45" width="4" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="83" y="31" width="4" height="1" rx="0.5" className="view-layout-text" />
                              <rect x="83" y="45" width="4" height="1" rx="0.5" className="view-layout-text" />
                            </svg>
                          </div>
                          <span className="view-layout-label">高效</span>
                        </div>
                        {/* 深刻布局 */}
                        <div
                          className={`view-layout-item ${settings.viewLayout === 'deep' ? 'selected' : ''}`}
                          onClick={() => handleViewLayoutChange('deep')}
                        >
                          <div className="view-layout-preview">
                            <svg width="102" height="66" viewBox="0 0 96 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="96" height="60" rx="2" className="view-layout-bg" />
                              <rect x="24" y="8" width="48" height="8" rx="1" className="view-layout-search-bar" />
                              <rect x="14" y="24" width="10" height="10" rx="2" className="view-layout-icon" />
                              <rect x="14" y="40" width="10" height="10" rx="2" className="view-layout-icon" />
                              <rect x="33" y="24" width="10" height="10" rx="2" className="view-layout-icon" />
                              <rect x="33" y="40" width="10" height="10" rx="2" className="view-layout-icon" />
                              <rect x="52" y="24" width="10" height="10" rx="2" className="view-layout-icon" />
                              <rect x="72" y="24" width="10" height="10" rx="2" className="view-layout-icon" />
                              <rect x="52" y="40" width="10" height="10" rx="2" className="view-layout-icon" />
                              <rect x="72" y="40" width="10" height="10" rx="2" className="view-layout-icon" />
                            </svg>
                          </div>
                          <span className="view-layout-label">深刻</span>
                        </div>
                        {/* 轻巧布局 */}
                        <div
                          className={`view-layout-item ${settings.viewLayout === 'light' ? 'selected' : ''}`}
                          onClick={() => handleViewLayoutChange('light')}
                        >
                          <div className="view-layout-preview">
                            <svg width="102" height="66" viewBox="0 0 96 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="96" height="60" rx="2" className="view-layout-bg" />
                              <rect x="22" y="10" width="52" height="8" rx="1" className="view-layout-search-bar" />
                              <rect x="14" y="26" width="8" height="8" rx="2" className="view-layout-icon" />
                              <rect x="14" y="40" width="8" height="8" rx="2" className="view-layout-icon" />
                              <rect x="29" y="26" width="8" height="8" rx="2" className="view-layout-icon" />
                              <rect x="29" y="40" width="8" height="8" rx="2" className="view-layout-icon" />
                              <rect x="44" y="26" width="8" height="8" rx="2" className="view-layout-icon" />
                              <rect x="59" y="26" width="8" height="8" rx="2" className="view-layout-icon" />
                              <rect x="74" y="26" width="8" height="8" rx="2" className="view-layout-icon" />
                              <rect x="44" y="40" width="8" height="8" rx="2" className="view-layout-icon" />
                              <rect x="59" y="40" width="8" height="8" rx="2" className="view-layout-icon" />
                              <rect x="74" y="40" width="8" height="8" rx="2" className="view-layout-icon" />
                            </svg>
                          </div>
                          <span className="view-layout-label">轻巧</span>
                        </div>
                      </div>

                      {/* 分隔线 */}
                      <div className="appearance-divider" />

                      {/* 菜单项列表 - 带子菜单 */}
                      <div className="appearance-menu-list">
                        {/* 图标 */}
                        <div
                          className={`appearance-menu-item ${appearanceSubMenu === 'icon' ? 'active' : ''}`}
                          onClick={() => setAppearanceSubMenu(appearanceSubMenu === 'icon' ? null : 'icon')}
                        >
                          <span className="appearance-menu-label">图标</span>
                          <span className="appearance-menu-arrow">
                            <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
                              <path d="M1.5 0L0 1.5L4.5 6L0 10.5L1.5 12L7.5 6L1.5 0Z" />
                            </svg>
                          </span>
                        </div>
                        {/* 图标子菜单 */}
                        {appearanceSubMenu === 'icon' && (
                          <div className="appearance-submenu">
                            <div className="appearance-slider-item">
                              <span className="appearance-slider-label">大小</span>
                              <div className="appearance-slider-control">
                                <input
                                  type="range"
                                  min="50"
                                  max="120"
                                  value={settings.iconSizePercentage}
                                  onChange={(e) => updateSetting('iconSizePercentage', Number(e.target.value))}
                                  className="appearance-slider"
                                />
                                <span className="appearance-slider-value">{settings.iconSizePercentage}%</span>
                              </div>
                            </div>
                            <div className="appearance-slider-item">
                              <span className="appearance-slider-label">圆角</span>
                              <div className="appearance-slider-control">
                                <input
                                  type="range"
                                  min="0"
                                  max="50"
                                  value={settings.iconBorderRadius}
                                  onChange={(e) => updateSetting('iconBorderRadius', Number(e.target.value))}
                                  className="appearance-slider"
                                />
                                <span className="appearance-slider-value">{settings.iconBorderRadius}%</span>
                              </div>
                            </div>
                            <div className="appearance-slider-item">
                              <span className="appearance-slider-label">行间距</span>
                              <div className="appearance-slider-control">
                                <input
                                  type="range"
                                  min="10"
                                  max="60"
                                  value={settings.iconRowGap}
                                  onChange={(e) => updateSetting('iconRowGap', Number(e.target.value))}
                                  className="appearance-slider"
                                />
                                <span className="appearance-slider-value">{settings.iconRowGap}px</span>
                              </div>
                            </div>
                            <div className="appearance-slider-item">
                              <span className="appearance-slider-label">列间距</span>
                              <div className="appearance-slider-control">
                                <input
                                  type="range"
                                  min="10"
                                  max="60"
                                  value={settings.iconColumnGap}
                                  onChange={(e) => updateSetting('iconColumnGap', Number(e.target.value))}
                                  className="appearance-slider"
                                />
                                <span className="appearance-slider-value">{settings.iconColumnGap}px</span>
                              </div>
                            </div>
                            <div className="appearance-switch-item">
                              <span className="appearance-switch-label">阴影</span>
                              <div
                                className={`settings-switch ${settings.iconShadow ? 'active' : ''}`}
                                onClick={() => updateSetting('iconShadow', !settings.iconShadow)}
                              >
                                <div className="settings-switch-thumb" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 显示红点提示 */}
                        <div className="appearance-menu-item">
                          <span className="appearance-menu-label">显示红点提示</span>
                          <div
                            className={`settings-switch ${settings.showSiteLabel ? 'active' : ''}`}
                            onClick={() => updateSetting('showSiteLabel', !settings.showSiteLabel)}
                          >
                            <div className="settings-switch-thumb" />
                          </div>
                        </div>
                        {/* 显示添加按钮 */}
                        <div className="appearance-menu-item">
                          <span className="appearance-menu-label">显示添加按钮</span>
                          <div
                            className={`settings-switch ${settings.showAddButton !== false ? 'active' : ''}`}
                            onClick={() => updateSetting('showAddButton', settings.showAddButton === false)}
                          >
                            <div className="settings-switch-thumb" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 右列 - 待机页设置 */}
                  <div className="appearance-right">
                    {/* 待机页 */}
                    <div className="settings-card">
                      <h3 className="settings-section-title">待机页</h3>
                      <div className="settings-item">
                        <span className="settings-item-label">开启待机页</span>
                        <div
                          className={`settings-switch ${settings.standby?.display !== false ? 'active' : ''}`}
                          onClick={() => updateStandbySetting('display', settings.standby?.display === false)}
                        >
                          <div className="settings-switch-thumb" />
                        </div>
                      </div>
                      {/* 待机页开启时才显示以下设置项 */}
                      {settings.standby?.display !== false && (
                        <>
                          <div className="settings-item">
                            <span className="settings-item-label">打开标签页时进入</span>
                            <div
                              className={`settings-switch ${settings.standby?.openAfterAppReady ? 'active' : ''}`}
                              onClick={() => updateStandbySetting('openAfterAppReady', !settings.standby?.openAfterAppReady)}
                            >
                              <div className="settings-switch-thumb" />
                            </div>
                          </div>
                          <div className="settings-item">
                            <span className="settings-item-label">不活跃时进入</span>
                            <select
                              className="settings-select compact"
                              value={settings.standby?.openAfterAppInactiveDelaySeconds ?? 30}
                              onChange={(e) => updateStandbySetting('openAfterAppInactiveDelaySeconds', Number(e.target.value) as StandbyInactiveDelay)}
                            >
                              {STANDBY_INACTIVE_DELAYS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 待机页开启时才显示以下卡片 */}
                    {settings.standby?.display !== false && (
                      <>
                        {/* 待机页背景 */}
                        <div className="settings-card">
                          <h3 className="settings-section-title">待机页背景</h3>
                          <div className="settings-item">
                            <span className="settings-item-label">模糊</span>
                            <div
                              className={`settings-switch ${settings.standby?.blurredBackground !== false ? 'active' : ''}`}
                              onClick={() => updateStandbySetting('blurredBackground', settings.standby?.blurredBackground === false)}
                            >
                              <div className="settings-switch-thumb" />
                            </div>
                          </div>
                        </div>

                        {/* 待机页时钟 */}
                        <div className="settings-card">
                          <h3 className="settings-section-title">待机页时钟</h3>
                          <div className="settings-item">
                            <span className="settings-item-label">开启时钟</span>
                            <div
                              className={`settings-switch ${settings.standby?.displayClock !== false ? 'active' : ''}`}
                              onClick={() => updateStandbySetting('displayClock', settings.standby?.displayClock === false)}
                            >
                              <div className="settings-switch-thumb" />
                            </div>
                          </div>
                          <div className="settings-item">
                            <span className="settings-item-label">24小时制</span>
                            <div
                              className={`settings-switch ${settings.clockFormat === '24h' ? 'active' : ''}`}
                              onClick={() => updateSetting('clockFormat', settings.clockFormat === '24h' ? '12h' : '24h')}
                            >
                              <div className="settings-switch-thumb" />
                            </div>
                          </div>
                        </div>

                        {/* 待机页天气 */}
                        <div className="settings-card">
                          <h3 className="settings-section-title">待机页天气</h3>
                          <div className="settings-item">
                            <span className="settings-item-label">开启天气</span>
                            <div
                              className={`settings-switch ${settings.standby?.displayWeather !== false ? 'active' : ''}`}
                              onClick={() => updateStandbySetting('displayWeather', settings.standby?.displayWeather === false)}
                            >
                              <div className="settings-switch-thumb" />
                            </div>
                          </div>
                          {/* 天气地区选择 - 仅在开启天气时显示 */}
                          {settings.standby?.displayWeather !== false && (
                            <div className="settings-item location-item">
                              <span className="settings-item-label">天气地区</span>
                              <div className="location-input-wrapper">
                                <input
                                  type="text"
                                  className="settings-input"
                                  placeholder="搜索城市..."
                                  value={locationInput || settings.location?.shortname || ''}
                                  onChange={(e) => handleLocationInputChange(e.target.value)}
                                  onFocus={() => {
                                    if (locationResults.length > 0) {
                                      setShowLocationDropdown(true)
                                    }
                                  }}
                                />
                                {isSearchingLocation && (
                                  <span className="location-loading">搜索中...</span>
                                )}
                                {settings.location && (
                                  <button
                                    className="location-clear-btn"
                                    onClick={handleClearLocation}
                                    title="清除位置"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                    </svg>
                                  </button>
                                )}
                                {/* 位置搜索结果下拉列表 */}
                                {showLocationDropdown && locationResults.length > 0 && (
                                  <div className="location-dropdown">
                                    {locationResults.map((loc, index) => (
                                      <div
                                        key={`${loc.woeid}-${index}`}
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
                          )}
                        </div>
                      </>
                    )}
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
