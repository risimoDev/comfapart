import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getOwnerFilter, hasAdminAccess, isTechAdmin } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const ownerFilter = getOwnerFilter(user)
    const apartmentFilter = ownerFilter.ownerId ? { ownerId: ownerFilter.ownerId } : {}
    const bookingFilter = ownerFilter.ownerId ? { apartment: { ownerId: ownerFilter.ownerId } } : {}
    
    const [
      totalApartments,
      publishedApartments,
      totalBookings,
      pendingBookings,
      revenueStats,
      ratingStats,
      monthlyBookings,
    ] = await Promise.all([
      prisma.apartment.count({ where: apartmentFilter }),
      
      prisma.apartment.count({ where: { ...apartmentFilter, status: 'PUBLISHED' } }),
      
      prisma.booking.count({ where: bookingFilter }),
      
      prisma.booking.count({ where: { ...bookingFilter, status: 'PENDING' } }),
      
      prisma.booking.aggregate({
        where: { ...bookingFilter, status: { in: ['PAID', 'COMPLETED'] } },
        _sum: { totalPrice: true },
      }),
      
      // Средний рейтинг квартир пользователя
      prisma.apartment.aggregate({
        where: { ...apartmentFilter, averageRating: { not: null } },
        _avg: { averageRating: true },
      }),
      
      // Доход за месяц
      prisma.booking.aggregate({
        where: {
          ...bookingFilter,
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalPrice: true },
      }),
    ])
    
    // Доход по месяцам за последние 6 месяцев
    const revenueByMonth = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthRevenue = await prisma.booking.aggregate({
        where: {
          ...bookingFilter,
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { totalPrice: true },
        _count: true,
      })
      
      revenueByMonth.push({
        period: monthStart.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue._sum.totalPrice || 0,
        bookings: monthRevenue._count,
      })
    }
    
    // Получаем ID квартир пользователя для группировки
    const userApartmentIds = await prisma.apartment.findMany({
      where: apartmentFilter,
      select: { id: true },
    }).then(apts => apts.map(a => a.id))
    
    // Статистика по статусам бронирований
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      where: { apartmentId: { in: userApartmentIds } },
      _count: true,
    })
    
    // Топ апартаментов по доходу
    const topApartments = await prisma.booking.groupBy({
      by: ['apartmentId'],
      where: { 
        apartmentId: { in: userApartmentIds },
        status: { in: ['PAID', 'COMPLETED'] },
      },
      _sum: { totalPrice: true },
      _count: true,
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 5,
    })
    
    // Получаем названия апартаментов
    const apartmentIds = topApartments.map(a => a.apartmentId)
    const apartments = await prisma.apartment.findMany({
      where: { id: { in: apartmentIds } },
      select: { id: true, title: true },
    })
    
    const topApartmentsWithNames = topApartments.map(apt => ({
      ...apt,
      title: apartments.find(a => a.id === apt.apartmentId)?.title || 'Неизвестно',
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalApartments,
          publishedApartments,
          totalBookings,
          pendingBookings,
          totalRevenue: revenueStats._sum.totalPrice || 0,
          thisMonthRevenue: monthlyBookings._sum.totalPrice || 0,
          averageRating: ratingStats._avg.averageRating || 0,
        },
        revenueByMonth,
        bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count
          return acc
        }, {} as Record<string, number>),
        topApartments: topApartmentsWithNames,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики',
    }, { status: 500 })
  }
}
