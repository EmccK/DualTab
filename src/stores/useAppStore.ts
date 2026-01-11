/**
 * 应用状态管理 Store
 * 管理核心业务数据：分组、设置、用户
 */

import { create } from 'zustand'
import type { NavGroup, Site, Settings, User } from '../types'
import { DEFAULT_NAV_GROUPS, DEFAULT_SETTINGS } from '../constants'
import { getStorage, setStorage, removeStorage, STORAGE_KEYS } from '../services/storage'
import { getUserAllData, parseMonkNowIcons, syncIconsToServer, syncSettingsToServer, syncSidebarToServer, syncSearcherToServer, syncBackgroundToServer, syncStandbyToServer, parseMonknowCommon, parseMonknowSidebar } from '../services/api'
import type { UserInfo } from '../services/api'

// 设置同步防抖定时器
let commonSyncTimer: ReturnType<typeof setTimeout> | null = null
let sidebarSyncTimer: ReturnType<typeof setTimeout> | null = null
let iconsSyncTimer: ReturnType<typeof setTimeout> | null = null
let searcherSyncTimer: ReturnType<typeof setTimeout> | null = null
let backgroundSyncTimer: ReturnType<typeof setTimeout> | null = null
let standbySyncTimer: ReturnType<typeof setTimeout> | null = null
const SETTINGS_SYNC_DELAY = 1000 // 1秒防抖延迟

// 侧边栏相关的设置 key
const SIDEBAR_SETTINGS_KEYS: (keyof Settings)[] = ['sidebarPosition', 'sidebarAutoHide', 'sidebarCollapsed']

// 图标相关的设置 key（同步到 icons 类型）
const ICONS_SETTINGS_KEYS: (keyof Settings)[] = [
  'openTarget',
  'iconLayout',
  'iconSizePercentage',
  'iconBorderRadius',
  'iconOpacity',
  'iconShadow',
  'iconRowGap',
  'iconColumnGap',
  'showAddButton',
  'rememberLastGroup',
  'scrollToSwitchGroup'
]

// 搜索相关的设置 key（同步到 searcher 类型）
const SEARCHER_SETTINGS_KEYS: (keyof Settings)[] = ['searchOpenTarget', 'searchEngine']

// 壁纸相关的设置 key（同步到 background 类型）
const BACKGROUND_SETTINGS_KEYS: (keyof Settings)[] = [
  'wallpaperSource',
  'wallpaperBlurred',
  'wallpaperInterval',
  'wallpaperCategory',
  'wallpaperColor',
  'localWallpaper',
  'localWallpaperBlurred'
]

// 待机页相关的设置 key（同步到 standby 类型）
const STANDBY_SETTINGS_KEYS: (keyof Settings)[] = ['standby']

/**
 * 防抖同步 common 设置到服务器
 */
function debouncedSyncCommon(secret: string, settings: Settings) {
  if (commonSyncTimer) {
    clearTimeout(commonSyncTimer)
  }
  commonSyncTimer = setTimeout(() => {
    syncSettingsToServer(secret, settings).catch(err => {
      console.warn('同步 common 设置到服务器失败:', err)
    })
    commonSyncTimer = null
  }, SETTINGS_SYNC_DELAY)
}

/**
 * 防抖同步 sidebar 设置到服务器
 */
function debouncedSyncSidebar(secret: string, settings: Settings) {
  if (sidebarSyncTimer) {
    clearTimeout(sidebarSyncTimer)
  }
  sidebarSyncTimer = setTimeout(() => {
    syncSidebarToServer(secret, settings).catch(err => {
      console.warn('同步 sidebar 设置到服务器失败:', err)
    })
    sidebarSyncTimer = null
  }, SETTINGS_SYNC_DELAY)
}

/**
 * 防抖同步 icons 设置到服务器
 */
function debouncedSyncIcons(secret: string, settings: Settings, groups: NavGroup[]) {
  if (iconsSyncTimer) {
    clearTimeout(iconsSyncTimer)
  }
  iconsSyncTimer = setTimeout(() => {
    syncIconsToServer(secret, groups, settings).catch(err => {
      console.warn('同步 icons 设置到服务器失败:', err)
    })
    iconsSyncTimer = null
  }, SETTINGS_SYNC_DELAY)
}

/**
 * 防抖同步 searcher 设置到服务器
 */
