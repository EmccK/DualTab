import { useState, useRef, useEffect } from 'react'
import './OptionSelect.css'

// 选项类型
export interface Option {
  value: string
  label: string
}

interface OptionSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  className?: string
}

// 自定义选项选择组件 - Monknow 风格
export function OptionSelect({ options, value, onChange, className = '' }: OptionSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 当前选中的选项
  const selectedOption = options.find(opt => opt.value === value) || options[0]

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 处理选项点击
  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`option-select ${className}`} ref={containerRef}>
      {/* 触发器 - 显示当前选中值 */}
      <div
        className={`option-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="option-select-value">{selectedOption?.label}</span>
        <div className={`option-select-arrow ${isOpen ? 'open' : ''}`} />
      </div>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="option-select-dropdown">
          {options.map(option => (
            <div
              key={option.value}
              className={`option-select-item ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option.value)}
            >
              <span className="option-select-item-label">{option.label}</span>
              {option.value === value && (
                <div className="option-select-check" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
