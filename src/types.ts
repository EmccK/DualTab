// 网站类型
export interface Site {
  id: string
  name: string
  desc: string
  url: string
  icon: string
  color: string
}

// 导航分组类型
export interface NavGroup {
  id: string
  name: string
  icon: string
  badge?: number
  sites: Site[]
  isCustom?: boolean  // 是否为用户自定义分组
}

// 天气信息类型
export interface WeatherInfo {
  text: string
  temp: number
  tempMin: number
  tempMax: number
}

// 搜索引擎配置
export interface SearchEngine {
  id: string
  name: string
  url: string
  icon: string
}

// 设置配置类型
export interface Settings {
  theme: 'dark' | 'light'
  wallpaper: string
  wallpaperType: 'image' | 'color'
  openInNewTab: boolean
  searchEngine: string
}

// 用户信息类型
export interface User {
  email: string
  name: string
  avatar: string
  secret: string  // 用于数据同步的 token
  isLoggedIn: boolean
}
