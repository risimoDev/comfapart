import { NextRequest, NextResponse } from 'next/server'
import { telegramService } from '@/services/telegram.service'

/**
 * GET /api/telegram/verify - Получить код верификации
 * POST /api/telegram/verify - Проверить код (webhook от бота)
 */

export async function GET(request: NextRequest) {
  try {
    // Получаем userId из заголовков (установлены middleware)
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    // Генерируем код верификации
    const code = await telegramService.createVerificationCode(userId)
    const botUsername = telegramService.getBotUsername()
    
    // Формируем deep link для бота
    const deepLink = `https://t.me/${botUsername}?start=verify_${code}`

    return NextResponse.json({
      success: true,
      data: {
        code,
        botUsername,
        deepLink,
        expiresIn: 600, // 10 минут в секундах
        instructions: [
          `Откройте бота @${botUsername} в Telegram`,
          'Нажмите Start или отправьте код',
          'Верификация произойдёт автоматически',
        ],
      },
    })
  } catch (error) {
    console.error('Telegram verify GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка генерации кода' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, telegramId, telegramUsername } = body

    if (!code || !telegramId) {
      return NextResponse.json(
        { success: false, error: 'Требуется код и telegramId' },
        { status: 400 }
      )
    }

    const result = await telegramService.verifyCode(
      code,
      BigInt(telegramId),
      telegramUsername
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { userId: result.userId },
    })
  } catch (error) {
    console.error('Telegram verify POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка верификации' },
      { status: 500 }
    )
  }
}
