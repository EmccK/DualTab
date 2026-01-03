import { useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Settings, LocationInfo } from '../types'
import { getWeather, fahrenheitToCelsius } from '../services/api'
import type { WeatherData } from '../services/api'

interface TimeWeatherProps {
  visible?: boolean  // 控制显示/隐藏
  settings?: Pick<Settings, 'clockFormat' | 'showSeconds' | 'showWeather' | 'standby' | 'location' | 'temperatureUnit'>  // 时钟和待机页设置
}

// 天气图标映射 - 根据 Yahoo 天气代码返回对应的 SVG 图标
function getWeatherIcon(code: number): ReactNode {
  // 晴天 (32, 34)
  if (code === 32 || code === 34) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
      </svg>
    )
  }
  // 多云 (26, 27, 28, 29, 30)
  if (code >= 26 && code <= 30) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
      </svg>
    )
  }
  // 雨天 (11, 12, 39, 40, 45)
  if (code === 11 || code === 12 || code === 39 || code === 40 || code === 45) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z"/>
      </svg>
    )
  }
  // 雪天 (16, 41, 42, 43, 46)
  if (code === 16 || code === 41 || code === 42 || code === 43 || code === 46) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z"/>
      </svg>
    )
  }
  // 雷暴 (4, 3, 37, 38, 47)
  if (code === 4 || code === 3 || code === 37 || code === 38 || code === 47) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.92 7.02C17.45 4.18 14.97 2 12 2 9.82 2 7.83 3.18 6.78 5.06 4.09 5.41 2 7.74 2 10.5 2 13.53 4.47 16 7.5 16h10c2.48 0 4.5-2.02 4.5-4.5 0-2.34-1.79-4.27-4.08-4.48zM11 20l4-8h-3l1-4-4 8h3l-1 4z"/>
      </svg>
    )
  }
  // 雾 (20, 21, 22)
  if (code === 20 || code === 21 || code === 22) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z"/>
      </svg>
    )
  }
  // 默认晴天图标
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
    </svg>
  )
}

// 天气缓存 key
const WEATHER_CACHE_KEY = 'dualtab_weather_cache'

// 获取今天的日期字符串 (YYYY-MM-DD)
function getTodayDateStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// 天气缓存数据结构（仅缓存城市名称，不保存经纬度）
interface WeatherCache {
  date: string  // 缓存日期
  locationName: string  // 城市名称（用于匹配，不保存精确经纬度）
  data: WeatherData  // 天气数据
}

// 从本地存储获取天气缓存
function getWeatherCache(locationName: string): WeatherData | null {
  try {
    const cacheStr = localStorage.getItem(WEATHER_CACHE_KEY)
    if (!cacheStr) return null

    const cache: WeatherCache = JSON.parse(cacheStr)
    // 检查是否是今天的缓存且位置相同
    if (cache.date === getTodayDateStr() && cache.locationName === locationName) {
      return cache.data
    }
    return null
  } catch {
    return null
  }
}

// 保存天气缓存到本地存储
function setWeatherCache(locationName: string, data: WeatherData): void {
  try {
    const cache: WeatherCache = {
      date: getTodayDateStr(),
      locationName,
      data
    }
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache))
  } catch (err) {
    console.error('保存天气缓存失败:', err)
  }
}

// 时间天气组件 - 空闲时显示 (Monknow 风格)
export function TimeWeather({ visible = true, settings }: TimeWeatherProps) {
  const [time, setTime] = useState(new Date())
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)

  // 默认设置
  const clockFormat = settings?.clockFormat ?? '24h'
  const showSeconds = settings?.showSeconds ?? false
  const temperatureUnit = settings?.temperatureUnit ?? 'celsius'
  const location = settings?.location
  // 使用待机页设置中的 displayClock 和 displayWeather
  const showClock = settings?.standby?.displayClock !== false
  const showWeather = settings?.standby?.displayWeather !== false

  // 获取天气数据（带缓存）
  const fetchWeather = useCallback(async (loc: LocationInfo) => {
    const locationName = loc.shortname

    // 先检查缓存
    const cachedData = getWeatherCache(locationName)
    if (cachedData) {
      setWeather(cachedData)
      return
    }

    // 缓存不存在或已过期，从服务器获取
    setIsLoadingWeather(true)
    try {
      const data = await getWeather(loc)
      if (data) {
        setWeather(data)
        // 保存到缓存
        setWeatherCache(locationName, data)
      }
    } catch (err) {
      console.error('获取天气失败:', err)
    } finally {
      setIsLoadingWeather(false)
    }
  }, [])

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 获取天气数据 - 当位置变化时
  useEffect(() => {
    if (showWeather && location) {
      fetchWeather(location)
    }
  }, [showWeather, location, fetchWeather])

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

  // 格式化温度
  const formatTemp = (fahrenheit: number): string => {
    if (temperatureUnit === 'fahrenheit') {
      return `${fahrenheit}°F`
    }
    return `${fahrenheitToCelsius(fahrenheit)}°`
  }

  return (
    <div className="time-weather-content">
      {/* 主内容区 - 垂直居中 */}
      <div className="time-weather-main">
        <div className="time-weather-container">
          {/* 时间显示 - Monknow 风格 */}
          {showClock && (
            <>
              <div className="time-display">
                <span className="time-text">
                  {timeString}
                  {period && <span className="time-period">{period}</span>}
                </span>
              </div>

              {/* 日期显示 */}
              <div className="date-display">{dateStr}</div>
            </>
          )}

          {/* 天气显示 - Monknow 风格 */}
          {showWeather && (
            <div className="weather-display">
              {!location ? (
                // 未设置位置时显示提示
                <div className="weather-no-location">
                  <span>请在设置中选择天气地区</span>
                </div>
              ) : isLoadingWeather && !weather ? (
                // 加载中
                <div className="weather-loading">
                  <span>加载天气中...</span>
                </div>
              ) : weather ? (
                // 显示天气数据
                <>
                  <div className="weather-icon">
                    {getWeatherIcon(weather.yahooConditionCode)}
                  </div>
                  <div className="weather-info">
                    <span className="weather-temp">{formatTemp(weather.currentTemperatureFahrenheit)}</span>
                    <span className="weather-range">
                      {formatTemp(weather.lowTemperatureFahrenheit)} / {formatTemp(weather.highTemperatureFahrenheit)}
                    </span>
                  </div>
                </>
              ) : (
                // 获取天气失败
                <div className="weather-error">
                  <span>天气获取失败</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 提示文字 - 底部显示 */}
      {visible && (
        <div className="idle-hint-wrapper">
          <div className="idle-hint">滚动或点击</div>
        </div>
      )}
    </div>
  )
}
