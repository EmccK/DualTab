// 图标类型: image(图片) 或 text(文字)
export type IconType = 'image' | 'text'

// 图标来源信息（图片类型）
export interface IconSource {
  data: string           // 图标 URL
  isOfficial: boolean    // 是否为官方图标
  mimeType?: string      // MIME 类型
  uploaded?: boolean     // 是否已上传
}

// 背景颜色信息
export interface BackgroundColor {
  type: 'pure'           // 颜色类型，目前只支持纯色
  data: string           // 颜色值，如 "#ffffff"
}

// 网站/图标类型
export interface Site {
  id: string                      // uuid
  uuid?: string                   // 兼容 Monknow 的 uuid 字段
  name: string                    // label
  desc: string                    // desc
  url: string                     // url
  type: IconType                  // 图标类型: image 或 text
  icoSrc?: IconSource             // 图片图标来源（type=image 时使用）
  icoText?: string                // 文字图标内容（type=text 时使用）
  backgroundColor: BackgroundColor // 背景颜色
  icoScalePercentage?: number     // 图标缩放比例 (50-150)
}

// 导航分组类型
export interface NavGroup {
  id: string              // uuid
  uuid?: string           // 兼容 Monknow 的 uuid 字段
  name: string            // label
  icon: string            // icoSrc
  badge?: number
  sites: Site[]           // 该分组下的图标列表
  isCustom?: boolean      // 是否为用户自定义分组
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
export type OpenTarget = 'currentTab' | 'newTab' | 'backgroundTab'

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
  openTarget: OpenTarget              // 图标打开方式
  searchOpenTarget: OpenTarget        // 搜索结果打开方式
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
