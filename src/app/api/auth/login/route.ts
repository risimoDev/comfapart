import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import { loginSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Валидация
    const validatedData = loginSchema.parse(body)
    
    // Получаем метаданные запроса
    const meta = {
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 request.ip || undefined,
    }
    
    // Авторизация
    const result = await authService.login(validatedData, meta)
    
    // Устанавливаем refresh token в httpOnly cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
      },
    })

    response.cookies.set('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Ошибка валидации',
        details: error.errors,
      }, { status: 400 })
    }
    
    if (error instanceof Error) {
      // Определяем код ошибки
      const isRateLimit = error.message.includes('Слишком много попыток')
      return NextResponse.json({
        success: false,
        error: error.message,
        code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'INVALID_CREDENTIALS',
      }, { status: isRateLimit ? 429 : 401 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
    }, { status: 500 })
  }
}
