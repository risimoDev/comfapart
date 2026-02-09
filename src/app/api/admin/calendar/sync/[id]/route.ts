import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { hasAdminAccess, isTechAdmin, getOwnerFilter } from '@/lib/rbac'
import { calendarService } from '@/services/calendar.service'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Проверяем принадлежность синхронизации текущему пользователю
    const ownerFilter = getOwnerFilter(user)
    const whereClause = ownerFilter.ownerId 
      ? { id, userId: ownerFilter.ownerId }
      : { id }
    
    const syncCheck = await prisma.calendarSync.findFirst({ where: whereClause })
    if (!syncCheck) {
      return NextResponse.json(
        { success: false, error: 'Синхронизация не найдена или доступ запрещён' },
        { status: 404 }
      )
    }

    const imported = await calendarService.importFromExternalCalendar(id)

    return NextResponse.json({
      success: true,
      data: { imported },
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Ошибка при синхронизации' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Для TECH_ADMIN - разрешаем удаление любой синхронизации
    // Для OWNER - только своих (проверка внутри deleteCalendarSync)
    if (isTechAdmin(user)) {
      // Проверяем существование
      const sync = await prisma.calendarSync.findUnique({ where: { id } })
      if (!sync) {
        return NextResponse.json(
          { success: false, error: 'Синхронизация не найдена' },
          { status: 404 }
        )
      }
      await prisma.externalCalendarEvent.deleteMany({ where: { calendarSyncId: id } })
      await prisma.calendarSync.delete({ where: { id } })
    } else {
      await calendarService.deleteCalendarSync(id, user.id)
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении синхронизации' },
      { status: 500 }
    )
  }
}
