/**
 * API 服务
 * 处理数据获取、用户认证和数据同步
 */

import type { LocationInfo, Settings, StandbySettings, ThemeType } from '../types'
import { API_PATHS, buildApiUrl } from '../config/api'

// 通用请求头（不含 secret）
const getBaseHeaders = () => ({
  'Content-Type': 'application/json;charset=utf-8'
})

// 带 secret 的请求头
const getHeaders = (secret?: string) => ({
  ...getBaseHeaders(),
  ...(secret ? { 'secret': secret } : {})
})

// 用户信息类型
export interface UserInfo {
  email: string
  name: string
  avatar: string
  secret: string  // 用户 token，用于数据同步
  isBackup: number
  lastVisitAt: number
  isActivate: number
  createdAt: number
  updatedAt: number
}

// 登录响应
interface LoginResponse {
  data: UserInfo
  msg: string
}

// 注册响应
interface RegisterResponse {
  data: object
  msg: string
}

/**
 * 用户登录
 */
export async function login(email: string, password: string): Promise<UserInfo> {
  const res = await fetch(buildApiUrl(API_PATHS.USER_LOGIN), {
    method: 'POST',
    headers: getBaseHeaders(),
    body: JSON.stringify({ email, password })
  })

  const data: LoginResponse = await res.json()
  if (data.msg !== 'success') {
    throw new Error(data.msg || '登录失败')
  }
  return data.data
}

/**
 * 用户注册
 */
export async function register(
  email: string,
  password: string,
  captcha: string,
  key: string
): Promise<void> {
  const res = await fetch(buildApiUrl(API_PATHS.USER_REGISTER), {
    method: 'POST',
    headers: getBaseHeaders(),
    body: JSON.stringify({ email, password, captcha, key })
  })

  const data: RegisterResponse = await res.json()
  if (data.msg !== 'success') {
    throw new Error(data.msg || '注册失败')
  }
}


/**
 * 获取验证码
 * 返回验证码图片 URL 和 key
 */
export async function getCaptcha(): Promise<{ url: string; key: string }> {
  // 生成随机 key
  const key = btoa(Math.random().toString(36).substring(2, 15) + Date.now())
  const url = buildApiUrl(API_PATHS.CAPTCHA, { len: 4, width: 170, height: 62, key })
  return { url, key }
}

// 推荐书签分类 ID 映射（兼容旧版本，新版本应使用 getCategories 动态获取）
export const ICON_CATEGORIES = {
  hot: 24,        // 热门
  shopping: 9,    // 购物
  social: 10,     // 社交
  entertainment: 26, // 娱乐
  news: 11,       // 新闻与阅读
  efficiency: 14, // 效率
  builtin: 25,    // 内置App
  image: 15,      // 图片
  lifestyle: 16,  // 生活方式
  travel: 17,     // 旅行
  tech: 18,       // 科技与教育
  finance: 19     // 金融
} as const

// 分类信息类型
export interface CategoryInfo {
  id: number
  name: string
  name_en: string
  sort_order: number
}

// 搜索引擎信息类型
export interface SearchEngineInfo {
  id: string      // UUID
  name: string
  url: string
  icon: string
}

// 搜索引擎缓存（5分钟过期）
let searchEnginesCache: SearchEngineInfo[] | null = null
let searchEnginesCacheTime: number = 0
let searchEnginesPromise: Promise<SearchEngineInfo[]> | null = null
const SEARCH_ENGINES_CACHE_TTL = 5 * 60 * 1000  // 5分钟

/**
 * 获取搜索引擎列表
 * 从后端动态获取所有启用的搜索引擎（带5分钟缓存）
 */
export async function getSearchEngines(): Promise<SearchEngineInfo[]> {
  // 检查缓存是否存在且未过期
  const now = Date.now()
  if (searchEnginesCache && (now - searchEnginesCacheTime < SEARCH_ENGINES_CACHE_TTL)) {
    return searchEnginesCache
  }
  // 如果正在请求中，返回同一个 Promise（避免重复请求）
  if (searchEnginesPromise) {
    return searchEnginesPromise
  }
  // 发起请求
  searchEnginesPromise = (async (): Promise<SearchEngineInfo[]> => {
    try {
      const res = await fetch(buildApiUrl(API_PATHS.SEARCH_ENGINES))
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data.msg === 'success' && data.data?.list) {
        searchEnginesCache = data.data.list
        searchEnginesCacheTime = Date.now()  // 记录缓存时间
        return searchEnginesCache!
      }
      // 后端返回失败，返回空数组
      console.warn('获取搜索引擎列表失败:', data.msg || '未知错误')
      return []
    } catch (err) {
      console.warn('获取搜索引擎列表失败:', err)
      // 网络错误时返回空数组
      return []
    } finally {
      // 无论成功或失败，都清理 Promise 引用
      searchEnginesPromise = null
    }
  })()
  return searchEnginesPromise
}

/**
 * 获取分类列表
 * 从后端动态获取所有启用的分类
 */
