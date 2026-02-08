/**
 * GET /api/auth/sessions - Получить активные сессии
 * DELETE /api/auth/sessions - Отозвать сессию
 */

import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import { getUserFromRequest } from '@/lib/auth'

// GET - список активных сессий пользователя
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Требуется авторизация',
        code: 'UNAUTHORIZED',
      }, { status: 401 })
    }

    const sessions = await authService.getUserSessions(user.id)

    // Помечаем текущую сессию
    const currentToken = request.cookies.get('refreshToken')?.value
    const sessionsWithCurrent = sessions.map((session) => ({
      ...session,
      // Не можем напрямую сравнить, но можем показать признак по времени создания
      isCurrent: false, // Клиент определит по ID
    }))

    return NextResponse.json({
      success: true,
      data: sessionsWithCurrent,
    })
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения сессий',
    }, { status: 500 })
  }
}

// DELETE - отзыв конкретной сессии
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Требуется авторизация',
        code: 'UNAUTHORIZED',
      }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'ID сессии обязателен',
      }, { status: 400 })
    }

    const meta = {
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 request.ip || undefined,
    }

    const revoked = await authService.revokeSession(sessionId, user.id, meta)

    if (!revoked) {
      return NextResponse.json({
        success: false,
        error: 'Сессия не найдена',
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Сессия отозвана',
    })
  } catch (error) {
    console.error('Revoke session error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка отзыва сессии',
    }, { status: 500 })
  }
}
