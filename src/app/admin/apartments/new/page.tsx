'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
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
import { AmenityIcon } from '@/components/apartments'

// Динамический импорт карты (отключаем SSR)
const MapPicker = dynamic(() => import('@/components/MapPicker'), { 
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Загрузка карты...</div>
    </div>
  )
})

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
  images: { url: string; alt: string; isPrimary: boolean }[]
  
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

// Координаты центра Перми для карты по умолчанию
const PERM_CENTER = { lat: 58.0105, lng: 56.2502 }

const DEFAULT_RULES = [
  { rule: 'Курение запрещено', isAllowed: false },
  { rule: 'Размещение с животными', isAllowed: false },
  { rule: 'Проведение мероприятий', isAllowed: false },
  { rule: 'Заселение с детьми', isAllowed: true },
]

const initialFormData: ApartmentFormData = {
  title: '',
  description: '',
  shortDescription: '',
  rooms: 1,
  bedrooms: 1,
  bathrooms: 1,
  area: 30,
  maxGuests: 2,
  floor: null,
  totalFloors: null,
  city: 'Пермь',
  address: '',
  district: '',
  latitude: null,
  longitude: null,
  amenityIds: [],
  rules: DEFAULT_RULES,
  images: [],
  basePrice: 3000,
  cleaningFee: 1000,
  serviceFee: 0,
  securityDeposit: 5000,
  weeklyDiscount: 10,
  monthlyDiscount: 20,
  minNights: 1,
  maxNights: 30,
  checkInTime: '14:00',
  checkOutTime: '12:00',
}

