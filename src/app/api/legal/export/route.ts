/**
 * API для экспорта данных пользователя (право на переносимость)
 * GET - получить экспорт данных
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { legalService } from '@/services/legal.service'

// GET /api/legal/export - экспортировать данные пользователя
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    const exportData = await legalService.exportUserData(user.id)

    // Возвращаем как JSON файл
    const jsonString = JSON.stringify(exportData, null, 2)
    
    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="my-data-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Export user data error:', error)
    return NextResponse.json(
      { error: 'Ошибка экспорта данных' },
      { status: 500 }
    )
  }
}
