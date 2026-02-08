/**
 * POST /api/auth/forgot-password - Запрос сброса пароля
 * POST /api/auth/reset-password - Сброс пароля по токену
 */

import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Некорректный email'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    const meta = {
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 request.ip || undefined,
    }

    // Не раскрываем существование пользователя
    await authService.requestPasswordReset(email, meta)

    return NextResponse.json({
      success: true,
      message: 'Если email существует, на него отправлена инструкция по восстановлению',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Некорректный email',
      }, { status: 400 })
    }

    console.error('Forgot password error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка запроса сброса пароля',
    }, { status: 500 })
  }
}
