'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Send, Copy, CheckCircle, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react'
import { useAuth, useAuthFetch } from '@/contexts/AuthContext'
import { Button } from '@/components/ui'

export default function VerifyTelegramPage() {
  const { user, isLoading: authLoading, isTelegramVerified, updateUser } = useAuth()
  const authFetch = useAuthFetch()
  const router = useRouter()

  const [verificationCode, setVerificationCode] = useState<string | null>(null)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [botUsername, setBotUsername] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Получаем код верификации
  const fetchVerificationCode = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authFetch('/api/telegram/verify')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка получения кода')
      }

      const { code, deepLink: link, botUsername: bot, expiresIn } = result.data
      setVerificationCode(code)
      setDeepLink(link)
      setBotUsername(bot)
      setExpiresAt(new Date(Date.now() + expiresIn * 1000))
      setTimeLeft(expiresIn)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setIsLoading(false)
    }
  }, [authFetch])

  // Проверяем статус верификации
  const checkVerificationStatus = useCallback(async () => {
    try {
      const response = await authFetch('/api/auth/profile')
      const result = await response.json()

      console.log('Checking verification status:', result.data?.telegramVerified)

      if (result.success && result.data?.telegramVerified) {
        // Обновляем пользователя полными данными из профиля
        updateUser(result.data)
        // Небольшая задержка для обновления контекста
        setTimeout(() => {
          router.push('/')
        }, 100)
      }
    } catch (err) {
      console.error('Error checking verification:', err)
    }
  }, [authFetch, updateUser, router])

  // Загружаем код при монтировании
  useEffect(() => {
    if (!authLoading && user && !isTelegramVerified) {
      fetchVerificationCode()
    }
  }, [authLoading, user, isTelegramVerified, fetchVerificationCode])

  // Редирект если уже верифицирован
  useEffect(() => {
    if (!authLoading && isTelegramVerified) {
      router.push('/')
    }
  }, [authLoading, isTelegramVerified, router])

  // Таймер обратного отсчёта
  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setTimeLeft(remaining)

      if (remaining === 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  // Периодическая проверка статуса
  useEffect(() => {
    if (!verificationCode || isTelegramVerified) return

    const interval = setInterval(checkVerificationStatus, 3000)
    return () => clearInterval(interval)
  }, [verificationCode, isTelegramVerified, checkVerificationStatus])

  // Копирование кода
  const copyCode = async () => {
    if (!verificationCode) return
    
    try {
      await navigator.clipboard.writeText(verificationCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.createElement('input')
      input.value = verificationCode
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/auth/login')
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Подтвердите аккаунт</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Привяжите Telegram для доступа ко всем функциям
            </p>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Код верификации */}
          {verificationCode && (
            <>
              {/* Инструкции */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <h3 className="font-medium mb-3 text-blue-800 dark:text-blue-200">
                  Как подтвердить:
                </h3>
                <ol className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs">1</span>
                    <span>Откройте бота <strong>@{botUsername}</strong> в Telegram</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs">2</span>
                    <span>Нажмите Start или отправьте код</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs">3</span>
                    <span>Верификация произойдёт автоматически</span>
                  </li>
                </ol>
              </div>

              {/* Код */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
                  Ваш код верификации:
                </p>
                <div 
                  className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={copyCode}
                >
                  <code className="text-3xl font-mono font-bold tracking-widest text-gray-900 dark:text-white">
                    {verificationCode}
                  </code>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Нажмите, чтобы скопировать</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Таймер */}
                <p className={`text-center mt-3 text-sm ${timeLeft < 60 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {timeLeft > 0 ? (
                    <>Код действителен: {formatTime(timeLeft)}</>
                  ) : (
                    <>Код истёк</>
                  )}
                </p>
              </div>

              {/* Кнопки */}
              <div className="space-y-3">
                <a
                  href={deepLink!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                >
                  <Send className="w-5 h-5" />
                  Открыть Telegram
                  <ExternalLink className="w-4 h-4" />
                </a>

                {timeLeft === 0 && (
                  <Button
                    onClick={fetchVerificationCode}
                    loading={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Получить новый код
                  </Button>
                )}
              </div>

              {/* Статус проверки */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Ожидание верификации...
                </p>
              </div>
            </>
          )}

          {/* Загрузка */}
          {isLoading && !verificationCode && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Генерация кода...</p>
            </div>
          )}

          {/* Ссылка на выход */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <Link
              href="/auth/login"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Войти в другой аккаунт
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
