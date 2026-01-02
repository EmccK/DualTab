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

// 图标布局类型
export type IconLayout = 'simple' | 'particular'

// 主视图布局类型: classic(经典) / efficient(高效) / deep(深刻) / light(轻巧)
export type ViewLayout = 'classic' | 'efficient' | 'deep' | 'light'

// 主题类型: dark(深色) / light(浅色) / auto(跟随系统)
export type ThemeType = 'dark' | 'light' | 'auto'

// 壁纸来源类型: lib(官方库) / local(本地) / color(纯色)
export type WallpaperSource = 'lib' | 'local' | 'color'

// 壁纸类别 ID
export type WallpaperCategory = 8 | 9 | 10 | 11 | 12  // 自然、人物、动物、建筑、动漫

// 壁纸更换频率（秒）
export type WallpaperInterval = 0 | 60 | 3600 | 21600 | 43200 | 86400  // 从不、1分钟、1小时、6小时、12小时、24小时

// 壁纸数据类型
export interface WallpaperData {
  id: number | null
  uuid: string
  type: 'color' | 'image'
  data: {
    type?: 'pure'  // 纯色类型
    data: string   // 颜色值或图片URL
    isOfficial?: boolean
    uploaded?: boolean
    mimeType?: string
  }
  blurredData?: {
    isOfficial?: boolean
    uploaded?: boolean
    mimeType?: string
    data: string
  }
  overviewData?: {
    isOfficial?: boolean
    uploaded?: boolean
    mimeType?: string
    data: string
  }
}

// 壁纸设置类型
export interface WallpaperSettings {
  value: WallpaperSource           // 当前选择的壁纸来源
  blurred: boolean                 // 是否模糊
  slideIntervalSeconds: WallpaperInterval  // 更换频率（秒）
  libCategories: WallpaperCategory[]       // 官方库类别
}

// 壁纸字典类型
export interface WallpaperDict {
  color: WallpaperData
  local: WallpaperData
  lib?: WallpaperData
}

// 设置配置类型
export interface Settings {
  // 主题设置
  theme: ThemeType
  wallpaper: string
  wallpaperType: 'image' | 'color'

  // 壁纸设置（Monknow 风格）
  wallpaperSource: WallpaperSource         // 壁纸来源
  wallpaperBlurred: boolean                // 是否模糊
  wallpaperInterval: WallpaperInterval     // 更换频率
  wallpaperCategory: WallpaperCategory     // 官方库类别
  wallpaperColor: string                   // 纯色壁纸颜色
  localWallpaper: string | null            // 本地壁纸URL
  localWallpaperBlurred: string | null     // 本地壁纸模糊版URL

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
  viewLayout: ViewLayout             // 主视图布局
  iconSize: 'small' | 'medium' | 'large'  // 图标大小
  showSiteLabel: boolean       // 显示网站标签
  showSiteDesc: boolean        // 显示网站描述
  sidebarPosition: 'left' | 'right'  // 侧边栏位置
  sidebarAutoHide: boolean     // 侧边栏自动隐藏
  sidebarCollapsed: boolean    // 侧边栏窄距菜单

  // 图标设置 - Monknow 风格
  iconLayout: IconLayout              // 图标布局: simple(简洁) / particular(详细)
  iconSizePercentage: number          // 图标大小百分比 (50-150)
  iconBorderRadius: number            // 图标圆角百分比 (0-50)
  iconOpacity: number                 // 图标透明度百分比 (0-100)
  iconShadow: boolean                 // 显示图标阴影
  iconRowGap: number                  // 行间距百分比 (0-100)
  iconColumnGap: number               // 列间距百分比 (0-100)
  showAddButton: boolean              // 显示添加按钮
  scrollToSwitchGroup: boolean        // 滚动以切换分组
  rememberLastGroup: boolean          // 记住最后访问的分组
}

// 用户信息类型
export interface User {
  email: string
  name: string
  avatar: string
  secret: string  // 用于数据同步的 token
  isLoggedIn: boolean
}