export async function getCategories(): Promise<CategoryInfo[]> {
  try {
    const res = await fetch(buildApiUrl(API_PATHS.CATEGORIES))
    const data = await res.json()
    if (data.msg === 'success' && data.data?.list) {
      return data.data.list
    }
    return []
  } catch (err) {
    console.warn('获取分类列表失败:', err)
    return []
  }
}

// 推荐书签项类型
export interface IconListItem {
  udId: number
  title: string
  description: string
  url: string
  imgUrl: string
  bgColor: string
  mimeType: string
}

/**
 * 获取推荐书签列表
 * 使用自己的后端 API
 * @param cateId 分类 ID
 * @param keyword 搜索关键词
 * @param size 返回数量
 */
export async function getIconList(
  cateId: number,
  keyword: string = '',
  size: number = 20
): Promise<IconListItem[]> {
  try {
    const url = buildApiUrl(API_PATHS.ICON_LIST, {
      cate_id: cateId,
      keyword,
      size
    })

    const res = await fetch(url)
    const result = await res.json()

    // 后端返回格式: { msg: "success", data: { list: [...] } }
    if (result.msg !== 'success') {
      console.warn('获取推荐书签失败:', result.msg)
      return []
    }
    return result.data?.list || []
  } catch (err) {
    console.warn('获取推荐书签失败:', err)
    return []
  }
}

/**
 * 获取用户数据（单个类型）
 * @param secret 用户 token
 * @param type 数据类型: icons | common | background | searcher | sidebar | todos | standby
 */
export async function getUserDataByType(
  secret: string,
  type: 'icons' | 'common' | 'background' | 'searcher' | 'sidebar' | 'todos' | 'standby'
): Promise<string | null> {
  try {
    const res = await fetch(buildApiUrl(API_PATHS.USER_DATA_INFO, { type }), {
      method: 'GET',
      headers: getHeaders(secret)
    })

    const result = await res.json()
    if (result.msg !== 'success' || !result.data?.data) {
      console.warn(`获取 ${type} 数据失败:`, result.msg)
      return null
    }
    return result.data.data
  } catch (err) {
    console.warn(`获取 ${type} 数据失败:`, err)
    return null
  }
}

/**
 * 获取用户所有数据
 * 登录后调用此方法从服务器恢复数据
 */
export async function getUserAllData(secret: string): Promise<{
  icons?: string
  common?: string
  background?: string
  searcher?: string
  sidebar?: string
} | null> {
  try {
    // 并行获取所有数据类型
    const [icons, common, background, searcher, sidebar] = await Promise.all([
      getUserDataByType(secret, 'icons'),
      getUserDataByType(secret, 'common'),
      getUserDataByType(secret, 'background'),
      getUserDataByType(secret, 'searcher'),
      getUserDataByType(secret, 'sidebar')
    ])

    return { icons: icons || undefined, common: common || undefined, background: background || undefined, searcher: searcher || undefined, sidebar: sidebar || undefined }
  } catch (err) {
    console.warn('获取用户数据失败:', err)
    return null
  }
}

// MonkNow 图标数据结构
export interface MonkNowIcon {
  uuid: string
  label: string
  desc: string
  url: string
  type: 'image' | 'text'
  icoSrc?: {
    data: string
    isOfficial: boolean
    mimeType?: string
    uploaded?: boolean
  }
  icoText?: string  // 文字图标内容
  backgroundColor: {
    data: string
    type: 'pure'
  }
  icoScalePercentage?: number
  id?: number
}

// MonkNow 分组数据结构
export interface MonkNowGroup {
  uuid: string
  label: string
  icoSrc: string
  data: string[]  // 图标 uuid 列表
}

// MonkNow icons 数据结构
export interface MonkNowIconsData {
  version: number
  updaterVersion?: number
  setting: {
    openTarget: string
    rowGapPercentage: number
    columnGapPercentage: number
    iconLayout: string
    borderRadiusPercentage: number
    opacityPercentage: number
    sizePercentage: number
    displayShadow: boolean
    displayNotificationBadge: boolean
    displayAddBtn: boolean
    rememberLastVisitedGroup: boolean
    scrollToSwitchGroup: boolean
  }
  data: {
    groups: string[]  // 分组 uuid 列表
    groupDict: Record<string, MonkNowGroup>
    iconDict: Record<string, MonkNowIcon>
  }
}

/**
 * 更新用户数据到服务器
 * @param secret 用户 token
 * @param type 数据类型
 * @param data 数据内容（JSON 字符串）
 */
export async function updateUserData(
  secret: string,
  type: 'icons' | 'common' | 'background' | 'searcher' | 'sidebar' | 'todos' | 'standby',
  data: string
): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl(API_PATHS.USER_DATA_UPDATE), {
      method: 'PUT',
      headers: getHeaders(secret),
      body: JSON.stringify({ type, data })
    })

    const result = await res.json()
    if (result.msg !== 'success') {
      console.warn(`更新 ${type} 数据失败:`, result.msg)
      return false
    }
    console.log(`同步 ${type} 数据到服务器成功`)
    return true
  } catch (err) {
    console.warn(`更新 ${type} 数据失败:`, err)
    return false
  }
}

