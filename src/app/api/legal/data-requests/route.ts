/**
 * API для запросов на обработку данных (право на забвение, выгрузка)
 * GET - получить запросы пользователя
 * POST - создать запрос
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { legalService } from '@/services/legal.service'
import { z } from 'zod'

const createDataRequestSchema = z.object({
  requestType: z.enum(['deletion', 'export', 'restriction']),
  reason: z.string().optional(),
  requestedData: z.array(z.string()).optional(),
})

// GET /api/legal/data-requests - получить запросы пользователя
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    const requests = await legalService.getUserDataRequests(user.id)

    return NextResponse.json({
      success: true,
      data: requests,
    })
  } catch (error) {
    console.error('Get data requests error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения запросов' },
      { status: 500 }
    )
  }
}

// POST /api/legal/data-requests - создать запрос
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { requestType, reason, requestedData } = createDataRequestSchema.parse(body)

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      request.ip
    const userAgent = request.headers.get('user-agent')

    const dataRequest = await legalService.createDataRequest({
      userId: user.id,
      requestType,
      reason,
      requestedData,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    })

    return NextResponse.json({
      success: true,
      data: dataRequest,
      message: requestType === 'deletion' 
        ? 'Запрос на удаление данных создан. Мы обработаем его в течение 30 дней.'
        : requestType === 'export'
        ? 'Запрос на выгрузку данных создан. Вы получите ссылку на скачивание на email.'
        : 'Запрос на ограничение обработки создан.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create data request error:', error)
    return NextResponse.json(
      { error: 'Ошибка создания запроса' },
      { status: 500 }
    )
  }
}
