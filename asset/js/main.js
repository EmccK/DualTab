/**
 * DualTab - 新标签页扩展
 * 主要JavaScript逻辑
 */

// 默认配置
const DEFAULT_CONFIG = {
  theme: 'dark',
  wallpaper: 'https://static.monknow.com/newtab/wallpaper/81d10bb3542bc99097ba324fd6162def.jpg',
  searchEngine: 'google'
};

// 导航分组数据 - 使用MonkNow的图标
const NAV_GROUPS = [
  {
    id: 'home',
    name: '主页',
    icon: 'https://static.monknow.com/newtab/icon-group/61df5dde-0afd-4104-9b87-418bd62f95df.svg',
    sites: [
      { name: '微博', desc: '随时随地发现新鲜事！', url: 'https://weibo.com', icon: 'https://static.monknow.com/newtab/icon/0e3b119f42ba105262c52885adf032f1.png', color: '#e6162b' },
      { name: '微信网页版', desc: '使用手机微信扫码登录', url: 'https://wx.qq.com', icon: 'https://static.monknow.com/newtab/icon/e760bb47e6988e068f6d44c9f3109bb2.png', color: '#07c160' },
      { name: 'Bilibili', desc: 'bilibili是国内知名的视频弹幕网站。', url: 'https://bilibili.com', icon: 'https://static.monknow.com/newtab/icon/b88213b97677a97e45cb9f12d80ad328.png', color: '#fb7299' },
      { name: '爱淘宝', desc: '阿里巴巴旗下潮流导购网站', url: 'https://ai.taobao.com', icon: 'https://static.monknow.com/newtab/icon/62decccfc76a4da384686b01e7abffd0.png', color: '#ff5000' },
      { name: '京东', desc: '专业的综合网上购物商城', url: 'https://jd.com', icon: 'https://static.monknow.com/newtab/icon/61589568063efc2ebbfdac364bfb641b.png', color: '#e1251b' },
      { name: '知乎', desc: '有问题，上知乎。可信赖的问答社区。', url: 'https://zhihu.com', icon: 'https://static.monknow.com/newtab/icon/d485e51391e9a96b80caa34516bd00be.png', color: '#0066ff' },
      { name: '豆瓣', desc: '提供图书、电影、音乐唱片的推荐、评论和价格比较', url: 'https://douban.com', icon: 'https://static.monknow.com/newtab/icon/0358c64952350ca5e46e9f3b645f688c.png', color: '#00b51d' },
      { name: '印象笔记网页版', desc: '登录使用印象笔记网页版', url: 'https://app.yinxiang.com', icon: 'https://static.monknow.com/newtab/icon/be162f5b969fbb1c28d209b0773557cf.png', color: '#00a82d' }
    ]
  },
  {
    id: 'social',
    name: '社交',
    icon: 'https://static.monknow.com/newtab/icon-group/9ac2df78-617e-4090-85ea-e68caf566a47.svg',
    sites: [
      { name: '爱奇艺', desc: '大型视频网站，专业的网络视频播放平台。', url: 'https://iqiyi.com', icon: 'https://static.monknow.com/newtab/icon/49d02ac31b2efd6c6da10ad9ffa3d909.png', color: '#00be06' },
      { name: '163网易邮箱', desc: '中文邮箱第一品牌。', url: 'https://mail.163.com', icon: 'https://static.monknow.com/newtab/icon/32b3bcd5782d3ae416c506eeeec28ecf.png', color: '#d43c33' },
      { name: '58同城', desc: '58同城，专业的分类信息网。', url: 'https://58.com', icon: 'https://static.monknow.com/newtab/icon/289d6000cfb0bb35124dca1f948af822.png', color: '#ff6600' },
      { name: '大众点评', desc: '推荐吃喝玩乐优惠信息，帮您选到满意商家', url: 'https://dianping.com', icon: 'https://static.monknow.com/newtab/icon/1353e0e5e6cf12ba5a4d596fb9c23ac6.png', color: '#ff6633' }
    ]
  },
  {
    id: 'tools',
    name: '工具',
    icon: 'https://static.monknow.com/newtab/icon-group/5664820e-0e6e-4040-9fa8-7a7491a5f2b8.svg',
    badge: 1,
    sites: [
      { name: '携程', desc: '中国领先的在线旅行服务公司', url: 'https://ctrip.com', icon: 'https://static.monknow.com/newtab/icon/8a65194bb0f11289441f61a1d26737eb.png', color: '#2577e3' },
      { name: '今日头条', desc: '今日头条为您推荐有价值的、个性化的信息', url: 'https://toutiao.com', icon: 'https://static.monknow.com/newtab/icon/18d469f739518a6636bde9da8bd6d93b.png', color: '#f85959' },
      { name: '网易云音乐', desc: '一款专注于发现与分享的音乐产品', url: 'https://music.163.com', icon: 'https://static.monknow.com/newtab/icon/156950db51a3c93f877f9c00a121e548.png', color: '#c20c0c' },
      { name: '中国大学MOOC', desc: '国家精品课程在线学习平台', url: 'https://icourse163.org', icon: 'https://static.monknow.com/newtab/icon/276366d9d8e7c8b3ee2c8e8f301b5fe6.png', color: '#8b0000' }
    ]
  }
];

// 壁纸列表 - 使用MonkNow的壁纸
const WALLPAPERS = [
  'https://static.monknow.com/newtab/wallpaper/81d10bb3542bc99097ba324fd6162def.jpg',
  'https://static.monknow.com/newtab/wallpaper/nature1.jpg',
  'https://static.monknow.com/newtab/wallpaper/nature2.jpg'
];

