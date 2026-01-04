/**
 * Popup 组件 - 点击扩展图标时弹出的添加书签窗口
 * 复刻 Monknow Pop 的 UI 和逻辑
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Site, NavGroup, IconType, Settings } from '../types'
import { PRESET_COLORS, ICON_SCALE_MIN, ICON_SCALE_MAX, ICON_SCALE_DEFAULT } from '../constants'
import { generateId } from '../utils'
import { getIconByUrl, uploadImage, syncIconsToServer } from '../services/api'
import { getStorage, setStorage, STORAGE_KEYS } from '../services/storage'
import './Popup.css'

// 内部使用的图标模式类型
type IconMode = 'official' | 'text' | 'upload'

export function Popup() {
  // 当前页面信息
  const [pageUrl, setPageUrl] = useState('')

  // 表单状态
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState('#ffffff')
  const [iconMode, setIconMode] = useState<IconMode>('official')
  const [customIcon, setCustomIcon] = useState('')
  const [iconText, setIconText] = useState('')
  const [iconScale, setIconScale] = useState(ICON_SCALE_DEFAULT)
  const [officialIcon, setOfficialIcon] = useState('')

  // 分组选择
  const [groups, setGroups] = useState<NavGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')

  // 状态
  const [isFetchingIcon, setIsFetchingIcon] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')  // 保存错误信息
  const [uploadError, setUploadError] = useState('')  // 上传错误信息
  const [userSecret, setUserSecret] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // refs
  const iconInputRef = useRef<HTMLInputElement>(null)
  const fetchIconTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 获取当前标签页信息
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]
        if (tab) {
          const tabUrl = tab.url || ''
          const tabTitle = tab.title || ''
          setPageUrl(tabUrl)
          setUrl(tabUrl)
          setName(tabTitle)
          setDesc(tabTitle)
        }
      })
    }
  }, [])

  // 加载用户数据和分组
  useEffect(() => {
    const loadData = async () => {
      // 加载用户信息
      const user = await getStorage<{ secret: string }>(STORAGE_KEYS.USER)
      if (user?.secret) {
        setUserSecret(user.secret)
      }

      // 加载分组
      const savedGroups = await getStorage<NavGroup[]>(STORAGE_KEYS.GROUPS)
      if (savedGroups && savedGroups.length > 0) {
        setGroups(savedGroups)
        setSelectedGroupId(savedGroups[0].id)
      }

      // 加载设置（主题）
      const settings = await getStorage<{ theme: string }>(STORAGE_KEYS.SETTINGS)
      if (settings?.theme === 'light') {
        setTheme('light')
      } else if (settings?.theme === 'dark') {
        setTheme('dark')
      } else {
        // auto - 跟随系统
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setTheme(isDark ? 'dark' : 'light')
      }
    }
    loadData()
  }, [])

  // 自动获取图标信息
  const fetchIconInfo = useCallback(async (inputUrl: string) => {
    if (!inputUrl.trim()) return

    // 规范化 URL
    const normalizedUrl = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`

    try {
      new URL(normalizedUrl)
    } catch {
      return
    }

    setIsFetchingIcon(true)
    try {
      const iconInfo = await getIconByUrl(normalizedUrl)
      if (iconInfo) {
        if (iconInfo.title) setName(iconInfo.title)
        if (iconInfo.description) setDesc(iconInfo.description)
        if (iconInfo.imgUrl) {
          setCustomIcon(iconInfo.imgUrl)
          setOfficialIcon(iconInfo.imgUrl)
          setIconMode('official')
        }
        if (iconInfo.bgColor) {
          setColor(iconInfo.bgColor)
        }
      }
    } catch (error) {
      console.error('获取图标信息失败:', error)
    } finally {
      setIsFetchingIcon(false)
    }
  }, [])

  // URL 变化时自动获取图标（防抖 800ms）
  useEffect(() => {
    if (fetchIconTimeoutRef.current) {
      clearTimeout(fetchIconTimeoutRef.current)
    }

    if (iconMode !== 'official' || !url.trim()) return

    // 如果 URL 和页面 URL 相同，自动获取图标
    if (url === pageUrl && pageUrl) {
      fetchIconTimeoutRef.current = setTimeout(() => {
        fetchIconInfo(url)
      }, 500)
    }

    return () => {
      if (fetchIconTimeoutRef.current) {
        clearTimeout(fetchIconTimeoutRef.current)
      }
    }
  }, [url, pageUrl, iconMode, fetchIconInfo])

  // 组件挂载时自动获取当前页面图标
  useEffect(() => {
    if (pageUrl && iconMode === 'official') {
      fetchIconInfo(pageUrl)
    }
  }, [pageUrl, fetchIconInfo, iconMode])

  // 获取图标URL
  const getIconUrl = () => {
    if (iconMode === 'text' || !url) return ''
    if (customIcon) return customIcon
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return `${urlObj.origin}/favicon.ico`
    } catch {
      return ''
    }
  }

  // 获取图标显示文字
  const getIconDisplayText = () => {
    if (iconText) return iconText
    return name ? name.slice(0, 2) : 'A'
  }

  // 处理图标文件上传
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 清除之前的错误
    setUploadError('')

    if (!file.type.startsWith('image/')) {
      setUploadError('请选择图片文件')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('图片大小不能超过 2MB')
      return
    }

    // 本地预览
    const previewLocalIcon = (f: File) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        setCustomIcon(event.target?.result as string)
        setIconMode('upload')
      }
      reader.readAsDataURL(f)
    }

    if (userSecret) {
      setIsUploading(true)
      try {
        const imageUrl = await uploadImage(userSecret, file)
        if (imageUrl) {
          setCustomIcon(imageUrl)
          setIconMode('upload')
        } else {
          previewLocalIcon(file)
        }
      } catch {
        previewLocalIcon(file)
      } finally {
        setIsUploading(false)
      }
    } else {
      previewLocalIcon(file)
    }

    if (iconInputRef.current) {
      iconInputRef.current.value = ''
    }
  }

  // 保存书签
  const handleSave = async () => {
    if (!url.trim() || !name.trim() || !selectedGroupId) return

    // 清除之前的错误
    setSaveError('')
    setIsSaving(true)
    try {
      const finalUrl = url.startsWith('http') ? url : `https://${url}`
      const finalColor = color === 'transparent' ? '' : color

      // 构建 Site 对象
      const siteData: Site = {
        id: generateId(),
        name: name.trim(),
        url: finalUrl,
        desc: desc.trim() || name.trim(),
        type: (iconMode === 'text' ? 'text' : 'image') as IconType,
        backgroundColor: {
          type: 'pure',
          data: finalColor || '#ffffff'
        },
        icoScalePercentage: iconScale
      }

      if (iconMode === 'text') {
        siteData.icoText = iconText || name.trim().slice(0, 2)
      } else {
        const finalIcon = customIcon || officialIcon || getIconUrl() || `https://www.google.com/s2/favicons?domain=${finalUrl}&sz=64`
        siteData.icoSrc = {
          data: finalIcon,
          isOfficial: iconMode === 'official',
          mimeType: 'image/png',
          uploaded: true
        }
      }

      // 更新分组数据
      const updatedGroups = groups.map(group => {
        if (group.id === selectedGroupId) {
          return {
            ...group,
            sites: [...group.sites, siteData]
          }
        }
        return group
      })

      // 保存到本地存储
      await setStorage(STORAGE_KEYS.GROUPS, updatedGroups)
      setGroups(updatedGroups)

      // 如果已登录，同步到服务器
      if (userSecret) {
        const settings = await getStorage<Settings>(STORAGE_KEYS.SETTINGS)
        await syncIconsToServer(userSecret, updatedGroups, settings ?? undefined)
      }

      setSaveSuccess(true)

      // 1.5秒后关闭窗口
      setTimeout(() => {
        window.close()
      }, 1500)
    } catch (error) {
      console.error('保存书签失败:', error)
      setSaveError('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`popup-container ${theme === 'light' ? 'light-theme' : ''}`}>
      {/* 标题栏 */}
      <div className="popup-header">
        <span className="popup-title">添加书签</span>
      </div>

      {/* 操作按钮 */}
      <div className="popup-actions">
        <button className="btn-cancel" onClick={() => window.close()}>取消</button>
        <button
          className="btn-add"
          onClick={handleSave}
          disabled={isSaving || !url.trim() || !name.trim() || !selectedGroupId}
        >
          {isSaving ? '保存中...' : saveSuccess ? '已添加' : '添加'}
        </button>
      </div>

      {/* 表单内容 */}
      <div className="popup-form">
        <div className="form-row">
          {/* 左侧表单字段 */}
          <div className="form-fields">
            <div className="field-group">
              <label>地址</label>
              <input
                type="text"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>名称</label>
              <input
                type="text"
                placeholder="网站名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>描述</label>
              <textarea
                placeholder="网站描述(选填)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>分组</label>
              <select
                className="form-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 右侧预览区 */}
          <div className="form-preview">
            <label>预览</label>

            {/* 三个图标类型卡片 */}
            <div className="icon-type-cards">
              {/* 官方图标 */}
              <div
                className={`icon-type-card ${iconMode === 'official' ? 'active' : ''}`}
                onClick={() => {
                  setIconMode('official')
                  if (officialIcon) {
                    setCustomIcon(officialIcon)
                  } else if (url.trim()) {
                    fetchIconInfo(url)
                  }
                }}
              >
                <div className="icon-type-preview" style={{ backgroundColor: color === 'transparent' ? '#f5f5f5' : color }}>
                  {isFetchingIcon ? (
                    <span className="preview-loading">...</span>
                  ) : (
                    <img
                      src={officialIcon || customIcon || getIconUrl() || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                </div>
                <span className="icon-type-label">官方</span>
              </div>

              {/* 文字图标 */}
              <div
                className={`icon-type-card ${iconMode === 'text' ? 'active' : ''}`}
                onClick={() => {
                  setIconMode('text')
                  if (!iconText) {
                    setIconText(name ? name.slice(0, 2) : '')
                  }
                }}
              >
                <div className="icon-type-preview text-preview" style={{ backgroundColor: color === 'transparent' ? '#f5f5f5' : color }}>
                  <span>{getIconDisplayText()}</span>
                </div>
                <span className="icon-type-label">文字</span>
              </div>

              {/* 上传图标 */}
              <div
                className={`icon-type-card ${iconMode === 'upload' ? 'active' : ''}`}
                onClick={() => {
                  if (iconMode !== 'upload') {
                    iconInputRef.current?.click()
                  }
                }}
              >
                <div className="icon-type-preview upload-preview" style={{ backgroundColor: color === 'transparent' ? '#e0e0e0' : color }}>
                  {iconMode === 'upload' && customIcon ? (
                    <img src={customIcon} alt="" style={{ transform: `scale(${iconScale / 100})` }} />
                  ) : (
                    <svg className="upload-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  )}
                </div>
                <span className="icon-type-label">{isUploading ? '上传中...' : '上传'}</span>
              </div>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleIconUpload}
              />
            </div>

            {/* 图标缩放控制 */}
            {iconMode === 'upload' && customIcon && (
              <div className="icon-scale-section">
                <div className="scale-controls">
                  <button
                    className="scale-btn"
                    onClick={() => setIconScale(Math.max(ICON_SCALE_MIN, iconScale - 10))}
                    disabled={iconScale <= ICON_SCALE_MIN}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                      <path d="M8 11h6"/>
                    </svg>
                  </button>
                  <button
                    className="scale-btn"
                    onClick={() => setIconScale(Math.min(ICON_SCALE_MAX, iconScale + 10))}
                    disabled={iconScale >= ICON_SCALE_MAX}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                      <path d="M8 11h6"/>
                      <path d="M11 8v6"/>
                    </svg>
                  </button>
                  <button
                    className="scale-btn"
                    onClick={() => setIconScale(ICON_SCALE_DEFAULT)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* 图标文字输入框 */}
            {iconMode === 'text' && (
              <div className="icon-text-section">
                <label>图标文字</label>
                <input
                  type="text"
                  placeholder="图标文字"
                  value={iconText || (name ? name.slice(0, 2) : '')}
                  onChange={(e) => setIconText(e.target.value)}
                />
              </div>
            )}

            {/* 背景颜色 */}
            <div className="color-section">
              <label>背景颜色</label>
              <div className="color-presets">
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-preset ${color === c ? 'active' : ''} ${c === 'transparent' ? 'transparent' : ''}`}
                    style={c === 'transparent' ? {} : { backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
              <div className="color-input-row">
                <input
                  type="text"
                  placeholder="#ffffff"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 成功提示 */}
      {saveSuccess && (
        <div className="save-success-toast">
          书签已添加
        </div>
      )}

      {/* 错误提示 */}
      {(saveError || uploadError) && (
        <div className="save-error-toast">
          {saveError || uploadError}
        </div>
      )}
    </div>
  )
}
