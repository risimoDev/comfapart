'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { 
  ChevronLeft, 
  Calendar, 
  Users, 
  CreditCard,
  Shield,
  Check,
  AlertCircle,
  MapPin,
  Star
} from 'lucide-react'
import { formatPrice, formatDate, getDaysBetween } from '@/lib/utils'
import { Button, Input } from '@/components/ui'

interface BookingPageProps {
  params: { slug: string }
}

interface ApartmentData {
  id: string
  title: string
  slug: string
  address: string
  city: string
  basePrice: number
  cleaningFee: number
  currency: string
  image: string
  rating: number
  reviewsCount: number
}

interface PriceBreakdown {
  nights: number
  subtotal: number
  cleaningFee: number
  serviceFee: number
  discount: number
  discountType?: string
  total: number
}

export default function BookingPage({ params }: BookingPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [apartment, setApartment] = useState<ApartmentData | null>(null)
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  // Данные бронирования
  const checkIn = searchParams.get('checkIn') ? new Date(searchParams.get('checkIn')!) : null
  const checkOut = searchParams.get('checkOut') ? new Date(searchParams.get('checkOut')!) : null
  const guests = parseInt(searchParams.get('guests') || '1')
  const promoCode = searchParams.get('promoCode') || ''

  // Данные гостя
  const [guestData, setGuestData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    comment: ''
  })

  // Согласие с офертой
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      if (!checkIn || !checkOut) {
        setError('Не указаны даты бронирования')
        setIsLoading(false)
        return
      }

      try {
        // Получаем данные об апартаментах
        const apartmentRes = await fetch(`/api/apartments/${params.slug}`)
        if (!apartmentRes.ok) throw new Error('Апартаменты не найдены')
        const apartmentData = await apartmentRes.json()

        setApartment({
          id: apartmentData.id,
          title: apartmentData.title,
          slug: apartmentData.slug,
          address: apartmentData.address,
          city: apartmentData.city,
          basePrice: apartmentData.basePrice,
          cleaningFee: apartmentData.cleaningFee || 0,
          currency: apartmentData.currency,
          image: apartmentData.images?.[0]?.url || '/placeholder.jpg',
          rating: apartmentData.avgRating || 0,
          reviewsCount: apartmentData.reviewsCount || 0
        })

        // Получаем расчет стоимости
        const priceParams = new URLSearchParams({
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guests: guests.toString()
        })
        if (promoCode) priceParams.append('promoCode', promoCode)

        const priceRes = await fetch(`/api/apartments/${params.slug}/price?${priceParams}`)
        if (priceRes.ok) {
          const priceData = await priceRes.json()
          setPriceBreakdown(priceData)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.slug, checkIn, checkOut, guests, promoCode])

  // Отправка бронирования
  const handleSubmit = async () => {
    if (!apartment || !checkIn || !checkOut) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apartmentId: apartment.id,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guests,
          promoCode: promoCode || undefined,
          guestName: `${guestData.firstName} ${guestData.lastName}`,
          guestEmail: guestData.email,
          guestPhone: guestData.phone,
          comment: guestData.comment || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания бронирования')
      }

      // Перенаправляем на страницу подтверждения
      router.push(`/booking/success?id=${data.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (error && !apartment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href={`/apartments/${params.slug}`}>
            <Button>Вернуться к апартаментам</Button>
          </Link>
        </div>
      </div>
    )
  }

  const nights = checkIn && checkOut ? getDaysBetween(checkIn, checkOut) : 0

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Навигация */}
        <Link 
          href={`/apartments/${params.slug}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary mb-8"
        >
          <ChevronLeft className="w-5 h-5" />
          Назад к апартаментам
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Форма */}
          <div className="lg:col-span-3 space-y-6">
            {/* Шаги */}
            <div className="flex items-center gap-4 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                      step >= s
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        step > s ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Шаг 1: Детали поездки */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-6">Детали поездки</h2>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <Calendar className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium">Даты</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {checkIn && formatDate(checkIn)} — {checkOut && formatDate(checkOut)}
                        <span className="ml-2">({nights} ночей)</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <Users className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium">Гости</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {guests} {guests === 1 ? 'гость' : guests < 5 ? 'гостя' : 'гостей'}
                      </p>
                    </div>
                  </div>

                  {promoCode && (
                    <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <Check className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-600">Промокод применен</p>
                        <p className="text-gray-600 dark:text-gray-400">{promoCode}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Button className="w-full mt-6" onClick={() => setStep(2)}>
                  Продолжить
                </Button>
              </motion.div>
            )}

            {/* Шаг 2: Данные гостя */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-6">Ваши данные</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Имя"
                      value={guestData.firstName}
                      onChange={(e) => setGuestData({ ...guestData, firstName: e.target.value })}
                      required
                    />
                    <Input
                      label="Фамилия"
                      value={guestData.lastName}
                      onChange={(e) => setGuestData({ ...guestData, lastName: e.target.value })}
                      required
                    />
                  </div>

                  <Input
                    label="Email"
                    type="email"
                    value={guestData.email}
                    onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                    required
                  />

                  <Input
                    label="Телефон"
                    type="tel"
                    value={guestData.phone}
                    onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Комментарий (необязательно)
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                      rows={3}
                      placeholder="Особые пожелания, время заезда и т.д."
                      value={guestData.comment}
                      onChange={(e) => setGuestData({ ...guestData, comment: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Назад
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setStep(3)}
                    disabled={!guestData.firstName || !guestData.lastName || !guestData.email || !guestData.phone}
                  >
                    Продолжить
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Шаг 3: Подтверждение */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-6">Подтверждение</h2>

                {/* Данные бронирования */}
                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <h3 className="font-medium mb-2">Данные гостя</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {guestData.firstName} {guestData.lastName}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">{guestData.email}</p>
                    <p className="text-gray-600 dark:text-gray-400">{guestData.phone}</p>
                  </div>

                  {guestData.comment && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <h3 className="font-medium mb-2">Комментарий</h3>
                      <p className="text-gray-600 dark:text-gray-400">{guestData.comment}</p>
                    </div>
                  )}
                </div>

                {/* Политика отмены */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl mb-4">
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Политика отмены бронирования
                  </h3>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• Бесплатная отмена за 7+ дней до заезда — полный возврат</li>
                    <li>• Отмена за 3-7 дней до заезда — возврат 50%</li>
                    <li>• Отмена менее чем за 3 дня — без возврата</li>
                    <li>• В случае форс-мажора — индивидуальное рассмотрение</li>
                  </ul>
                </div>

                {/* Условия */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-primary mb-1">Безопасное бронирование</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Ваши данные защищены. Оплата производится после подтверждения бронирования.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Чекбокс согласия с офертой */}
                <div className="mb-6">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200">
                      Я ознакомился и согласен с{' '}
                      <Link href="/legal/offer" className="text-primary hover:underline">
                        публичной офертой
                      </Link>,{' '}
                      <Link href="/legal/booking" className="text-primary hover:underline">
                        условиями бронирования
                      </Link>{' '}
                      и{' '}
                      <Link href="/legal/personal-data" className="text-primary hover:underline">
                        политикой обработки персональных данных
                      </Link>
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Назад
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={!agreedToTerms}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Забронировать
                  </Button>
                </div>

                {!agreedToTerms && (
                  <p className="text-sm text-gray-500 text-center mt-3">
                    Для продолжения необходимо принять условия оферты
                  </p>
                )}
              </motion.div>
            )}
          </div>

          {/* Сайдбар - информация о бронировании */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sticky top-24">
              {apartment && (
                <>
                  {/* Апартаменты */}
                  <div className="flex gap-4 pb-4 border-b">
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={apartment.image}
                        alt={apartment.title}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold line-clamp-2">{apartment.title}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {apartment.city}
                      </p>
                      {apartment.rating > 0 && (
                        <p className="text-sm flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          {apartment.rating.toFixed(1)} ({apartment.reviewsCount})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Детализация */}
                  {priceBreakdown && (
                    <div className="py-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatPrice(apartment.basePrice, apartment.currency)} × {nights} ночей
                        </span>
                        <span>{formatPrice(priceBreakdown.subtotal, apartment.currency)}</span>
                      </div>

                      {priceBreakdown.cleaningFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Уборка</span>
                          <span>{formatPrice(priceBreakdown.cleaningFee, apartment.currency)}</span>
                        </div>
                      )}

                      {priceBreakdown.serviceFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Сервисный сбор</span>
                          <span>{formatPrice(priceBreakdown.serviceFee, apartment.currency)}</span>
                        </div>
                      )}

                      {priceBreakdown.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Скидка {priceBreakdown.discountType}</span>
                          <span>-{formatPrice(priceBreakdown.discount, apartment.currency)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-semibold text-lg pt-3 border-t">
                        <span>Итого</span>
                        <span>{formatPrice(priceBreakdown.total, apartment.currency)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
