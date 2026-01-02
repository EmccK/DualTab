import { useState, useRef, useEffect, useCallback } from 'react'
import type { KeyboardEvent, ChangeEvent } from 'react'
import { SEARCH_ENGINES } from '../constants'
import type { OpenTarget } from '../types'

interface SearchBoxProps {
  currentEngineId: string
  onEngineChange: (engineId: string) => void
  openTarget: OpenTarget
}

// 搜索建议 API（使用 Google 搜索建议）
const fetchSuggestions = async (query: string): Promise<string[]> => {
  if (!query.trim()) return []

  try {
    // 使用 Google 搜索建议 API
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`
    const response = await fetch(url)
    const data = await response.json()
    // 返回格式: [query, [suggestions], ...]
    return data[1] || []
  } catch {
    return []
  }
}

// 搜索框组件 - Monknow 风格
export function SearchBox({ currentEngineId, onEngineChange, openTarget }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)

  const currentEngine = SEARCH_ENGINES.find(e => e.id === currentEngineId) || SEARCH_ENGINES[0]

  // 获取搜索建议（防抖）
  const fetchSuggestionsDebounced = useCallback((q: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    // 空查询直接清空建议
    if (!q.trim()) {
      setSuggestions([])
      setSelectedIndex(-1)
      return
    }
    debounceRef.current = window.setTimeout(async () => {
      const results = await fetchSuggestions(q)
      setSuggestions(results.slice(0, 8)) // 最多显示 8 条
      setSelectedIndex(-1)
    }, 150)
  }, [])

  // 处理输入变化 - 直接在事件处理中触发搜索建议
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    fetchSuggestionsDebounced(value)
  }

  // 组件卸载时清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // 执行搜索
  const handleSearch = (searchQuery?: string) => {
    const q = searchQuery || query
    if (q.trim()) {
      const url = currentEngine.url + encodeURIComponent(q.trim())
      // 根据 openTarget 设置决定打开方式
      switch (openTarget) {
        case 'newTab':
          window.open(url, '_blank')
          break
        case 'backgroundTab':
          // 后台标签页需要 Chrome API，这里降级为新标签页
          window.open(url, '_blank')
          break
        case 'newWindow':
          window.open(url, '_blank', 'noopener,noreferrer')
          break
        case 'newIncognitoWindow':
          // 隐身窗口需要 Chrome API，这里降级为新标签页
          window.open(url, '_blank')
          break
        case 'currentTab':
        default:
          window.location.href = url
          break
      }
    }
  }

  // 键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSearch(suggestions[selectedIndex])
      } else {
        handleSearch()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > -1 ? prev - 1 : -1)
    } else if (e.key === 'Escape') {
      setSuggestions([])
      setSelectedIndex(-1)
    }
  }

  // 清除输入
  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.search-box')) {
        setShowDropdown(false)
        setSuggestions([])
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // 是否显示搜索建议
  const showSuggestions = suggestions.length > 0 && isFocused && !showDropdown

  return (
    <div className="search-container">
      <div className={`search-box ${isFocused || query ? 'search-box-focused' : ''} search-box-shadow`}>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="搜索"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />

        {/* 搜索引擎切换按钮 - Monknow 风格 */}
        <div
          className={`search-engine ${showDropdown ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setShowDropdown(!showDropdown)
            setSuggestions([])
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <img
            src={currentEngine.icon}
            alt={currentEngine.name}
            className="search-engine-icon"
          />
          {/* 下拉箭头指示器 */}
          <div className={`search-engine-arrow ${isHovering || showDropdown ? 'visible' : ''}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
        </div>

        {/* 清除按钮 - Monknow 风格 */}
        {query && (
          <div className="search-clear" onClick={handleClear}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </div>
        )}

        {/* 搜索引擎下拉菜单 - Monknow 风格 */}
        {showDropdown && (
          <div
            className="search-engine-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            {SEARCH_ENGINES.map(engine => (
              <div
                key={engine.id}
                className="search-engine-option"
                onClick={() => {
                  onEngineChange(engine.id)
                  setShowDropdown(false)
                  inputRef.current?.focus()
                }}
              >
                <div className="search-engine-option-icon">
                  <img src={engine.icon} alt={engine.name} />
                </div>
                <span className="search-engine-option-name">{engine.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* 搜索建议列表 - Monknow 风格 */}
        {showSuggestions && (
          <div className="search-suggestions">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`search-suggestion-item ${index === selectedIndex ? 'active' : ''}`}
                onClick={() => handleSearch(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="search-suggestion-icon">
                  {/* 搜索图标 */}
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </div>
                <span className="search-suggestion-text">{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
