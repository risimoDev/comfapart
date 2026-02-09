import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { hasAdminAccess, isTechAdmin } from '@/lib/rbac'
import { calendarService } from '@/services/calendar.service'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
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
      endDate,
      user.role
    )

    return NextResponse.json({
      success: true,
      data: events,
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
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
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
      reason,
      user.role
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
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const apartmentId = searchParams.get('apartmentId')
    const datesParam = searchParams.get('dates')

    if (!apartmentId || !datesParam) {
      return NextResponse.json(
        { success: false, error: 'Укажите apartmentId и dates' },
        { status: 400 }
      )
    }

    const dates = datesParam.split(',').map(d => new Date(d))
    const unblocked = await calendarService.unblockDates(user.id, apartmentId, dates, user.role)

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
