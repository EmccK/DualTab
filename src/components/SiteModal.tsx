import { useState, useEffect, useCallback, useRef } from 'react'
import type { Site, IconType } from '../types'
import { PRESET_COLORS, ICON_SCALE_MIN, ICON_SCALE_MAX, ICON_SCALE_DEFAULT } from '../constants'
import { generateId } from '../utils'
import { getIconList, getCategories, uploadImage, getIconByUrl } from '../services/api'
import type { IconListItem, CategoryInfo } from '../services/api'
import './SiteModal.css'

// 内部使用的图标模式类型（UI 展示用）
type IconMode = 'official' | 'text' | 'upload'

// 网站分类配置类型
interface SiteCategory {
  id: string
  name: string
  cateId: number
}

interface SiteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (site: Site) => void
  site?: Site | null
  userSecret?: string  // 用户 token，用于获取推荐书签
}

export function SiteModal({ isOpen, onClose, onSave, site, userSecret }: SiteModalProps) {
  const [activeCategory, setActiveCategory] = useState('manual')
  const [searchQuery, setSearchQuery] = useState('')
  const [categorySites, setCategorySites] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)

  // 动态分类列表
  const [siteCategories, setSiteCategories] = useState<SiteCategory[]>([
    { id: 'manual', name: '手动添加', cateId: 0 }
  ])

  // 表单状态
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState('#ffffff')
  const [iconMode, setIconMode] = useState<IconMode>('official')
  const [customIcon, setCustomIcon] = useState('')
  const [iconText, setIconText] = useState('')
  const [iconScale, setIconScale] = useState(ICON_SCALE_DEFAULT)

  // 图标上传相关
  const iconInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // 自动获取图标相关
  const [isFetchingIcon, setIsFetchingIcon] = useState(false)
  const fetchIconTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [officialIcon, setOfficialIcon] = useState('')
  const isInitialLoadRef = useRef(false)

  // 弹窗打开时初始化表单状态
  useEffect(() => {
    if (!isOpen) return

    if (site) {
      // 编辑模式：恢复已有数据
      isInitialLoadRef.current = true
      setUrl(site.url)
      setName(site.name)
      setDesc(site.desc)
      const bgColor = site.backgroundColor?.data || '#ffffff'
      setColor(bgColor)
      setActiveCategory('manual')
      setIconScale(site.icoScalePercentage || ICON_SCALE_DEFAULT)

      if (site.type === 'text') {
        setIconMode('text')
        setIconText(site.icoText || site.name.slice(0, 2))
        setCustomIcon('')
        setOfficialIcon('')
      } else {
        const iconUrl = site.icoSrc?.data || ''
        setCustomIcon(iconUrl)
        if (site.icoSrc?.isOfficial === false) {
          setIconMode('upload')
          setOfficialIcon('')
        } else {
          setIconMode('official')
          setOfficialIcon(iconUrl)
        }
        setIconText('')
      }
    } else {
      // 添加模式：重置为默认值
      isInitialLoadRef.current = false
      setUrl('')
      setName('')
      setDesc('')
      setColor('#ffffff')
      setCustomIcon('')
      setOfficialIcon('')
      setIconText('')
      setIconScale(ICON_SCALE_DEFAULT)
      setActiveCategory('hot')
      setIconMode('official')
    }
  }, [isOpen, site])

  // 组件卸载时清理 timeout
  useEffect(() => {
    return () => {
      if (fetchIconTimeoutRef.current) {
        clearTimeout(fetchIconTimeoutRef.current)
      }
    }
  }, [])

  // 获取分类列表
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categories = await getCategories()
        if (categories.length > 0) {
          const dynamicCategories: SiteCategory[] = [
            { id: 'manual', name: '手动添加', cateId: 0 },
            ...categories.map((cat: CategoryInfo) => ({
              id: cat.name_en || String(cat.id),
              name: cat.name,
              cateId: cat.id
            }))
          ]
          setSiteCategories(dynamicCategories)
          // 如果不是编辑模式，默认选中第一个非手动分类
          if (!site && categories.length > 0) {
            setActiveCategory(categories[0].name_en || String(categories[0].id))
          }
        }
      } catch (err) {
        console.warn('获取分类列表失败:', err)
      }
    }
    fetchCategories()
  }, [site])

  // 加载分类网站数据
  const loadCategorySites = useCallback(async (categoryId: string) => {
    if (categoryId === 'manual') return

    const category = siteCategories.find(c => c.id === categoryId)
    if (!category || category.cateId === 0) return

    setLoading(true)
    try {
      const items: IconListItem[] = await getIconList(category.cateId, '', 20)
      // 转换 API 数据为 Site 格式
      const sites: Site[] = items.map(item => ({
        id: String(item.udId),
        name: item.title,
        desc: item.description,
        url: item.url,
        type: 'image' as IconType,
        icoSrc: {
          data: item.imgUrl,
          isOfficial: true,
          mimeType: item.mimeType,
          uploaded: true
        },
        backgroundColor: {
          type: 'pure' as const,
          data: item.bgColor
        }
      }))
      setCategorySites(sites)
    } finally {
      setLoading(false)
    }
  }, [siteCategories])

  // 当分类变化时加载数据
  useEffect(() => {
    if (!isOpen || activeCategory === 'manual') return
    loadCategorySites(activeCategory)
  }, [activeCategory, isOpen, loadCategorySites])

  // 自动获取图标信息
  const fetchIconInfo = useCallback(async (inputUrl: string, updateColor = true) => {
    if (!inputUrl.trim()) return

    // 规范化 URL
    const normalizedUrl = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`

    try {
      new URL(normalizedUrl)  // 验证 URL 格式
    } catch {
      return  // URL 格式无效，不请求
    }

    setIsFetchingIcon(true)
    try {
      const iconInfo = await getIconByUrl(normalizedUrl)
      if (iconInfo) {
        setName(iconInfo.title || '')
        setDesc(iconInfo.description || '')
        if (iconInfo.imgUrl) {
          setCustomIcon(iconInfo.imgUrl)
          setOfficialIcon(iconInfo.imgUrl)
          setIconMode('official')
        }
        if (updateColor && iconInfo.bgColor) {
          setColor(iconInfo.bgColor)
        }
      }
    } catch (error) {
      console.error('获取图标信息失败:', error)
    } finally {
      setIsFetchingIcon(false)
    }
  }, [])

  // URL 变化时自动获取图标（防抖 800ms）- 仅在官方图标模式下触发
  useEffect(() => {
    // 清除之前的定时器
    if (fetchIconTimeoutRef.current) {
      clearTimeout(fetchIconTimeoutRef.current)
    }

    // 只在手动添加模式、官方图标模式且有 URL 时触发
    if (activeCategory !== 'manual' || iconMode !== 'official' || !url.trim()) return

    // 如果是初始加载（编辑模式），跳过自动获取，并重置标记
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      return
    }

    // 设置新的定时器
    fetchIconTimeoutRef.current = setTimeout(() => {
      fetchIconInfo(url)
    }, 800)

    return () => {
      if (fetchIconTimeoutRef.current) {
        clearTimeout(fetchIconTimeoutRef.current)
      }
    }
  }, [url, activeCategory, iconMode, fetchIconInfo])

  // 搜索过滤
  const filteredSites = searchQuery
    ? categorySites.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categorySites

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

  // 获取图标显示文字（文字模式）
  const getIconDisplayText = () => {
    if (iconText) return iconText
    return name ? name.slice(0, 2) : 'A'
  }

  // 使用本地文件预览图标
  const previewLocalIcon = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      setCustomIcon(event.target?.result as string)
      setIconMode('upload')
    }
    reader.readAsDataURL(file)
  }

  // 处理图标文件上传
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      console.warn('请选择图片文件')
      return
    }

    // 检查文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      console.warn('图片大小不能超过 2MB')
      return
    }

    // 如果有 userSecret，上传到服务器
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

    // 清空 input 以便再次选择同一文件
    if (iconInputRef.current) {
      iconInputRef.current.value = ''
    }
  }

  // 保存网站
  const handleSave = (continueAdd = false) => {
    if (!url.trim() || !name.trim()) return

    const finalUrl = url.startsWith('http') ? url : `https://${url}`
    const finalColor = color === 'transparent' ? '' : color

    // 构建 Site 对象
    const siteData: Site = {
      id: site?.id || generateId(),
      name: name.trim(),
      url: finalUrl,
      desc: desc.trim() || name.trim(),
      type: iconMode === 'text' ? 'text' : 'image',
      backgroundColor: {
        type: 'pure',
        data: finalColor || '#ffffff'
      },
      icoScalePercentage: iconScale
    }

    if (iconMode === 'text') {
      // 文字图标
      siteData.icoText = iconText || name.trim().slice(0, 2)
    } else {
      // 图片图标（官方或上传）
      const finalIcon = customIcon || officialIcon || getIconUrl() || `https://www.google.com/s2/favicons?domain=${finalUrl}&sz=64`
      siteData.icoSrc = {
        data: finalIcon,
        isOfficial: iconMode === 'official',
        mimeType: 'image/png',
        uploaded: true
      }
    }

    onSave(siteData)

    if (continueAdd) {
      setUrl('')
      setName('')
      setDesc('')
      setColor('#ffffff')
      setCustomIcon('')
      setOfficialIcon('')
      setIconText('')
      setIconMode('official')
      setIconScale(ICON_SCALE_DEFAULT)
    } else {
      onClose()
    }
  }

  // 选择热门网站 - 直接添加书签
  const handleSelectHotSite = (hotSite: Site) => {
    // 热门网站已经是新数据结构，直接使用
    onSave({
      ...hotSite,
      id: generateId()
    })
    // 不关闭弹窗，方便用户继续添加
  }

  if (!isOpen) return null

  return (
    <>
      <div className="site-modal-overlay" onClick={onClose} />
      <div className={`site-modal ${site ? 'edit-mode' : ''}`}>
        {/* 左侧分类栏 - 编辑模式不显示 */}
        {!site && (
          <div className="site-modal-sidebar">
            <div className="site-modal-title">添加图标</div>
            <div className="site-modal-categories">
              {siteCategories.map(cat => (
                <div
                  key={cat.id}
                  className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 右侧内容区 */}
        <div className="site-modal-content">
          {/* 搜索框 - 仅在非手动添加且非编辑模式时显示 */}
          {!site && activeCategory !== 'manual' && (
            <div className="site-modal-search">
              <input
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* 手动添加表单 - 编辑模式或手动添加时显示 */}
          {(site || activeCategory === 'manual') ? (
            <div className="site-modal-form">
              <div className="form-header">
                <span>{site ? '编辑图标' : '手动添加'}</span>
              </div>

              {/* 底部按钮 - 放在表单内容上方 */}
              <div className="form-actions">
                <button className="btn-cancel" onClick={onClose}>取消</button>
                <div className="actions-right">
                  {!site && (
                    <button className="btn-continue" onClick={() => handleSave(true)}>添加并继续</button>
                  )}
                  <button className="btn-add" onClick={() => handleSave(false)}>
                    {site ? '保存' : '添加'}
                  </button>
                </div>
              </div>

              <div className="form-row">
                {/* 左侧表单 */}
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
                </div>

                {/* 右侧预览 */}
                <div className="form-preview">
                  <label>预览</label>

                  {/* 三个图标类型卡片 */}
                  <div className="icon-type-cards">
                    {/* 官方图标 */}
                    <div
                      className={`icon-type-card ${iconMode === 'official' ? 'active' : ''}`}
                      onClick={() => {
                        const wasOfficial = iconMode === 'official'
                        setIconMode('official')
                        
                        if (officialIcon) {
                          setCustomIcon(officialIcon)
                        } else if (!wasOfficial && url.trim()) {
                          // 从其他模式切换到官方模式，且没有官方图标时，自动获取（不更新颜色）
                          fetchIconInfo(url, false)
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

                  {/* 图标缩放控制 - 仅在上传模式且有图片时显示 */}
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

                  {/* 图标文字输入框 - 仅在文字模式显示 */}
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
          ) : (
            /* 热门网站列表 */
            <div className="hot-sites-grid">
              {/* 未登录提示 */}
              {!userSecret && (
                <div className="no-results">请先登录以获取推荐书签</div>
              )}
              {/* 加载中状态 */}
              {userSecret && loading && (
                <div className="loading-indicator">加载中...</div>
              )}
              {/* 网站列表 */}
              {userSecret && !loading && filteredSites.map(hotSite => (
                <div
                  key={hotSite.id}
                  className="hot-site-card"
                  onClick={() => handleSelectHotSite(hotSite)}
                >
                  <div className="hot-site-icon" style={{ backgroundColor: hotSite.backgroundColor.data }}>
                    <img src={hotSite.icoSrc?.data} alt={hotSite.name} />
                  </div>
                  <div className="hot-site-info">
                    <div className="hot-site-name">{hotSite.name}</div>
                    <div className="hot-site-desc">{hotSite.desc}</div>
                  </div>
                </div>
              ))}
              {userSecret && !loading && filteredSites.length === 0 && (
                <div className="no-results">没有找到匹配的网站</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
