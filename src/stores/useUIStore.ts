/**
 * UI 状态管理 Store
 * 管理弹窗、面板等 UI 状态
 */

import { create } from 'zustand'
import type { Site, NavGroup } from '../types'

interface UIState {
  // 面板状态
  settingsOpen: boolean

  // 弹窗状态
  siteModalOpen: boolean
  groupModalOpen: boolean
  loginModalOpen: boolean

  // 编辑状态
  editingSite: Site | null
  editingGroup: NavGroup | null
  groupModalPosition: { x: number; y: number } | null

  // 时间天气显示状态
  showTimeWeather: boolean

  // 全局右键菜单状态
  globalContextMenuOpen: boolean
  globalContextMenuPosition: { x: number; y: number } | null

  // Actions - 设置面板
  openSettings: () => void
  closeSettings: () => void

  // Actions - 网站弹窗
  openAddSiteModal: () => void
  openEditSiteModal: (site: Site) => void
  closeSiteModal: () => void

  // Actions - 分组弹窗
  openAddGroupModal: (position: { x: number; y: number }) => void
  openEditGroupModal: (group: NavGroup) => void
  closeGroupModal: () => void

  // Actions - 登录弹窗
  openLoginModal: () => void
  closeLoginModal: () => void

  // Actions - 时间天气
  setShowTimeWeather: (show: boolean) => void

  // Actions - 全局右键菜单
  openGlobalContextMenu: (position: { x: number; y: number }) => void
  closeGlobalContextMenu: () => void
}

export const useUIStore = create<UIState>((set) => ({
  // 初始状态
  settingsOpen: false,
  siteModalOpen: false,
  groupModalOpen: false,
  loginModalOpen: false,
  editingSite: null,
  editingGroup: null,
  groupModalPosition: null,
  showTimeWeather: false,
  globalContextMenuOpen: false,
  globalContextMenuPosition: null,

  // 设置面板
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  // 网站弹窗
  openAddSiteModal: () => set({
    editingSite: null,
    siteModalOpen: true
  }),

  openEditSiteModal: (site) => set({
    editingSite: site,
    siteModalOpen: true
  }),

  closeSiteModal: () => set({
    siteModalOpen: false,
    editingSite: null
  }),

  // 分组弹窗
  openAddGroupModal: (position) => set({
    editingGroup: null,
    groupModalPosition: position,
    groupModalOpen: true
  }),

  openEditGroupModal: (group) => set({
    editingGroup: group,
    groupModalPosition: null, // 编辑时居中显示
    groupModalOpen: true
  }),

  closeGroupModal: () => set({
    groupModalOpen: false,
    editingGroup: null,
    groupModalPosition: null
  }),

  // 登录弹窗
  openLoginModal: () => set({ loginModalOpen: true }),
  closeLoginModal: () => set({ loginModalOpen: false }),

  // 时间天气
  setShowTimeWeather: (show) => set({ showTimeWeather: show }),

  // 全局右键菜单
  openGlobalContextMenu: (position) => set({
    globalContextMenuOpen: true,
    globalContextMenuPosition: position
  }),

  closeGlobalContextMenu: () => set({
    globalContextMenuOpen: false,
    globalContextMenuPosition: null
  })
}))
