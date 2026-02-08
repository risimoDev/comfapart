'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Calendar, MapPin, Download, Home } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatPrice, formatDate } from '@/lib/utils'

interface BookingDetails {
  id: string
  bookingNumber: string
  apartment: {
    title: string
    address: string
    city: string
    slug: string
  }
  checkIn: string
  checkOut: string
  guests: number
  totalPrice: number
  currency: string
  guestName: string
  guestEmail: string
  status: string
}

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('id')
  
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/bookings/${bookingId}`)
        if (response.ok) {
          const data = await response.json()
          setBooking(data)
        }
      } catch (error) {
        console.error('Error fetching booking:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center"
        >
          {/* Иконка успеха */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
          >
            <CheckCircle className="w-12 h-12 text-green-500" />
          </motion.div>

          <h1 className="text-3xl font-display font-bold mb-2">
            Бронирование подтверждено!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Мы отправили подтверждение на вашу электронную почту
          </p>

          {booking && (
            <div className="text-left space-y-4 mb-8">
              {/* Номер бронирования */}
              <div className="p-4 bg-primary/5 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Номер бронирования</p>
                <p className="text-xl font-bold text-primary">{booking.bookingNumber}</p>
              </div>

              {/* Детали */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Апартаменты</p>
                  <p className="font-medium">{booking.apartment.title}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {booking.apartment.city}, {booking.apartment.address}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Заезд</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(new Date(booking.checkIn))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Выезд</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(new Date(booking.checkOut))}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-500">Гости</p>
                  <p className="font-medium">{booking.guests} гостей • {booking.guestName}</p>
                </div>
              </div>

              {/* Стоимость */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Итого</span>
                  <span className="text-2xl font-bold">
                    {formatPrice(booking.totalPrice, booking.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={booking ? `/apartments/${booking.apartment.slug}` : '/'} className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                К апартаментам
              </Button>
            </Link>
            <Link href="/account/bookings" className="flex-1">
              <Button className="w-full">
                Мои бронирования
              </Button>
            </Link>
          </div>

          {/* Дополнительная информация */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-left">
            <h3 className="font-medium text-blue-600 dark:text-blue-400 mb-2">
              Что дальше?
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>• Проверьте почту — мы отправили подтверждение и инструкции</li>
              <li>• Свяжитесь с владельцем для уточнения деталей заезда</li>
              <li>• Сохраните номер бронирования для справки</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </main>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  )
}
