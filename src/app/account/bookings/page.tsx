'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  MapPin, 
  Clock,
  ChevronRight,
  MessageSquare,
  X
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button, BookingStatusBadge, BookingCardSkeleton } from '@/components/ui'

interface Booking {
  id: string
  bookingNumber: string
  apartment: {
    title: string
    slug: string
    city: string
    image: string
  }
  checkIn: string
  checkOut: string
  guests: number
  totalPrice: number
  currency: string
  status: string
  createdAt: string
}

export default function AccountBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/bookings')
        if (response.ok) {
          const data = await response.json()
          setBookings(data.bookings || [])
        }
      } catch (error) {
        console.error('Error fetching bookings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const now = new Date()

  const filteredBookings = bookings.filter((booking) => {
    const checkOut = new Date(booking.checkOut)
    
    switch (activeTab) {
      case 'upcoming':
        return checkOut >= now && booking.status !== 'CANCELLED'
      case 'past':
        return checkOut < now && booking.status !== 'CANCELLED'
      case 'cancelled':
        return booking.status === 'CANCELLED'
      default:
        return true
    }
  })

  const tabs = [
    { id: 'upcoming', label: 'Предстоящие' },
    { id: 'past', label: 'Прошедшие' },
    { id: 'cancelled', label: 'Отмененные' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Мои бронирования</h1>

        {/* Табы */}
        <div className="flex gap-2 mb-6 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Загрузка */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Список бронирований */}
        {!isLoading && filteredBookings.length > 0 && (
          <div className="space-y-4">
            {filteredBookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Изображение */}
                  <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                    {booking.apartment.image && (
                      <img
                        src={booking.apartment.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Информация */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-mono text-primary">
                          #{booking.bookingNumber}
                        </span>
                        <h3 className="font-semibold">
                          <Link 
                            href={`/apartments/${booking.apartment.slug}`}
                            className="hover:text-primary"
                          >
                            {booking.apartment.title}
                          </Link>
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {booking.apartment.city}
                        </p>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(new Date(booking.checkIn))} — {formatDate(new Date(booking.checkOut))}
                      </span>
                      <span>{booking.guests} гостей</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="font-bold text-lg">
                        {formatPrice(booking.totalPrice, booking.currency)}
                      </p>
                      <div className="flex gap-2">
                        {booking.status === 'CONFIRMED' && (
                          <Button variant="outline" size="sm">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Связаться
                          </Button>
                        )}
                        {booking.status === 'PENDING' && (
                          <Button variant="danger" size="sm">
                            <X className="w-4 h-4 mr-2" />
                            Отменить
                          </Button>
                        )}
                        <Link href={`/booking/${booking.apartment.slug}/${booking.id}`}>
                          <Button variant="ghost" size="sm">
                            Подробнее
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Пустое состояние */}
        {!isLoading && filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет бронирований</h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'upcoming' && 'У вас пока нет предстоящих бронирований'}
              {activeTab === 'past' && 'У вас пока нет завершенных бронирований'}
              {activeTab === 'cancelled' && 'У вас нет отмененных бронирований'}
            </p>
            {activeTab === 'upcoming' && (
              <Link href="/apartments">
                <Button>Найти апартаменты</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
