'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'

interface DayInfo {
  date: Date
  price: number
  isAvailable: boolean
  isBlocked: boolean
  minStay: number
}

interface AvailabilityCalendarProps {
  apartmentId: string
  checkIn?: Date
  checkOut?: Date
  onDateSelect: (date: Date) => void
  onRangeSelect?: (checkIn: Date, checkOut: Date) => void
  currency?: string
}

const DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

export function AvailabilityCalendar({
  apartmentId,
  checkIn,
  checkOut,
  onDateSelect,
  onRangeSelect,
  currency = 'RUB'
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState<Map<string, DayInfo>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [selectingRange, setSelectingRange] = useState<'checkIn' | 'checkOut'>('checkIn')
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  // Загрузка данных о доступности
  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoading(true)
      try {
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0)

        const response = await fetch(
          `/api/apartments/${apartmentId}/availability?` +
          `startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )

        if (response.ok) {
          const data = await response.json()
          const newMap = new Map<string, DayInfo>()
          
          data.forEach((day: any) => {
            const dateKey = new Date(day.date).toDateString()
            newMap.set(dateKey, {
              date: new Date(day.date),
              price: day.price,
              isAvailable: day.isAvailable,
              isBlocked: day.isBlocked,
              minStay: day.minStay || 1
            })
          })

          setCalendarData(newMap)
        }
      } catch (error) {
        console.error('Error fetching availability:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailability()
  }, [apartmentId, currentMonth])

  const handleDateClick = (date: Date) => {
    const dayInfo = calendarData.get(date.toDateString())
    if (!dayInfo?.isAvailable || dayInfo?.isBlocked) return

    if (onRangeSelect) {
      if (selectingRange === 'checkIn') {
        onDateSelect(date)
        setSelectingRange('checkOut')
      } else {
        if (checkIn && date > checkIn) {
          onRangeSelect(checkIn, date)
          setSelectingRange('checkIn')
        } else {
          // Если выбранная дата раньше checkIn, начинаем заново
          onDateSelect(date)
          setSelectingRange('checkOut')
        }
      }
    } else {
      onDateSelect(date)
    }
  }

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const renderMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = (firstDay.getDay() + 6) % 7 // Понедельник = 0
    const daysInMonth = lastDay.getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weeks: (Date | null)[][] = []
    let currentWeek: (Date | null)[] = []

    // Пустые ячейки до первого дня
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null)
    }

    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      currentWeek.push(date)

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    // Заполняем последнюю неделю
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      weeks.push(currentWeek)
    }

    return (
      <div className="flex-1">
        <h3 className="text-center font-semibold mb-4">
          {MONTHS[month]} {year}
        </h3>

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Недели */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((date, dayIndex) => {
                if (!date) {
                  return <div key={dayIndex} className="aspect-square" />
                }

                const dayInfo = calendarData.get(date.toDateString())
                const isPast = date < today
                const isSelected = 
                  (checkIn && date.toDateString() === checkIn.toDateString()) ||
                  (checkOut && date.toDateString() === checkOut.toDateString())
                const isInRange = 
                  checkIn && checkOut && date > checkIn && date < checkOut
                const isHoverRange =
                  hoverDate && checkIn && !checkOut &&
                  date > checkIn && date <= hoverDate
                const isUnavailable = !dayInfo?.isAvailable || dayInfo?.isBlocked || isPast

                return (
                  <button
                    key={dayIndex}
                    disabled={isUnavailable}
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={() => setHoverDate(date)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={cn(
                      'aspect-square p-1 rounded-lg flex flex-col items-center justify-center text-sm transition-all',
                      isUnavailable && 'opacity-30 cursor-not-allowed line-through',
                      !isUnavailable && 'hover:bg-primary/10 cursor-pointer',
                      isSelected && 'bg-primary text-white hover:bg-primary',
                      (isInRange || isHoverRange) && 'bg-primary/20',
                      dayInfo?.isBlocked && 'bg-red-100'
                    )}
                  >
                    <span className="font-medium">{date.getDate()}</span>
                    {dayInfo && !isPast && dayInfo.isAvailable && (
                      <span className="text-[10px] text-gray-500">
                        {formatPrice(dayInfo.price, currency).replace(/[^\d\s]/g, '')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
      {/* Навигация */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPrevMonth}
          disabled={currentMonth <= new Date()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Загрузка */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Календари */}
      {!isLoading && (
        <div className="flex gap-8">
          {renderMonth(currentMonth)}
          {renderMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
        </div>
      )}

      {/* Легенда */}
      <div className="flex items-center gap-6 mt-6 pt-4 border-t text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Выбрано</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/20" />
          <span>Диапазон</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200 line-through" />
          <span>Занято</span>
        </div>
      </div>

      {/* Подсказка */}
      {onRangeSelect && (
        <p className="text-sm text-gray-500 mt-4">
          {selectingRange === 'checkIn' 
            ? 'Выберите дату заезда'
            : 'Выберите дату выезда'}
        </p>
      )}
    </div>
  )
}
