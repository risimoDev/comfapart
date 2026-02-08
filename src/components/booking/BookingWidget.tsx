'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Users, 
  Tag, 
  Check, 
  X, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { formatPrice, getDaysBetween } from '@/lib/utils'
import { Button, Input } from '@/components/ui'
import { AvailabilityCalendar } from './AvailabilityCalendar'

interface Apartment {
  id: string
  slug: string
  basePrice: number
  maxGuests: number
  cleaningFee: number
}

interface PriceBreakdown {
  nights: number
  nightlyRates: { date: string; price: number }[]
  subtotal: number
  cleaningFee: number
  serviceFee: number
  discount: number
  discountType?: string
  total: number
}

interface BookingWidgetProps {
  apartment: Apartment
  currency?: string
}

export function BookingWidget({ apartment, currency = 'RUB' }: BookingWidgetProps) {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [guests, setGuests] = useState(1)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [isCheckingPromo, setIsCheckingPromo] = useState(false)
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null)

  // Расчет стоимости при изменении дат
  useEffect(() => {
    const fetchPrice = async () => {
      if (!checkIn || !checkOut) {
        setPriceBreakdown(null)
        return
      }

      try {
        const params = new URLSearchParams({
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guests: guests.toString()
        })

        if (promoApplied) {
          params.append('promoCode', promoApplied)
        }

        const response = await fetch(`/api/apartments/${apartment.slug}/price?${params}`)
        
        if (response.ok) {
          const data = await response.json()
          setPriceBreakdown(data)
        }
      } catch (error) {
        console.error('Error fetching price:', error)
      }
    }

    fetchPrice()
  }, [checkIn, checkOut, guests, promoApplied, apartment.slug])

  // Проверка промокода
  const handlePromoCode = async () => {
    if (!promoCode.trim()) return

    setIsCheckingPromo(true)
    setPromoError(null)

    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          apartmentId: apartment.id,
          checkIn: checkIn?.toISOString(),
          checkOut: checkOut?.toISOString()
        })
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setPromoApplied(promoCode)
        setPromoError(null)
      } else {
        setPromoError(data.error || 'Промокод недействителен')
        setPromoApplied(null)
      }
    } catch (error) {
      setPromoError('Ошибка проверки промокода')
    } finally {
      setIsCheckingPromo(false)
    }
  }

  const removePromoCode = () => {
    setPromoApplied(null)
    setPromoCode('')
    setPromoError(null)
  }

  // Обработка выбора дат
  const handleDateSelect = (date: Date) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date)
      setCheckOut(undefined)
    } else {
      if (date > checkIn) {
        setCheckOut(date)
      } else {
        setCheckIn(date)
        setCheckOut(undefined)
      }
    }
  }

  const handleRangeSelect = (start: Date, end: Date) => {
    setCheckIn(start)
    setCheckOut(end)
    setIsCalendarOpen(false)
  }

  // Бронирование
  const handleBooking = async () => {
    if (!checkIn || !checkOut) return

    setIsLoading(true)

    try {
      // Перенаправляем на страницу оформления
      const params = new URLSearchParams({
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guests: guests.toString()
      })

      if (promoApplied) {
        params.append('promoCode', promoApplied)
      }

      router.push(`/booking/${apartment.slug}?${params}`)
    } finally {
      setIsLoading(false)
    }
  }

  const nights = checkIn && checkOut ? getDaysBetween(checkIn, checkOut) : 0
  const formatDateShort = (date: Date) => 
    date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-24">
      {/* Цена */}
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-3xl font-bold">
          {formatPrice(apartment.basePrice, currency)}
        </span>
        <span className="text-gray-500">/ ночь</span>
      </div>

      {/* Форма */}
      <div className="space-y-4">
        {/* Даты */}
        <div 
          className="border rounded-xl overflow-hidden cursor-pointer"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        >
          <div className="grid grid-cols-2 divide-x">
            <div className="p-3">
              <div className="text-xs font-medium text-gray-500 mb-1">ЗАЕЗД</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className={checkIn ? '' : 'text-gray-400'}>
                  {checkIn ? formatDateShort(checkIn) : 'Выберите'}
                </span>
              </div>
            </div>
            <div className="p-3">
              <div className="text-xs font-medium text-gray-500 mb-1">ВЫЕЗД</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className={checkOut ? '' : 'text-gray-400'}>
                  {checkOut ? formatDateShort(checkOut) : 'Выберите'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Календарь */}
        <AnimatePresence>
          {isCalendarOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <AvailabilityCalendar
                apartmentId={apartment.id}
                checkIn={checkIn}
                checkOut={checkOut}
                onDateSelect={handleDateSelect}
                onRangeSelect={handleRangeSelect}
                currency={currency}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Гости */}
        <div className="border rounded-xl p-3">
          <div className="text-xs font-medium text-gray-500 mb-1">ГОСТИ</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{guests} {guests === 1 ? 'гость' : guests < 5 ? 'гостя' : 'гостей'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGuests(Math.max(1, guests - 1))}
                disabled={guests <= 1}
                className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
              >
                -
              </button>
              <span className="w-6 text-center">{guests}</span>
              <button
                onClick={() => setGuests(Math.min(apartment.maxGuests, guests + 1))}
                disabled={guests >= apartment.maxGuests}
                className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
          {guests >= apartment.maxGuests && (
            <p className="text-xs text-gray-500 mt-2">
              Максимум {apartment.maxGuests} гостей
            </p>
          )}
        </div>

        {/* Промокод */}
        <div className="border rounded-xl p-3">
          <div className="text-xs font-medium text-gray-500 mb-2">ПРОМОКОД</div>
          {promoApplied ? (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="font-medium">{promoApplied}</span>
              </div>
              <button
                onClick={removePromoCode}
                className="p-1 hover:bg-green-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Введите код"
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handlePromoCode}
                disabled={!promoCode.trim() || isCheckingPromo}
                loading={isCheckingPromo}
              >
                Применить
              </Button>
            </div>
          )}
          {promoError && (
            <p className="text-sm text-red-500 mt-2">{promoError}</p>
          )}
        </div>

        {/* Детализация цены */}
        {priceBreakdown && checkIn && checkOut && (
          <div className="border-t pt-4 mt-4">
            <button
              onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-gray-600">Детализация стоимости</span>
              {isPriceDetailsOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {isPriceDetailsOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 mt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Проживание ({nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'})
                      </span>
                      <span>{formatPrice(priceBreakdown.subtotal, currency)}</span>
                    </div>
                    
                    {priceBreakdown.cleaningFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Уборка</span>
                        <span>{formatPrice(priceBreakdown.cleaningFee, currency)}</span>
                      </div>
                    )}
                    
                    {priceBreakdown.serviceFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 flex items-center gap-1">
                          Сервисный сбор
                          <Info className="w-3 h-3" />
                        </span>
                        <span>{formatPrice(priceBreakdown.serviceFee, currency)}</span>
                      </div>
                    )}
                    
                    {priceBreakdown.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>
                          Скидка {priceBreakdown.discountType}
                        </span>
                        <span>-{formatPrice(priceBreakdown.discount, currency)}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between font-semibold text-lg mt-4 pt-4 border-t">
              <span>Итого</span>
              <span>{formatPrice(priceBreakdown.total, currency)}</span>
            </div>
          </div>
        )}

        {/* Кнопка бронирования */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleBooking}
          disabled={!checkIn || !checkOut || isLoading}
          loading={isLoading}
        >
          {checkIn && checkOut ? 'Забронировать' : 'Выберите даты'}
        </Button>

        {/* Примечание */}
        <p className="text-center text-sm text-gray-500">
          Вы пока ничего не платите
        </p>
      </div>
    </div>
  )
}
