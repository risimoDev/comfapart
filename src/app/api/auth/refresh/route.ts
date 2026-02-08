/**
 * POST /api/auth/refresh - Обновление access token
 */

import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Получаем refresh token из cookie
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        error: 'Refresh token не найден',
        code: 'REFRESH_TOKEN_MISSING',
      }, { status: 401 })
    }

    const meta = {
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 request.ip || undefined,
    }

    // Обновляем токены
    const tokens = await authService.refreshTokens(refreshToken, meta)

    // Получаем данные пользователя
    const payload = await authService.verifyToken(tokens.accessToken)
    let userData = null
    
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          telegramVerified: true,
          telegramUsername: true,
          avatar: true,
        },
      })
      userData = user
    }

    // Устанавливаем новый refresh token в cookie
    const response = NextResponse.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        user: userData,
      },
    })

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    // Удаляем невалидный refresh token
    const response = NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка обновления токена',
      code: 'REFRESH_TOKEN_INVALID',
    }, { status: 401 })

    response.cookies.delete('refreshToken')
    
    return response
  }
}
