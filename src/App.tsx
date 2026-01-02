import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import './App.css'
import { useAppStore, useUIStore } from './stores'
import { useIdleTimer } from './hooks'
import { Sidebar } from './components/Sidebar'
import { SearchBox } from './components/SearchBox'
import { SiteCard, AddSiteCard } from './components/SiteCard'
import { TimeWeather } from './components/TimeWeather'
import { SettingsPanel } from './components/SettingsPanel'
import { SiteModal } from './components/SiteModal'
import { GroupModal } from './components/GroupModal'
import { LoginModal } from './components/LoginModal'
import { getRandomWallpaper } from './services/api'
import { getStorage, setStorage, STORAGE_KEYS } from './services/storage'

// 壁纸缓存类型
interface WallpaperCache {
  light: string | null
  lightBlurred: string | null
  dark: string | null
  darkBlurred: string | null
  fetchTime: number
  category: number
}

// 默认空闲超时时间（毫秒）- 用户停止操作后多久显示时间天气
const DEFAULT_IDLE_TIMEOUT = 30000
// 滚动切换分组的动画时间（毫秒）
const SLIDE_ANIMATION_TIME = 200

// 分组切换动画状态
const SlideStatus = {
  Normal: 'normal',
  UpExited: 'slide-up-exit',
  DownExited: 'slide-down-exit',
  Faded: 'slide-faded'
} as const

type SlideStatusType = typeof SlideStatus[keyof typeof SlideStatus]

