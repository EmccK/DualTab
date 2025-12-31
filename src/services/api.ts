/**
 * MonkNow API 服务
 * 处理用户认证和数据同步
 */

const API_BASE = 'https://dynamic-api.monknow.com'

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
  icoSrc: {
    data: string
    isOfficial: boolean
    mimeType: string
    uploaded: boolean
  }
  backgroundColor: {
    data: string
    type: 'pure'
  }
  icoScalePercentage: number
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
      iconDict[site.id] = {
        uuid: site.id,
        label: site.name,
        desc: site.desc,
        url: site.url,
        type: 'image',
        icoSrc: {
          data: site.icon,
          isOfficial: site.icon.includes('static.monknow.com'),
          mimeType: 'image/png',
          uploaded: true
        },
        backgroundColor: {
          data: site.color,
          type: 'pure'
        },
        icoScalePercentage: 100
      }
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
          
          return {
            id: icon.uuid,
            name: icon.label,
            desc: icon.desc || icon.label,
            url: icon.url,
            icon: icon.icoSrc?.data || '',
            color: icon.backgroundColor?.data || '#1890ff'
          }
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
