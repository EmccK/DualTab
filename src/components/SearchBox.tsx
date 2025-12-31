import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { SEARCH_ENGINES } from '../constants'

interface SearchBoxProps {
  currentEngineId: string
  onEngineChange: (engineId: string) => void
  openInNewTab: boolean
}

// 搜索框组件
export function SearchBox({ currentEngineId, onEngineChange, openInNewTab }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const currentEngine = SEARCH_ENGINES.find(e => e.id === currentEngineId) || SEARCH_ENGINES[0]

  // 执行搜索
  const handleSearch = () => {
    if (query.trim()) {
      const url = currentEngine.url + encodeURIComponent(query.trim())
      if (openInNewTab) {
        window.open(url, '_blank')
      } else {
        window.location.href = url
      }
    }
  }

  // 键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="search-container">
      <div className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="搜索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        
        {/* 搜索引擎切换 */}
        <div className="search-engine" onClick={() => setShowDropdown(!showDropdown)}>
          <img src={currentEngine.icon} alt={currentEngine.name} />
        </div>

        {/* 搜索引擎下拉菜单 */}
        {showDropdown && (
          <>
            <div className="dropdown-overlay" onClick={() => setShowDropdown(false)} />
            <div className="search-engine-dropdown">
              {SEARCH_ENGINES.map(engine => (
                <div
                  key={engine.id}
                  className={`search-engine-option ${engine.id === currentEngineId ? 'active' : ''}`}
                  onClick={() => {
                    onEngineChange(engine.id)
                    setShowDropdown(false)
                  }}
                >
                  <img src={engine.icon} alt={engine.name} />
                  <span>{engine.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