/**
 * 将本地分组数据转换为 MonkNow 格式并同步到服务器
 */
export async function syncIconsToServer(
  secret: string,
  groups: import('../types').NavGroup[],
  settings?: import('../types').Settings
): Promise<boolean> {
  // 构建 MonkNow 格式的数据
  const groupUuids: string[] = []
  const groupDict: Record<string, MonkNowGroup> = {}
  const iconDict: Record<string, MonkNowIcon> = {}

  groups.forEach(group => {
    groupUuids.push(group.id)

    const iconUuids: string[] = []
    group.sites.forEach(site => {
      iconUuids.push(site.id)

      // 根据图标类型构建数据
      const iconData: MonkNowIcon = {
        uuid: site.id,
        label: site.name,
        desc: site.desc,
        url: site.url,
        type: site.type,
        backgroundColor: site.backgroundColor,
        icoScalePercentage: site.icoScalePercentage || 100
      }

      if (site.type === 'text') {
        // 文字图标
        iconData.icoText = site.icoText || site.name.slice(0, 2)
      } else {
        // 图片图标
        iconData.icoSrc = site.icoSrc
      }

      iconDict[site.id] = iconData
    })

    groupDict[group.id] = {
      uuid: group.id,
      label: group.name,
      icoSrc: group.icon,
      data: iconUuids
    }
  })

  // 使用实际设置值，如果没有传入则使用默认值
  const iconsData: MonkNowIconsData = {
    version: 6,
    updaterVersion: 2024042109,
    setting: {
      openTarget: settings?.openTarget || 'currentTab',
      rowGapPercentage: settings?.iconRowGap ?? 26,
      columnGapPercentage: settings?.iconColumnGap ?? 34,
      iconLayout: settings?.iconLayout || 'particular',
      borderRadiusPercentage: settings?.iconBorderRadius ?? 20,
      opacityPercentage: settings?.iconOpacity ?? 100,
      sizePercentage: settings?.iconSizePercentage ?? 80,
      displayShadow: settings?.iconShadow ?? true,
      displayNotificationBadge: true,
      displayAddBtn: settings?.showAddButton ?? true,
      rememberLastVisitedGroup: settings?.rememberLastGroup ?? false,
      scrollToSwitchGroup: settings?.scrollToSwitchGroup ?? true
    },
    data: {
      groups: groupUuids,
      groupDict,
      iconDict
    }
  }

  return updateUserData(secret, 'icons', JSON.stringify(iconsData))
}

/**
 * 解析 MonkNow icons 数据为本地格式
 */
