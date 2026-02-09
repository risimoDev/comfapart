'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  HomeIcon,
  MapPinIcon,
  SparklesIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CloudArrowUpIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'

// Типы
interface ApartmentFormData {
  // Шаг 1: Основная информация
  title: string
  description: string
  shortDescription: string
  rooms: number
  bedrooms: number
  bathrooms: number
  area: number
  maxGuests: number
  floor: number | null
  totalFloors: number | null
  status: 'PUBLISHED' | 'DRAFT' | 'HIDDEN' | 'ARCHIVED'
  
  // Шаг 2: Адрес
  city: string
  address: string
  district: string
  latitude: number | null
  longitude: number | null
  
  // Шаг 3: Удобства
  amenityIds: string[]
  rules: { rule: string; isAllowed: boolean }[]
  
  // Шаг 4: Фотографии
  images: { id?: string; url: string; alt: string; isPrimary: boolean }[]
  
  // Шаг 5: Цены
  basePrice: number
  cleaningFee: number
  serviceFee: number
  securityDeposit: number
  weeklyDiscount: number
  monthlyDiscount: number
  minNights: number
  maxNights: number
  checkInTime: string
  checkOutTime: string
}

interface Amenity {
  id: string
  name: string
  icon: string | null
  category: string
}

const STEPS = [
  { id: 1, title: 'Основное', icon: HomeIcon, description: 'Название и характеристики' },
  { id: 2, title: 'Адрес', icon: MapPinIcon, description: 'Расположение объекта' },
  { id: 3, title: 'Удобства', icon: SparklesIcon, description: 'Удобства и правила' },
  { id: 4, title: 'Фото', icon: PhotoIcon, description: 'Фотографии объекта' },
  { id: 5, title: 'Цены', icon: CurrencyDollarIcon, description: 'Стоимость и условия' },
]

const CITIES = ['Москва', 'Санкт-Петербург', 'Сочи', 'Казань', 'Екатеринбург', 'Новосибирск', 'Калининград']

const DEFAULT_RULES = [
  { rule: 'Курение запрещено', isAllowed: false },
  { rule: 'Размещение с животными', isAllowed: false },
  { rule: 'Проведение мероприятий', isAllowed: false },
  { rule: 'Заселение с детьми', isAllowed: true },
]

interface PageProps {
  params: { id: string } | Promise<{ id: string }>
}