// 获取系统主题偏好
function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  // 从 Store 获取状态和方法
  const {
    groups,
    activeGroupId,
    settings,
    user,
    isLoaded,
    setActiveGroupId,
    addSite,
    updateSite,
    deleteSite,
    addGroup,
    updateGroup,
    deleteGroup,
    updateSettings,
    login,
    logout,
    loadData
  } = useAppStore()

  const {
    settingsOpen,
    siteModalOpen,
    groupModalOpen,
    loginModalOpen,
    editingSite,
    editingGroup,
    groupModalPosition,
    showTimeWeather,
    openSettings,
    closeSettings,
    openAddSiteModal,
    openEditSiteModal,
    closeSiteModal,
    openAddGroupModal,
    openEditGroupModal,
    closeGroupModal,
    openLoginModal,
    closeLoginModal,
    setShowTimeWeather
  } = useUIStore()

  // 系统主题状态（用于 auto 模式）
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(getSystemTheme)

  // 官方库壁纸状态（深色和浅色各一套）
  const [libWallpaperLight, setLibWallpaperLight] = useState<string | null>(null)
  const [libWallpaperLightBlurred, setLibWallpaperLightBlurred] = useState<string | null>(null)
  const [libWallpaperDark, setLibWallpaperDark] = useState<string | null>(null)
  const [libWallpaperDarkBlurred, setLibWallpaperDarkBlurred] = useState<string | null>(null)
  const lastWallpaperFetchTime = useRef<number>(0)
  const wallpaperCacheLoaded = useRef<boolean>(false)

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // 计算实际应用的主题（处理 auto 模式）
  const effectiveTheme = useMemo(() => {
    if (settings.theme === 'auto') {
      return systemTheme
    }
    return settings.theme
  }, [settings.theme, systemTheme])

  // 从缓存加载壁纸（仅初始化时执行一次）
  useEffect(() => {
    if (wallpaperCacheLoaded.current) return
    wallpaperCacheLoaded.current = true

    getStorage<WallpaperCache>(STORAGE_KEYS.WALLPAPER_CACHE).then(cache => {
      if (cache && cache.category === settings.wallpaperCategory) {
        // 恢复缓存的壁纸
        setLibWallpaperLight(cache.light)
        setLibWallpaperLightBlurred(cache.lightBlurred)
        setLibWallpaperDark(cache.dark)
        setLibWallpaperDarkBlurred(cache.darkBlurred)
        lastWallpaperFetchTime.current = cache.fetchTime
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 获取官方库壁纸（同时获取深色和浅色）
  const fetchLibWallpaper = useCallback(async (forceRefresh = false) => {
    // 如果不是官方库模式，不获取
    if (settings.wallpaperSource !== 'lib') return

    // 检查是否需要获取新壁纸（根据更换频率）
    const now = Date.now()
    const interval = settings.wallpaperInterval * 1000
    if (!forceRefresh && interval > 0 && lastWallpaperFetchTime.current > 0) {
      const elapsed = now - lastWallpaperFetchTime.current
      if (elapsed < interval) return
    }

    try {
      // 并行获取深色和浅色壁纸
      const [lightResult, darkResult] = await Promise.all([
        getRandomWallpaper(user?.secret || '', settings.wallpaperCategory, 'bright'),
        getRandomWallpaper(user?.secret || '', settings.wallpaperCategory, 'dark')
      ])

      const newLight = lightResult?.url || null
      const newLightBlurred = lightResult?.blurUrl || null
      const newDark = darkResult?.url || null
      const newDarkBlurred = darkResult?.blurUrl || null

      setLibWallpaperLight(newLight)
      setLibWallpaperLightBlurred(newLightBlurred)
      setLibWallpaperDark(newDark)
      setLibWallpaperDarkBlurred(newDarkBlurred)
      lastWallpaperFetchTime.current = now

      // 保存到缓存
      const cache: WallpaperCache = {
        light: newLight,
        lightBlurred: newLightBlurred,
        dark: newDark,
        darkBlurred: newDarkBlurred,
        fetchTime: now,
        category: settings.wallpaperCategory
      }
      setStorage(STORAGE_KEYS.WALLPAPER_CACHE, cache)
    } catch (err) {
      console.error('获取官方库壁纸失败:', err)
    }
  }, [settings.wallpaperSource, settings.wallpaperInterval, settings.wallpaperCategory, user?.secret])

  // 初始化时检查是否需要获取壁纸
  useEffect(() => {
    if (!isLoaded || settings.wallpaperSource !== 'lib') return

    // 如果没有缓存的壁纸，获取新的
    if (!libWallpaperLight && !libWallpaperDark) {
      fetchLibWallpaper()
    }
  }, [isLoaded, settings.wallpaperSource, libWallpaperLight, libWallpaperDark, fetchLibWallpaper])

  // 壁纸类别变化时重新获取
  const prevCategory = useRef(settings.wallpaperCategory)
  useEffect(() => {
    if (settings.wallpaperSource === 'lib' && prevCategory.current !== settings.wallpaperCategory) {
      prevCategory.current = settings.wallpaperCategory
      fetchLibWallpaper(true)
    }
  }, [settings.wallpaperSource, settings.wallpaperCategory, fetchLibWallpaper])

  // 定时更换壁纸（仅在页面可见时）
  useEffect(() => {
    if (settings.wallpaperSource !== 'lib' || settings.wallpaperInterval === 0) return

    const intervalId = setInterval(() => {
      // 仅在页面可见时更换壁纸
      if (document.visibilityState === 'visible') {
        fetchLibWallpaper(true)
      }
    }, settings.wallpaperInterval * 1000)

    return () => clearInterval(intervalId)
  }, [settings.wallpaperSource, settings.wallpaperInterval, fetchLibWallpaper])

  // 手动切换下一张壁纸
  const handleNextWallpaper = useCallback(() => {
    fetchLibWallpaper(true)
  }, [fetchLibWallpaper])

  // 当前分组
  const currentGroup = groups.find(g => g.id === activeGroupId) || groups[0]

  // 分组切换动画状态
  const [slideStatus, setSlideStatus] = useState<SlideStatusType>(SlideStatus.Normal)
  // 侧边栏进入状态（用于自动隐藏功能）
  const [sidebarEntered, setSidebarEntered] = useState(false)
  // 侧边栏离开延迟定时器
  const sidebarLeaveTimer = useRef<number | null>(null)
  // 动画是否正在进行中
  const isAnimating = useRef(false)
  // 动画定时器
  const slideTimeoutId = useRef<number | null>(null)
  // 标记是否刚刚关闭了遮罩（用于阻止同一次滚轮操作切换分组）
  const justClosedOverlay = useRef(false)
  // 滚轮停止检测定时器
  const wheelStopTimer = useRef<number | null>(null)
  // 标记当前滚轮操作是否已经开始（用于只响应滚轮操作的第一个事件）
  const wheelStarted = useRef(false)

  // 计算空闲超时时间（毫秒）
  // 如果待机页关闭或设置为"从不"，则不启用空闲检测
  const idleTimeout = useMemo(() => {
    // 待机页关闭时不启用空闲检测
    if (settings.standby?.display === false) return 0
    // 获取设置的延迟时间（秒），0 表示"从不"
    const delaySeconds = settings.standby?.openAfterAppInactiveDelaySeconds ?? 30
    if (delaySeconds === 0) return 0
    return delaySeconds * 1000
  }, [settings.standby?.display, settings.standby?.openAfterAppInactiveDelaySeconds])

  // 使用空闲计时器 hook（排除 wheel 事件，由下面的 handleWheel 统一处理）
  const { resetTimer: resetIdleTimer } = useIdleTimer({
    timeout: idleTimeout || DEFAULT_IDLE_TIMEOUT,
    onIdle: () => {
      // 只有在待机页启用且有超时时间时才显示
      if (idleTimeout > 0) {
        setShowTimeWeather(true)
      }
    },
    onActive: () => setShowTimeWeather(false),
    excludeWheel: true
  })

  // 初始化加载数据
  useEffect(() => {
    loadData()
  }, [loadData])

  // 打开标签页时进入待机页（如果设置了 openAfterAppReady）
  useEffect(() => {
    if (isLoaded && settings.standby?.display !== false && settings.standby?.openAfterAppReady) {
      setShowTimeWeather(true)
    }
  // 只在初始加载完成时执行一次
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded])

  // 滚动切换分组（带动画）
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 忽略 deltaY 为 0 的事件（某些设备的初始化事件）
      if (e.deltaY === 0) return

      // 重置空闲计时器
      resetIdleTimer()

      // 清除之前的滚轮停止检测定时器
      if (wheelStopTimer.current) {
        clearTimeout(wheelStopTimer.current)
      }

      // 检测是否是滚轮操作的开始（参考 Monknow 的 isStart 逻辑）
      const isStart = !wheelStarted.current
      wheelStarted.current = true

      // 设置新的滚轮停止检测定时器（200ms 后重置状态）
      wheelStopTimer.current = window.setTimeout(() => {
        justClosedOverlay.current = false
        wheelStarted.current = false
      }, 200)

      // 只在滚轮操作开始时处理（忽略连续滚动事件）
      if (!isStart) return

      // 如果在弹窗打开时，不处理滚动
      if (settingsOpen || siteModalOpen || groupModalOpen || loginModalOpen) return

      // 如果时间天气遮罩显示中，滚轮只关闭遮罩，不切换分组（参考 Monknow 的 checkSlide 逻辑）
      if (showTimeWeather) {
        justClosedOverlay.current = true
        setShowTimeWeather(false)
        return
      }

      // 如果刚刚关闭了遮罩，不切换分组（等待滚轮停止后才允许）
      if (justClosedOverlay.current) return

      // 如果未开启滚动切换分组，直接返回
      if (!settings.scrollToSwitchGroup) return

      // 如果动画正在进行中，忽略滚动
      if (isAnimating.current) return

      // 只有一个分组时不处理
      if (groups.length <= 1) return

      // 获取当前分组索引
      const currentIndex = groups.findIndex(g => g.id === activeGroupId)
      if (currentIndex === -1) return

      // 判断滚动方向
      const isScrollDown = e.deltaY > 0
      const isScrollUp = e.deltaY < 0

      // 向下滚动 - 切换到下一个分组（循环：最后一个 -> 第一个）
      if (isScrollDown) {
        isAnimating.current = true
        // 向上滑出
        setSlideStatus(SlideStatus.UpExited)

        slideTimeoutId.current = window.setTimeout(() => {
          // 切换分组并立即设为淡出状态（不可见）
          setSlideStatus(SlideStatus.Faded)
          // 循环逻辑：如果是最后一个，切换到第一个
          const nextIndex = currentIndex === groups.length - 1 ? 0 : currentIndex + 1
          setActiveGroupId(groups[nextIndex].id)

          // 使用 requestAnimationFrame 确保 DOM 更新后再恢复
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setSlideStatus(SlideStatus.Normal)
              isAnimating.current = false
            })
          })
        }, SLIDE_ANIMATION_TIME)
      }
      // 向上滚动 - 切换到上一个分组（循环：第一个 -> 最后一个）
      else if (isScrollUp) {
        isAnimating.current = true
        // 向下滑出
        setSlideStatus(SlideStatus.DownExited)

        slideTimeoutId.current = window.setTimeout(() => {
          // 切换分组并立即设为淡出状态（不可见）
          setSlideStatus(SlideStatus.Faded)
          // 循环逻辑：如果是第一个，切换到最后一个
          const prevIndex = currentIndex === 0 ? groups.length - 1 : currentIndex - 1
          setActiveGroupId(groups[prevIndex].id)

          // 使用 requestAnimationFrame 确保 DOM 更新后再恢复
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setSlideStatus(SlideStatus.Normal)
              isAnimating.current = false
            })
          })
        }, SLIDE_ANIMATION_TIME)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      // 清理定时器
      if (slideTimeoutId.current) {
        clearTimeout(slideTimeoutId.current)
      }
      if (wheelStopTimer.current) {
        clearTimeout(wheelStopTimer.current)
      }
    }
  }, [settings.scrollToSwitchGroup, groups, activeGroupId, setActiveGroupId, settingsOpen, siteModalOpen, groupModalOpen, loginModalOpen, showTimeWeather, setShowTimeWeather, resetIdleTimer])

  // 处理删除分组
  const handleDeleteGroup = useCallback((groupId: string) => {
    deleteGroup(groupId)
    closeGroupModal()
  }, [deleteGroup, closeGroupModal])

  // 计算当前壁纸样式
  const wallpaperStyle = useMemo(() => {
    const { wallpaperSource, wallpaperBlurred, wallpaperColor, localWallpaper, localWallpaperBlurred } = settings

    // 根据壁纸来源计算样式
    switch (wallpaperSource) {
      case 'color':
        // 纯色壁纸
        return { backgroundColor: wallpaperColor || '#276ce6' }

      case 'local':
        // 本地壁纸
        if (localWallpaper) {
          const url = wallpaperBlurred && localWallpaperBlurred ? localWallpaperBlurred : localWallpaper
          return { backgroundImage: `url(${url})` }
        }
        return { backgroundColor: '#276ce6' }

      case 'lib':
      default: {
        // 官方库壁纸 - 根据当前主题选择对应的壁纸
        const currentLibWallpaper = effectiveTheme === 'dark' ? libWallpaperDark : libWallpaperLight
        const currentLibWallpaperBlurred = effectiveTheme === 'dark' ? libWallpaperDarkBlurred : libWallpaperLightBlurred
        if (currentLibWallpaper) {
          const url = wallpaperBlurred && currentLibWallpaperBlurred ? currentLibWallpaperBlurred : currentLibWallpaper
          return { backgroundImage: `url(${url})` }
        }
        // 如果还没加载到壁纸，使用默认壁纸
        return { backgroundImage: `url(${settings.wallpaper})` }
      }
    }
  }, [settings, effectiveTheme, libWallpaperLight, libWallpaperLightBlurred, libWallpaperDark, libWallpaperDarkBlurred])

  // 获取当前显示的壁纸URL（用于设置面板预览）
  const currentWallpaperUrl = useMemo(() => {
    switch (settings.wallpaperSource) {
      case 'lib':
        // 根据当前主题返回对应的壁纸
        return effectiveTheme === 'dark' ? libWallpaperDark : libWallpaperLight
      case 'local':
        return settings.localWallpaper
      case 'color':
        return null
      default:
        return effectiveTheme === 'dark' ? libWallpaperDark : libWallpaperLight
    }
  }, [settings.wallpaperSource, settings.localWallpaper, effectiveTheme, libWallpaperLight, libWallpaperDark])

  // 获取模糊背景URL（用于时间天气遮罩）
  const blurredWallpaperUrl = useMemo(() => {
    switch (settings.wallpaperSource) {
      case 'lib':
        // 根据当前主题返回对应的模糊壁纸
        return effectiveTheme === 'dark' ? libWallpaperDarkBlurred : libWallpaperLightBlurred
      case 'local':
        return settings.localWallpaperBlurred || settings.localWallpaper
      case 'color':
        return null
      default:
        return effectiveTheme === 'dark' ? libWallpaperDarkBlurred : libWallpaperLightBlurred
    }
  }, [settings.wallpaperSource, settings.localWallpaper, settings.localWallpaperBlurred, effectiveTheme, libWallpaperLightBlurred, libWallpaperDarkBlurred])

  // 侧边栏鼠标进入处理（取消延迟关闭）
  const handleSidebarEnter = useCallback(() => {
    if (sidebarLeaveTimer.current) {
      clearTimeout(sidebarLeaveTimer.current)
      sidebarLeaveTimer.current = null
    }
    setSidebarEntered(true)
  }, [])

  // 侧边栏鼠标离开处理（延迟关闭，避免闪烁）
  const handleSidebarLeave = useCallback(() => {
    sidebarLeaveTimer.current = window.setTimeout(() => {
      setSidebarEntered(false)
      sidebarLeaveTimer.current = null
    }, 100)
  }, [])

  return (
    <div className={`app ${effectiveTheme}-theme`}>
      {/* 壁纸 */}
      <div className="wallpaper" style={wallpaperStyle} />

      {/* 主容器 */}
      <div className={[
        'main-container',
        settings.sidebarPosition === 'right' && 'sidebar-right',
        settings.sidebarAutoHide && 'sidebar-auto-hide',
        !settings.sidebarCollapsed && 'sidebar-expanded',
        sidebarEntered && 'sidebar-entered'
      ].filter(Boolean).join(' ')}>
        {/* 侧边栏触发区域 - 用于自动隐藏模式下检测鼠标进入 */}
        <div
          className="sidebar-trigger"
          onMouseEnter={handleSidebarEnter}
        />
        {/* 侧边栏 */}
        <Sidebar
          groups={groups}
          activeGroupId={activeGroupId}
          onGroupSelect={setActiveGroupId}
          onAddGroup={openAddGroupModal}
          onEditGroup={openEditGroupModal}
          onDeleteGroup={(group) => handleDeleteGroup(group.id)}
          onOpenAllSites={(group) => {
            // 打开分组内所有书签
            group.sites.forEach(site => {
              window.open(site.url, '_blank')
            })
          }}
          onOpenSettings={openSettings}
          user={user}
          collapsed={settings.sidebarCollapsed}
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
        />

        {/* 内容区视口 - 用于滚动切换分组动画 */}
        <div className="content-viewport">
          {/* 内容区 */}
          <main className={`content-area ${slideStatus !== SlideStatus.Normal ? slideStatus : ''}`}>
            {/* 搜索框 */}
            <SearchBox
              currentEngineId={settings.searchEngine}
              onEngineChange={(id) => updateSettings({ searchEngine: id })}
              openTarget={settings.searchOpenTarget}
            />

            {/* 网站网格 - 根据 iconLayout 应用不同布局样式 */}
            <div
              className={`sites-grid ${settings.iconLayout === 'simple' ? 'simple-layout' : 'particular-layout'}`}
              style={{
                '--icon-size': `${settings.iconSizePercentage * 0.96 + 24}px`,
                '--icon-border-radius': `${settings.iconBorderRadius}%`,
                '--grid-row-gap': `${settings.iconRowGap}px`,
                '--grid-column-gap': `${settings.iconColumnGap}px`
              } as React.CSSProperties}
            >
              {isLoaded && currentGroup?.sites.map(site => (
                <SiteCard
                  key={site.id}
                  site={site}
                  onEdit={openEditSiteModal}
                  onDelete={deleteSite}
                  openTarget={settings.openTarget}
                  iconLayout={settings.iconLayout}
                />
              ))}
              {/* 添加网站卡片 - 根据设置决定是否显示 */}
              {isLoaded && settings.showAddButton !== false && <AddSiteCard onClick={openAddSiteModal} />}
            </div>
          </main>
        </div>

        {/* 时间天气覆盖层 - 空闲时显示 */}
        <div
          className={`time-weather-overlay ${showTimeWeather ? 'visible' : 'hidden'}`}
        >
          <div
            className="time-weather-blur-bg"
            style={
              // 根据待机页背景模糊设置决定使用模糊壁纸还是原壁纸
              settings.standby?.blurredBackground !== false
                ? (blurredWallpaperUrl ? { backgroundImage: `url(${blurredWallpaperUrl})` } : { backgroundColor: settings.wallpaperColor || '#276ce6' })
                : (currentWallpaperUrl ? { backgroundImage: `url(${currentWallpaperUrl})` } : { backgroundColor: settings.wallpaperColor || '#276ce6' })
            }
          />
          <TimeWeather visible={showTimeWeather} settings={settings} />
        </div>
      </div>

      {/* 设置面板 */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={closeSettings}
        settings={settings}
        onSettingsChange={(newSettings) => useAppStore.getState().setSettings(newSettings)}
        user={user}
        onLoginClick={openLoginModal}
        onLogout={logout}
        onUserUpdate={(updatedUser) => useAppStore.getState().setUser(updatedUser)}
        currentWallpaper={currentWallpaperUrl}
        onNextWallpaper={handleNextWallpaper}
      />

      {/* 添加/编辑网站弹窗 */}
      <SiteModal
        isOpen={siteModalOpen}
        onClose={closeSiteModal}
        site={editingSite}
        onSave={editingSite ? updateSite : addSite}
        userSecret={user?.secret}
      />

      {/* 添加/编辑分组弹窗 */}
      <GroupModal
        isOpen={groupModalOpen}
        onClose={closeGroupModal}
        group={editingGroup}
        onSave={editingGroup ? updateGroup : addGroup}
        onDelete={editingGroup ? () => handleDeleteGroup(editingGroup.id) : undefined}
        position={groupModalPosition}
      />

      {/* 登录弹窗 */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={closeLoginModal}
        onLogin={login}
      />
    </div>
  )
}

export default App
