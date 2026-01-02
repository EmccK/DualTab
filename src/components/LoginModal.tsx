import { useState, useEffect } from 'react'
import type { UserInfo } from '../services/api'
import { login, register, getCaptcha } from '../services/api'
import './LoginModal.css'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (user: UserInfo) => void
}

type Mode = 'login' | 'register'

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [captchaUrl, setCaptchaUrl] = useState('')
  const [captchaKey, setCaptchaKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 刷新验证码
  const refreshCaptcha = async () => {
    const { url, key } = await getCaptcha()
    setCaptchaUrl(url)
    setCaptchaKey(key)
    setCaptcha('')
  }

  // 切换模式时刷新验证码
  useEffect(() => {
    if (isOpen && mode === 'register') {
      refreshCaptcha()
    }
  }, [isOpen, mode])

  // 重置表单
  useEffect(() => {
    if (!isOpen) {
      setEmail('')
      setPassword('')
      setCaptcha('')
      setError('')
      setMode('login')
    }
  }, [isOpen])

  // 处理登录
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const user = await login(email, password)
      onLogin(user)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  // 处理注册
  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !captcha.trim()) {
      setError('请填写完整信息')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      await register(email, password, captcha, captchaKey)
      // 注册成功后自动登录
      const user = await login(email, password)
      onLogin(user)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  // 切换模式
  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  // 处理回车键提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      if (mode === 'login') {
        handleLogin()
      } else {
        handleRegister()
      }
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="login-modal-overlay" onClick={onClose} />
      <div className="login-modal">
        <div className="login-modal-header">
          {mode === 'login' ? '欢迎回来' : '注册一个账号以同步您的资料'}
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="login-form">
          <input
            type="email"
            placeholder="电子邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={mode === 'login' ? handleKeyDown : undefined}
            disabled={loading}
          />

          {mode === 'register' && (
            <div className="captcha-row">
              <input
                type="text"
                placeholder="验证码"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <img 
                src={captchaUrl} 
                alt="验证码" 
                onClick={refreshCaptcha}
                title="点击刷新"
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="login-links">
              <span className="forgot-password">忘记密码？</span>
            </div>
          )}

          <button 
            className="login-btn"
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>

          <div className="login-switch">
            <span onClick={switchMode}>
              {mode === 'login' ? '没有账户，即刻注册' : '已有账户，即刻登录'}
            </span>
          </div>

          <div className="login-logout" onClick={onClose}>
            保持登出
          </div>
        </div>
      </div>
    </>
  )
}
