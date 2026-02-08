/**
 * AdminService - Сервис управления админ-функциями
 * Централизует все операции администратора
 */

import prisma from '@/lib/prisma'
import { AdminAction } from '@prisma/client'

interface LogActionParams {
  adminId: string
  action: AdminAction
  entity: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

interface DashboardStats {
  apartments: {
    total: number
    published: number
    draft: number
    hidden: number
  }
  bookings: {
    total: number
    pending: number
    confirmed: number
    completed: number
    canceled: number
    thisMonth: number
    lastMonth: number
  }
  revenue: {
    thisMonth: number
    lastMonth: number
    thisYear: number
    growth: number
  }
  users: {
    total: number
    thisMonth: number
    active: number
  }
  occupancy: {
    rate: number
    avgNights: number
  }
}

interface BookingTrend {
  date: string
  bookings: number
  revenue: number
}

interface RevenueByApartment {
  apartmentId: string
  apartmentTitle: string
  revenue: number
  bookings: number
  occupancyRate: number
}

export class AdminService {
  /**
   * Логирует действие администратора
   */
  async logAction(params: LogActionParams): Promise<void> {
    await prisma.adminLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details as object | undefined,
        ipAddress: params.ipAddress,
      },
    })
  }

  /**
   * Получает полную статистику для дашборда
   */
  async getDashboardStats(ownerId?: string): Promise<DashboardStats> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Фильтр по владельцу (если указан)
    const apartmentFilter = ownerId ? { ownerId } : {}
    const bookingFilter = ownerId ? { apartment: { ownerId } } : {}

    // Параллельные запросы для производительности
    const [
      apartmentStats,
      bookingStats,
      userStats,
      monthRevenue,
      lastMonthRevenue,
      yearRevenue,
      occupancyData
    ] = await Promise.all([
      // Статистика апартаментов
      prisma.apartment.groupBy({
        by: ['status'],
        where: apartmentFilter,
        _count: true,
      }),
      
      // Статистика бронирований
      Promise.all([
        prisma.booking.count({ where: bookingFilter }),
        prisma.booking.count({ where: { ...bookingFilter, status: 'PENDING' } }),
        prisma.booking.count({ where: { ...bookingFilter, status: 'CONFIRMED' } }),
        prisma.booking.count({ where: { ...bookingFilter, status: 'COMPLETED' } }),
        prisma.booking.count({ where: { ...bookingFilter, status: 'CANCELED' } }),
        prisma.booking.count({ where: { ...bookingFilter, createdAt: { gte: startOfMonth } } }),
        prisma.booking.count({ where: { ...bookingFilter, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      ]),
      
      // Статистика пользователей (только для TECH_ADMIN - без ownerId)
      ownerId ? Promise.resolve([0, 0, 0]) : Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
      ]),
      
      // Выручка за текущий месяц
      prisma.booking.aggregate({
        where: {
          ...bookingFilter,
          createdAt: { gte: startOfMonth },
          status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
        },
        _sum: { totalPrice: true },
      }),
      
      // Выручка за прошлый месяц
      prisma.booking.aggregate({
        where: {
          ...bookingFilter,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
        },
        _sum: { totalPrice: true },
      }),
      
      // Выручка за год
      prisma.booking.aggregate({
        where: {
          ...bookingFilter,
          createdAt: { gte: startOfYear },
          status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
        },
        _sum: { totalPrice: true },
      }),
      
      // Данные для расчёта загрузки
      prisma.booking.aggregate({
        where: {
          ...bookingFilter,
          checkIn: { gte: startOfMonth },
          status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
        },
        _sum: { nights: true },
        _count: true,
      }),
    ])

    // Обработка статистики апартаментов
    const apartments = {
      total: 0,
      published: 0,
      draft: 0,
      hidden: 0,
    }
    
    for (const stat of apartmentStats) {
      apartments.total += stat._count
      switch (stat.status) {
        case 'PUBLISHED':
          apartments.published = stat._count
          break
        case 'DRAFT':
          apartments.draft = stat._count
          break
        case 'HIDDEN':
          apartments.hidden = stat._count
          break
      }
    }

    // Расчёт роста выручки
    const thisMonthRev = Number(monthRevenue._sum.totalPrice) || 0
    const lastMonthRev = Number(lastMonthRevenue._sum.totalPrice) || 0
    const growth = lastMonthRev > 0 
      ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 
      : 0

    // Расчёт загрузки (упрощённый - ночей забронировано / возможных ночей)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const possibleNights = apartments.published * daysInMonth
    const bookedNights = Number(occupancyData._sum.nights) || 0
    const occupancyRate = possibleNights > 0 
      ? (bookedNights / possibleNights) * 100 
      : 0

    return {
      apartments,
      bookings: {
        total: bookingStats[0],
        pending: bookingStats[1],
        confirmed: bookingStats[2],
        completed: bookingStats[3],
        canceled: bookingStats[4],
        thisMonth: bookingStats[5],
        lastMonth: bookingStats[6],
      },
      revenue: {
        thisMonth: thisMonthRev,
        lastMonth: lastMonthRev,
        thisYear: Number(yearRevenue._sum.totalPrice) || 0,
        growth,
      },
      users: {
        total: userStats[0],
        thisMonth: userStats[1],
        active: userStats[2],
      },
      occupancy: {
        rate: Math.round(occupancyRate * 10) / 10,
        avgNights: occupancyData._count > 0 
          ? Math.round((bookedNights / occupancyData._count) * 10) / 10 
          : 0,
      },
    }
  }

  /**
   * Получает тренды бронирований за период
   */
  async getBookingTrends(days: number = 30, ownerId?: string): Promise<BookingTrend[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const bookingFilter = ownerId ? { apartment: { ownerId } } : {}

    const bookings = await prisma.booking.findMany({
      where: {
        ...bookingFilter,
        createdAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
      },
      select: {
        createdAt: true,
        totalPrice: true,
      },
    })

    // Группируем по дням
    const trendsMap = new Map<string, { bookings: number; revenue: number }>()
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const key = date.toISOString().split('T')[0]
      trendsMap.set(key, { bookings: 0, revenue: 0 })
    }

    for (const booking of bookings) {
      const key = booking.createdAt.toISOString().split('T')[0]
      const current = trendsMap.get(key)
      if (current) {
        current.bookings++
        current.revenue += Number(booking.totalPrice) || 0
      }
    }

    return Array.from(trendsMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }))
  }

  /**
   * Получает выручку по апартаментам
   */
  async getRevenueByApartment(year: number, month: number): Promise<RevenueByApartment[]> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const apartments = await prisma.apartment.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        bookings: {
          where: {
            checkIn: { gte: startDate, lte: endDate },
            status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
          },
          select: {
            totalPrice: true,
            nights: true,
          },
        },
      },
    })

    const daysInMonth = endDate.getDate()

    return apartments.map((apt) => {
      const revenue = apt.bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0)
      const bookedNights = apt.bookings.reduce((sum, b) => sum + b.nights, 0)
      
      return {
        apartmentId: apt.id,
        apartmentTitle: apt.title,
        revenue,
        bookings: apt.bookings.length,
        occupancyRate: Math.round((bookedNights / daysInMonth) * 100 * 10) / 10,
      }
    }).sort((a, b) => b.revenue - a.revenue)
  }

  /**
   * Получает историю действий
   */
  async getAdminLogs(params: {
    adminId?: string
    entity?: string
    action?: AdminAction
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
  }) {
    const { adminId, entity, action, startDate, endDate, page = 1, limit = 50 } = params

    const where: Record<string, unknown> = {}
    
    if (adminId) where.adminId = adminId
    if (entity) where.entity = entity
    if (action) where.action = action
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
    }

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        include: {
          admin: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.adminLog.count({ where }),
    ])

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Быстрые действия для дашборда
   */
  async getPendingActions(ownerId?: string) {
    const apartmentFilter = ownerId ? { ownerId } : {}
    const bookingFilter = ownerId ? { apartment: { ownerId } } : {}
    const reviewFilter = ownerId ? { apartment: { ownerId } } : {}

    const [
      pendingBookings,
      pendingReviews,
      lowOccupancy
    ] = await Promise.all([
      // Бронирования, ожидающие подтверждения
      prisma.booking.findMany({
        where: { ...bookingFilter, status: 'PENDING' },
        include: {
          apartment: { select: { title: true } },
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      
      // Отзывы на модерации
      prisma.review.findMany({
        where: { ...reviewFilter, isApproved: false, isPublished: false },
        include: {
          apartment: { select: { title: true } },
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      
      // Апартаменты с низкой загрузкой (без бронирований за 30 дней)
      prisma.apartment.findMany({
        where: {
          ...apartmentFilter,
          status: 'PUBLISHED',
          bookings: {
            none: {
              checkIn: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
        select: { id: true, title: true, slug: true },
        take: 10,
      }),
    ])

    return {
      pendingBookings,
      pendingReviews,
      lowOccupancy,
    }
  }
}

export const adminService = new AdminService()
