import { useEffect, useCallback } from 'react'
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

  // 当前分组
  const currentGroup = groups.find(g => g.id === activeGroupId) || groups[0]

  // 使用空闲计时器 hook
  useIdleTimer({
    timeout: IDLE_TIMEOUT,
    onIdle: () => setShowTimeWeather(true),
    onActive: () => setShowTimeWeather(false)
  })

  // 初始化加载数据
  useEffect(() => {
    loadData()
  }, [loadData])

  // 处理删除网站
  const handleDeleteSite = useCallback((siteId: string) => {
    deleteSite(siteId)
    // 如果正在编辑该网站，关闭弹窗
    if (editingSite?.id === siteId) {
      closeSiteModal()
    }
  }, [deleteSite, editingSite?.id, closeSiteModal])

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
          onOpenSettings={openSettings}
          user={user}
          onLoginClick={openLoginModal}
          onLogout={logout}
        />

        {/* 内容区 */}
        <main className="content-area">
          {/* 搜索框 */}
          <SearchBox
            currentEngineId={settings.searchEngine}
            onEngineChange={(id) => updateSettings({ searchEngine: id })}
            openInNewTab={settings.openInNewTab}
          />

          {/* 网站网格 */}
          <div className="sites-grid">
            {isLoaded && currentGroup?.sites.map(site => (
              <SiteCard
                key={site.id}
                site={site}
                onEdit={openEditSiteModal}
                onDelete={handleDeleteSite}
                openInNewTabSetting={settings.openInNewTab}
              />
            ))}
            {/* 添加网站卡片 */}
            {isLoaded && <AddSiteCard onClick={openAddSiteModal} />}
          </div>

          {/* 时间天气覆盖层 - 空闲时显示，带毛玻璃效果 */}
          <div
            className={`time-weather-overlay ${showTimeWeather ? 'visible' : 'hidden'}`}
          >
            <div className="time-weather-blur-bg" />
            <TimeWeather visible={showTimeWeather} settings={settings} />
          </div>
        </main>
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
      />

      {/* 添加/编辑网站弹窗 */}
      <SiteModal
        isOpen={siteModalOpen}
        onClose={closeSiteModal}
        site={editingSite}
        onSave={editingSite ? updateSite : addSite}
        onDelete={editingSite ? () => handleDeleteSite(editingSite.id) : undefined}
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
