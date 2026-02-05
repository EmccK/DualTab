// 网络可达性检测工具
// 用于检测内网地址是否可访问

const CHECK_TIMEOUT = 2000  // 检测超时时间（毫秒）

/**
 * 使用 fetch 检测 URL 可达性
 * no-cors 模式下，即使请求"失败"（opaque response），只要能建立连接就算成功
 */
async function fetchCheck(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT)

  try {
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return true
  } catch {
    clearTimeout(timeoutId)
    return false
  }
}

/**
 * 使用 Image 加载检测 URL 可达性
 * 尝试加载目标域名的 favicon，如果能加载则认为可达
 *
 * 注意：这是一种启发式检测方法，存在以下权衡：
 * - onerror 被触发时我们假设服务器可达（因为 favicon 不存在也会触发 error）
 * - 这可能导致误判：DNS 解析失败也会触发 error，但此时服务器实际不可达
 * - 但在内网场景下，DNS 解析失败通常意味着不在内网环境，返回 true 后
 *   用户点击链接时浏览器会正确处理，不会造成实际问题
 * - 相比漏判（内网可达但检测为不可达），误判的影响更小
 */
function imageCheck(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    const timeoutId = setTimeout(() => {
      img.src = ''
      resolve(false)
    }, CHECK_TIMEOUT)

    img.onload = () => {
      // 图片加载成功，服务器确定可达
      clearTimeout(timeoutId)
      resolve(true)
    }

    img.onerror = () => {
      // 图片加载失败可能是：1) favicon 不存在 2) 服务器不可达 3) CORS 限制
      // 由于无法区分这些情况，我们乐观地假设服务器可达
      // 理由：在内网检测场景中，宁可误判为可达（用户点击后浏览器处理），也不要漏判
      clearTimeout(timeoutId)
      resolve(true)
    }

    // 加载目标域名的 favicon，添加时间戳防止缓存
    const origin = new URL(url).origin
    img.src = `${origin}/favicon.ico?_t=${Date.now()}`
  })
}

/**
 * 检测 URL 可达性（混合策略）
 * 1. 先尝试 fetch no-cors
 * 2. 失败则回退到 Image 加载 favicon
 */
export async function checkUrlReachability(url: string): Promise<boolean> {
  // 确保 URL 有协议前缀
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  try {
    // 验证 URL 格式
    new URL(normalizedUrl)
  } catch {
    return false
  }

  // 先尝试 fetch
  const fetchResult = await fetchCheck(normalizedUrl)
  if (fetchResult) return true

  // 回退到 Image 检测
  return await imageCheck(normalizedUrl)
}
