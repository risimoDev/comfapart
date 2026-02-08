import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import { legalService } from '@/services/legal.service'
import { registerSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Валидация
    const validatedData = registerSchema.parse(body)
    
    // Метаданные запроса
    const meta = {
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 request.ip || undefined,
    }
    
    // Регистрация
    const result = await authService.register(validatedData, meta)
    
    // Логирование согласий (152-ФЗ)
    if (body.consents) {
      const consentTypes: { type: 'PERSONAL_DATA' | 'TERMS_ACCEPTANCE' | 'MARKETING'; documentType?: 'PERSONAL_DATA_POLICY' | 'TERMS_OF_SERVICE' }[] = []
      
      if (body.consents.personalData) {
        consentTypes.push({ type: 'PERSONAL_DATA', documentType: 'PERSONAL_DATA_POLICY' })
      }
      if (body.consents.terms) {
        consentTypes.push({ type: 'TERMS_ACCEPTANCE', documentType: 'TERMS_OF_SERVICE' })
      }
      if (body.consents.marketing) {
        consentTypes.push({ type: 'MARKETING' })
      }
      
      // Записываем согласия в БД
      await legalService.createMultipleConsents(
        result.user.id,
        consentTypes,
        meta.ipAddress,
        meta.userAgent
      )
    }
    
    // Устанавливаем refresh token в httpOnly cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
      },
    }, { status: 201 })

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
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
    }, { status: 500 })
  }
}