// 搜索引擎配置
const SEARCH_ENGINES = {
  google: { name: 'Google', url: 'https://www.google.com/search?q=', icon: 'https://static.monknow.com/newtab/searcher/0eb43a90-b4c7-43ce-9c73-ab110945f47d.svg' },
  baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=', icon: 'https://www.baidu.com/favicon.ico' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=', icon: 'https://www.bing.com/favicon.ico' }
};

// 应用状态
let state = {
  config: { ...DEFAULT_CONFIG },
  currentGroup: 'home'
};

// DOM元素引用
const elements = {};

/**
 * 初始化应用
 */
function init() {
  // 缓存DOM元素
  cacheElements();

  // 加载配置
  loadConfig();

  // 应用主题
  applyTheme(state.config.theme);

  // 设置壁纸
  setWallpaper(state.config.wallpaper);

  // 渲染导航菜单
  renderNavMenu();

  // 渲染网站卡片
  renderSites(state.currentGroup);

  // 绑定事件
  bindEvents();
}

/**
 * 缓存DOM元素
 */
function cacheElements() {
  elements.app = document.getElementById('app');
  elements.wallpaper = document.getElementById('wallpaper');
  elements.navMenu = document.getElementById('navMenu');
  elements.sitesGrid = document.getElementById('sitesGrid');
  elements.searchInput = document.getElementById('searchInput');
  elements.searchEngine = document.getElementById('searchEngine');
  elements.settingsBtn = document.getElementById('settingsBtn');
  elements.settingsPanel = document.getElementById('settingsPanel');
  elements.closeSettings = document.getElementById('closeSettings');
  elements.wallpaperGrid = document.getElementById('wallpaperGrid');
}

/**
 * 加载配置
 */
function loadConfig() {
  try {
    const saved = localStorage.getItem('dualtab_config');
    if (saved) {
      state.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('加载配置失败:', e);
  }
}

/**
 * 保存配置
 */
function saveConfig() {
  try {
    localStorage.setItem('dualtab_config', JSON.stringify(state.config));
  } catch (e) {
    console.error('保存配置失败:', e);
  }
}

/**
 * 应用主题
 */
function applyTheme(theme) {
  const app = elements.app;
  app.classList.remove('dark-theme', 'light-theme');

  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    app.classList.add(isDark ? 'dark-theme' : 'light-theme');
  } else {
    app.classList.add(`${theme}-theme`);
  }
}

/**
 * 设置壁纸
 */
function setWallpaper(url) {
  elements.wallpaper.style.backgroundImage = `url("${url}")`;
}

/**
 * 渲染导航菜单
 */
function renderNavMenu() {
  const html = NAV_GROUPS.map(group => `
    <div class="nav-item ${group.id === state.currentGroup ? 'active' : ''}" data-group="${group.id}">
      <div class="icon" style="mask-image: url('${group.icon}'); -webkit-mask-image: url('${group.icon}'); background-color: currentColor;"></div>
      <div class="label">${group.name}</div>
      ${group.badge ? `<span class="badge">${group.badge}</span>` : ''}
    </div>
  `).join('');

  elements.navMenu.innerHTML = html;
}

/**
 * 渲染网站卡片
 */
function renderSites(groupId) {
  const group = NAV_GROUPS.find(g => g.id === groupId);
  if (!group) return;

  const html = group.sites.map(site => `
    <div class="site-card" data-url="${site.url}">
      <div class="site-card-icon" style="background-color: ${site.color}40;">
        <img src="${site.icon}" alt="${site.name}">
      </div>
      <div class="site-card-info">
        <div class="site-card-title">${site.name}</div>
        <div class="site-card-desc">${site.desc}</div>
      </div>
    </div>
  `).join('');

  elements.sitesGrid.innerHTML = html;
}

/**
 * 渲染壁纸选择器
 */
function renderWallpapers() {
  const html = WALLPAPERS.map(url => `
    <div class="wallpaper-item ${url === state.config.wallpaper ? 'selected' : ''}"
         style="background-image: url('${url}')"
         data-url="${url}">
    </div>
  `).join('');

  elements.wallpaperGrid.innerHTML = html;
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 导航菜单点击
  elements.navMenu.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
      const groupId = navItem.dataset.group;
      state.currentGroup = groupId;

      // 更新激活状态
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.group === groupId);
      });

      // 渲染对应网站
      renderSites(groupId);
    }
  });

  // 网站卡片点击
  elements.sitesGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.site-card');
    if (card) {
      window.open(card.dataset.url, '_blank');
    }
  });

  // 搜索功能
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = elements.searchInput.value.trim();
      if (query) {
        const engine = SEARCH_ENGINES[state.config.searchEngine];
        window.open(engine.url + encodeURIComponent(query), '_blank');
      }
    }
  });

  // 设置按钮
  elements.settingsBtn.addEventListener('click', () => {
    elements.settingsPanel.classList.add('open');
    renderWallpapers();
  });

  // 关闭设置
  elements.closeSettings.addEventListener('click', () => {
    elements.settingsPanel.classList.remove('open');
  });

  // 主题切换
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.config.theme = e.target.value;
      applyTheme(state.config.theme);
      saveConfig();
    });
  });

  // 壁纸选择
  elements.wallpaperGrid.addEventListener('click', (e) => {
    const item = e.target.closest('.wallpaper-item');
    if (item) {
      const url = item.dataset.url;
      state.config.wallpaper = url;
      setWallpaper(url);
      saveConfig();

      // 更新选中状态
      document.querySelectorAll('.wallpaper-item').forEach(wp => {
        wp.classList.toggle('selected', wp.dataset.url === url);
      });
    }
  });

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.config.theme === 'system') {
      applyTheme('system');
    }
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
