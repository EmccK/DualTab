import { useState } from 'react'
import type { Settings } from '../types'
import { WALLPAPERS, SOLID_COLORS } from '../constants'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
}

// 设置面板组件
export function SettingsPanel({ isOpen, onClose, settings, onSettingsChange }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState('theme')
  const [wallpaperTab, setWallpaperTab] = useState<'official' | 'local' | 'solid'>('official')

  // 更新设置
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <>
      {isOpen && <div className="overlay" onClick={onClose} />}
      <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
        <div className="settings-content">
          {/* 头部 */}
          <div className="settings-header">
            <h2>设置</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          {/* 内容 */}
          <div className="settings-body">
            {/* 选项卡 */}
            <div className="settings-tabs">
              <div 
                className={`tab ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                常规
              </div>
              <div 
                className={`tab ${activeTab === 'theme' ? 'active' : ''}`}
                onClick={() => setActiveTab('theme')}
              >
                主题&壁纸
              </div>
              <div 
                className={`tab ${activeTab === 'appearance' ? 'active' : ''}`}
                onClick={() => setActiveTab('appearance')}
              >
                外观
              </div>
              <div 
                className={`tab ${activeTab === 'about' ? 'active' : ''}`}
                onClick={() => setActiveTab('about')}
              >
                反馈&其他
              </div>
            </div>

            {/* 常规设置 */}
            {activeTab === 'general' && (
              <div className="settings-tab-content">
                <div className="login-prompt">
                  <div className="login-prompt-text">
                    <span>登录后可同步数据</span>
                    <span>支持多设备同步</span>
                  </div>
                  <button className="login-btn">登录</button>
                </div>
                <div className="setting-row">
                  <span className="setting-label">打开链接方式</span>
                  <select 
                    className="setting-select"
                    value={settings.openInNewTab ? 'new' : 'current'}
                    onChange={(e) => updateSetting('openInNewTab', e.target.value === 'new')}
                  >
                    <option value="new">新标签页</option>
                    <option value="current">当前页</option>
                  </select>
                </div>
              </div>
            )}

            {/* 主题&壁纸设置 */}
            {activeTab === 'theme' && (
              <div className="settings-tab-content">
                <div className="settings-section">
                  <h3>主题</h3>
                  <div className="theme-options">
                    <label className="theme-option">
                      <input 
                        type="radio" 
                        name="theme" 
                        checked={settings.theme === 'dark'}
                        onChange={() => updateSetting('theme', 'dark')}
                      />
                      <span>深色</span>
                    </label>
                    <label className="theme-option">
                      <input 
                        type="radio" 
                        name="theme" 
                        checked={settings.theme === 'light'}
                        onChange={() => updateSetting('theme', 'light')}
                      />
                      <span>浅色</span>
                    </label>
                  </div>
                </div>

                <div className="settings-section">
                  <h3>壁纸</h3>
                  <div className="wallpaper-tabs">
                    <div 
                      className={`wp-tab ${wallpaperTab === 'official' ? 'active' : ''}`}
                      onClick={() => setWallpaperTab('official')}
                    >
                      官方
                    </div>
                    <div 
                      className={`wp-tab ${wallpaperTab === 'local' ? 'active' : ''}`}
                      onClick={() => setWallpaperTab('local')}
                    >
                      本地
                    </div>
                    <div 
                      className={`wp-tab ${wallpaperTab === 'solid' ? 'active' : ''}`}
                      onClick={() => setWallpaperTab('solid')}
                    >
                      纯色
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
                    <div className="local-wallpaper">
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
                      <p className="local-hint">支持 JPG、PNG 格式</p>
                    </div>
                  )}

                  {/* 纯色壁纸 */}
                  {wallpaperTab === 'solid' && (
                    <div className="solid-color-grid">
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
              <div className="settings-tab-content">
                <p className="coming-soon">更多外观设置即将推出...</p>
              </div>
            )}

            {/* 反馈&其他 */}
            {activeTab === 'about' && (
              <div className="settings-tab-content">
                <p className="about-text">MonkNow Clone v1.0</p>
                <p className="about-text">一个简洁的新标签页扩展</p>
                <button className="feedback-btn">反馈问题</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
