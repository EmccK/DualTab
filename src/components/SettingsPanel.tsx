import { useState } from 'react'
import type { Settings, User } from '../types'
import { WALLPAPERS, SOLID_COLORS, SEARCH_ENGINES } from '../constants'
import './SettingsPanel.css'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  user: User | null
  onLoginClick: () => void
  onLogout: () => void
}

// 设置面板选项卡类型
type SettingsTab = 'general' | 'theme' | 'appearance' | 'about'

// 壁纸选项卡类型
type WallpaperTab = 'official' | 'local' | 'solid'

// 设置面板组件 - Monknow 风格居中弹窗
export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  user,
  onLoginClick,
  onLogout
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme')
  const [wallpaperTab, setWallpaperTab] = useState<WallpaperTab>('official')

  // 更新设置
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
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
          <div className="settings-content-inner">
            {/* 常规设置 */}
            {activeTab === 'general' && (
              <div className="settings-panel-content">
                {/* 用户卡片 */}
                {user ? (
                  // 已登录状态
                  <div className="settings-card user-card">
                    <div className="user-card-header">
                      <div
                        className="user-card-avatar"
                        style={{ backgroundImage: `url(${user.avatar})` }}
                      />
                      <div className="user-card-info">
                        <p className="user-card-name">{user.name}</p>
                        <p className="user-card-email">{user.email}</p>
                      </div>
                    </div>
                    <div className="user-card-actions">
                      <button className="user-logout-btn" onClick={onLogout}>
                        退出登录
                      </button>
                    </div>
                  </div>
                ) : (
                  // 未登录状态
                  <div className="settings-card login-card">
                    <div className="login-card-bg">
                      <div className="login-card-content">
                        <p className="login-card-text">登录后可同步数据，支持多设备同步</p>
                        <button className="login-card-btn" onClick={onLoginClick}>登录</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 基本设置 */}
                <div className="settings-card">
                  <h3 className="settings-section-title">基本设置</h3>

                  {/* 打开链接方式 */}
                  <div className="settings-item">
                    <span className="settings-item-label">打开链接方式</span>
                    <select
                      className="settings-select"
                      value={settings.openInNewTab ? 'new' : 'current'}
                      onChange={(e) => updateSetting('openInNewTab', e.target.value === 'new')}
                    >
                      <option value="new">新标签页</option>
                      <option value="current">当前页</option>
                    </select>
                  </div>

                  {/* 搜索引擎 */}
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

                  {/* 时钟格式 */}
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

                  {/* 显示秒 */}
                  <div className="settings-item">
                    <span className="settings-item-label">显示秒</span>
                    <div
                      className={`settings-switch ${settings.showSeconds ? 'active' : ''}`}
                      onClick={() => updateSetting('showSeconds', !settings.showSeconds)}
                    >
                      <div className="settings-switch-thumb" />
                    </div>
                  </div>

                  {/* 显示天气 */}
                  <div className="settings-item">
                    <span className="settings-item-label">显示天气</span>
                    <div
                      className={`settings-switch ${settings.showWeather ? 'active' : ''}`}
                      onClick={() => updateSetting('showWeather', !settings.showWeather)}
                    >
                      <div className="settings-switch-thumb" />
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
                                  if (typeof importedSettings.openInNewTab === 'boolean') {
                                    validatedSettings.openInNewTab = importedSettings.openInNewTab
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
