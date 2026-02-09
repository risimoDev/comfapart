/**
 * API статистики для владельца (OWNER)
 * GET - получить статистику доходности
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, eachDayOfInterval, differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    // Проверяем, что пользователь - владелец
    if (user.role !== 'OWNER' && user.role !== 'TECH_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Доступ только для владельцев' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '12')
    const apartmentId = searchParams.get('apartmentId') || undefined

    const now = new Date()
    const startDate = startOfMonth(subMonths(now, months - 1))
    const endDate = endOfMonth(now)

    // Фильтр для квартир пользователя
    const apartmentFilter = {
      ownerId: user.id,
      ...(apartmentId && { id: apartmentId }),
    }

    // Получаем квартиры пользователя
    const apartments = await prisma.apartment.findMany({
      where: apartmentFilter,
      select: {
        id: true,
        title: true,
        averageRating: true,
        reviewCount: true,
        status: true,
      },
    })

    const apartmentIds = apartments.map(a => a.id)

    // Общая статистика
    const [
      totalRevenue,
      totalBookings,
      completedBookings,
      ratingStats,
    ] = await Promise.all([
      prisma.booking.aggregate({
        where: {
          apartmentId: { in: apartmentIds },
          status: { in: ['PAID', 'COMPLETED'] },
        },
        _sum: { totalPrice: true },
      }),

      prisma.booking.count({
        where: {
          apartmentId: { in: apartmentIds },
        },
      }),

      prisma.booking.count({
        where: {
          apartmentId: { in: apartmentIds },
          status: { in: ['PAID', 'COMPLETED'] },
        },
      }),

      prisma.review.aggregate({
        where: {
          apartmentId: { in: apartmentIds },
          isApproved: true,
        },
        _avg: { rating: true },
        _count: true,
      }),
    ])

    // Доход по месяцам
    const revenueByMonth: { period: string; revenue: number; bookings: number }[] = []
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i))
      const monthEnd = endOfMonth(subMonths(now, i))

      const monthData = await prisma.booking.aggregate({
        where: {
          apartmentId: { in: apartmentIds },
          status: { in: ['PAID', 'COMPLETED'] },
          checkIn: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { totalPrice: true },
        _count: true,
      })

      revenueByMonth.push({
        period: monthStart.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        revenue: monthData._sum.totalPrice || 0,
        bookings: monthData._count,
      })
    }

    // Загрузка по месяцам (occupancy %)
    const occupancyByMonth: { period: string; occupancy: number; bookedNights: number; totalNights: number }[] = []

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i))
      const monthEnd = endOfMonth(subMonths(now, i))
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1
      const totalAvailableNights = daysInMonth * apartments.length

      // Получаем бронирования за месяц
      const monthBookings = await prisma.booking.findMany({
        where: {
          apartmentId: { in: apartmentIds },
          status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
          OR: [
            {
              checkIn: { gte: monthStart, lte: monthEnd },
            },
            {
              checkOut: { gte: monthStart, lte: monthEnd },
            },
            {
              AND: [
                { checkIn: { lte: monthStart } },
                { checkOut: { gte: monthEnd } },
              ],
            },
          ],
        },
        select: {
          checkIn: true,
          checkOut: true,
        },
      })

      // Считаем занятые ночи
      let bookedNights = 0
      for (const booking of monthBookings) {
        const bookingStart = new Date(Math.max(booking.checkIn.getTime(), monthStart.getTime()))
        const bookingEnd = new Date(Math.min(booking.checkOut.getTime(), monthEnd.getTime()))
        const nights = differenceInDays(bookingEnd, bookingStart)
        if (nights > 0) bookedNights += nights
      }

      const occupancy = totalAvailableNights > 0 
        ? Math.round((bookedNights / totalAvailableNights) * 100) 
        : 0

      occupancyByMonth.push({
        period: monthStart.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        occupancy,
        bookedNights,
        totalNights: totalAvailableNights,
      })
    }

    // Статистика по апартаментам
    const apartmentStats = await Promise.all(
      apartments.map(async (apt) => {
        const aptRevenue = await prisma.booking.aggregate({
          where: {
            apartmentId: apt.id,
            status: { in: ['PAID', 'COMPLETED'] },
          },
          _sum: { totalPrice: true },
          _count: true,
        })

        return {
          id: apt.id,
          title: apt.title,
          status: apt.status,
          revenue: aptRevenue._sum.totalPrice || 0,
          bookings: aptRevenue._count,
          averageRating: apt.averageRating,
          reviewCount: apt.reviewCount,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRevenue: totalRevenue._sum.totalPrice || 0,
          totalBookings,
          completedBookings,
          averageRating: ratingStats._avg.rating || 0,
          totalReviews: ratingStats._count,
          apartmentsCount: apartments.length,
        },
        revenueByMonth,
        occupancyByMonth,
        apartmentStats,
      },
    })
  } catch (error) {
    console.error('Error fetching owner stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики',
    }, { status: 500 })
  }
}
