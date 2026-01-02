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

// 空闲超时时间（毫秒）- 用户停止操作后多久显示时间天气
const IDLE_TIMEOUT = 5000
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

  // 当前分组
  const currentGroup = groups.find(g => g.id === activeGroupId) || groups[0]

  // 分组切换动画状态
  const [slideStatus, setSlideStatus] = useState<SlideStatusType>(SlideStatus.Normal)
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

  // 使用空闲计时器 hook（排除 wheel 事件，由下面的 handleWheel 统一处理）
  const { resetTimer: resetIdleTimer } = useIdleTimer({
    timeout: IDLE_TIMEOUT,
    onIdle: () => setShowTimeWeather(true),
    onActive: () => setShowTimeWeather(false),
    excludeWheel: true
  })

  // 初始化加载数据
  useEffect(() => {
    loadData()
  }, [loadData])

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

  // 壁纸样式
  const wallpaperStyle = settings.wallpaperType === 'color'
    ? { backgroundColor: settings.wallpaper }
    : { backgroundImage: `url(${settings.wallpaper})` }

  return (
    <div className={`app ${effectiveTheme}-theme`}>
      {/* 壁纸 */}
      <div className="wallpaper" style={wallpaperStyle} />

      {/* 主容器 */}
      <div className="main-container">
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

            {/* 网站网格 */}
            <div className="sites-grid">
              {isLoaded && currentGroup?.sites.map(site => (
                <SiteCard
                  key={site.id}
                  site={site}
                  onEdit={openEditSiteModal}
                  onDelete={deleteSite}
                  openTarget={settings.openTarget}
                />
              ))}
              {/* 添加网站卡片 */}
              {isLoaded && <AddSiteCard onClick={openAddSiteModal} />}
            </div>
          </main>
        </div>

        {/* 时间天气覆盖层 - 空闲时显示，带毛玻璃效果 */}
        <div
          className={`time-weather-overlay ${showTimeWeather ? 'visible' : 'hidden'}`}
        >
          <div className="time-weather-blur-bg" />
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
