/**
 * API для календаря владельца (OWNER)
 * GET - получить события календаря
 * POST - заблокировать даты
 * DELETE - разблокировать даты
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { calendarService } from '@/services/calendar.service'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    // Проверяем, что пользователь - владелец (OWNER или TECH_ADMIN)
    if (user.role !== 'OWNER' && user.role !== 'TECH_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Доступ только для владельцев' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const apartmentId = searchParams.get('apartmentId') || undefined
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined

    const events = await calendarService.getCalendarEvents(
      user.id,
      apartmentId,
      startDate,
      endDate
    )

    // Получаем также сезонные цены для отображения
    const seasonalPrices = await prisma.seasonalPrice.findMany({
      where: {
        apartment: { ownerId: user.id },
        ...(apartmentId && { apartmentId }),
        isActive: true,
        OR: [
          { endDate: { gte: startDate || new Date() } },
          { startDate: { lte: endDate || new Date() } },
        ],
      },
      include: {
        apartment: {
          select: { id: true, title: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        events,
        seasonalPrices: seasonalPrices.map(sp => ({
          id: sp.id,
          apartmentId: sp.apartmentId,
          apartmentTitle: sp.apartment.title,
          name: sp.name,
          startDate: sp.startDate.toISOString(),
          endDate: sp.endDate.toISOString(),
          priceMultiplier: sp.priceMultiplier,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении событий календаря',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    if (user.role !== 'OWNER' && user.role !== 'TECH_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Доступ только для владельцев' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { apartmentId, dates, reason } = body

    if (!apartmentId || !dates || !Array.isArray(dates)) {
      return NextResponse.json(
        { success: false, error: 'Укажите apartmentId и dates' },
        { status: 400 }
      )
    }

    const parsedDates = dates.map((d: string) => new Date(d))
    const blocked = await calendarService.blockDates(
      user.id,
      apartmentId,
      parsedDates,
      reason || 'OWNER_BLOCK'
    )

    return NextResponse.json({
      success: true,
      data: { blocked },
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Ошибка при блокировке дат' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    if (user.role !== 'OWNER' && user.role !== 'TECH_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Доступ только для владельцев' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { apartmentId, dates } = body

    if (!apartmentId || !dates || !Array.isArray(dates)) {
      return NextResponse.json(
        { success: false, error: 'Укажите apartmentId и dates' },
        { status: 400 }
      )
    }

    const parsedDates = dates.map((d: string) => new Date(d))
    const unblocked = await calendarService.unblockDates(
      user.id,
      apartmentId,
      parsedDates
    )

    return NextResponse.json({
      success: true,
      data: { unblocked },
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Ошибка при разблокировке дат' },
      { status: 500 }
    )
  }
}