export default function EditApartmentPage({ params }: PageProps) {
  // Handle both sync and async params (Next.js 14 compatibility)
  const resolvedParams = params instanceof Promise ? use(params) : params
  const router = useRouter()
  const { accessToken } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ApartmentFormData | null>(null)
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadingImage, setUploadingImage] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [resolvedParams.id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const headers = {
        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
      }
      const [apartmentRes, amenitiesRes] = await Promise.all([
        fetch(`/api/admin/apartments/${resolvedParams.id}`, { headers }),
        fetch('/api/amenities'),
      ])

      if (apartmentRes.ok) {
        const result = await apartmentRes.json()
        const apt = result.data

        // Преобразуем данные апартамента в формат формы
        setFormData({
          title: apt.title || '',
          description: apt.description || '',
          shortDescription: apt.shortDescription || '',
          rooms: apt.rooms || 1,
          bedrooms: apt.bedrooms || 1,
          bathrooms: apt.bathrooms || 1,
          area: apt.area || 30,
          maxGuests: apt.maxGuests || 2,
          floor: apt.floor,
          totalFloors: apt.totalFloors,
          status: apt.status || 'DRAFT',
          city: apt.city || '',
          address: apt.address || '',
          district: apt.district || '',
          latitude: apt.latitude,
          longitude: apt.longitude,
          amenityIds: apt.amenities?.map((a: any) => a.id) || [],
          rules: apt.rules?.length ? apt.rules : DEFAULT_RULES,
          images: apt.images || [],
          basePrice: apt.pricing?.basePrice || 3000,
          cleaningFee: apt.pricing?.cleaningFee || 0,
          serviceFee: apt.pricing?.serviceFee || 0,
          securityDeposit: apt.pricing?.securityDeposit || 0,
          weeklyDiscount: apt.pricing?.weeklyDiscount || 0,
          monthlyDiscount: apt.pricing?.monthlyDiscount || 0,
          minNights: apt.minNights || 1,
          maxNights: apt.maxNights || 30,
          checkInTime: apt.checkInTime || '14:00',
          checkOutTime: apt.checkOutTime || '12:00',
        })
      } else {
        showNotification('error', 'Объект не найден')
        router.push('/admin/apartments')
        return
      }

      if (amenitiesRes.ok) {
        const result = await amenitiesRes.json()
        if (result.success && result.data?.all) {
          setAmenities(result.data.all)
        } else if (Array.isArray(result)) {
          setAmenities(result)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      showNotification('error', 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const updateFormData = useCallback((updates: Partial<ApartmentFormData>) => {
    setFormData(prev => prev ? { ...prev, ...updates } : null)
    Object.keys(updates).forEach(key => {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    })
  }, [])

  const validateStep = (step: number): boolean => {
    if (!formData) return false
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Введите название'
        if (formData.title.length < 5) newErrors.title = 'Минимум 5 символов'
        if (!formData.description.trim()) newErrors.description = 'Введите описание'
        if (formData.description.length < 50) newErrors.description = 'Минимум 50 символов'
        if (formData.area < 10) newErrors.area = 'Минимум 10 м²'
        break
      case 2:
        if (!formData.city) newErrors.city = 'Выберите город'
        if (!formData.address.trim()) newErrors.address = 'Введите адрес'
        break
      case 3:
        if (formData.amenityIds.length < 3) newErrors.amenities = 'Выберите минимум 3 удобства'
        break
      case 4:
        if (formData.images.length < 1) newErrors.images = 'Загрузите минимум 1 фотографию'
        break
      case 5:
        if (formData.basePrice < 500) newErrors.basePrice = 'Минимальная цена 500 ₽'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return
    const files = e.target.files
    if (!files?.length) return

    setUploadingImage(true)
    
    try {
      const formDataUpload = new FormData()
      Array.from(files).forEach(file => {
        formDataUpload.append('images', file)
      })

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: formDataUpload,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const newImages = result.data.images.map((img: { url: string; originalName: string }, index: number) => ({
          url: img.url,
          alt: img.originalName,
          isPrimary: formData.images.length === 0 && index === 0,
        }))
        updateFormData({ images: [...formData.images, ...newImages] })
      } else {
        setErrors({ images: result.error || 'Ошибка загрузки изображений' })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setErrors({ images: 'Ошибка загрузки изображений' })
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = (index: number) => {
    if (!formData) return
    const newImages = formData.images.filter((_, i) => i !== index)
    if (formData.images[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true
    }
    updateFormData({ images: newImages })
  }

  const setPrimaryImage = (index: number) => {
    if (!formData) return
    const newImages = formData.images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }))
    updateFormData({ images: newImages })
  }

  const handleSubmit = async () => {
    if (!formData || !validateStep(5)) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/apartments/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        showNotification('success', 'Изменения сохранены')
        setTimeout(() => router.push('/admin/apartments'), 1000)
      } else {
        const error = await response.json()
        setErrors({ submit: error.message || 'Ошибка сохранения' })
      }
    } catch (error) {
      setErrors({ submit: 'Ошибка сети' })
    } finally {
      setSaving(false)
    }
  }

  // Группировка удобств по категориям
  const amenitiesByCategory = Array.isArray(amenities) 
    ? amenities.reduce((acc, amenity) => {
        if (!acc[amenity.category]) acc[amenity.category] = []
        acc[amenity.category].push(amenity)
        return acc
      }, {} as Record<string, Amenity[]>)
    : {}

  const categoryNames: Record<string, string> = {
    general: 'Общие',
    kitchen: 'Кухня',
    bathroom: 'Ванная',
    bedroom: 'Спальня',
    entertainment: 'Развлечения',
    outdoor: 'На улице',
    safety: 'Безопасность',
    services: 'Услуги',
  }

  if (loading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/apartments')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Редактирование объекта</h1>
                <p className="text-sm text-gray-500">{formData.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={formData.status}
                onChange={(e) => updateFormData({ status: e.target.value as ApartmentFormData['status'] })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="DRAFT">Черновик</option>
                <option value="PUBLISHED">Опубликован</option>
                <option value="HIDDEN">Скрыт</option>
                <option value="ARCHIVED">В архиве</option>
              </select>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className="flex items-center gap-3 group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className={`font-medium ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`hidden lg:block w-12 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{errors.submit}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Шаг 1: Основная информация */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Основная информация</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название объекта *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Например: Уютная студия в центре города"
                  />
                  {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    rows={5}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Подробное описание апартаментов..."
                  />
                  {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                  <p className="text-sm text-gray-500 mt-1">{formData.description.length} / 50 символов минимум</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Краткое описание
                  </label>
                  <input
                    type="text"
                    value={formData.shortDescription}
                    onChange={(e) => updateFormData({ shortDescription: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Краткое описание для карточки"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Комнат</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.rooms}
                      onChange={(e) => updateFormData({ rooms: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Спален</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.bedrooms}
                      onChange={(e) => updateFormData({ bedrooms: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ванных</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.bathrooms}
                      onChange={(e) => updateFormData({ bathrooms: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Площадь м²</label>
                    <input
                      type="number"
                      min={10}
                      value={formData.area}
                      onChange={(e) => updateFormData({ area: parseInt(e.target.value) || 10 })}
                      className={`w-full px-4 py-3 border rounded-lg ${
                        errors.area ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Макс. гостей</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.maxGuests}
                      onChange={(e) => updateFormData({ maxGuests: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Этаж</label>
                    <input
                      type="number"
                      value={formData.floor || ''}
                      onChange={(e) => updateFormData({ floor: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Всего этажей</label>
                    <input
                      type="number"
                      value={formData.totalFloors || ''}
                      onChange={(e) => updateFormData({ totalFloors: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 2: Адрес */}
            {currentStep === 2 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Расположение</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Город *</label>
                  <select
                    value={formData.city}
                    onChange={(e) => updateFormData({ city: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg ${
                      errors.city ? 'border-red-500' : 'border-gray-200'
                    }`}
                  >
                    <option value="">Выберите город</option>
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Адрес *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateFormData({ address: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg ${
                      errors.address ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="ул. Пушкина, д. 10, кв. 5"
                  />
                  {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Район</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => updateFormData({ district: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    placeholder="Центральный"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Широта</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude || ''}
                      onChange={(e) => updateFormData({ latitude: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                      placeholder="55.7558"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Долгота</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude || ''}
                      onChange={(e) => updateFormData({ longitude: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                      placeholder="37.6173"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 3: Удобства */}
            {currentStep === 3 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Удобства</h2>
                {errors.amenities && <p className="text-sm text-red-500">{errors.amenities}</p>}

                {Object.entries(amenitiesByCategory).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="font-medium text-gray-700 mb-3">{categoryNames[category] || category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {items.map(amenity => (
                        <label
                          key={amenity.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                            formData.amenityIds.includes(amenity.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.amenityIds.includes(amenity.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateFormData({ amenityIds: [...formData.amenityIds, amenity.id] })
                              } else {
                                updateFormData({ amenityIds: formData.amenityIds.filter(id => id !== amenity.id) })
                              }
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">{amenity.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="mt-8">
                  <h3 className="font-medium text-gray-700 mb-3">Правила проживания</h3>
                  <div className="space-y-3">
                    {formData.rules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <span className="text-gray-700">{rule.rule}</span>
                        <button
                          onClick={() => {
                            const newRules = [...formData.rules]
                            newRules[index] = { ...rule, isAllowed: !rule.isAllowed }
                            updateFormData({ rules: newRules })
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                            rule.isAllowed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {rule.isAllowed ? 'Разрешено' : 'Запрещено'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 4: Фотографии */}
            {currentStep === 4 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Фотографии</h2>
                {errors.images && <p className="text-sm text-red-500">{errors.images}</p>}

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Перетащите фотографии сюда или</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition">
                    <PlusIcon className="h-5 w-5" />
                    Выберите файлы
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPrimaryImage(index)}
                            className={`p-2 rounded-full ${
                              image.isPrimary ? 'bg-yellow-500' : 'bg-white/20 hover:bg-white/30'
                            }`}
                            title={image.isPrimary ? 'Главное фото' : 'Сделать главным'}
                          >
                            ⭐
                          </button>
                          <button
                            onClick={() => removeImage(index)}
                            className="p-2 bg-red-500 rounded-full text-white"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        {image.isPrimary && (
                          <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded">
                            Главное
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Шаг 5: Цены */}
            {currentStep === 5 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Ценообразование</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Базовая цена за ночь *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={500}
                        value={formData.basePrice}
                        onChange={(e) => updateFormData({ basePrice: parseInt(e.target.value) || 500 })}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg ${
                          errors.basePrice ? 'border-red-500' : 'border-gray-200'
                        }`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                    </div>
                    {errors.basePrice && <p className="text-sm text-red-500 mt-1">{errors.basePrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Сбор за уборку</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={formData.cleaningFee}
                        onChange={(e) => updateFormData({ cleaningFee: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Залог</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={formData.securityDeposit}
                        onChange={(e) => updateFormData({ securityDeposit: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Сервисный сбор</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.serviceFee}
                        onChange={(e) => updateFormData({ serviceFee: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Скидка за неделю</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.weeklyDiscount}
                        onChange={(e) => updateFormData({ weeklyDiscount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Скидка за месяц</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.monthlyDiscount}
                        onChange={(e) => updateFormData({ monthlyDiscount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Мин. ночей</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.minNights}
                      onChange={(e) => updateFormData({ minNights: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Макс. ночей</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.maxNights}
                      onChange={(e) => updateFormData({ maxNights: parseInt(e.target.value) || 30 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Заезд</label>
                    <input
                      type="time"
                      value={formData.checkInTime}
                      onChange={(e) => updateFormData({ checkInTime: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Выезд</label>
                    <input
                      type="time"
                      value={formData.checkOutTime}
                      onChange={(e) => updateFormData({ checkOutTime: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Назад
          </button>

          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Далее
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-5 w-5" />
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
