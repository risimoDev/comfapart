/**
 * POST /api/auth/verify-email - Подтверждение email
 */

import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Токен верификации обязателен',
        code: 'TOKEN_REQUIRED',
      }, { status: 400 })
    }

    const verified = await authService.verifyEmail(token)

    if (!verified) {
      return NextResponse.json({
        success: false,
        error: 'Недействительный или истекший токен',
        code: 'TOKEN_INVALID',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Email успешно подтверждён',
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка подтверждения email',
    }, { status: 500 })
  }
}
