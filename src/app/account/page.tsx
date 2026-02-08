'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import toast from 'react-hot-toast'

const profileSchema = z.object({
  firstName: z.string().min(2, 'Минимум 2 символа'),
  lastName: z.string().min(2, 'Минимум 2 символа'),
  phone: z.string().min(10, 'Введите корректный номер телефона'),
  email: z.string().email('Неверный формат email')
})

type ProfileFormData = z.infer<typeof profileSchema>

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar: string | null
  role: string
  createdAt: string
}

export default function AccountPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  })

  // Загрузка данных пользователя
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          reset({
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            phone: data.user.phone || '',
            email: data.user.email
          })
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [reset])

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true)

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка сохранения')
      }

      const updatedUser = await response.json()
      setUser(updatedUser)
      toast.success('Профиль обновлен')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p>Не удалось загрузить данные профиля</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Аватар */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {user.firstName[0]}
                </span>
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-400 mt-1">
              На платформе с {new Date(user.createdAt).getFullYear()} года
            </p>
          </div>
        </div>
      </div>

      {/* Форма профиля */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6">Личные данные</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Имя"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Фамилия"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Телефон"
            type="tel"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!isDirty || isSaving}
              loading={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить изменения
            </Button>
          </div>
        </form>
      </div>

      {/* Статистика */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Статистика</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-sm text-gray-500">Бронирований</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-sm text-gray-500">Отзывов</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-sm text-gray-500">В избранном</p>
          </div>
        </div>
      </div>
    </div>
  )
}
