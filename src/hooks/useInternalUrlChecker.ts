import { useState, useEffect, useCallback, useRef } from 'react'
import type { Site, NavGroup } from '../types'
import { checkUrlReachability } from '../utils'

interface UseInternalUrlCheckerOptions {
  groups: NavGroup[]
  enabled?: boolean  // 是否启用检测，默认 true
}

interface UseInternalUrlCheckerReturn {
  getEffectiveUrl: (site: Site) => string  // 获取应使用的 URL
  isChecking: boolean                       // 是否正在检测中
  reachabilityMap: Map<string, boolean>     // 可达性缓存（供调试用）
  recheckAll: () => void                    // 手动触发重新检测
}

/**
 * 内网地址检测 Hook
 * - 页面加载时批量检测所有有 internalUrl 的书签
 * - 缓存检测结果到内存 Map
 * - 监听网络变化自动重新检测
 */

// 并发限制：最多同时检测的数量
const MAX_CONCURRENT_CHECKS = 5

/**
 * 带并发限制的批量执行
 * @param tasks 任务数组
 * @param limit 最大并发数
 */
async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let index = 0

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const i = index++
      try {
        const value = await tasks[i]()
        results[i] = { status: 'fulfilled', value }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }

  // 启动 limit 个并发执行器
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => runNext()))
  return results
}

export function useInternalUrlChecker({
  groups,
  enabled = true
}: UseInternalUrlCheckerOptions): UseInternalUrlCheckerReturn {
  // 可达性缓存: siteId -> 是否可达
  const [reachabilityMap, setReachabilityMap] = useState<Map<string, boolean>>(new Map())
  const [isChecking, setIsChecking] = useState(false)

  // 用于防止重复检测
  const checkingRef = useRef(false)

  // 批量检测所有内网地址
  const performCheck = useCallback(async () => {
    if (!enabled || checkingRef.current) return

    // 收集所有有内网地址的书签
    const sitesWithInternalUrl = groups
      .flatMap(g => g.sites)
      .filter(s => s.internalUrl)

    if (sitesWithInternalUrl.length === 0) return

    checkingRef.current = true
    setIsChecking(true)

    try {
      // 带并发限制的批量检测内网地址
      const tasks = sitesWithInternalUrl.map(site => async () => ({
        siteId: site.id,
        reachable: await checkUrlReachability(site.internalUrl!)
      }))
      const results = await runWithConcurrencyLimit(tasks, MAX_CONCURRENT_CHECKS)

      // 更新缓存
      const newMap = new Map<string, boolean>()
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          newMap.set(result.value.siteId, result.value.reachable)
        }
      })
      setReachabilityMap(newMap)
    } finally {
      setIsChecking(false)
      checkingRef.current = false
    }
  }, [groups, enabled])

  // 页面加载时进行初始检测
  useEffect(() => {
    if (enabled) {
      performCheck()
    }
  }, [enabled, performCheck])

  // 监听网络变化（online 事件）
  useEffect(() => {
    if (!enabled) return

    const handleOnline = () => {
      // 网络恢复时重新检测
      performCheck()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [enabled, performCheck])

  // 监听网络连接类型变化（Wi-Fi 切换等）
  useEffect(() => {
    if (!enabled) return

    // Network Information API（部分浏览器支持）
    const connection = (navigator as NavigatorWithConnection).connection
    if (connection) {
      const handleChange = () => {
        performCheck()
      }
      connection.addEventListener('change', handleChange)
      return () => connection.removeEventListener('change', handleChange)
    }
  }, [enabled, performCheck])

  // 获取应使用的 URL
  const getEffectiveUrl = useCallback((site: Site): string => {
    // 没有内网地址，直接返回外网地址
    if (!site.internalUrl) return site.url

    // 检查内网地址是否可达
    const isReachable = reachabilityMap.get(site.id)

    // 可达则使用内网地址，否则使用外网地址
    return isReachable === true ? site.internalUrl : site.url
  }, [reachabilityMap])

  return {
    getEffectiveUrl,
    isChecking,
    reachabilityMap,
    recheckAll: performCheck
  }
}

// Network Information API 类型声明
interface NetworkInformation extends EventTarget {
  readonly type?: string
  readonly effectiveType?: string
  readonly downlink?: number
  readonly rtt?: number
  readonly saveData?: boolean
  addEventListener(type: 'change', listener: EventListener): void
  removeEventListener(type: 'change', listener: EventListener): void
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
}