export function parseMonkNowIcons(iconsJson: string): { groups: import('../types').NavGroup[] } | null {
  try {
    const iconsData: MonkNowIconsData = JSON.parse(iconsJson)

    const groups = iconsData.data.groups.map(groupUuid => {
      const group = iconsData.data.groupDict[groupUuid]
      if (!group) return null

      const sites = group.data
        .map(iconUuid => {
          const icon = iconsData.data.iconDict[iconUuid]
          if (!icon) return null

          // 构建 Site 对象
          const site: import('../types').Site = {
            id: icon.uuid,
            name: icon.label,
            desc: icon.desc || icon.label,
            url: icon.url,
            type: icon.type || 'image',
            backgroundColor: icon.backgroundColor || { type: 'pure', data: '#ffffff' },
            icoScalePercentage: icon.icoScalePercentage || 100
          }

          if (icon.type === 'text') {
            site.icoText = icon.icoText || icon.label.slice(0, 2)
          } else {
            site.icoSrc = icon.icoSrc || {
              data: '',
              isOfficial: false
            }
          }

          return site
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)

      return {
        id: group.uuid,
        name: group.label,
        icon: group.icoSrc,
        sites,
        isCustom: false
      }
    }).filter((g): g is NonNullable<typeof g> => g !== null)

    return { groups }
  } catch (e) {
    console.error('解析 MonkNow 数据失败:', e)
    return null
  }
}

/**
 * 搜索位置
 * 使用自己的后端 API
 * @param keyword 搜索关键词
 */
export async function searchLocations(keyword: string): Promise<LocationInfo[]> {
  try {
    const url = buildApiUrl(API_PATHS.WEATHER_LOCATIONS, { keyword })
    const res = await fetch(url)
    const result = await res.json()

    // 后端返回格式: { msg: "success", data: { list: [...] } }
    if (result.msg !== 'success' || !result.data?.list) {
      return []
    }

    // 转换后端返回格式为前端格式
    return result.data.list.map((loc: {
      id: string
      name: string
      country: string
      adm1: string
      adm2: string
      lat: string
      lon: string
    }) => ({
      woeid: parseInt(loc.id) || 0,  // 使用 id 作为 woeid
      latitude: parseFloat(loc.lat),
      longitude: parseFloat(loc.lon),
      fullname: [loc.name, loc.adm2, loc.adm1, loc.country].filter(Boolean).join(', '),
      shortname: loc.name
    }))
  } catch (err) {
    console.error('搜索位置失败:', err)
    return []
  }
}

// 天气信息类型
export interface WeatherData {
  currentTemperatureFahrenheit: number
  lowTemperatureFahrenheit: number
  highTemperatureFahrenheit: number
  yahooConditionCode: number
}

/**
 * 获取天气信息
 * 使用自己的后端 API
 * @param location 位置信息
 */
export async function getWeather(location: LocationInfo): Promise<WeatherData | null> {
  try {
    // 后端使用 location 参数（城市 ID 或经纬度）
    const locationParam = location.woeid ? String(location.woeid) : `${location.longitude},${location.latitude}`
    const url = buildApiUrl(API_PATHS.WEATHER, { location: locationParam })

    const res = await fetch(url)
    const result = await res.json()

    // 后端返回格式: { msg: "success", data: { temperature, tempMax, tempMin, feelsLike, text, icon, ... } }
    if (result.msg !== 'success' || !result.data) {
      return null
    }

    const weather = result.data
    // 后端返回摄氏度，转换为华氏度（前端统一使用华氏度存储）
    const tempC = parseFloat(weather.temperature) || 0
    const tempF = Math.round(tempC * 9 / 5 + 32)

    // 解析最高最低温度（后端已返回真实数据）
    const tempMaxC = parseFloat(weather.tempMax)
    const tempMinC = parseFloat(weather.tempMin)
    const tempMaxF = isNaN(tempMaxC) ? tempF + 5 : Math.round(tempMaxC * 9 / 5 + 32)  // 如果后端未返回则估算
    const tempMinF = isNaN(tempMinC) ? tempF - 5 : Math.round(tempMinC * 9 / 5 + 32)  // 如果后端未返回则估算

    return {
      currentTemperatureFahrenheit: tempF,
      lowTemperatureFahrenheit: tempMinF,
      highTemperatureFahrenheit: tempMaxF,
      yahooConditionCode: mapWeatherIconToCode(weather.icon || weather.text)
    }
  } catch (err) {
    console.error('获取天气失败:', err)
    return null
  }
}

/**
 * 将天气图标/描述映射为 Yahoo 天气代码
 * 用于前端显示对应的天气图标
 */
function mapWeatherIconToCode(iconOrText: string): number {
  const text = String(iconOrText).toLowerCase()

  // 和风天气图标代码映射（修复正则匹配范围）
  if (/^\d{3}$/.test(text)) {
    const code = parseInt(text)
    if (code >= 100 && code <= 103) return 32  // 晴
    if (code >= 104 && code <= 199) return 26  // 多云
    if (code >= 300 && code <= 399) return 11  // 雨
    if (code >= 400 && code <= 499) return 16  // 雪
    if (code >= 500 && code <= 599) return 20  // 雾
  }

  // 文字描述映射
  if (text.includes('晴') || text.includes('sunny') || text.includes('clear')) return 32
  if (text.includes('多云') || text.includes('cloudy')) return 26
  if (text.includes('阴') || text.includes('overcast')) return 28
  if (text.includes('雨') || text.includes('rain')) return 11
  if (text.includes('雪') || text.includes('snow')) return 16
  if (text.includes('雾') || text.includes('fog') || text.includes('haze')) return 20
  if (text.includes('雷') || text.includes('thunder')) return 4

  return 32  // 默认晴天
}

/**
 * 华氏度转摄氏度
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round((fahrenheit - 32) * 5 / 9)
}

/**
 * 更新用户昵称
 * @param secret 用户 token
 * @param name 新昵称
 */
export async function updateNickname(secret: string, name: string): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl(API_PATHS.USER_CHANGE_NAME), {
      method: 'PUT',
      headers: getHeaders(secret),
      body: JSON.stringify({ name })
    })

    const result = await res.json()
    if (result.msg !== 'success') {
      console.error('更新昵称失败:', result.msg)
      return false
    }
    return true
  } catch (err) {
    console.error('更新昵称失败:', err)
    return false
  }
}

/**
 * 更新用户头像
 * @param secret 用户 token
 * @param avatarUrl 头像 URL
 */
export async function updatePortrait(secret: string, avatarUrl: string): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl(API_PATHS.USER_CHANGE_AVATAR), {
      method: 'PUT',
      headers: getHeaders(secret),
      body: JSON.stringify({ avatar: avatarUrl })
    })

    const result = await res.json()
    if (result.msg !== 'success') {
      console.error('更新头像失败:', result.msg)
      return false
    }
    return true
  } catch (err) {
    console.error('更新头像失败:', err)
    return false
  }
}

/**
 * 修改密码
 * @param secret 用户 token
 * @param oldPassword 旧密码
 * @param newPassword 新密码
 */
export async function changePassword(
  secret: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(buildApiUrl(API_PATHS.USER_CHANGE_PWD), {
      method: 'PUT',
      headers: getHeaders(secret),
      body: JSON.stringify({
        old: oldPassword,
        new: newPassword
      })
    })

    const result = await res.json()
    if (result.msg !== 'success') {
      return { success: false, message: result.msg || '修改密码失败' }
    }
    return { success: true, message: '密码修改成功' }
  } catch (err) {
    console.error('修改密码失败:', err)
    return { success: false, message: '网络错误，请稍后重试' }
  }
}

