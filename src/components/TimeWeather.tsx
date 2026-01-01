import { useState, useEffect } from 'react'
import type { Settings } from '../types'

interface TimeWeatherProps {
  visible?: boolean  // 控制显示/隐藏
  settings?: Pick<Settings, 'clockFormat' | 'showSeconds' | 'showWeather'>  // 时钟设置
}

// 时间天气组件 - 空闲时显示 (Monknow 风格)
export function TimeWeather({ visible = true, settings }: TimeWeatherProps) {
  const [time, setTime] = useState(new Date())

  // 默认设置
  const clockFormat = settings?.clockFormat ?? '24h'
  const showSeconds = settings?.showSeconds ?? false
  const showWeather = settings?.showWeather ?? true

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 格式化时间
  const hours = time.getHours()
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')

  // 根据时钟格式显示
  let displayHours: string
  let period: string | null = null

  if (clockFormat === '12h') {
    period = hours >= 12 ? 'PM' : 'AM'
    displayHours = (hours % 12 || 12).toString()
  } else {
    displayHours = hours.toString().padStart(2, '0')
  }

  // 构建时间字符串
  let timeString = `${displayHours}:${minutes}`
  if (showSeconds) {
    timeString += `:${seconds}`
  }

  // 格式化日期 - 与 Monknow 格式一致
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const dateStr = `${time.getFullYear()}年${time.getMonth() + 1}月${time.getDate()}日 ${weekdays[time.getDay()]}`

  return (
    <>
      <div className={`time-weather-container ${visible ? 'visible' : 'hidden'}`}>
        {/* 时间显示 - Monknow 风格 */}
        <div className="time-display">
          <span className="time-text">
            {timeString}
            {period && <span className="time-period">{period}</span>}
          </span>
        </div>

        {/* 日期显示 */}
        <div className="date-display">{dateStr}</div>

        {/* 天气显示 - Monknow 风格 */}
        {showWeather && (
          <div className="weather-display">
            <div className="weather-icon">
              {/* 天气图标 - 晴天 */}
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
              </svg>
            </div>
            <div className="weather-info">
              <span className="weather-temp">25°</span>
              <span className="weather-range">18° / 28°</span>
            </div>
          </div>
        )}
      </div>

      {/* 提示文字 - 底部显示 */}
      {visible && (
        <div className="idle-hint">滚动或点击</div>
      )}
    </>
  )
}
