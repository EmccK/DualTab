/**
 * 应用状态管理 Store
 * 管理核心业务数据：分组、设置、用户
 */

import { create } from 'zustand'
import type { NavGroup, Site, Settings, User } from '../types'
import { DEFAULT_NAV_GROUPS, DEFAULT_SETTINGS } from '../constants'
import { getStorage, setStorage, removeStorage, STORAGE_KEYS } from '../services/storage'
import { getUserAllData, parseMonkNowIcons, syncIconsToServer } from '../services/api'
import type { UserInfo } from '../services/api'

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

  // 设置操作
  setSettings: (settings) => {
    set({ settings })
    setStorage(STORAGE_KEYS.SETTINGS, settings)
  },

  updateSettings: (partial) => {
    set(state => {
      const newSettings = { ...state.settings, ...partial }
      setStorage(STORAGE_KEYS.SETTINGS, newSettings)
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