/**
 * 上传图片到后端
 * @param secret 用户 token（保留参数兼容性）
 * @param file 图片文件
 * @param type 上传类型: avatar | icon | wallpaper
 */
export async function uploadImage(
  _secret: string,
  file: File,
  type: 'avatar' | 'icon' | 'wallpaper' = 'avatar'
): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const res = await fetch(buildApiUrl(API_PATHS.UPLOAD_IMAGE), {
      method: 'POST',
      body: formData
    })

    const result = await res.json()
    if (result.msg !== 'success' || !result.data?.url) {
      console.error('上传图片失败:', result.msg)
      return null
    }

    return result.data.url
  } catch (err) {
    console.error('上传图片失败:', err)
    return null
  }
}

// 根据 URL 获取图标信息的响应类型
export interface IconByUrlResponse {
  udId: number
  title: string
  description: string
  lang: string
  url: string
  imgUrl: string
  bgColor: string
  mimeType: string
  sort: number
  createdAt: number
  updatedAt: number
}

/**
 * 根据 URL 获取网站图标信息
 * 使用自己的后端 API
 * @param url 网站 URL
 */
export async function getIconByUrl(url: string): Promise<IconByUrlResponse | null> {
  try {
    const apiUrl = buildApiUrl(API_PATHS.ICON_BY_URL, { url })
    const res = await fetch(apiUrl)
    const result = await res.json()

    // 后端返回格式: { msg: "success", data: { udId, title, ... } }
    if (result.msg !== 'success' || !result.data) {
      return null
    }
    return result.data
  } catch (err) {
    console.error('获取图标失败:', err)
    return null
  }
}

// MonkNow common 数据结构（设置）
const MONKNOW_COMMON_VERSION = 1  // Monknow common 数据版本号

export interface MonkNowCommonData {
  version: number
  setting: {
    themeType: 'bright' | 'dark' | 'auto'  // Monknow 使用 bright 而不是 light
    widthPercentage: number
    location: {
      fullname: string
      latitude: string
      longtitude: string  // Monknow 拼写错误，保持一致
      shortname: string
      woeid: string
    } | null
    enable24HourSystem: boolean
    enableImperialUnits: boolean
  }
}

/**
 * 将本地主题类型转换为 Monknow 格式
 */
function toMonknowThemeType(theme: ThemeType): 'bright' | 'dark' | 'auto' {
  if (theme === 'light') return 'bright'
  return theme
}

/**
 * 将 Monknow 主题类型转换为本地格式
 */
export function fromMonknowThemeType(theme: 'bright' | 'dark' | 'auto'): ThemeType {
  if (theme === 'bright') return 'light'
  return theme
}

/**
 * 同步设置到服务器（common 类型）
 * @param secret 用户 token
 * @param settings 本地设置
 */
export async function syncSettingsToServer(secret: string, settings: Settings): Promise<boolean> {
  // 构建 Monknow 格式的 common 数据
  const commonData: MonkNowCommonData = {
    version: MONKNOW_COMMON_VERSION,
    setting: {
      themeType: toMonknowThemeType(settings.theme),
      widthPercentage: 100,
      location: settings.location ? {
        fullname: settings.location.fullname,
        latitude: String(settings.location.latitude),
        longtitude: String(settings.location.longitude),
        shortname: settings.location.shortname,
        woeid: String(settings.location.woeid)
      } : null,
      enable24HourSystem: settings.clockFormat === '24h',
      enableImperialUnits: settings.temperatureUnit === 'fahrenheit'
    }
  }

  return updateUserData(secret, 'common', JSON.stringify(commonData))
}

/**
 * 解析 Monknow common 数据为本地设置格式
 * @param commonJson common 数据 JSON 字符串
 */
export function parseMonknowCommon(commonJson: string): Partial<Settings> | null {
  try {
    const commonData: MonkNowCommonData = JSON.parse(commonJson)

    const settings: Partial<Settings> = {
      theme: fromMonknowThemeType(commonData.setting.themeType),
      clockFormat: commonData.setting.enable24HourSystem ? '24h' : '12h',
      temperatureUnit: commonData.setting.enableImperialUnits ? 'fahrenheit' : 'celsius'
    }

    if (commonData.setting.location) {
      settings.location = {
        fullname: commonData.setting.location.fullname,
        latitude: parseFloat(commonData.setting.location.latitude),
        longitude: parseFloat(commonData.setting.location.longtitude),
        shortname: commonData.setting.location.shortname,
        woeid: parseInt(commonData.setting.location.woeid, 10)
      }
    } else {
      settings.location = null
    }

    return settings
  } catch (e) {
    console.error('解析 Monknow common 数据失败:', e)
    return null
  }
}

// Monknow sidebar 数据格式
interface MonkNowSidebarData {
  version: number
  setting: {
    autoHide: boolean
    collapsed: boolean
    side: 'left' | 'right'
  }
}

const MONKNOW_SIDEBAR_VERSION = 2

/**
 * 同步侧边栏设置到服务器（sidebar 类型）
 * @param secret 用户 token
 * @param settings 本地设置
 */
