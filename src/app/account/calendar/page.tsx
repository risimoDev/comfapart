'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  X,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
  startOfDay,
  isBefore,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Apartment {
  id: string
  title: string
}

interface CalendarEvent {
  id: string
  apartmentId: string
  apartmentTitle: string
  startDate: string
  endDate: string
  type: 'booking' | 'blocked' | 'external'
  status?: string
  source?: string
  guestName?: string
  color: string
}

interface SeasonalPrice {
  id: string
  apartmentId: string
  apartmentTitle: string
  name: string
  startDate: string
  endDate: string
  priceMultiplier: number
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function AccountCalendarPage() {
  const router = useRouter()
  const { user, accessToken, isAuthenticated, isLoading: authLoading } = useAuth()

  const [apartments, setApartments] = useState<Apartment[]>([])
  const [selectedApartment, setSelectedApartment] = useState<string>('')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [seasonalPrices, setSeasonalPrices] = useState<SeasonalPrice[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [showBlockModal, setShowBlockModal] = useState(false)

  // Проверка авторизации
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/account/calendar')
    }
  }, [authLoading, isAuthenticated, router])

  // Проверка роли
  useEffect(() => {
    if (user && user.role !== 'OWNER' && user.role !== 'TECH_ADMIN') {
      router.push('/account')
    }
  }, [user, router])

  // Загрузка квартир
  useEffect(() => {
    if (!accessToken) return

    fetch('/api/admin/apartments?limit=100', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success !== false && data.apartments) {
          setApartments(data.apartments)
          if (data.apartments.length > 0 && !selectedApartment) {
            setSelectedApartment(data.apartments[0].id)
          }
        }
      })
      .catch(console.error)
  }, [accessToken])

  // Загрузка событий календаря
  const loadEvents = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    try {
      const startDate = startOfMonth(currentMonth).toISOString()
      const endDate = endOfMonth(addMonths(currentMonth, 1)).toISOString()

      const url = new URL('/api/account/calendar', window.location.origin)
      url.searchParams.set('startDate', startDate)
      url.searchParams.set('endDate', endDate)
      if (selectedApartment) {
        url.searchParams.set('apartmentId', selectedApartment)
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = await res.json()

      if (data.success) {
        setEvents(data.data.events || [])
        setSeasonalPrices(data.data.seasonalPrices || [])
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }, [accessToken, currentMonth, selectedApartment])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Заблокировать даты
  const handleBlockDates = async () => {
    if (!accessToken || !selectedApartment || selectedDates.length === 0) return

    setIsBlocking(true)
    try {
      const res = await fetch('/api/account/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          apartmentId: selectedApartment,
          dates: selectedDates.map(d => d.toISOString()),
          reason: blockReason || 'OWNER_BLOCK'
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`Заблокировано дат: ${data.data.blocked}`)
        setSelectedDates([])
        setBlockReason('')
        setShowBlockModal(false)
        loadEvents()
      } else {
        toast.error(data.error || 'Ошибка при блокировке')
      }
    } catch (error) {
      console.error('Error blocking dates:', error)
      toast.error('Ошибка при блокировке дат')
    } finally {
      setIsBlocking(false)
    }
  }

  // Разблокировать даты
  const handleUnblockDates = async () => {
    if (!accessToken || !selectedApartment || selectedDates.length === 0) return

    setIsBlocking(true)
    try {
      const res = await fetch('/api/account/calendar', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          apartmentId: selectedApartment,
          dates: selectedDates.map(d => d.toISOString()),
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`Разблокировано дат: ${data.data.unblocked}`)
        setSelectedDates([])
        loadEvents()
      } else {
        toast.error(data.error || 'Ошибка при разблокировке')
      }
    } catch (error) {
      console.error('Error unblocking dates:', error)
      toast.error('Ошибка при разблокировке дат')
    } finally {
      setIsBlocking(false)
    }
  }

  // Выбор даты
  const handleDateClick = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return

    setSelectedDates(prev => {
      const exists = prev.some(d => isSameDay(d, date))
      if (exists) {
        return prev.filter(d => !isSameDay(d, date))
      }
      return [...prev, date]
    })
  }

  // Проверка события на дату
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const start = parseISO(event.startDate)
      const end = parseISO(event.endDate)
      return isWithinInterval(date, { start, end: new Date(end.getTime() - 1) })
    })
  }

  // Проверка сезонной цены на дату
  const getSeasonalPriceForDate = (date: Date): SeasonalPrice | null => {
    return seasonalPrices.find(sp => {
      const start = parseISO(sp.startDate)
      const end = parseISO(sp.endDate)
      return isWithinInterval(date, { start, end })
    }) || null
  }

  // Генерация дней месяца
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Добавляем дни до понедельника
  const startDay = monthStart.getDay()
  const paddingDays = startDay === 0 ? 6 : startDay - 1
  const paddedDays = Array(paddingDays).fill(null)

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Calendar className="w-7 h-7 text-primary" />
          Календарь занятости
        </h1>
      </div>

      {apartments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold mb-2">У вас нет апартаментов</h2>
          <p className="text-gray-500 mb-4">
            Добавьте апартаменты, чтобы управлять их календарём
          </p>
          <Button onClick={() => router.push('/admin/apartments/new')}>
            Добавить апартамент
          </Button>
        </div>
      ) : (
        <>
          {/* Фильтр по квартире */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <label className="block text-sm font-medium mb-2">Апартамент</label>
            <select
              className="w-full md:w-64 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600"
              value={selectedApartment}
              onChange={(e) => setSelectedApartment(e.target.value)}
            >
              {apartments.map(apt => (
                <option key={apt.id} value={apt.id}>{apt.title}</option>
              ))}
            </select>
          </div>

          {/* Легенда */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-sm">Бронирование</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-sm">Заблокировано</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-500" />
                <span className="text-sm">Внешний календарь</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/50" />
                <span className="text-sm">Сезонная цена</span>
              </div>
            </div>
          </div>

          {/* Календарь */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            {/* Навигация */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'LLLL yyyy', { locale: ru })}
              </h2>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Дни недели */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Дни месяца */}
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {paddedDays.map((_, index) => (
                  <div key={`pad-${index}`} className="aspect-square" />
                ))}

                {days.map(day => {
                  const dayEvents = getEventsForDate(day)
                  const seasonalPrice = getSeasonalPriceForDate(day)
                  const isSelected = selectedDates.some(d => isSameDay(d, day))
                  const isPast = isBefore(day, startOfDay(new Date()))
                  const hasBooking = dayEvents.some(e => e.type === 'booking')
                  const hasBlocked = dayEvents.some(e => e.type === 'blocked')
                  const hasExternal = dayEvents.some(e => e.type === 'external')

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      disabled={isPast}
                      className={`
                        aspect-square p-1 rounded-lg text-sm relative transition-all
                        ${isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'}
                        ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}
                        ${seasonalPrice ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                      `}
                    >
                      <span className={`
                        ${!isSameMonth(day, currentMonth) ? 'text-gray-400' : ''}
                        ${isSelected ? 'font-bold text-primary' : ''}
                      `}>
                        {format(day, 'd')}
                      </span>

                      {/* Индикаторы событий */}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {hasBooking && <div className="w-2 h-2 rounded-full bg-green-500" />}
                        {hasBlocked && <div className="w-2 h-2 rounded-full bg-red-500" />}
                        {hasExternal && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                      </div>

                      {/* Множитель сезонной цены */}
                      {seasonalPrice && (
                        <div className="absolute top-0 right-0 text-[8px] bg-yellow-500 text-white px-0.5 rounded">
                          x{seasonalPrice.priceMultiplier}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Панель действий */}
          {selectedDates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 flex items-center gap-4 z-50"
            >
              <span className="text-sm">
                Выбрано дат: <strong>{selectedDates.length}</strong>
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDates([])}
              >
                <X className="w-4 h-4 mr-1" />
                Сбросить
              </Button>

              <Button
                size="sm"
                onClick={() => setShowBlockModal(true)}
                className="bg-red-500 hover:bg-red-600"
              >
                <Lock className="w-4 h-4 mr-1" />
                Заблокировать
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleUnblockDates}
                loading={isBlocking}
              >
                <Unlock className="w-4 h-4 mr-1" />
                Разблокировать
              </Button>
            </motion.div>
          )}

          {/* Модальное окно блокировки */}
          <AnimatePresence>
            {showBlockModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowBlockModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-red-500" />
                    Заблокировать даты
                  </h3>

                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Вы собираетесь заблокировать {selectedDates.length} дат. Укажите причину (необязательно):
                  </p>

                  <Input
                    placeholder="Причина блокировки"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="mb-4"
                  />

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowBlockModal(false)}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleBlockDates}
                      loading={isBlocking}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      Заблокировать
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Список событий */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">События в этом месяце</h3>

            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет событий</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {event.type === 'booking' && event.guestName}
                        {event.type === 'blocked' && `Заблокировано${event.source !== 'MANUAL' ? ` (${event.source})` : ''}`}
                        {event.type === 'external' && `Внешнее бронирование`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(event.startDate), 'd MMM', { locale: ru })} — {format(parseISO(event.endDate), 'd MMM', { locale: ru })}
                      </p>
                    </div>
                    {event.status && (
                      <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                        {event.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Сезонные цены */}
          {seasonalPrices.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Сезонные цены</h3>
              <div className="space-y-2">
                {seasonalPrices.map(sp => (
                  <div
                    key={sp.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl"
                  >
                    <div>
                      <p className="font-medium">{sp.name}</p>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(sp.startDate), 'd MMM', { locale: ru })} — {format(parseISO(sp.endDate), 'd MMM yyyy', { locale: ru })}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">
                      x{sp.priceMultiplier}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
