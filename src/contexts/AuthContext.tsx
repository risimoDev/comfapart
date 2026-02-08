'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: 'USER' | 'OWNER' | 'TECH_ADMIN'
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED'
  emailVerified: boolean
  telegramVerified: boolean
  telegramUsername?: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isTelegramVerified: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>
  logout: () => Promise<void>
  refreshAuth: () => Promise<boolean>
  updateUser: (user: User) => void
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACCESS_TOKEN_KEY = 'accessToken'
const ACCESS_TOKEN_EXPIRES_KEY = 'accessTokenExpiresAt'
const USER_KEY = 'user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Проверка валидности токена по времени
  const isTokenExpired = useCallback((expiresAt: string | null): boolean => {
    if (!expiresAt) return true
    const expiryTime = new Date(expiresAt).getTime()
    // Считаем токен истёкшим за 30 секунд до реального времени истечения
    return Date.now() > expiryTime - 30000
  }, [])

  // Refresh токенов через httpOnly cookie
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Важно для отправки httpOnly cookie
      })

      if (!response.ok) {
        throw new Error('Refresh failed')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        const { accessToken: newToken, accessTokenExpiresAt, user: userData } = result.data
        
        setAccessToken(newToken)
        setUser(userData)
        
        // Сохраняем в localStorage
        localStorage.setItem(ACCESS_TOKEN_KEY, newToken)
        localStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, accessTokenExpiresAt)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
        
        return true
      }
      
      return false
    } catch {
      // Очищаем данные при ошибке refresh
      setAccessToken(null)
      setUser(null)
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY)
      localStorage.removeItem(USER_KEY)
      return false
    }
  }, [])

  // Инициализация при загрузке
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      
      try {
        const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        const storedExpires = localStorage.getItem(ACCESS_TOKEN_EXPIRES_KEY)
        const storedUser = localStorage.getItem(USER_KEY)

        if (storedToken && storedUser) {
          // Проверяем не истёк ли токен
          if (!isTokenExpired(storedExpires)) {
            setAccessToken(storedToken)
            setUser(JSON.parse(storedUser))
          } else {
            // Пробуем обновить токен
            await refreshAuth()
          }
        }
      } catch (error) {
        console.error('Auth init error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [isTokenExpired, refreshAuth])

  // Автоматический refresh токена перед истечением
  useEffect(() => {
    if (!accessToken) return

    const expiresAt = localStorage.getItem(ACCESS_TOKEN_EXPIRES_KEY)
    if (!expiresAt) return

    const expiryTime = new Date(expiresAt).getTime()
    // Обновляем за 1 минуту до истечения
    const refreshTime = expiryTime - Date.now() - 60000

    if (refreshTime <= 0) {
      refreshAuth()
      return
    }

    const timeoutId = setTimeout(() => {
      refreshAuth()
    }, refreshTime)

    return () => clearTimeout(timeoutId)
  }, [accessToken, refreshAuth])

  // Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        return { success: false, error: result.error || 'Ошибка входа' }
      }

      const { accessToken: newToken, accessTokenExpiresAt, user: userData } = result.data

      setAccessToken(newToken)
      setUser(userData)

      localStorage.setItem(ACCESS_TOKEN_KEY, newToken)
      localStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, accessTokenExpiresAt)
      localStorage.setItem(USER_KEY, JSON.stringify(userData))

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка сети' 
      }
    }
  }, [])

  // Register
  const register = useCallback(async (data: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        return { success: false, error: result.error || 'Ошибка регистрации' }
      }

      const { accessToken: newToken, accessTokenExpiresAt, user: userData } = result.data

      setAccessToken(newToken)
      setUser(userData)

      localStorage.setItem(ACCESS_TOKEN_KEY, newToken)
      localStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, accessTokenExpiresAt)
      localStorage.setItem(USER_KEY, JSON.stringify(userData))

      // Если пользователь не верифицирован через Telegram
      const needsVerification = !userData.telegramVerified

      return { success: true, needsVerification }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка сети' 
      }
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setAccessToken(null)
      setUser(null)
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY)
      localStorage.removeItem(USER_KEY)
      router.push('/auth/login?logout=true')
    }
  }, [accessToken, router])

  // Update user (для обновления после верификации)
  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
  }, [])

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    isTelegramVerified: user?.telegramVerified ?? false,
    login,
    register,
    logout,
    refreshAuth,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// HOC для защиты страниц
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: { requireTelegram?: boolean; allowedRoles?: string[] }
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading, isAuthenticated, isTelegramVerified } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (isLoading) return

      if (!isAuthenticated) {
        router.push('/auth/login')
        return
      }

      // Проверяем Telegram верификацию
      if (options?.requireTelegram && !isTelegramVerified) {
        router.push('/auth/verify-telegram')
        return
      }

      // Проверяем роль
      if (options?.allowedRoles && user && !options.allowedRoles.includes(user.role)) {
        router.push('/')
        return
      }
    }, [isLoading, isAuthenticated, isTelegramVerified, user, router])

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return null
    }

    if (options?.requireTelegram && !isTelegramVerified) {
      return null
    }

    return <WrappedComponent {...props} />
  }
}

// Хук для API запросов с авторизацией
export function useAuthFetch() {
  const { accessToken, refreshAuth, logout } = useAuth()

  const authFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = new Headers(options.headers)
    
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    })

    // Если получили 401, пробуем обновить токен
    if (response.status === 401 && accessToken) {
      const refreshed = await refreshAuth()
      
      if (refreshed) {
        // Повторяем запрос с новым токеном
        const newToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`)
          response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          })
        }
      } else {
        // Refresh не удался - разлогиниваем
        await logout()
      }
    }

    return response
  }, [accessToken, refreshAuth, logout])

  return authFetch
}
