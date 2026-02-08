/**
 * POST /api/auth/reset-password - Сброс пароля по токену
 */

import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Токен обязателен'),
  password: z.string().min(8, 'Пароль должен быть минимум 8 символов'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    const meta = {
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 request.ip || undefined,
    }

    const success = await authService.resetPassword(token, password, meta)

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Недействительный или истекший токен',
        code: 'TOKEN_INVALID',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменён',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Ошибка валидации',
        details: error.errors,
      }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 })
    }

    console.error('Reset password error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка сброса пароля',
    }, { status: 500 })
  }
}