function debouncedSyncSearcher(secret: string, settings: Settings) {
  if (searcherSyncTimer) {
    clearTimeout(searcherSyncTimer)
  }
  searcherSyncTimer = setTimeout(() => {
    syncSearcherToServer(secret, settings).catch(err => {
      console.warn('同步 searcher 设置到服务器失败:', err)
    })
    searcherSyncTimer = null
  }, SETTINGS_SYNC_DELAY)
}

/**
 * 防抖同步 background 设置到服务器
 */
function debouncedSyncBackground(secret: string, settings: Settings) {
  if (backgroundSyncTimer) {
    clearTimeout(backgroundSyncTimer)
  }
  backgroundSyncTimer = setTimeout(() => {
    syncBackgroundToServer(secret, settings).catch(err => {
      console.warn('同步 background 设置到服务器失败:', err)
    })
    backgroundSyncTimer = null
  }, SETTINGS_SYNC_DELAY)
}

/**
 * 防抖同步 standby 设置到服务器
 */
function debouncedSyncStandby(secret: string, settings: Settings) {
  if (standbySyncTimer) {
    clearTimeout(standbySyncTimer)
  }
  standbySyncTimer = setTimeout(() => {
    if (settings.standby) {
      syncStandbyToServer(secret, settings.standby).catch(err => {
        console.warn('同步 standby 设置到服务器失败:', err)
      })
    }
    standbySyncTimer = null
  }, SETTINGS_SYNC_DELAY)
}

/**
 * 根据变更的设置 key 同步到服务器
 */
function syncSettingsChange(secret: string, settings: Settings, changedKeys: (keyof Settings)[], groups: NavGroup[]) {
  const hasSidebarChange = changedKeys.some(key => SIDEBAR_SETTINGS_KEYS.includes(key))
  const hasIconsChange = changedKeys.some(key => ICONS_SETTINGS_KEYS.includes(key))
  const hasSearcherChange = changedKeys.some(key => SEARCHER_SETTINGS_KEYS.includes(key))
  const hasBackgroundChange = changedKeys.some(key => BACKGROUND_SETTINGS_KEYS.includes(key))
  const hasStandbyChange = changedKeys.some(key => STANDBY_SETTINGS_KEYS.includes(key))
  // common 设置：不属于 sidebar、icons、searcher、background、standby 的其他设置
  const hasCommonChange = changedKeys.some(key =>
    !SIDEBAR_SETTINGS_KEYS.includes(key) &&
    !ICONS_SETTINGS_KEYS.includes(key) &&
    !SEARCHER_SETTINGS_KEYS.includes(key) &&
    !BACKGROUND_SETTINGS_KEYS.includes(key) &&
    !STANDBY_SETTINGS_KEYS.includes(key)
  )

  if (hasSidebarChange) {
    debouncedSyncSidebar(secret, settings)
  }
  if (hasIconsChange) {
    debouncedSyncIcons(secret, settings, groups)
  }
  if (hasSearcherChange) {
    debouncedSyncSearcher(secret, settings)
  }
  if (hasBackgroundChange) {
    debouncedSyncBackground(secret, settings)
  }
  if (hasStandbyChange) {
    debouncedSyncStandby(secret, settings)
  }
  if (hasCommonChange) {
    debouncedSyncCommon(secret, settings)
  }
}

interface AppState {
  // 状态
  groups: NavGroup[]
  activeGroupId: string
  settings: Settings
  user: User | null
  isLoaded: boolean
  needSync: boolean

  // 计算属性
  currentGroup: NavGroup | undefined

  // Actions - 分组操作
  setGroups: (groups: NavGroup[]) => void
  setActiveGroupId: (id: string) => void
  addGroup: (group: NavGroup) => void
  updateGroup: (group: NavGroup) => void
  deleteGroup: (groupId: string) => void

  // Actions - 网站操作
  addSite: (site: Site) => void
  updateSite: (site: Site) => void
  deleteSite: (siteId: string) => void
  reorderSites: (sites: Site[]) => void  // 重排序网站

  // Actions - 设置操作
  setSettings: (settings: Settings) => void
  updateSettings: (partial: Partial<Settings>) => void

  // Actions - 用户操作
  setUser: (user: User | null) => void
  login: (userInfo: UserInfo) => Promise<void>
  logout: () => void

  // Actions - 数据操作
  loadData: () => Promise<void>
  syncToServer: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  groups: [],
  activeGroupId: 'home',
  settings: DEFAULT_SETTINGS,
  user: null,
  isLoaded: false,
  needSync: false,

