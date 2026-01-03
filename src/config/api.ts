/**
 * API 配置文件
 * 部署后端服务后，修改此处的域名配置
 */

// ============================================
// API 域名配置 - 部署后修改此处
// ============================================

// 后端 API 地址（部署后修改为真实域名，如 https://api.example.com）
export const API_BASE_URL = "https://dualtab.emcck.com";

// ============================================
// 以下为 API 路径配置，一般不需要修改
// ============================================

// 对外 API 路径
export const API_PATHS = {
  // 图标相关
  ICON_LIST: "/icon/list",
  ICON_BY_URL: "/icon/byurl",

  // 搜索引擎和分类
  SEARCH_ENGINES: "/search-engines",
  CATEGORIES: "/categories",

  // 壁纸相关
  WALLPAPER_RANDOM: "/wallpaper/random",
  WALLPAPER_LIST: "/wallpaper/list",

  // 天气相关
  WEATHER_LOCATIONS: "/weather/locations",
  WEATHER: "/weather",

  // 代理服务
  SEARCH_SUGGEST: "/proxy/search-suggest",

  // 用户相关
  USER_LOGIN: "/user/login",
  USER_REGISTER: "/user/register",
  USER_DATA_INFO: "/user/data/info",
  USER_DATA_UPDATE: "/user/data/update",
  USER_CHANGE_NAME: "/user/changename",
  USER_CHANGE_AVATAR: "/user/changeavatar",
  USER_CHANGE_PWD: "/user/changepwd",
  CAPTCHA: "/home/captcha",
  UPLOAD_IMAGE: "/upload/image",
};

// 构建完整 API URL
export function buildApiUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = `${API_BASE_URL}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}
