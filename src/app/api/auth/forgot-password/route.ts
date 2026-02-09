/**
 * POST /api/auth/forgot-password - Запрос сброса пароля через Telegram
 */

import { NextRequest, NextResponse } from 'next/server'
import { securityService } from '@/services'
import { telegramService } from '@/services/telegram.service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

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

    // Проверяем rate limit (5 попыток / 15 минут)
    const rateLimit = await securityService.checkPasswordResetRateLimit(
      email,
      meta.ipAddress || 'unknown'
    )

    if (!rateLimit.allowed) {
      return NextResponse.json({
        success: false,
        error: `Слишком много запросов. Повторите через ${Math.ceil(rateLimit.retryAfter! / 60)} минут`,
      }, { status: 429 })
    }

    // Записываем попытку
    await securityService.recordPasswordResetAttempt({
      email,
      ipAddress: meta.ipAddress || 'unknown',
      userAgent: meta.userAgent,
    })

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { 
        id: true,
        telegramId: true, 
        telegramVerified: true,
        firstName: true,
      },
    })

    // Не раскрываем существование пользователя
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Если email существует и Telegram привязан, ссылка для сброса отправлена в Telegram',
        telegramLinked: false,
      })
    }

    // Проверяем привязан ли Telegram
    if (!user.telegramVerified || !user.telegramId) {
      return NextResponse.json({
        success: false,
        error: 'Telegram не привязан к этому аккаунту. Обратитесь в поддержку для восстановления пароля.',
        telegramLinked: false,
      }, { status: 400 })
    }

    // Создаём токен сброса пароля
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 минут

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        type: 'PASSWORD_RESET',
        expiresAt,
      }
    })

    // Отправляем ссылку в Telegram
    const result = await telegramService.sendPasswordResetLink(email, resetToken)

    if (!result.success) {
      console.error('[ForgotPassword] Failed to send Telegram message:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Не удалось отправить ссылку в Telegram. Проверьте настройки бота.',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Ссылка для сброса пароля отправлена в Telegram',
      telegramLinked: true,
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