export async function syncSidebarToServer(secret: string, settings: Settings): Promise<boolean> {
  const sidebarData: MonkNowSidebarData = {
    version: MONKNOW_SIDEBAR_VERSION,
    setting: {
      autoHide: settings.sidebarAutoHide,
      collapsed: settings.sidebarCollapsed,
      side: settings.sidebarPosition
    }
  }

  return updateUserData(secret, 'sidebar', JSON.stringify(sidebarData))
}

/**
 * 解析 Monknow sidebar 数据为本地设置格式
 * @param sidebarJson sidebar 数据 JSON 字符串
 */
export function parseMonknowSidebar(sidebarJson: string): Partial<Settings> | null {
  try {
    const sidebarData: MonkNowSidebarData = JSON.parse(sidebarJson)

    return {
      sidebarAutoHide: sidebarData.setting.autoHide,
      sidebarCollapsed: sidebarData.setting.collapsed,
      sidebarPosition: sidebarData.setting.side
    }
  } catch (e) {
    console.error('解析 Monknow sidebar 数据失败:', e)
    return null
  }
}

// Monknow searcher 数据结构
interface MonkNowSearcherData {
  version: number
  updaterVersion: number
  setting: {
    borderRadiusPercentage: number
    displayShadow: boolean
    heightPercentage: number
    opacityPercentage: number
    openTarget: string
    value: string
    widthPercentage: number
  }
  data: {
    dict: Record<string, {
      icoSrc: {
        data: string
        isOfficial: boolean
        mimeType: string
        uploaded: boolean
      }
      id: number
      title: string
      url: string
      uuid: string
    }>
    officials: string[]
  }
}

const MONKNOW_SEARCHER_VERSION = 6

// 搜索引擎 UUID 映射（本地 id -> Monknow uuid）
const SEARCHER_UUID_MAP: Record<string, string> = {
  google: 'e58b5a00-74fe-4319-af0a-d4999565dd71',
  bing: 'ceb6c985-d09c-4fdc-b0ea-b304f1ee0f2d',
  yahoo: '2a5e69d9-bf13-4188-8da2-004551a913a0',
  baidu: '0eb43a90-b4c7-43ce-9c73-ab110945f47d',
  yandex: '118f7463-4411-4856-873f-2851faa3b543',
  duckduckgo: '259d8e2b-340e-4690-8046-88a0b130cbd0'
}

// 默认搜索引擎数据（完整的 Monknow 格式）
const DEFAULT_SEARCHER_DICT: MonkNowSearcherData['data']['dict'] = {
  'e58b5a00-74fe-4319-af0a-d4999565dd71': {
    icoSrc: {
      data: 'https://static.monknow.com/newtab/searcher/e58b5a00-74fe-4319-af0a-d4999565dd71.svg',
      isOfficial: true,
      mimeType: 'image/svg+xml',
      uploaded: true
    },
    id: 1,
    title: 'Google',
    url: 'https://www.google.com/search?ie=utf-8&q=%s',
    uuid: 'e58b5a00-74fe-4319-af0a-d4999565dd71'
  },
  'ceb6c985-d09c-4fdc-b0ea-b304f1ee0f2d': {
    icoSrc: {
      data: 'https://static.monknow.com/newtab/searcher/ceb6c985-d09c-4fdc-b0ea-b304f1ee0f2d.svg',
      isOfficial: true,
      mimeType: 'image/svg+xml',
      uploaded: true
    },
    id: 2,
    title: 'Bing',
    url: 'https://www.bing.com/search?form=bing&q=%s',
    uuid: 'ceb6c985-d09c-4fdc-b0ea-b304f1ee0f2d'
  },
  '2a5e69d9-bf13-4188-8da2-004551a913a0': {
    icoSrc: {
      data: 'https://static.monknow.com/newtab/searcher/2a5e69d9-bf13-4188-8da2-004551a913a0.svg',
      isOfficial: true,
      mimeType: 'image/svg+xml',
      uploaded: true
    },
    id: 3,
    title: 'Yahoo',
    url: 'https://search.yahoo.com/search?ei=UTF-8&p=%s',
    uuid: '2a5e69d9-bf13-4188-8da2-004551a913a0'
  },
  '0eb43a90-b4c7-43ce-9c73-ab110945f47d': {
    icoSrc: {
      data: 'https://static.monknow.com/newtab/searcher/0eb43a90-b4c7-43ce-9c73-ab110945f47d.svg',
      isOfficial: true,
      mimeType: 'image/svg+xml',
      uploaded: true
    },
    id: 4,
    title: 'Baidu',
    url: 'https://www.baidu.com/s?tn=68018901_23_oem_dg&ch=3&ie=utf-8&wd=%s',
    uuid: '0eb43a90-b4c7-43ce-9c73-ab110945f47d'
  },
  '118f7463-4411-4856-873f-2851faa3b543': {
    icoSrc: {
      data: 'https://static.monknow.com/newtab/searcher/118f7463-4411-4856-873f-2851faa3b543.svg',
      isOfficial: true,
      mimeType: 'image/svg+xml',
      uploaded: true
    },
    id: 5,
    title: 'Yandex',
    url: 'https://yandex.ru/search/?text=%s',
    uuid: '118f7463-4411-4856-873f-2851faa3b543'
  },
  '259d8e2b-340e-4690-8046-88a0b130cbd0': {
    icoSrc: {
      data: 'https://static.monknow.com/newtab/searcher/259d8e2b-340e-4690-8046-88a0b130cbd0.svg',
      isOfficial: true,
      mimeType: 'image/svg+xml',
      uploaded: true
    },
    id: 6,
    title: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=%s',
    uuid: '259d8e2b-340e-4690-8046-88a0b130cbd0'
  }
}

