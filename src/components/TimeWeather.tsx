import { useState, useEffect } from 'react'

interface TimeWeatherProps {
  visible?: boolean  // 控制显示/隐藏
}

// 时间天气组件 - 空闲时显示
export function TimeWeather({ visible = true }: TimeWeatherProps) {
  const [time, setTime] = useState(new Date())

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 格式化时间
  const hours = time.getHours()
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = (hours % 12 || 12).toString()

  // 格式化日期 - 与 MonkNow 格式一致
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const dateStr = `${time.getFullYear()}年${time.getMonth() + 1}月${time.getDate()}日${weekdays[time.getDay()]}`

  return (
    <>
      <div className={`time-weather-container ${visible ? 'visible' : 'hidden'}`}>
        {/* 时间显示 */}
        <div className="time-display">
          <span className="time-text">{displayHours}:{minutes}</span>
          <span className="time-period">{period}</span>
        </div>
        
        {/* 日期显示 */}
        <div className="date-display">{dateStr}</div>
        
        {/* 天气显示 (静态数据) */}
        <div className="weather-display">
          <span className="weather-text">晴</span>
          <span className="weather-temp">25°</span>
          <span className="weather-range">18° / 28°</span>
        </div>
      </div>

      {/* 提示文字 - 底部显示 */}
      {visible && (
        <div className="idle-hint">滚动或点击</div>
      )}
    </>
  )
}
