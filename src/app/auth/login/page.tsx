'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Введите пароль')
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isLoading: authLoading, isTelegramVerified } = useAuth()
  
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Редирект если уже авторизован
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (!isTelegramVerified) {
        router.push('/auth/verify-telegram')
      } else {
        const returnUrl = searchParams.get('returnUrl') || '/'
        router.push(returnUrl)
      }
    }
  }, [authLoading, isAuthenticated, isTelegramVerified, router, searchParams])

  // Проверяем параметры URL
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Регистрация успешна! Теперь вы можете войти.')
    }
    if (searchParams.get('logout') === 'true') {
      setSuccessMessage('Вы успешно вышли из системы.')
    }
    if (searchParams.get('session_expired') === 'true') {
      setError('Сессия истекла. Пожалуйста, войдите снова.')
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    const result = await login(data.email, data.password)

    if (!result.success) {
      setError(result.error || 'Ошибка входа')
      setIsLoading(false)
      return
    }

    // Редирект обработается через useEffect выше
    setIsLoading(false)
  }

  // Показываем загрузку пока проверяем авторизацию
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
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
            <Link href="/" className="inline-block mb-6">
              <span className="text-2xl font-display font-bold text-primary">
                Comfort
              </span>
            </Link>
            <h1 className="text-2xl font-bold mb-2">Вход в аккаунт</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Рады видеть вас снова!
            </p>
          </div>

          {/* Сообщение об успехе */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Форма */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="ivan@example.com"
              icon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                placeholder="Введите пароль"
                icon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Запомнить и Забыли пароль */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Запомнить меня
                </span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Забыли пароль?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              Войти
            </Button>
          </form>

          {/* Разделитель */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">
                или
              </span>
            </div>
          </div>

          {/* Социальные кнопки */}
          <div className="space-y-3">
            <button 
              type="button"
              className="w-full px-4 py-3 border rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setError('OAuth в разработке')}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Продолжить с Google
            </button>

            <button 
              type="button"
              className="w-full px-4 py-3 border rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setError('OAuth в разработке')}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.5 4.5c-4.385 0-7.95 3.52-8 7.88-.03 2.54 1.18 4.8 3.11 6.23.14.1.3.15.47.15.11 0 .22-.02.32-.07.26-.11.44-.34.5-.62l.44-2.16c.09-.4-.06-.82-.38-1.06-.9-.67-1.44-1.73-1.44-2.87 0-2.02 1.69-3.67 3.77-3.67 1.69 0 3.15 1.1 3.57 2.7.06.22.08.45.08.67 0 1.14-.54 2.2-1.44 2.87-.32.24-.47.66-.38 1.06l.44 2.16c.06.28.24.51.5.62.1.05.21.07.32.07.17 0 .33-.05.47-.15 1.93-1.43 3.14-3.69 3.11-6.23-.05-4.36-3.615-7.88-8-7.88z"/>
              </svg>
              Продолжить с Яндекс
            </button>
          </div>

          {/* Ссылка на регистрацию */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            Нет аккаунта?{' '}
            <Link href="/auth/register" className="text-primary font-medium hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