const DEFAULT_SEARCHER_OFFICIALS = [
  'e58b5a00-74fe-4319-af0a-d4999565dd71',
  'ceb6c985-d09c-4fdc-b0ea-b304f1ee0f2d',
  '2a5e69d9-bf13-4188-8da2-004551a913a0',
  '0eb43a90-b4c7-43ce-9c73-ab110945f47d',
  '118f7463-4411-4856-873f-2851faa3b543',
  '259d8e2b-340e-4690-8046-88a0b130cbd0'
]

/**
 * 同步搜索设置到服务器
 * 使用本地搜索引擎数据直接同步
 */
export async function syncSearcherToServer(secret: string, settings: Settings): Promise<boolean> {
  // 将本地搜索引擎 id 转换为 Monknow uuid
  const searcherUuid = SEARCHER_UUID_MAP[settings.searchEngine] || SEARCHER_UUID_MAP.google

  const searcherData: MonkNowSearcherData = {
    version: MONKNOW_SEARCHER_VERSION,
    updaterVersion: Date.now(),
    setting: {
      borderRadiusPercentage: 20,
      displayShadow: true,
      heightPercentage: 100,
      opacityPercentage: 90,
      openTarget: settings.searchOpenTarget || 'currentTab',
      value: searcherUuid,
      widthPercentage: 59
    },
    data: {
      dict: DEFAULT_SEARCHER_DICT,
      officials: DEFAULT_SEARCHER_OFFICIALS
    }
  }

  return updateUserData(secret, 'searcher', JSON.stringify(searcherData))
}

// Monknow background 数据结构
interface MonkNowBackgroundData {
  version: number
  setting: {
    value: 'lib' | 'local' | 'color'  // 壁纸来源
    blurred: boolean                   // 是否模糊
    slideIntervalSeconds: number       // 更换频率（秒）
    libCategories: number[]            // 官方库类别
  }
  data: {
    wallpaperDict: {
      color: {
        id: null
        uuid: 'color'
        type: 'color'
        data: {
          type: 'pure'
          data: string  // 颜色值
        }
      }
      local: {
        id: null
        uuid: 'local'
        type: 'image'
        data: {
          isOfficial: boolean
          uploaded: boolean
          mimeType: string
          data: string  // 图片URL
        }
        blurredData?: {
          isOfficial: boolean
          uploaded: boolean
          mimeType: string
          data: string
        }
        overviewData?: {
          isOfficial: boolean
          uploaded: boolean
          mimeType: string
          data: string
        }
      }
    }
  }
}

const MONKNOW_BACKGROUND_VERSION = 1

/**
 * 同步壁纸设置到服务器
 * @param secret 用户 token
 * @param settings 本地设置
 */
export async function syncBackgroundToServer(secret: string, settings: Settings): Promise<boolean> {
  const backgroundData: MonkNowBackgroundData = {
    version: MONKNOW_BACKGROUND_VERSION,
    setting: {
      value: settings.wallpaperSource,
      blurred: settings.wallpaperBlurred,
      slideIntervalSeconds: settings.wallpaperInterval,
      libCategories: [settings.wallpaperCategory]
    },
    data: {
      wallpaperDict: {
        color: {
          id: null,
          uuid: 'color',
          type: 'color',
          data: {
            type: 'pure',
            data: settings.wallpaperColor
          }
        },
        local: {
          id: null,
          uuid: 'local',
          type: 'image',
          data: {
            isOfficial: false,
            uploaded: !!settings.localWallpaper,
            mimeType: 'image/png',
            data: settings.localWallpaper || ''
          },
          ...(settings.localWallpaperBlurred ? {
            blurredData: {
              isOfficial: false,
              uploaded: true,
              mimeType: 'image/png',
              data: settings.localWallpaperBlurred
            }
          } : {})
        }
      }
    }
  }

  return updateUserData(secret, 'background', JSON.stringify(backgroundData))
}

/**
 * 解析 Monknow background 数据为本地设置格式
 * @param backgroundJson background 数据 JSON 字符串
 */
