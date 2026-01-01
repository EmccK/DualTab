import type { NavGroup, SearchEngine } from './types'

// 搜索引擎列表 - 使用 Monknow 官方 SVG 图标
export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    icon: 'https://static.monknow.com/newtab/searcher/e58b5a00-74fe-4319-af0a-d4999565dd71.svg'
  },
  {
    id: 'baidu',
    name: '百度',
    url: 'https://www.baidu.com/s?wd=',
    icon: 'https://static.monknow.com/newtab/searcher/0eb43a90-b4c7-43ce-9c73-ab110945f47d.svg'
  },
  {
    id: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    icon: 'https://static.monknow.com/newtab/searcher/ceb6c985-d09c-4fdc-b0ea-b304f1ee0f2d.svg'
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    url: 'https://search.yahoo.com/search?p=',
    icon: 'https://static.monknow.com/newtab/searcher/2a5e69d9-bf13-4188-8da2-004551a913a0.svg'
  },
  {
    id: 'yandex',
    name: 'Yandex',
    url: 'https://yandex.ru/search/?text=',
    icon: 'https://static.monknow.com/newtab/searcher/118f7463-4411-4856-873f-2851faa3b543.svg'
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    icon: 'https://static.monknow.com/newtab/searcher/259d8e2b-340e-4690-8046-88a0b130cbd0.svg'
  }
]

// 分组图标列表 - MonkNow 官方图标
export const GROUP_ICONS = [
  'https://static.monknow.com/newtab/icon-group/61df5dde-0afd-4104-9b87-418bd62f95df.svg', // 主页
  'https://static.monknow.com/newtab/icon-group/5664820e-0e6e-4040-9fa8-7a7491a5f2b8.svg', // 工具
  'https://static.monknow.com/newtab/icon-group/dcc802e4-874f-4ac5-bbe0-dbda5428265d.svg', // 日历
  'https://static.monknow.com/newtab/icon-group/9ac2df78-617e-4090-85ea-e68caf566a47.svg', // 表情
  'https://static.monknow.com/newtab/icon-group/69e6f555-cff1-42fe-9f8e-677381c04cd3.svg', // 图片
  'https://static.monknow.com/newtab/icon-group/3cea0df9-aa97-4d00-9a7a-a576c6805c6b.svg', // 购物车
  'https://static.monknow.com/newtab/icon-group/15cb3663-ba77-44f6-91ab-2ded15fdec30.svg', // 用户
  'https://static.monknow.com/newtab/icon-group/989dee8d-8d2d-4bef-bb5a-ff4c10499353.svg', // 时钟
  'https://static.monknow.com/newtab/icon-group/abb98f16-8bd4-4c76-9c30-55c91afad96b.svg', // 文件夹
  'https://static.monknow.com/newtab/icon-group/e38a7f4d-b22e-4ee5-8220-b236ac317756.svg'  // 点赞
]

// 预设颜色列表
export const PRESET_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#2f54eb', '#fa541c', '#a0d911'
]

// 壁纸列表
export const WALLPAPERS = [
  'https://static.monknow.com/newtab/wallpaper/81d10bb3542bc99097ba324fd6162def.jpg',
  'https://static.monknow.com/newtab/wallpaper/0a1b2c3d4e5f6789abcdef0123456789.jpg',
  'https://static.monknow.com/newtab/wallpaper/1234567890abcdef1234567890abcdef.jpg',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920'
]

// 纯色壁纸
export const SOLID_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#2f54eb', '#fa541c', '#a0d911',
  '#333436', '#202124', '#1a1a2e', '#16213e', '#0f3460'
]


