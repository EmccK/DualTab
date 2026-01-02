/**
 * MonkNow API 服务
 * 处理用户认证和数据同步
 */

import type { LocationInfo, Settings, ThemeType } from '../types'

const API_BASE = 'https://dynamic-api.monknow.com'
const WEATHER_API_BASE = 'https://weather-api.monknow.com'

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
  const res = await fetch(`${API_BASE}/user/login`, {
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
  const res = await fetch(`${API_BASE}/user/register`, {
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
  const url = `${API_BASE}/home/captcha?len=4&width=170&height=62&key=${encodeURIComponent(key)}`
  return { url, key }
}

// 推荐书签分类 ID 映射
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
 * @param cateId 分类 ID
 * @param keyword 搜索关键词
 * @param size 返回数量
 * @param secret 用户 token（登录后获取）
 */
export async function getIconList(
  cateId: number,
  keyword: string = '',
  size: number = 20,
  secret?: string
): Promise<IconListItem[]> {
  // 未登录时无法获取推荐书签
  if (!secret) {
    console.warn('获取推荐书签需要登录')
    return []
  }
  
  try {
    const res = await fetch(
      `${API_BASE}/icon/list?cate_id=${cateId}&keyword=${encodeURIComponent(keyword)}&size=${size}`,
      {
        method: 'GET',
        headers: getHeaders(secret)
      }
    )
    
    const result = await res.json()
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
    const res = await fetch(`${API_BASE}/user/data/info?type=${type}`, {
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
} | null> {
  try {
    // 并行获取所有数据类型
    const [icons, common, background, searcher] = await Promise.all([
      getUserDataByType(secret, 'icons'),
      getUserDataByType(secret, 'common'),
      getUserDataByType(secret, 'background'),
      getUserDataByType(secret, 'searcher')
    ])
    
    return { icons: icons || undefined, common: common || undefined, background: background || undefined, searcher: searcher || undefined }
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
    const res = await fetch(`${API_BASE}/user/data/update`, {
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
  groups: import('../types').NavGroup[]
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

  const iconsData: MonkNowIconsData = {
    version: 6,
    updaterVersion: 2024042109,
    setting: {
      openTarget: 'currentTab',
      rowGapPercentage: 26,
      columnGapPercentage: 34,
      iconLayout: 'particular',
      borderRadiusPercentage: 20,
      opacityPercentage: 100,
      sizePercentage: 80,
      displayShadow: true,
      displayNotificationBadge: true,
      displayAddBtn: true,
      rememberLastVisitedGroup: false,
      scrollToSwitchGroup: true
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
 * 使用 Monknow 天气 API 搜索城市位置
 * @param keyword 搜索关键词
 * @param secret 用户 token（可选）
 */
export async function searchLocations(keyword: string, secret?: string): Promise<LocationInfo[]> {
  try {
    const lang = navigator.language || 'zh-CN'
    const url = `${WEATHER_API_BASE}/home/locations?keyword=${encodeURIComponent(keyword)}&lang=${lang}`

    const headers: Record<string, string> = {}
    if (secret) {
      headers['secret'] = secret
    }

    const res = await fetch(url, {
      method: 'GET',
      headers
    })

    const result = await res.json()
    if (!result.data?.locations) {
      return []
    }

    // 转换 API 返回的数据格式
    return result.data.locations.map((loc: {
      woeid: number
      lat: number
      lon: number
      qualifiedName: string
      city: string
    }) => ({
      woeid: loc.woeid,
      latitude: loc.lat,
      longitude: loc.lon,
      fullname: loc.qualifiedName,
      shortname: loc.city
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
 * @param location 位置信息
 * @param secret 用户 token（可选）
 */
export async function getWeather(location: LocationInfo, secret?: string): Promise<WeatherData | null> {
  try {
    const url = `${WEATHER_API_BASE}/home/weather?woeid=${location.woeid}&lat=${location.latitude}&lon=${location.longitude}`

    const headers: Record<string, string> = {}
    if (secret) {
      headers['secret'] = secret
    }

    const res = await fetch(url, {
      method: 'GET',
      headers
    })

    const result = await res.json()
    if (!result.data?.weather) {
      return null
    }

    const weather = result.data.weather
    return {
      currentTemperatureFahrenheit: weather.currentFahrenheit,
      lowTemperatureFahrenheit: weather.lowFahrenheit,
      highTemperatureFahrenheit: weather.highFahrenheit,
      yahooConditionCode: weather.conditionCode
    }
  } catch (err) {
    console.error('获取天气失败:', err)
    return null
  }
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
    const res = await fetch(`${API_BASE}/user/changename`, {
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
    const res = await fetch(`${API_BASE}/user/changeavatar`, {
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
    const res = await fetch(`${API_BASE}/user/changepwd`, {
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
 * 获取 S3/OSS 签名信息
 * @param secret 用户 token
 * @param type 上传类型: avatar | icon | wallpaper
 * @param mimeType 文件 MIME 类型
 */
interface S3SignResponse {
  attribute: {
    action: string
    enctype: string
    method: string
  }
  input: {
    key: string
    policy: string
    OSSAccessKeyId: string
    success_action_status: number
    signature: string
    'cache-control': string
  }
}

async function getS3Sign(
  secret: string,
  type: 'avatar' | 'icon' | 'wallpaper',
  mimeType: string
): Promise<S3SignResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE}/home/s3sign?type=${type}&mime=${encodeURIComponent(mimeType)}`,
      {
        method: 'GET',
        headers: getHeaders(secret)
      }
    )

    const result = await res.json()
    if (result.msg !== 'success' || !result.data?.normal) {
      console.error('获取签名失败:', result.msg)
      return null
    }
    return result.data.normal
  } catch (err) {
    console.error('获取签名失败:', err)
    return null
  }
}

/**
 * 上传图片到 OSS
 * @param secret 用户 token
 * @param file 图片文件
 * @param type 上传类型: avatar | icon | wallpaper
 */
export async function uploadImage(
  secret: string,
  file: File,
  type: 'avatar' | 'icon' | 'wallpaper' = 'avatar'
): Promise<string | null> {
  try {
    // 1. 获取 OSS 签名
    const signData = await getS3Sign(secret, type, file.type)
    if (!signData) {
      return null
    }

    const { attribute, input } = signData

    // 2. 上传到 OSS
    const formData = new FormData()
    formData.append('key', input.key)
    formData.append('policy', input.policy)
    formData.append('OSSAccessKeyId', input.OSSAccessKeyId)
    formData.append('success_action_status', String(input.success_action_status))
    formData.append('signature', input.signature)
    formData.append('cache-control', input['cache-control'])
    formData.append('file', file)

    const uploadRes = await fetch(attribute.action, {
      method: attribute.method,
      body: formData
    })

    if (!uploadRes.ok) {
      console.error('上传到 OSS 失败:', uploadRes.status)
      return null
    }

    // 3. 返回完整的图片 URL
    const imageUrl = `${attribute.action}/${input.key}`
    return imageUrl
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
 * @param url 网站 URL
 * @param secret 用户 token
 */
export async function getIconByUrl(url: string, secret?: string): Promise<IconByUrlResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE}/icon/byurl?url=${encodeURIComponent(url)}`,
      {
        method: 'GET',
        headers: getHeaders(secret)
      }
    )

    const result = await res.json()
    if (result.msg !== 'success' || !result.data?.icon) {
      return null
    }
    return result.data.icon
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