  // 计算属性
  get currentGroup() {
    const { groups, activeGroupId } = get()
    return groups.find(g => g.id === activeGroupId) || groups[0]
  },

  // 分组操作
  setGroups: (groups) => set({ groups }),

  setActiveGroupId: (id) => {
    set({ activeGroupId: id })
    // 如果开启了记住最后访问的分组，保存到本地存储
    const { settings } = get()
    if (settings.rememberLastGroup) {
      setStorage(STORAGE_KEYS.LAST_GROUP_ID, id)
    }
  },

  addGroup: (group) => {
    set(state => ({
      groups: [...state.groups, group],
      activeGroupId: group.id,
      needSync: true
    }))
    get().syncToServer()
  },

  updateGroup: (group) => {
    set(state => ({
      groups: state.groups.map(g => g.id === group.id ? group : g),
      needSync: true
    }))
    get().syncToServer()
  },

  deleteGroup: (groupId) => {
    set(state => {
      const newGroups = state.groups.filter(g => g.id !== groupId)
      const newActiveId = state.activeGroupId === groupId && newGroups.length > 0
        ? newGroups[0].id
        : state.activeGroupId
      return {
        groups: newGroups,
        activeGroupId: newActiveId,
        needSync: true
      }
    })
    get().syncToServer()
  },

  // 网站操作
  addSite: (site) => {
    const { activeGroupId } = get()
    set(state => ({
      groups: state.groups.map(g =>
        g.id === activeGroupId
          ? { ...g, sites: [...g.sites, site] }
          : g
      ),
      needSync: true
    }))
    get().syncToServer()
  },

  updateSite: (site) => {
    set(state => ({
      groups: state.groups.map(g => ({
        ...g,
        sites: g.sites.map(s => s.id === site.id ? site : s)
      })),
      needSync: true
    }))
    get().syncToServer()
  },

  deleteSite: (siteId) => {
    set(state => ({
      groups: state.groups.map(g => ({
        ...g,
        sites: g.sites.filter(s => s.id !== siteId)
      })),
      needSync: true
    }))
    get().syncToServer()
  },

  // 重排序当前分组的网站
  reorderSites: (sites) => {
    const { activeGroupId } = get()
    set(state => ({
      groups: state.groups.map(g =>
        g.id === activeGroupId
          ? { ...g, sites }
          : g
      ),
      needSync: true
    }))
    get().syncToServer()
  },

  // 设置操作
  setSettings: (settings) => {
    const oldSettings = get().settings
    set({ settings })
    setStorage(STORAGE_KEYS.SETTINGS, settings)
    // 如果已登录，根据变更的 key 同步到服务器
    const { user, groups } = get()
    if (user?.secret) {
      // 找出变更的 key
      const changedKeys = (Object.keys(settings) as (keyof Settings)[]).filter(
        key => settings[key] !== oldSettings[key]
      )
      syncSettingsChange(user.secret, settings, changedKeys, groups)
    }
  },

  updateSettings: (partial) => {
    set(state => {
      const newSettings = { ...state.settings, ...partial }
      setStorage(STORAGE_KEYS.SETTINGS, newSettings)
      // 如果已登录，根据变更的 key 同步到服务器
      const { user, groups } = get()
      if (user?.secret) {
        const changedKeys = Object.keys(partial) as (keyof Settings)[]
        syncSettingsChange(user.secret, newSettings, changedKeys, groups)
      }
      return { settings: newSettings }
    })
  },

  // 用户操作
  setUser: (user) => {
    set({ user })
    if (user) {
      setStorage(STORAGE_KEYS.USER, user)
    } else {
      removeStorage(STORAGE_KEYS.USER)
    }
  },

  login: async (userInfo) => {
    const newUser: User = {
      email: userInfo.email,
      name: userInfo.name || 'Guest',
      avatar: userInfo.avatar,
      secret: userInfo.secret,
      isLoggedIn: true
    }
    set({ user: newUser })
    await setStorage(STORAGE_KEYS.USER, newUser)

    // 登录后从服务器恢复数据
    try {
      const serverData = await getUserAllData(userInfo.secret)
      if (serverData?.icons) {
        const parsed = parseMonkNowIcons(serverData.icons)
        if (parsed?.groups && parsed.groups.length > 0) {
          set({
            groups: parsed.groups,
            activeGroupId: parsed.groups[0].id
          })
          await setStorage(STORAGE_KEYS.GROUPS, parsed.groups)
          console.log('从服务器恢复书签成功')
        }
      }
    } catch (err) {
      console.warn('数据同步失败:', err)
    }
  },

