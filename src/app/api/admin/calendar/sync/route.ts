import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { hasAdminAccess } from '@/lib/rbac'
import { calendarService } from '@/services/calendar.service'
import { CalendarSyncType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const syncs = await calendarService.getUserCalendarSyncs(user.id)

    // Добавляем полные URL для экспорта
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const syncsWithUrls = syncs.map(sync => ({
      ...sync,
      exportUrl: sync.exportToken 
        ? `${baseUrl}/api/calendar/ical/${sync.exportToken}` 
        : null,
    }))

    return NextResponse.json({
      success: true,
      data: syncsWithUrls,
    })
  } catch (error) {
    console.error('Error fetching calendar syncs:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении синхронизаций',
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
    const { type, apartmentId, importUrl, sourceName, syncInterval } = body

    if (!type || !['EXPORT', 'IMPORT'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Укажите корректный тип: EXPORT или IMPORT' },
        { status: 400 }
      )
    }

    if (type === 'IMPORT' && !importUrl) {
      return NextResponse.json(
        { success: false, error: 'Для импорта укажите URL календаря' },
        { status: 400 }
      )
    }

    const sync = await calendarService.createCalendarSync({
      userId: user.id,
      type: type as CalendarSyncType,
      apartmentId,
      importUrl,
      sourceName,
      syncInterval,
    })

    // Добавляем URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const syncWithUrl = {
      ...sync,
      exportUrl: sync.exportToken 
        ? `${baseUrl}/api/calendar/ical/${sync.exportToken}` 
        : null,
    }

    // Если это импорт - сразу запускаем синхронизацию
    if (type === 'IMPORT') {
      try {
        await calendarService.importFromExternalCalendar(sync.id)
      } catch (e) {
        // Ошибка синхронизации не критична при создании
        console.error('Initial sync failed:', e)
      }
    }

    return NextResponse.json({
      success: true,
      data: syncWithUrl,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании синхронизации' },
      { status: 500 }
    )
  }
}
