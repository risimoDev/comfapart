'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  Lock,
  Bell,
  Shield,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Mail,
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import toast from 'react-hot-toast'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(8, 'Минимум 8 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
})

type PasswordFormData = z.infer<typeof passwordSchema>

interface NotificationSettings {
  emailBookings: boolean
  emailPromo: boolean
  emailReviews: boolean
  pushBookings: boolean
  pushMessages: boolean
  smsBookings: boolean
}

export default function SettingsPage() {
  const { accessToken } = useAuth()
  const [activeTab, setActiveTab] = useState<'password' | 'notifications' | 'security'>('password')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailBookings: true,
    emailPromo: false,
    emailReviews: true,
    pushBookings: true,
    pushMessages: true,
    smsBookings: true,
  })

  // Загружаем настройки уведомлений при монтировании
  useEffect(() => {
    if (!accessToken) return

    fetch('/api/auth/notifications', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setNotifications(prev => ({ ...prev, ...data.data }))
        }
      })
      .catch(console.error)
  }, [accessToken])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  })

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка смены пароля')
      }

      toast.success('Пароль успешно изменён')
      reset()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const saveNotifications = async () => {
    setIsSavingNotifications(true)
    try {
      const response = await fetch('/api/auth/notifications', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify(notifications),
      })

      if (!response.ok) {
        throw new Error('Ошибка сохранения')
      }

      toast.success('Настройки сохранены')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSavingNotifications(false)
    }
  }

  const tabs = [
    { id: 'password', label: 'Пароль', icon: Lock },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'security', label: 'Безопасность', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Настройки</h1>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-4 mb-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Password Tab */}
        {activeTab === 'password' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold mb-4">Смена пароля</h2>
            <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
              <div className="relative">
                <Input
                  label="Текущий пароль"
                  type={showCurrentPassword ? 'text' : 'password'}
                  error={errors.currentPassword?.message}
                  {...register('currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Новый пароль"
                  type={showNewPassword ? 'text' : 'password'}
                  error={errors.newPassword?.message}
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <Input
                label="Подтвердите пароль"
                type="password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button type="submit" loading={isChangingPassword}>
                <Save className="w-4 h-4 mr-2" />
                Изменить пароль
              </Button>
            </form>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold mb-4">Настройки уведомлений</h2>
            
            <div className="space-y-6">
              {/* Email уведомления */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Email-уведомления
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                    <span>Бронирования и оплаты</span>
                    <input
                      type="checkbox"
                      checked={notifications.emailBookings}
                      onChange={() => handleNotificationChange('emailBookings')}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                    <span>Акции и специальные предложения</span>
                    <input
                      type="checkbox"
                      checked={notifications.emailPromo}
                      onChange={() => handleNotificationChange('emailPromo')}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                    <span>Отзывы и рейтинги</span>
                    <input
                      type="checkbox"
                      checked={notifications.emailReviews}
                      onChange={() => handleNotificationChange('emailReviews')}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                  </label>
                </div>
              </div>

              {/* Push уведомления */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Push-уведомления
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                    <span>Статус бронирования</span>
                    <input
                      type="checkbox"
                      checked={notifications.pushBookings}
                      onChange={() => handleNotificationChange('pushBookings')}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                    <span>Сообщения от владельцев</span>
                    <input
                      type="checkbox"
                      checked={notifications.pushMessages}
                      onChange={() => handleNotificationChange('pushMessages')}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                  </label>
                </div>
              </div>

              {/* SMS */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  SMS-уведомления
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                    <span>Подтверждение и напоминания о бронировании</span>
                    <input
                      type="checkbox"
                      checked={notifications.smsBookings}
                      onChange={() => handleNotificationChange('smsBookings')}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                  </label>
                </div>
              </div>

              <Button onClick={saveNotifications} loading={isSavingNotifications}>
                <Save className="w-4 h-4 mr-2" />
                Сохранить настройки
              </Button>
            </div>
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold mb-4">Безопасность аккаунта</h2>
            
            <div className="space-y-4">
              {/* 2FA */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium mb-1">Двухфакторная аутентификация</h3>
                    <p className="text-sm text-gray-500">
                      Добавьте дополнительный уровень защиты для вашего аккаунта
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                    Отключено
                  </span>
                </div>
                <Button variant="outline" className="mt-3" disabled>
                  Настроить 2FA (скоро)
                </Button>
              </div>

              {/* Активные сессии */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <h3 className="font-medium mb-3">Активные сессии</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Текущая сессия</p>
                        <p className="text-sm text-gray-500">Браузер • Пермь, Россия</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600">Активна</span>
                  </div>
                </div>
                <Button variant="outline" className="mt-3 text-red-500 border-red-300 hover:bg-red-50">
                  Завершить все другие сессии
                </Button>
              </div>

              {/* Удаление аккаунта */}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-700 dark:text-red-400 mb-1">
                      Удаление аккаунта
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                      После удаления аккаунта все ваши данные будут безвозвратно удалены. 
                      Это действие нельзя отменить.
                    </p>
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-100">
                      Удалить аккаунт
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