export function parseMonknowBackground(backgroundJson: string): Partial<Settings> | null {
  try {
    const backgroundData: MonkNowBackgroundData = JSON.parse(backgroundJson)

    const settings: Partial<Settings> = {
      wallpaperSource: backgroundData.setting.value,
      wallpaperBlurred: backgroundData.setting.blurred,
      wallpaperInterval: backgroundData.setting.slideIntervalSeconds as Settings['wallpaperInterval'],
      wallpaperCategory: (backgroundData.setting.libCategories[0] || 8) as Settings['wallpaperCategory'],
      wallpaperColor: backgroundData.data.wallpaperDict.color.data.data,
      localWallpaper: backgroundData.data.wallpaperDict.local.data.data || null,
      localWallpaperBlurred: backgroundData.data.wallpaperDict.local.blurredData?.data || null
    }

    return settings
  } catch (e) {
    console.error('解析 Monknow background 数据失败:', e)
    return null
  }
}

/**
 * 获取官方壁纸库随机壁纸
 * 使用自己的后端 API
 * @param _secret 用户 token（保留参数兼容性，暂不使用）
 * @param _categoryId 类别 ID（保留参数兼容性，后端暂不支持）
 * @param _theme 主题类型（保留参数兼容性，后端暂不支持）
 */
export async function getRandomWallpaper(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _secret: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _categoryId: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _theme?: 'bright' | 'dark'
): Promise<{
  url: string
  blurUrl: string
  overviewUrl: string
  mimeType: string
  udId: number
} | null> {
  try {
    const url = buildApiUrl(API_PATHS.WALLPAPER_RANDOM)
    const res = await fetch(url)
    const result = await res.json()

    // 后端返回格式: { msg: "success", data: { id, title, url, thumbUrl } }
    if (result.msg !== 'success' || !result.data) {
      return null
    }

    const wallpaper = result.data
    return {
      url: wallpaper.url,
      blurUrl: wallpaper.thumbUrl || wallpaper.url,  // 使用缩略图作为模糊版
      overviewUrl: wallpaper.thumbUrl || wallpaper.url,
      mimeType: 'image/jpeg',
      udId: typeof wallpaper.id === 'number' ? wallpaper.id : 0
    }
  } catch (err) {
    console.error('获取随机壁纸失败:', err)
    return null
  }
}

/**
 * 上传壁纸图片
 * @param secret 用户 token
 * @param file 图片文件
 */
export async function uploadWallpaper(
  secret: string,
  file: File
): Promise<{
  url: string
  blurUrl: string
  overviewUrl: string
} | null> {
  try {
    // 上传原图
    const imageUrl = await uploadImage(secret, file, 'wallpaper')
    if (!imageUrl) {
      return null
    }

    // 生成模糊版和预览版的 URL（服务器会自动处理）
    const baseUrl = imageUrl.replace(/\/wallpaper\//, '/wallpaper/')
    const blurUrl = baseUrl.replace(/\/wallpaper\//, '/wallpaper/blur/')
    const overviewUrl = baseUrl.replace(/\/wallpaper\//, '/wallpaper/overview/')

    return {
      url: imageUrl,
      blurUrl,
      overviewUrl
    }
  } catch (err) {
    console.error('上传壁纸失败:', err)
    return null
  }
}

// Monknow standby 数据结构
interface MonkNowStandbyData {
  version: number
  setting: {
    display: boolean                           // 开启待机页
    openAfterAppReady: boolean                 // 打开标签页时进入
    openAfterAppInactiveDelaySeconds: number   // 不活跃时进入延迟（秒）
    blurredBackground: boolean                 // 待机页背景模糊
    displayClock: boolean                      // 显示时钟
    displayWeather: boolean                    // 显示天气
  }
}

const MONKNOW_STANDBY_VERSION = 1

/**
 * 同步待机页设置到服务器
 * @param secret 用户 token
 * @param standbySettings 待机页设置
 */
export async function syncStandbyToServer(secret: string, standbySettings: StandbySettings): Promise<boolean> {
  const standbyData: MonkNowStandbyData = {
    version: MONKNOW_STANDBY_VERSION,
    setting: {
      display: standbySettings.display,
      openAfterAppReady: standbySettings.openAfterAppReady,
      openAfterAppInactiveDelaySeconds: standbySettings.openAfterAppInactiveDelaySeconds,
      blurredBackground: standbySettings.blurredBackground,
      displayClock: standbySettings.displayClock,
      displayWeather: standbySettings.displayWeather
    }
  }

  return updateUserData(secret, 'standby', JSON.stringify(standbyData))
}

/**
 * 解析 Monknow standby 数据为本地设置格式
 * @param standbyJson standby 数据 JSON 字符串
 */
export function parseMonknowStandby(standbyJson: string): StandbySettings | null {
  try {
    const standbyData: MonkNowStandbyData = JSON.parse(standbyJson)

    return {
      display: standbyData.setting.display,
      openAfterAppReady: standbyData.setting.openAfterAppReady,
      openAfterAppInactiveDelaySeconds: standbyData.setting.openAfterAppInactiveDelaySeconds as StandbySettings['openAfterAppInactiveDelaySeconds'],
      blurredBackground: standbyData.setting.blurredBackground,
      displayClock: standbyData.setting.displayClock,
      displayWeather: standbyData.setting.displayWeather
    }
  } catch (e) {
    console.error('解析 Monknow standby 数据失败:', e)
    return null
  }
}