// 默认导航分组数据
export const DEFAULT_NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    name: '主页',
    icon: 'https://static.monknow.com/newtab/icon-group/61df5dde-0afd-4104-9b87-418bd62f95df.svg',
    sites: [
      { id: 'site_weibo_001', name: '微博', desc: '随时随地发现新鲜事！', url: 'https://weibo.com', icon: 'https://static.monknow.com/newtab/icon/0e3b119f42ba105262c52885adf032f1.png', color: '#e6162b' },
      { id: 'site_wechat_002', name: '微信网页版', desc: '使用手机微信扫码登录', url: 'https://wx.qq.com', icon: 'https://static.monknow.com/newtab/icon/e760bb47e6988e068f6d44c9f3109bb2.png', color: '#07c160' },
      { id: 'site_bilibili_003', name: 'Bilibili', desc: 'bilibili是国内知名的视频弹幕网站。', url: 'https://bilibili.com', icon: 'https://static.monknow.com/newtab/icon/b88213b97677a97e45cb9f12d80ad328.png', color: '#fb7299' },
      { id: 'site_taobao_004', name: '爱淘宝', desc: '阿里巴巴旗下潮流导购网站', url: 'https://ai.taobao.com', icon: 'https://static.monknow.com/newtab/icon/62decccfc76a4da384686b01e7abffd0.png', color: '#ff5000' },
      { id: 'site_jd_005', name: '京东', desc: '专业的综合网上购物商城', url: 'https://jd.com', icon: 'https://static.monknow.com/newtab/icon/61589568063efc2ebbfdac364bfb641b.png', color: '#e1251b' },
      { id: 'site_zhihu_006', name: '知乎', desc: '有问题，上知乎。可信赖的问答社区。', url: 'https://zhihu.com', icon: 'https://static.monknow.com/newtab/icon/d485e51391e9a96b80caa34516bd00be.png', color: '#0066ff' },
      { id: 'site_douban_007', name: '豆瓣', desc: '提供图书、电影、音乐唱片的推荐、评论和价格比较', url: 'https://douban.com', icon: 'https://static.monknow.com/newtab/icon/0358c64952350ca5e46e9f3b645f688c.png', color: '#00b51d' },
      { id: 'site_yinxiang_008', name: '印象笔记网页版', desc: '登录使用印象笔记网页版', url: 'https://app.yinxiang.com', icon: 'https://static.monknow.com/newtab/icon/be162f5b969fbb1c28d209b0773557cf.png', color: '#00a82d' }
    ]
  },
  {
    id: 'social',
    name: '社交',
    icon: 'https://static.monknow.com/newtab/icon-group/9ac2df78-617e-4090-85ea-e68caf566a47.svg',
    sites: [
      { id: 'site_iqiyi_009', name: '爱奇艺', desc: '大型视频网站，专业的网络视频播放平台。', url: 'https://iqiyi.com', icon: 'https://static.monknow.com/newtab/icon/49d02ac31b2efd6c6da10ad9ffa3d909.png', color: '#00be06' },
      { id: 'site_163mail_010', name: '163网易邮箱', desc: '中文邮箱第一品牌。', url: 'https://mail.163.com', icon: 'https://static.monknow.com/newtab/icon/32b3bcd5782d3ae416c506eeeec28ecf.png', color: '#d43c33' },
      { id: 'site_58_011', name: '58同城', desc: '58同城，专业的分类信息网。', url: 'https://58.com', icon: 'https://static.monknow.com/newtab/icon/289d6000cfb0bb35124dca1f948af822.png', color: '#ff6600' },
      { id: 'site_dianping_012', name: '大众点评', desc: '推荐吃喝玩乐优惠信息，帮您选到满意商家', url: 'https://dianping.com', icon: 'https://static.monknow.com/newtab/icon/1353e0e5e6cf12ba5a4d596fb9c23ac6.png', color: '#ff6633' }
    ]
  },
  {
    id: 'tools',
    name: '工具',
    icon: 'https://static.monknow.com/newtab/icon-group/5664820e-0e6e-4040-9fa8-7a7491a5f2b8.svg',
    sites: [
      { id: 'site_ctrip_013', name: '携程', desc: '中国领先的在线旅行服务公司', url: 'https://ctrip.com', icon: 'https://static.monknow.com/newtab/icon/8a65194bb0f11289441f61a1d26737eb.png', color: '#2577e3' },
      { id: 'site_toutiao_014', name: '今日头条', desc: '今日头条为您推荐有价值的、个性化的信息', url: 'https://toutiao.com', icon: 'https://static.monknow.com/newtab/icon/18d469f739518a6636bde9da8bd6d93b.png', color: '#f85959' },
      { id: 'site_music163_015', name: '网易云音乐', desc: '一款专注于发现与分享的音乐产品', url: 'https://music.163.com', icon: 'https://static.monknow.com/newtab/icon/156950db51a3c93f877f9c00a121e548.png', color: '#c20c0c' },
      { id: 'site_mooc_016', name: '中国大学MOOC', desc: '国家精品课程在线学习平台', url: 'https://icourse163.org', icon: 'https://static.monknow.com/newtab/icon/276366d9d8e7c8b3ee2c8e8f301b5fe6.png', color: '#8b0000' }
    ]
  }
]

// 默认设置
export const DEFAULT_SETTINGS = {
  // 主题设置
  theme: 'dark' as const,
  wallpaper: WALLPAPERS[0],
  wallpaperType: 'image' as const,

  // 常规设置
  openInNewTab: true,
  searchEngine: 'google',
  clockFormat: '24h' as const,
  showSeconds: false,
  showWeather: true,

  // 外观设置
  iconSize: 'medium' as const,
  showSiteLabel: true,
  showSiteDesc: true,
  sidebarPosition: 'left' as const
}