export default function NewApartmentPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ApartmentFormData>(initialFormData)
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchAmenities()
  }, [])

  const fetchAmenities = async () => {
    try {
      const response = await fetch('/api/amenities')
      if (response.ok) {
        const result = await response.json()
        // API возвращает { success, data: { all, grouped } }
        if (result.success && result.data?.all) {
          setAmenities(result.data.all)
        } else if (Array.isArray(result)) {
          setAmenities(result)
        } else {
          setAmenities([])
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки удобств:', error)
      setAmenities([])
    }
  }

  const updateFormData = useCallback((updates: Partial<ApartmentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    // Очищаем ошибки при изменении
    Object.keys(updates).forEach(key => {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    })
  }, [])

  const validateStep = (step: number): boolean => {
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
        if (!formData.address.trim()) newErrors.address = 'Введите адрес'
        break
      case 3:
        if (formData.amenityIds.length < 3) newErrors.amenities = 'Выберите минимум 3 удобства'
        break
      case 4:
        if (formData.images.length < 3) newErrors.images = 'Загрузите минимум 3 фотографии'
        if (!formData.images.some(img => img.isPrimary)) newErrors.images = 'Выберите главное фото'
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
    const files = e.target.files
    if (!files?.length) return

    setUploadingImage(true)
    
    // Симуляция загрузки - в реальном проекте здесь будет upload на S3/Cloudinary
    const newImages = Array.from(files).map((file, index) => ({
      url: URL.createObjectURL(file),
      alt: file.name,
      isPrimary: formData.images.length === 0 && index === 0,
    }))

    updateFormData({ images: [...formData.images, ...newImages] })
    setUploadingImage(false)
  }

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index)
    // Если удалили главное фото, сделаем первое главным
    if (formData.images[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true
    }
    updateFormData({ images: newImages })
  }

  const setPrimaryImage = (index: number) => {
    const newImages = formData.images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }))
    updateFormData({ images: newImages })
  }

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED' = 'DRAFT') => {
    if (!validateStep(5)) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/apartments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status,
        }),
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        router.push(`/admin/apartments`)
      } else {
        console.error('API Error:', result)
        setErrors({ submit: result.error || result.details?.[0]?.message || 'Ошибка сохранения' })
      }
    } catch (error) {
      console.error('Network error:', error)
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

  return (
    <div className="min-h-screen bg-gray-50">
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
                <h1 className="text-xl font-bold text-gray-900">Новый объект</h1>
                <p className="text-sm text-gray-500">Заполните информацию об апартаменте</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSubmit('DRAFT')}
                disabled={saving}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Сохранить черновик
              </button>
              {currentStep === 5 && (
                <button
                  onClick={() => handleSubmit('PUBLISHED')}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : 'Опубликовать'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                  disabled={currentStep < step.id}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                    currentStep === step.id
                      ? 'bg-blue-50 text-blue-700'
                      : currentStep > step.id
                      ? 'text-green-600 hover:bg-green-50 cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : currentStep > step.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs opacity-70">{step.description}</p>
                  </div>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Шаг 1: Основная информация */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => updateFormData({ title: e.target.value })}
                        placeholder="Например: Уютная студия в центре"
                        className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.title ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-4 w-4" />
                          {errors.title}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Краткое описание
                      </label>
                      <input
                        type="text"
                        value={formData.shortDescription}
                        onChange={(e) => updateFormData({ shortDescription: e.target.value })}
                        placeholder="Короткое описание для карточки (до 150 символов)"
                        maxLength={150}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Полное описание <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => updateFormData({ description: e.target.value })}
                        rows={5}
                        placeholder="Подробное описание апартамента, особенностей, расположения..."
                        className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 ${
                          errors.description ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      <div className="mt-1 flex justify-between text-sm">
                        {errors.description ? (
                          <p className="text-red-500 flex items-center gap-1">
                            <ExclamationCircleIcon className="h-4 w-4" />
                            {errors.description}
                          </p>
                        ) : <span />}
                        <span className="text-gray-400">{formData.description.length} / 50 мин.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Характеристики</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Комнат</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.rooms}
                        onChange={(e) => updateFormData({ rooms: parseInt(e.target.value) || 1 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Спален</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={formData.bedrooms}
                        onChange={(e) => updateFormData({ bedrooms: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Санузлов</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={formData.bathrooms}
                        onChange={(e) => updateFormData({ bathrooms: parseInt(e.target.value) || 1 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Площадь (м²) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={500}
                        value={formData.area}
                        onChange={(e) => updateFormData({ area: parseInt(e.target.value) || 10 })}
                        className={`w-full border rounded-lg px-4 py-3 ${
                          errors.area ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Макс. гостей</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={formData.maxGuests}
                        onChange={(e) => updateFormData({ maxGuests: parseInt(e.target.value) || 1 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Этаж</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.floor || ''}
                        onChange={(e) => updateFormData({ floor: parseInt(e.target.value) || null })}
                        placeholder="—"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Этажей в доме</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.totalFloors || ''}
                        onChange={(e) => updateFormData({ totalFloors: parseInt(e.target.value) || null })}
                        placeholder="—"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 2: Адрес */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Расположение в Перми</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Город
                      </label>
                      <input
                        type="text"
                        value="Пермь"
                        disabled
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Адрес <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => updateFormData({ address: e.target.value })}
                        placeholder="Улица, дом, корпус"
                        className={`w-full border rounded-lg px-4 py-3 ${
                          errors.address ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.address && (
                        <p className="mt-1 text-sm text-red-500">{errors.address}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Район</label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => updateFormData({ district: e.target.value })}
                        placeholder="Например: Ленинский, Свердловский, Мотовилихинский"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>
                  </div>
                </div>

                {/* Карта для выбора расположения */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Укажите расположение на карте
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Найдите адрес через поиск или кликните на карте для выбора точного местоположения
                  </p>
                  <MapPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onLocationChange={(lat, lng, address) => {
                      updateFormData({ 
                        latitude: lat, 
                        longitude: lng,
                        ...(address && !formData.address && { address })
                      })
                    }}
                    className="h-[400px] rounded-lg overflow-hidden"
                  />
                  {formData.latitude && formData.longitude && (
                    <p className="mt-3 text-sm text-gray-500">
                      Координаты: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Шаг 3: Удобства */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Удобства</h2>
                    <span className="text-sm text-gray-500">
                      Выбрано: {formData.amenityIds.length}
                    </span>
                  </div>
                  
                  {errors.amenities && (
                    <p className="mb-4 text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-4 w-4" />
                      {errors.amenities}
                    </p>
                  )}

                  <div className="space-y-6">
                    {Object.entries(amenitiesByCategory).map(([category, items]) => (
                      <div key={category}>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                          {categoryNames[category] || category}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {items.map(amenity => (
                            <label
                              key={amenity.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
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
                                className="sr-only"
                              />
                              <AmenityIcon 
                                icon={amenity.icon} 
                                name={amenity.name} 
                                className={`h-5 w-5 ${
                                  formData.amenityIds.includes(amenity.id) 
                                    ? 'text-blue-600' 
                                    : 'text-gray-400'
                                }`}
                              />
                              <span className="text-sm">{amenity.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Правила проживания</h2>
                  
                  <div className="space-y-3">
                    {formData.rules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{rule.rule}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newRules = [...formData.rules]
                              newRules[index].isAllowed = true
                              updateFormData({ rules: newRules })
                            }}
                            className={`px-3 py-1 text-xs rounded-full ${
                              rule.isAllowed 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            Да
                          </button>
                          <button
                            onClick={() => {
                              const newRules = [...formData.rules]
                              newRules[index].isAllowed = false
                              updateFormData({ rules: newRules })
                            }}
                            className={`px-3 py-1 text-xs rounded-full ${
                              !rule.isAllowed 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            Нет
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const newRule = prompt('Введите новое правило:')
                      if (newRule) {
                        updateFormData({ rules: [...formData.rules, { rule: newRule, isAllowed: true }] })
                      }
                    }}
                    className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Добавить правило
                  </button>
                </div>
              </div>
            )}

            {/* Шаг 4: Фотографии */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Фотографии</h2>
                      <p className="text-sm text-gray-500">Загрузите минимум 3 фотографии</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formData.images.length} / 20
                    </span>
                  </div>

                  {errors.images && (
                    <p className="mb-4 text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-4 w-4" />
                      {errors.images}
                    </p>
                  )}

                  {/* Upload area */}
                  <label className="block mb-6">
                    <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                      uploadingImage 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                    }`}>
                      <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 mb-1">
                        {uploadingImage ? 'Загрузка...' : 'Перетащите файлы или нажмите для выбора'}
                      </p>
                      <p className="text-xs text-gray-400">PNG, JPG до 5MB</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="sr-only"
                      />
                    </div>
                  </label>

                  {/* Images grid */}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className={`aspect-video rounded-lg overflow-hidden border-2 ${
                            image.isPrimary ? 'border-blue-500' : 'border-transparent'
                          }`}>
                            <img
                              src={image.url}
                              alt={image.alt}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Overlay actions */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-2">
                            <button
                              onClick={() => setPrimaryImage(index)}
                              className={`px-3 py-1.5 text-xs rounded-lg ${
                                image.isPrimary
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {image.isPrimary ? 'Главное' : 'Сделать главным'}
                            </button>
                            <button
                              onClick={() => removeImage(index)}
                              className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {image.isPrimary && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                              Главное
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Шаг 5: Цены */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Стоимость</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Базовая цена за ночь <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={500}
                          value={formData.basePrice}
                          onChange={(e) => updateFormData({ basePrice: parseInt(e.target.value) || 0 })}
                          className={`w-full border rounded-lg px-4 py-3 pr-12 ${
                            errors.basePrice ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">₽</span>
                      </div>
                      {errors.basePrice && (
                        <p className="mt-1 text-sm text-red-500">{errors.basePrice}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Уборка</label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            value={formData.cleaningFee}
                            onChange={(e) => updateFormData({ cleaningFee: parseInt(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">₽</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Сервисный сбор</label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            value={formData.serviceFee}
                            onChange={(e) => updateFormData({ serviceFee: parseInt(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">₽</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Страховой депозит</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          value={formData.securityDeposit}
                          onChange={(e) => updateFormData({ securityDeposit: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">₽</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Возвращается после выселения</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Скидки</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Скидка за неделю
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={formData.weeklyDiscount}
                          onChange={(e) => updateFormData({ weeklyDiscount: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Скидка за месяц
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={formData.monthlyDiscount}
                          onChange={(e) => updateFormData({ monthlyDiscount: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Условия бронирования</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Мин. ночей</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={formData.minNights}
                        onChange={(e) => updateFormData({ minNights: parseInt(e.target.value) || 1 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Макс. ночей</label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={formData.maxNights}
                        onChange={(e) => updateFormData({ maxNights: parseInt(e.target.value) || 30 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Заезд</label>
                      <input
                        type="time"
                        value={formData.checkInTime}
                        onChange={(e) => updateFormData({ checkInTime: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Выезд</label>
                      <input
                        type="time"
                        value={formData.checkOutTime}
                        onChange={(e) => updateFormData({ checkOutTime: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview price */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Предварительный расчёт</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">3 ночи × {formData.basePrice.toLocaleString()} ₽</span>
                      <span className="font-medium">{(formData.basePrice * 3).toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Уборка</span>
                      <span className="font-medium">{formData.cleaningFee.toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Сервисный сбор</span>
                      <span className="font-medium">{formData.serviceFee.toLocaleString()} ₽</span>
                    </div>
                    <div className="border-t border-blue-200 pt-2 flex justify-between text-base">
                      <span className="font-semibold">Итого за 3 ночи</span>
                      <span className="font-bold text-blue-600">
                        {(formData.basePrice * 3 + formData.cleaningFee + formData.serviceFee).toLocaleString()} ₽
                      </span>
                    </div>
                  </div>
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {errors.submit}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              onClick={() => handleSubmit('PUBLISHED')}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-5 w-5" />
              {saving ? 'Публикация...' : 'Опубликовать'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