  logout: () => {
    // 退出登录后重置为默认数据
    set({
      user: null,
      groups: DEFAULT_NAV_GROUPS,
      activeGroupId: 'home',
      needSync: false
    })
    // 清除本地存储的用户和分组数据
    removeStorage(STORAGE_KEYS.USER)
    removeStorage(STORAGE_KEYS.GROUPS)
  },

  // 数据操作
  loadData: async () => {
    // 1. 从本地读取数据
    const [savedGroups, savedSettings, savedUser, savedLastGroupId] = await Promise.all([
      getStorage<NavGroup[]>(STORAGE_KEYS.GROUPS),
      getStorage<Settings>(STORAGE_KEYS.SETTINGS),
      getStorage<User>(STORAGE_KEYS.USER),
      getStorage<string>(STORAGE_KEYS.LAST_GROUP_ID)
    ])

    // 合并设置（确保新增的设置项有默认值）
    const mergedSettings = { ...DEFAULT_SETTINGS, ...savedSettings }

    // 确定初始分组 ID
    const groups = savedGroups && savedGroups.length > 0 ? savedGroups : DEFAULT_NAV_GROUPS
    let initialGroupId = groups[0]?.id || 'home'

    // 如果开启了记住最后访问的分组，且有保存的分组 ID，则使用它
    if (mergedSettings.rememberLastGroup && savedLastGroupId) {
      // 验证保存的分组 ID 是否存在
      const groupExists = groups.some(g => g.id === savedLastGroupId)
      if (groupExists) {
        initialGroupId = savedLastGroupId
      }
    }

    // 设置本地数据
    set({
      settings: mergedSettings,
      user: savedUser || null,
      groups: groups,
      activeGroupId: initialGroupId,
      isLoaded: true
    })

    // 2. 如果已登录，后台从服务器同步
    if (savedUser?.secret) {
      try {
        const serverData = await getUserAllData(savedUser.secret)

        // 合并服务器设置，避免竞态条件
        let mergedServerSettings = { ...get().settings }
        let hasSettingsUpdate = false

        // 同步 common 设置（主题等）
        if (serverData?.common) {
          const parsedSettings = parseMonknowCommon(serverData.common)
          if (parsedSettings) {
            mergedServerSettings = { ...mergedServerSettings, ...parsedSettings }
            hasSettingsUpdate = true
            console.log('解析 common 设置成功')
          }
        }

        // 同步 sidebar 设置（侧边栏位置等）
        if (serverData?.sidebar) {
          const parsedSidebar = parseMonknowSidebar(serverData.sidebar)
          if (parsedSidebar) {
            mergedServerSettings = { ...mergedServerSettings, ...parsedSidebar }
            hasSettingsUpdate = true
            console.log('解析 sidebar 设置成功')
          }
        }

        // 一次性更新设置，避免多次 set 导致的竞态条件
        if (hasSettingsUpdate) {
          set({ settings: mergedServerSettings })
          await setStorage(STORAGE_KEYS.SETTINGS, mergedServerSettings)
          console.log('从服务器同步设置成功')
        }

        // 同步 icons 数据
        if (serverData?.icons) {
          const parsed = parseMonkNowIcons(serverData.icons)
          if (parsed?.groups && parsed.groups.length > 0) {
            // 同步分组数据，但保留当前选中的分组（如果存在）
            const currentActiveId = get().activeGroupId
            const groupStillExists = parsed.groups.some(g => g.id === currentActiveId)

            set({
              groups: parsed.groups,
              // 如果当前分组在新数据中仍然存在，保持不变；否则切换到第一个分组
              activeGroupId: groupStillExists ? currentActiveId : parsed.groups[0].id
            })
            await setStorage(STORAGE_KEYS.GROUPS, parsed.groups)
            console.log('从服务器同步书签成功')
          }
        }
      } catch (err) {
        console.warn('从服务器同步数据失败:', err)
      }
    }
  },

  syncToServer: async () => {
    const { user, groups, needSync } = get()
    if (!needSync || !user?.secret) return

    // 保存到本地
    await setStorage(STORAGE_KEYS.GROUPS, groups)

    // 同步到服务器
    try {
      await syncIconsToServer(user.secret, groups)
      set({ needSync: false })
    } catch (err) {
      console.warn('同步到服务器失败:', err)
    }
  }
}))
