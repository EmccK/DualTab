import { useState, useEffect, useCallback } from 'react'
import type { Site } from '../types'
import { PRESET_COLORS } from '../constants'
import { generateId } from '../utils'
import { getIconList, ICON_CATEGORIES } from '../services/api'
import type { IconListItem } from '../services/api'
import './SiteModal.css'

// 网站分类配置
const SITE_CATEGORIES = [
  { id: 'manual', name: '手动添加', cateId: 0 },
  { id: 'hot', name: '热门', cateId: ICON_CATEGORIES.hot },
  { id: 'shopping', name: '购物', cateId: ICON_CATEGORIES.shopping },
  { id: 'social', name: '社交', cateId: ICON_CATEGORIES.social },
  { id: 'entertainment', name: '娱乐', cateId: ICON_CATEGORIES.entertainment },
  { id: 'news', name: '新闻与阅读', cateId: ICON_CATEGORIES.news },
  { id: 'efficiency', name: '效率', cateId: ICON_CATEGORIES.efficiency },
  { id: 'builtin', name: '内置App', cateId: ICON_CATEGORIES.builtin },
  { id: 'image', name: '图片', cateId: ICON_CATEGORIES.image },
  { id: 'lifestyle', name: '生活方式', cateId: ICON_CATEGORIES.lifestyle },
  { id: 'travel', name: '旅行', cateId: ICON_CATEGORIES.travel },
  { id: 'tech', name: '科技与教育', cateId: ICON_CATEGORIES.tech },
  { id: 'finance', name: '金融', cateId: ICON_CATEGORIES.finance }
]

// 图标类型
type IconType = 'official' | 'text' | 'upload'

interface SiteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (site: Site) => void
  onDelete?: () => void
  site?: Site | null
  userSecret?: string  // 用户 token，用于获取推荐书签
}

