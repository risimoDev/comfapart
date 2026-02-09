'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, Send, AlertCircle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import toast from 'react-hot-toast'

// Telegram icon component
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
)

const forgotPasswordSchema = z.object({
  email: z.string().email('Некорректный email'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setErrorMessage(null)
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      const result = await response.json()

      if (response.status === 429) {
        toast.error(result.error || 'Слишком много запросов')
        return
      }

      if (!response.ok) {
        setErrorMessage(result.error || 'Ошибка запроса')
        return
      }

      setSubmittedEmail(data.email)
      setIsSuccess(true)
    } catch (err: any) {
      toast.error('Ошибка отправки запроса')
    } finally {
      setIsLoading(false)
    }
  }

  // Успешная отправка
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <TelegramIcon className="w-8 h-8 text-[#0088cc]" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Проверьте Telegram</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Мы отправили ссылку для сброса пароля в Telegram, 
            привязанный к аккаунту <strong>{submittedEmail}</strong>.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Откройте бот <strong>@ComfortApartmentsBot</strong> в Telegram и нажмите кнопку "Сбросить пароль"
            </p>
          </div>
          <div className="space-y-3">
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Вернуться ко входу
              </Button>
            </Link>
            <p className="text-sm text-gray-500">
              Не получили сообщение?{' '}
              <button 
                onClick={() => setIsSuccess(false)} 
                className="text-primary hover:underline"
              >
                Попробуйте ещё раз
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#0088cc]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <TelegramIcon className="w-8 h-8 text-[#0088cc]" />
            </div>
            <h1 className="text-2xl font-bold">Забыли пароль?</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Введите email — мы отправим ссылку для сброса в Telegram
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-600">{errorMessage}</p>
                {errorMessage.includes('Telegram не привязан') && (
                  <a 
                    href="https://t.me/ComfortApartmentsSupport" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-red-600 underline mt-1 block"
                  >
                    Написать в поддержку
                  </a>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                'Отправка...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Отправить ссылку в Telegram
                </>
              )}
            </Button>
          </form>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              ⚠️ Для восстановления пароля требуется привязанный Telegram. 
              Если Telegram не привязан, обратитесь в поддержку.
            </p>
          </div>

          <div className="text-center">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться ко входу
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
