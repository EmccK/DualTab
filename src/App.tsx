import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import type { NavGroup, Site, Settings, User } from './types'
import { DEFAULT_NAV_GROUPS, DEFAULT_SETTINGS } from './constants'
import { Sidebar } from './components/Sidebar'
import { SearchBox } from './components/SearchBox'
import { SiteCard, AddSiteCard } from './components/SiteCard'
import { TimeWeather } from './components/TimeWeather'
import { SettingsPanel } from './components/SettingsPanel'
import { SiteModal } from './components/SiteModal'
import { GroupModal } from './components/GroupModal'
import { LoginModal } from './components/LoginModal'
import type { UserInfo } from './services/api'
import { getUserAllData, parseMonkNowIcons, syncIconsToServer } from './services/api'
import { getStorage, setStorage, removeStorage, STORAGE_KEYS } from './services/storage'

// 空闲超时时间（毫秒）- 用户停止操作后多久显示时间天气
const IDLE_TIMEOUT = 5000

function App() {
  // 导航分组数据 - 初始为空，避免闪现默认数据
  const [groups, setGroups] = useState<NavGroup[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  // 标记是否需要同步到服务器（只有用户主动修改时才同步）
  const [needSync, setNeedSync] = useState(false)

  // 当前选中的分组
  const [activeGroupId, setActiveGroupId] = useState('home')

  // 设置
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  // 面板状态
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  // 弹窗状态
  const [siteModalOpen, setSiteModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [editingGroup, setEditingGroup] = useState<NavGroup | null>(null)
  // 添加分组弹窗位置
  const [groupModalPosition, setGroupModalPosition] = useState<{ x: number; y: number } | null>(null)

  // 用户状态
  const [user, setUser] = useState<User | null>(null)

  // 时间天气显示状态 - 默认显示，用户交互后隐藏，空闲后重新显示
  const [showTimeWeather, setShowTimeWeather] = useState(true)
  const idleTimerRef = useRef<number | null>(null)

  // 当前分组
  const currentGroup = groups.find(g => g.id === activeGroupId) || groups[0]

  // 重置空闲计时器 - 用户交互时调用
  const resetIdleTimer = useCallback(() => {
    // 隐藏时间天气
    setShowTimeWeather(false)
    
    // 清除之前的计时器
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    
    // 设置新的计时器，空闲后显示时间天气
    idleTimerRef.current = window.setTimeout(() => {
      setShowTimeWeather(true)
    }, IDLE_TIMEOUT)
  }, [])

  // 监听用户交互事件
  useEffect(() => {
    const contentArea = document.querySelector('.content-area')
    if (!contentArea) return

    const handleInteraction = () => {
      resetIdleTimer()
    }

    // 监听点击和滚动事件
    contentArea.addEventListener('click', handleInteraction)
    contentArea.addEventListener('wheel', handleInteraction)
    contentArea.addEventListener('scroll', handleInteraction)

    return () => {
      contentArea.removeEventListener('click', handleInteraction)
      contentArea.removeEventListener('wheel', handleInteraction)
      contentArea.removeEventListener('scroll', handleInteraction)
      
      // 清理计时器
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [resetIdleTimer])

  // 初始化：先从本地加载数据立即显示，再从服务器同步
  useEffect(() => {
    const loadData = async () => {
      // 1. 先从本地读取数据，立即显示
      const [savedGroups, savedSettings, savedUser] = await Promise.all([
        getStorage<NavGroup[]>(STORAGE_KEYS.GROUPS),
        getStorage<Settings>(STORAGE_KEYS.SETTINGS),
        getStorage<User>(STORAGE_KEYS.USER)
      ])
      
      if (savedSettings) setSettings(savedSettings)
      if (savedUser) setUser(savedUser)
      
      // 优先使用本地数据
      if (savedGroups && savedGroups.length > 0) {
        setGroups(savedGroups)
        setActiveGroupId(savedGroups[0].id)
      } else {
        // 没有本地数据时使用默认数据
        setGroups(DEFAULT_NAV_GROUPS)
        setActiveGroupId('home')
      }
      
      setIsLoaded(true)
      
      // 2. 如果已登录，后台从服务器同步最新数据
      if (savedUser?.secret) {
        try {
          const serverData = await getUserAllData(savedUser.secret)
          if (serverData?.icons) {
            const parsed = parseMonkNowIcons(serverData.icons)
            if (parsed?.groups && parsed.groups.length > 0) {
              setGroups(parsed.groups)
              setActiveGroupId(parsed.groups[0].id)
              console.log('从服务器同步书签成功')
            }
          }
        } catch (err) {
          console.warn('从服务器同步数据失败:', err)
        }
      }
    }
    loadData()
  }, [])

  // 保存分组到存储，并同步到服务器（仅用户主动修改时）
  useEffect(() => {
    if (isLoaded) {
      setStorage(STORAGE_KEYS.GROUPS, groups)
      
      // 只有用户主动修改时才同步到服务器
      if (needSync && user?.secret) {
        syncIconsToServer(user.secret, groups)
        setNeedSync(false)
      }
    }
  }, [groups, isLoaded, needSync, user?.secret])

  // 保存设置到存储
  useEffect(() => {
    if (isLoaded) {
      setStorage(STORAGE_KEYS.SETTINGS, settings)
    }
  }, [settings, isLoaded])

  // 保存用户信息到存储
  useEffect(() => {
    if (!isLoaded) return
    if (user) {
      setStorage(STORAGE_KEYS.USER, user)
    } else {
      removeStorage(STORAGE_KEYS.USER)
    }
  }, [user, isLoaded])

  // 处理登录成功
  const handleLogin = useCallback(async (userInfo: UserInfo) => {
    const newUser = {
      email: userInfo.email,
      name: userInfo.name || 'Guest',
      avatar: userInfo.avatar,
      secret: userInfo.secret,
      isLoggedIn: true
    }
    setUser(newUser)
    
    // 登录后尝试从服务器恢复数据
    try {
      const serverData = await getUserAllData(userInfo.secret)
      if (serverData?.icons) {
        // 解析服务器上的书签数据
        const parsed = parseMonkNowIcons(serverData.icons)
        if (parsed?.groups && parsed.groups.length > 0) {
          setGroups(parsed.groups)
          setActiveGroupId(parsed.groups[0].id)
          console.log('从服务器恢复书签成功')
        }
      }
    } catch (err) {
      console.warn('数据同步失败:', err)
    }
  }, [])

  // 处理登出
  const handleLogout = useCallback(() => {
    setUser(null)
  }, [])

  // 添加网站
  const handleAddSite = useCallback((site: Site) => {
    setGroups(prev => prev.map(g => 
      g.id === activeGroupId 
        ? { ...g, sites: [...g.sites, site] }
        : g
    ))
    setNeedSync(true)
  }, [activeGroupId])

  // 更新网站
  const handleUpdateSite = useCallback((site: Site) => {
    setGroups(prev => prev.map(g => ({
      ...g,
      sites: g.sites.map(s => s.id === site.id ? site : s)
    })))
    setNeedSync(true)
  }, [])

  // 删除网站
  const handleDeleteSite = useCallback((siteId: string) => {
    setGroups(prev => prev.map(g => ({
      ...g,
      sites: g.sites.filter(s => s.id !== siteId)
    })))
    setNeedSync(true)
    // 如果正在编辑该网站，关闭弹窗
    if (editingSite?.id === siteId) {
      setEditingSite(null)
      setSiteModalOpen(false)
    }
  }, [editingSite?.id])

  // 添加分组
  const handleAddGroup = useCallback((group: NavGroup) => {
    setGroups(prev => [...prev, group])
    setActiveGroupId(group.id)
    setNeedSync(true)
  }, [])

  // 更新分组
  const handleUpdateGroup = useCallback((group: NavGroup) => {
    setGroups(prev => prev.map(g => g.id === group.id ? group : g))
    setNeedSync(true)
  }, [])

  // 删除分组
  const handleDeleteGroup = useCallback((groupId: string) => {
    setGroups(prev => {
      const newGroups = prev.filter(g => g.id !== groupId)
      // 如果删除的是当前分组，切换到第一个
      if (activeGroupId === groupId && newGroups.length > 0) {
        setActiveGroupId(newGroups[0].id)
      }
      return newGroups
    })
    setNeedSync(true)
    setEditingGroup(null)
    setGroupModalOpen(false)
  }, [activeGroupId])

  // 打开添加网站弹窗
  const openAddSiteModal = () => {
    setEditingSite(null)
    setSiteModalOpen(true)
  }

  // 打开编辑网站弹窗
  const openEditSiteModal = (site: Site) => {
    setEditingSite(site)
    setSiteModalOpen(true)
  }

  // 打开添加分组弹窗
  const openAddGroupModal = (position: { x: number; y: number }) => {
    setEditingGroup(null)
    setGroupModalPosition(position)
    setGroupModalOpen(true)
  }

  // 打开编辑分组弹窗
  const openEditGroupModal = (group: NavGroup) => {
    setEditingGroup(group)
    setGroupModalPosition(null) // 编辑时居中显示
    setGroupModalOpen(true)
  }

  // 壁纸样式
  const wallpaperStyle = settings.wallpaperType === 'color'
    ? { backgroundColor: settings.wallpaper }
    : { backgroundImage: `url(${settings.wallpaper})` }

  return (
    <div className={`app ${settings.theme}-theme`}>
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
          onOpenSettings={() => setSettingsOpen(true)}
          user={user}
          onLoginClick={() => setLoginModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* 内容区 */}
        <main className="content-area">
          {/* 搜索框 */}
          <SearchBox
            currentEngineId={settings.searchEngine}
            onEngineChange={(id) => setSettings(s => ({ ...s, searchEngine: id }))}
            openInNewTab={settings.openInNewTab}
          />

          {/* 网站网格 */}
          <div className="sites-grid">
            {isLoaded && currentGroup?.sites.map(site => (
              <SiteCard
                key={site.id}
                site={site}
                openInNewTab={settings.openInNewTab}
                onEdit={openEditSiteModal}
                onDelete={handleDeleteSite}
              />
            ))}
            {/* 添加网站卡片 */}
            {isLoaded && <AddSiteCard onClick={openAddSiteModal} />}
          </div>

          {/* 时间天气覆盖层 - 空闲时显示，带毛玻璃效果，点击隐藏 */}
          <div 
            className={`time-weather-overlay ${showTimeWeather ? 'visible' : 'hidden'}`}
            onClick={resetIdleTimer}
            onWheel={resetIdleTimer}
          >
            <div className="time-weather-blur-bg" />
            <TimeWeather visible={showTimeWeather} />
          </div>
        </main>
      </div>

      {/* 设置面板 */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {/* 添加/编辑网站弹窗 */}
      <SiteModal
        isOpen={siteModalOpen}
        onClose={() => setSiteModalOpen(false)}
        site={editingSite}
        onSave={editingSite ? handleUpdateSite : handleAddSite}
        onDelete={editingSite ? () => handleDeleteSite(editingSite.id) : undefined}
        userSecret={user?.secret}
      />

      {/* 添加/编辑分组弹窗 */}
      <GroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        group={editingGroup}
        onSave={editingGroup ? handleUpdateGroup : handleAddGroup}
        onDelete={editingGroup ? () => handleDeleteGroup(editingGroup.id) : undefined}
        position={groupModalPosition}
      />

      {/* 登录弹窗 */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  )
}

export default App
