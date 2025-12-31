/**
 * 空闲检测 Hook
 * 用户停止操作后触发回调
 */

import { useCallback, useEffect, useRef } from 'react'

interface UseIdleTimerOptions {
  timeout: number           // 空闲超时时间（毫秒）
  onIdle: () => void        // 空闲时回调
  onActive?: () => void     // 活动时回调
  element?: HTMLElement     // 监听的元素，默认为 document
}

export function useIdleTimer({
  timeout,
  onIdle,
  onActive,
  element
}: UseIdleTimerOptions) {
  const timerRef = useRef<number | null>(null)
  const isIdleRef = useRef(false)
  // 使用 ref 存储回调，避免依赖变化导致 effect 重新执行
  const onIdleRef = useRef(onIdle)
  const onActiveRef = useRef(onActive)

  // 更新 ref
  useEffect(() => {
    onIdleRef.current = onIdle
    onActiveRef.current = onActive
  }, [onIdle, onActive])

  // 重置计时器
  const resetTimer = useCallback(() => {
    // 如果之前是空闲状态，触发活动回调
    if (isIdleRef.current && onActiveRef.current) {
      onActiveRef.current()
    }
    isIdleRef.current = false

    // 清除之前的计时器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // 设置新的计时器
    timerRef.current = window.setTimeout(() => {
      isIdleRef.current = true
      onIdleRef.current()
    }, timeout)
  }, [timeout])

  // 监听用户交互事件
  useEffect(() => {
    const target = element || document

    const handleInteraction = () => {
      resetTimer()
    }

    // 监听多种交互事件（不监听 mousemove，避免频繁触发）
    target.addEventListener('click', handleInteraction)
    target.addEventListener('wheel', handleInteraction, { passive: true })
    target.addEventListener('scroll', handleInteraction, { passive: true })
    target.addEventListener('keydown', handleInteraction)

    // 初始化计时器
    resetTimer()

    return () => {
      target.removeEventListener('click', handleInteraction)
      target.removeEventListener('wheel', handleInteraction)
      target.removeEventListener('scroll', handleInteraction)
      target.removeEventListener('keydown', handleInteraction)

      // 清理计时器
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [element, resetTimer])

  return { resetTimer }
}
