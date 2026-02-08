/**
 * Сервис бронирований
 * Управляет созданием, обновлением, отменой бронирований
 */

import prisma from '@/lib/prisma'
import { pricingService } from './pricing.service'
import { availabilityService } from './availability.service'
import { generateBookingNumber, getDaysBetween } from '@/lib/utils'
import type { Booking, BookingStatus } from '@/types'
import { BookingStatus as PrismaBookingStatus, PaymentStatus } from '@prisma/client'

interface CreateBookingParams {
  apartmentId: string
  userId: string
  checkIn: Date
  checkOut: Date
  guests: number
  promoCode?: string
  guestComment?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
}

interface UpdateBookingStatusParams {
  bookingId: string
  status: BookingStatus
  adminId?: string
  comment?: string
  cancelReason?: string
}

// Правила отмены
const CANCELLATION_RULES = {
  FULL_REFUND_DAYS: 7,      // Полный возврат за 7+ дней до заезда
  PARTIAL_REFUND_DAYS: 3,   // 50% возврат за 3-7 дней
  PARTIAL_REFUND_PERCENT: 50,
  // Менее 3 дней - без возврата
}

export class BookingService {
  /**
   * Создает новое бронирование
   */
  async createBooking(params: CreateBookingParams): Promise<Booking> {
    const { apartmentId, userId, checkIn, checkOut, guests, promoCode, ...rest } = params

    // Проверяем доступность
    const availability = await availabilityService.checkAvailability(apartmentId, checkIn, checkOut)
    if (!availability.available) {
      throw new Error(availability.reason || 'Апартамент недоступен')
    }

    // Проверяем количество гостей
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { maxGuests: true },
    })
    if (!apartment) {
      throw new Error('Апартамент не найден')
    }
    if (guests > apartment.maxGuests) {
      throw new Error(`Максимальное количество гостей: ${apartment.maxGuests}`)
    }

    // Рассчитываем стоимость
    const priceCalculation = await pricingService.calculatePrice({
      apartmentId,
      checkIn,
      checkOut,
      guests,
      promoCode,
    })

    // Получаем промокод если есть
    let promoCodeRecord = null
    if (promoCode) {
      promoCodeRecord = await prisma.promoCode.findUnique({
        where: { code: promoCode.toUpperCase() },
      })
    }

    // Создаем бронирование в транзакции
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          apartmentId,
          userId,
          checkIn,
          checkOut,
          nights: priceCalculation.nights,
          guests,
          status: 'PENDING' as PrismaBookingStatus,
          paymentStatus: 'PENDING' as PaymentStatus,
          basePrice: priceCalculation.baseTotal,
          cleaningFee: priceCalculation.cleaningFee,
          serviceFee: priceCalculation.serviceFee,
          extraGuestFee: priceCalculation.extraGuestFee,
          seasonalAdjustment: priceCalculation.seasonalAdjustment,
          weekdayAdjustment: priceCalculation.weekdayAdjustment,
          discount: priceCalculation.discount,
          promoDiscount: priceCalculation.promoDiscount,
          totalPrice: priceCalculation.totalPrice,
          currency: priceCalculation.currency,
          promoCodeId: promoCodeRecord?.id,
          ...rest,
        },
        include: {
          apartment: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
          user: true,
        },
      })

      // Увеличиваем счетчик использования промокода
      if (promoCodeRecord) {
        await tx.promoCode.update({
          where: { id: promoCodeRecord.id },
          data: { usageCount: { increment: 1 } },
        })
      }

      // Записываем историю статуса
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: newBooking.id,
          toStatus: 'PENDING',
          comment: 'Бронирование создано',
        },
      })

      return newBooking
    })

    return booking as unknown as Booking
  }

  /**
   * Обновляет статус бронирования
   */
  async updateBookingStatus(params: UpdateBookingStatusParams): Promise<Booking> {
    const { bookingId, status, adminId, comment, cancelReason } = params

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      throw new Error('Бронирование не найдено')
    }

    const validTransitions = this.getValidStatusTransitions(booking.status as BookingStatus)
    if (!validTransitions.includes(status)) {
      throw new Error(`Невозможно изменить статус с ${booking.status} на ${status}`)
    }

    const updateData: Record<string, unknown> = { status }
    
    if (status === 'CANCELED') {
      updateData.canceledAt = new Date()
      updateData.cancelReason = cancelReason
      
      // Рассчитываем сумму возврата
      const refundAmount = await this.calculateRefund(booking)
      updateData.refundAmount = refundAmount
      
      if (refundAmount > 0) {
        updateData.paymentStatus = 'PARTIAL_REFUND'
      }
    }

    if (status === 'PAID') {
      updateData.paymentStatus = 'COMPLETED'
    }

    if (comment) {
      updateData.adminComment = comment
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: updateData,
        include: {
          apartment: true,
          user: true,
        },
      })

      // Записываем историю
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: status,
          comment: comment || cancelReason,
          changedBy: adminId,
        },
      })

      // Если отмена - уменьшаем счетчик промокода
      if (status === 'CANCELED' && booking.promoCodeId) {
        await tx.promoCode.update({
          where: { id: booking.promoCodeId },
          data: { usageCount: { decrement: 1 } },
        })
      }

      return updated
    })

    return updatedBooking as unknown as Booking
  }

  /**
   * Получает бронирование по ID
   */
  async getBookingById(bookingId: string): Promise<Booking | null> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        apartment: {
          include: {
            images: true,
          },
        },
        user: true,
        promoCode: true,
        payments: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    return booking as unknown as Booking | null
  }

  /**
   * Получает бронирование по номеру
   */
  async getBookingByNumber(bookingNumber: string): Promise<Booking | null> {
    const booking = await prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        apartment: {
          include: {
            images: true,
          },
        },
        user: true,
      },
    })
    return booking as unknown as Booking | null
  }

  /**
   * Получает бронирования пользователя
   */
  async getUserBookings(
    userId: string,
    options?: {
      status?: BookingStatus[]
      page?: number
      limit?: number
    }
  ) {
    const { status, page = 1, limit = 10 } = options || {}
    const skip = (page - 1) * limit

    const where = {
      userId,
      ...(status && { status: { in: status } }),
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          apartment: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ])

    return {
      items: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + bookings.length < total,
    }
  }

  /**
   * Получает все бронирования (для админки)
   */
  async getAllBookings(options?: {
    status?: BookingStatus[]
    apartmentId?: string
    startDate?: Date
    endDate?: Date
    search?: string
    page?: number
    limit?: number
    ownerId?: string  // Фильтр по владельцу квартир
  }) {
    const { status, apartmentId, startDate, endDate, search, page = 1, limit = 20, ownerId } = options || {}
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    // Фильтрация по владельцу квартир - каждый админ видит бронирования только своих квартир
    if (ownerId) {
      where.apartment = { ownerId }
    }

    if (status?.length) {
      where.status = { in: status }
    }
    if (apartmentId) {
      where.apartmentId = apartmentId
    }
    if (startDate || endDate) {
      where.checkIn = {}
      if (startDate) (where.checkIn as Record<string, Date>).gte = startDate
      if (endDate) (where.checkIn as Record<string, Date>).lte = endDate
    }
    if (search) {
      where.OR = [
        { bookingNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          apartment: {
            select: { id: true, title: true, slug: true, ownerId: true },
          },
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ])

    return {
      items: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + bookings.length < total,
    }
  }

  /**
   * Рассчитывает сумму возврата при отмене
   */
  private async calculateRefund(booking: {
    checkIn: Date
    totalPrice: number
    paymentStatus: string
  }): Promise<number> {
    // Если платеж не завершен - возврат не нужен
    if (booking.paymentStatus !== 'COMPLETED') {
      return 0
    }

    const now = new Date()
    const checkIn = new Date(booking.checkIn)
    const daysUntilCheckIn = getDaysBetween(now, checkIn)

    if (daysUntilCheckIn >= CANCELLATION_RULES.FULL_REFUND_DAYS) {
      return booking.totalPrice
    }
    
    if (daysUntilCheckIn >= CANCELLATION_RULES.PARTIAL_REFUND_DAYS) {
      return Math.round(booking.totalPrice * (CANCELLATION_RULES.PARTIAL_REFUND_PERCENT / 100))
    }

    return 0
  }

  /**
   * Возвращает допустимые переходы статусов
   */
  private getValidStatusTransitions(currentStatus: BookingStatus): BookingStatus[] {
    const transitions: Record<BookingStatus, BookingStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELED'],
      CONFIRMED: ['PAID', 'CANCELED'],
      PAID: ['COMPLETED', 'CANCELED', 'REFUNDED'],
      CANCELED: [],
      COMPLETED: ['REFUNDED'],
      REFUNDED: [],
    }
    return transitions[currentStatus] || []
  }

  /**
   * Получает статистику бронирований
   */
  async getBookingStats(apartmentId?: string) {
    const where = apartmentId ? { apartmentId } : {}

    const [total, pending, confirmed, paid, completed, canceled] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.count({ where: { ...where, status: 'PENDING' } }),
      prisma.booking.count({ where: { ...where, status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { ...where, status: 'PAID' } }),
      prisma.booking.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.booking.count({ where: { ...where, status: 'CANCELED' } }),
    ])

    return { total, pending, confirmed, paid, completed, canceled }
  }
}

export const bookingService = new BookingService()
