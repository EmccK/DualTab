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

// 打开链接方式枚举
export type OpenTarget = 'currentTab' | 'newTab' | 'backgroundTab' | 'newWindow' | 'newIncognitoWindow'

// 位置信息类型
export interface LocationInfo {
  woeid: number
  latitude: number
  longitude: number  // 经度
  fullname: string
  shortname: string
}

// 设置配置类型
export interface Settings {
  // 主题设置
  theme: 'dark' | 'light'
  wallpaper: string
  wallpaperType: 'image' | 'color'

  // 常规设置
  openTarget: OpenTarget       // 打开链接方式
  searchEngine: string
  clockFormat: '12h' | '24h'   // 时钟格式
  showSeconds: boolean         // 显示秒
  showWeather: boolean         // 显示天气
  temperatureUnit: 'celsius' | 'fahrenheit'  // 温度单位
  location: LocationInfo | null  // 位置信息

  // 外观设置
  iconSize: 'small' | 'medium' | 'large'  // 图标大小
  showSiteLabel: boolean       // 显示网站标签
  showSiteDesc: boolean        // 显示网站描述
  sidebarPosition: 'left' | 'right'  // 侧边栏位置
}

// 用户信息类型
export interface User {
  email: string
  name: string
  avatar: string
  secret: string  // 用于数据同步的 token
  isLoggedIn: boolean
}
