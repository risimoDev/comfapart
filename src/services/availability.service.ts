/**
 * Сервис проверки доступности апартаментов
 * Проверяет пересечение дат бронирования, блокированные даты
 */

import prisma from '@/lib/prisma'
import { getDateRange, getDaysBetween } from '@/lib/utils'

interface AvailabilityCheckResult {
  available: boolean
  reason?: string
  conflictingDates?: Date[]
  suggestedDates?: {
    checkIn: Date
    checkOut: Date
  }
}

interface BookedDate {
  date: Date
  bookingId: string
  status: string
}

export class AvailabilityService {
  /**
   * Проверяет доступность апартамента на указанные даты
   */
  async checkAvailability(
    apartmentId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string
  ): Promise<AvailabilityCheckResult> {
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: {
        id: true,
        minNights: true,
        maxNights: true,
        status: true,
      },
    })

    if (!apartment) {
      return { available: false, reason: 'Апартамент не найден' }
    }

    if (apartment.status !== 'PUBLISHED') {
      return { available: false, reason: 'Апартамент недоступен для бронирования' }
    }

    // Проверяем минимальное и максимальное количество ночей
    const nights = getDaysBetween(checkIn, checkOut)
    if (nights < apartment.minNights) {
      return {
        available: false,
        reason: `Минимальный срок бронирования: ${apartment.minNights} ночей`,
      }
    }
    if (nights > apartment.maxNights) {
      return {
        available: false,
        reason: `Максимальный срок бронирования: ${apartment.maxNights} ночей`,
      }
    }

    // Проверяем пересечение с существующими бронированиями
    const conflictingBookings = await this.getConflictingBookings(
      apartmentId,
      checkIn,
      checkOut,
      excludeBookingId
    )

    if (conflictingBookings.length > 0) {
      const conflictingDates = this.getConflictingDates(conflictingBookings, checkIn, checkOut)
      return {
        available: false,
        reason: 'Выбранные даты заняты',
        conflictingDates,
      }
    }

    // Проверяем заблокированные даты
    const blockedDates = await this.getBlockedDatesInRange(apartmentId, checkIn, checkOut)
    if (blockedDates.length > 0) {
      return {
        available: false,
        reason: 'Некоторые даты недоступны',
        conflictingDates: blockedDates,
      }
    }

    return { available: true }
  }

  /**
   * Получает все занятые даты для апартамента
   */
  async getOccupiedDates(
    apartmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BookedDate[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        apartmentId,
        status: { in: ['PENDING', 'CONFIRMED', 'PAID'] },
        OR: [
          {
            AND: [
              { checkIn: { lte: endDate } },
              { checkOut: { gte: startDate } },
            ],
          },
        ],
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
    })

    const bookedDates: BookedDate[] = []

    for (const booking of bookings) {
      const dates = getDateRange(booking.checkIn, booking.checkOut)
      for (const date of dates) {
        if (date >= startDate && date <= endDate) {
          bookedDates.push({
            date,
            bookingId: booking.id,
            status: booking.status,
          })
        }
      }
    }

    // Добавляем заблокированные даты
    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        apartmentId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    for (const blocked of blockedDates) {
      bookedDates.push({
        date: blocked.date,
        bookingId: 'blocked',
        status: 'BLOCKED',
      })
    }

    return bookedDates
  }

  /**
   * Получает календарь доступности на месяц
   */
  async getAvailabilityCalendar(
    apartmentId: string,
    year: number,
    month: number
  ): Promise<{ date: Date; available: boolean; price?: number }[]> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Последний день месяца

    const occupiedDates = await this.getOccupiedDates(apartmentId, startDate, endDate)
    const occupiedSet = new Set(
      occupiedDates.map(d => d.date.toISOString().split('T')[0])
    )

    // Получаем цены
    const pricing = await prisma.pricing.findUnique({
      where: { apartmentId },
    })

    const seasonalPrices = await prisma.seasonalPrice.findMany({
      where: {
        apartmentId,
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    })

    const weekdayPrices = await prisma.weekdayPrice.findMany({
      where: { apartmentId },
    })

    const calendar: { date: Date; available: boolean; price?: number }[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const available = !occupiedSet.has(dateStr)

      let price = pricing?.basePrice || 0
      if (available && pricing) {
        // Применяем сезонные коэффициенты
        for (const season of seasonalPrices) {
          if (currentDate >= season.startDate && currentDate <= season.endDate) {
            price = price * season.priceMultiplier
          }
        }
        // Применяем коэффициенты по дням недели
        const dayOfWeek = currentDate.getDay()
        const weekdayPrice = weekdayPrices.find(wp => wp.dayOfWeek === dayOfWeek)
        if (weekdayPrice) {
          price = price * weekdayPrice.priceMultiplier
        }
      }

      calendar.push({
        date: new Date(currentDate),
        available,
        price: available ? Math.round(price) : undefined,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return calendar
  }

  /**
   * Блокирует даты вручную (админ функция)
   */
  async blockDates(
    apartmentId: string,
    dates: Date[],
    reason?: string
  ): Promise<void> {
    const data = dates.map(date => ({
      apartmentId,
      date,
      reason,
    }))

    await prisma.blockedDate.createMany({
      data,
      skipDuplicates: true,
    })
  }

  /**
   * Разблокирует даты
   */
  async unblockDates(apartmentId: string, dates: Date[]): Promise<void> {
    await prisma.blockedDate.deleteMany({
      where: {
        apartmentId,
        date: { in: dates },
      },
    })
  }

  /**
   * Находит ближайшие доступные даты
   */
  async findNextAvailableDates(
    apartmentId: string,
    preferredCheckIn: Date,
    nights: number
  ): Promise<{ checkIn: Date; checkOut: Date } | null> {
    const maxSearchDays = 90 // Ищем в пределах 3 месяцев
    let currentDate = new Date(preferredCheckIn)

    for (let i = 0; i < maxSearchDays; i++) {
      const checkOut = new Date(currentDate)
      checkOut.setDate(checkOut.getDate() + nights)

      const availability = await this.checkAvailability(apartmentId, currentDate, checkOut)
      if (availability.available) {
        return { checkIn: new Date(currentDate), checkOut }
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return null
  }

  /**
   * Получает конфликтующие бронирования
   */
  private async getConflictingBookings(
    apartmentId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string
  ) {
    return prisma.booking.findMany({
      where: {
        apartmentId,
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { in: ['PENDING', 'CONFIRMED', 'PAID'] },
        AND: [
          { checkIn: { lt: checkOut } },
          { checkOut: { gt: checkIn } },
        ],
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
      },
    })
  }

  /**
   * Получает заблокированные даты в диапазоне
   */
  private async getBlockedDatesInRange(
    apartmentId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<Date[]> {
    const blocked = await prisma.blockedDate.findMany({
      where: {
        apartmentId,
        date: {
          gte: checkIn,
          lt: checkOut,
        },
      },
    })
    return blocked.map(b => b.date)
  }

  /**
   * Находит конкретные даты пересечения
   */
  private getConflictingDates(
    bookings: { checkIn: Date; checkOut: Date }[],
    checkIn: Date,
    checkOut: Date
  ): Date[] {
    const requestedDates = getDateRange(checkIn, checkOut)
    const conflicting: Date[] = []

    for (const booking of bookings) {
      const bookedDates = getDateRange(booking.checkIn, booking.checkOut)
      for (const date of requestedDates) {
        if (bookedDates.some(bd => bd.getTime() === date.getTime())) {
          conflicting.push(date)
        }
      }
    }

    // Удаляем дубликаты
    const uniqueDates = conflicting.filter((date, index, self) =>
      index === self.findIndex(d => d.getTime() === date.getTime())
    )
    return uniqueDates
  }
}

export const availabilityService = new AvailabilityService()
