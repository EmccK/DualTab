/**
 * 拖拽排序 Hook
 * 支持书签卡片的拖拽重新排序
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export interface DragState {
  isDragging: boolean        // 是否正在拖拽
  dragIndex: number | null   // 被拖拽项的索引
  overIndex: number | null   // 当前悬停位置的索引
}

export interface UseDragSortOptions<T> {
  items: T[]                           // 列表项
  onReorder: (newItems: T[]) => void   // 重排序回调
  disabled?: boolean                   // 是否禁用拖拽
}

export interface UseDragSortReturn {
  dragState: DragState
  handleDragStart: (index: number, e: React.DragEvent) => void
  handleDragOver: (index: number, e: React.DragEvent) => void
  handleDragEnd: () => void
  handleDragLeave: () => void
  getDragItemProps: (index: number) => {
    draggable: boolean
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDragEnd: () => void
    onDragLeave: () => void
  }
}

export function useDragSort<T>({
  items,
  onReorder,
  disabled = false
}: UseDragSortOptions<T>): UseDragSortReturn {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: null,
    overIndex: null
  })

  // 使用 ref 保存最新状态，避免闭包陈旧问题
  const dragStateRef = useRef(dragState)
  const itemsRef = useRef(items)

  // 在 effect 中更新 ref，避免渲染期间更新
  useEffect(() => {
    dragStateRef.current = dragState
  }, [dragState])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // 开始拖拽
  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    if (disabled) return

    // 设置拖拽数据（必须设置才能触发 dragover）
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))

    // 延迟设置状态，避免拖拽图像闪烁
    requestAnimationFrame(() => {
      setDragState({
        isDragging: true,
        dragIndex: index,
        overIndex: null
      })
    })
  }, [disabled])

  // 拖拽经过
  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    if (disabled) return

    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    setDragState(prev => {
      if (prev.dragIndex === null || prev.dragIndex === index) {
        return prev
      }
      // 只有当悬停位置变化时才更新
      if (prev.overIndex !== index) {
        return { ...prev, overIndex: index }
      }
      return prev
    })
  }, [disabled])

  // 拖拽离开
  const handleDragLeave = useCallback(() => {
    // 不清除 overIndex，因为可能是移动到子元素
  }, [])

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    if (disabled) return

    // 使用 ref 获取最新状态，避免闭包陈旧问题
    const { dragIndex, overIndex } = dragStateRef.current
    const currentItems = itemsRef.current

    // 如果有有效的拖拽和放置位置，执行重排序
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const newItems = [...currentItems]
      const [draggedItem] = newItems.splice(dragIndex, 1)
      newItems.splice(overIndex, 0, draggedItem)
      onReorder(newItems)
    }

    // 重置状态
    setDragState({
      isDragging: false,
      dragIndex: null,
      overIndex: null
    })
  }, [disabled, onReorder])

  // 获取拖拽项的属性
  const getDragItemProps = useCallback((index: number) => {
    return {
      draggable: !disabled,
      onDragStart: (e: React.DragEvent) => handleDragStart(index, e),
      onDragOver: (e: React.DragEvent) => handleDragOver(index, e),
      onDragEnd: handleDragEnd,
      onDragLeave: handleDragLeave
    }
  }, [disabled, handleDragStart, handleDragOver, handleDragEnd, handleDragLeave])

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragLeave,
    getDragItemProps
  }
}