export function SiteModal({ isOpen, onClose, onSave, onDelete, site, userSecret }: SiteModalProps) {
  const [activeCategory, setActiveCategory] = useState('hot')
  const [searchQuery, setSearchQuery] = useState('')
  const [categorySites, setCategorySites] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)

  // 表单状态
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [iconType, setIconType] = useState<IconType>('official')
  const [customIcon, setCustomIcon] = useState('')

  // 当 site 变化时重置表单（通过比较 id）
  const [prevSiteId, setPrevSiteId] = useState(site?.id)
  if (site?.id !== prevSiteId) {
    setPrevSiteId(site?.id)
    if (site) {
      setUrl(site.url)
      setName(site.name)
      setDesc(site.desc)
      setColor(site.color)
      setCustomIcon(site.icon)
      setActiveCategory('manual')
    } else {
      setUrl('')
      setName('')
      setDesc('')
      setColor(PRESET_COLORS[0])
      setCustomIcon('')
      setActiveCategory('hot')
    }
  }

  // 加载分类网站数据
  const loadCategorySites = useCallback(async (categoryId: string) => {
    if (categoryId === 'manual') return

    const category = SITE_CATEGORIES.find(c => c.id === categoryId)
    if (!category || category.cateId === 0) return

    setLoading(true)
    try {
      const items: IconListItem[] = await getIconList(category.cateId, '', 20, userSecret)
      // 转换 API 数据为 Site 格式
      const sites: Site[] = items.map(item => ({
        id: String(item.udId),
        name: item.title,
        desc: item.description,
        url: item.url,
        icon: item.imgUrl,
        color: item.bgColor
      }))
      setCategorySites(sites)
    } finally {
      setLoading(false)
    }
  }, [userSecret])

  // 当分类变化时加载数据
  useEffect(() => {
    if (!isOpen || activeCategory === 'manual') return
    loadCategorySites(activeCategory)
  }, [activeCategory, isOpen, loadCategorySites])

  // 搜索过滤
  const filteredSites = searchQuery 
    ? categorySites.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categorySites

  // 获取图标URL
  const getIconUrl = () => {
    if (iconType === 'text' || !url) return ''
    if (customIcon) return customIcon
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return `${urlObj.origin}/favicon.ico`
    } catch {
      return ''
    }
  }

  // 获取首字母
  const getInitial = () => name ? name.charAt(0).toUpperCase() : 'A'

  // 保存网站
  const handleSave = (continueAdd = false) => {
    if (!url.trim() || !name.trim()) return

    const finalUrl = url.startsWith('http') ? url : `https://${url}`
    const finalIcon = iconType === 'text' ? '' : (customIcon || getIconUrl())

    onSave({
      id: site?.id || generateId(),
      name: name.trim(),
      url: finalUrl,
      desc: desc.trim() || name.trim(),
      icon: finalIcon || `https://www.google.com/s2/favicons?domain=${finalUrl}&sz=64`,
      color
    })

    if (continueAdd) {
      setUrl('')
      setName('')
      setDesc('')
      setColor(PRESET_COLORS[0])
      setCustomIcon('')
    } else {
      onClose()
    }
  }

  // 选择热门网站 - 直接添加书签
  const handleSelectHotSite = (hotSite: Site) => {
    onSave({
      id: generateId(),
      name: hotSite.name,
      url: hotSite.url,
      desc: hotSite.desc,
      icon: hotSite.icon,
      color: hotSite.color
    })
    // 不关闭弹窗，方便用户继续添加
  }

  if (!isOpen) return null

  return (
    <>
      <div className="site-modal-overlay" onClick={onClose} />
      <div className="site-modal">
        {/* 左侧分类栏 */}
        <div className="site-modal-sidebar">
          <div className="site-modal-title">添加图标</div>
          <div className="site-modal-categories">
            {SITE_CATEGORIES.map(cat => (
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

        {/* 右侧内容区 */}
        <div className="site-modal-content">
          {/* 搜索框 */}
          {activeCategory !== 'manual' && (
            <div className="site-modal-search">
              <input
                type="text"
                placeholder="搜索网站..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* 手动添加表单 */}
          {activeCategory === 'manual' ? (
            <div className="site-modal-form">
              <div className="form-header">
                <span>手动添加</span>
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
                  <div className="preview-card" style={{ backgroundColor: color }}>
                    {iconType === 'text' ? (
                      <span className="preview-initial">{getInitial()}</span>
                    ) : (
                      <img 
                        src={customIcon || getIconUrl() || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'} 
                        alt="" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    )}
                  </div>
                  
                  {/* 图标类型选择 */}
                  <div className="icon-type-selector">
                    <div 
                      className={`icon-type ${iconType === 'official' ? 'active' : ''}`}
                      onClick={() => setIconType('official')}
                    >
                      官方
                    </div>
                    <div 
                      className={`icon-type ${iconType === 'text' ? 'active' : ''}`}
                      onClick={() => setIconType('text')}
                    >
                      <span className="type-letter">A</span>
                      <span>文字</span>
                    </div>
                    <div 
                      className={`icon-type ${iconType === 'upload' ? 'active' : ''}`}
                      onClick={() => setIconType('upload')}
                    >
                      上传
                    </div>
                  </div>

                  {/* 背景颜色 */}
                  <div className="color-section">
                    <label>背景颜色</label>
                    <div className="color-input-row">
                      <input
                        type="text"
                        placeholder="#"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                      />
                    </div>
                    <div className="color-presets">
                      {PRESET_COLORS.map(c => (
                        <div
                          key={c}
                          className={`color-preset ${color === c ? 'active' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="form-actions">
                {site && onDelete && (
                  <button className="btn-delete" onClick={onDelete}>删除</button>
                )}
                <div className="actions-right">
                  <button className="btn-cancel" onClick={onClose}>取消</button>
                  {!site && (
                    <button className="btn-continue" onClick={() => handleSave(true)}>添加并继续</button>
                  )}
                  <button className="btn-add" onClick={() => handleSave(false)}>
                    {site ? '保存' : '添加'}
                  </button>
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
                  <div className="hot-site-icon" style={{ backgroundColor: hotSite.color }}>
                    <img src={hotSite.icon} alt={hotSite.name} />
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
