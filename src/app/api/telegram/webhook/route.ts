import { NextRequest, NextResponse } from 'next/server'
import { telegramService } from '@/services/telegram.service'
import crypto from 'crypto'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

/**
 * POST /api/telegram/webhook - Webhook для Telegram Bot
 * 
 * Для настройки webhook выполните:
 * curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
 *   -H "Content-Type: application/json" \
 *   -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
 */

export async function POST(request: NextRequest) {
  try {
    // Проверяем секретный токен если установлен
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token')
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET

    if (expectedSecret && secretToken !== expectedSecret) {
      console.warn('Invalid webhook secret token')
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const update = await request.json()

    // Логируем для отладки (в production убрать)
    if (process.env.NODE_ENV === 'development') {
      console.log('Telegram webhook update:', JSON.stringify(update, null, 2))
    }

    // Обрабатываем update асинхронно
    await telegramService.handleWebhook(update)

    // Telegram требует быстрый ответ
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    // Всегда возвращаем 200, чтобы Telegram не повторял запрос
    return NextResponse.json({ ok: true })
  }
}

/**
 * GET /api/telegram/webhook - Информация о webhook (для отладки)
 */
export async function GET() {
  if (!telegramService.isConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'Telegram bot not configured. Set TELEGRAM_BOT_TOKEN environment variable.',
    })
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    )
    const info = await response.json()

    return NextResponse.json({
      configured: true,
      botUsername: telegramService.getBotUsername(),
      webhook: info.result,
    })
  } catch (error) {
    return NextResponse.json({
      configured: true,
      error: 'Failed to get webhook info',
    })
  }
}

/**
 * PUT /api/telegram/webhook - Установить webhook
 */
export async function PUT(request: NextRequest) {
  try {
    const { url, secret } = await request.json()

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    // Устанавливаем webhook с секретом
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          secret_token: secret || crypto.randomUUID(),
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true,
        }),
      }
    )

    const result = await response.json()

    return NextResponse.json({
      success: result.ok,
      description: result.description,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to set webhook' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/telegram/webhook - Удалить webhook
 */
export async function DELETE() {
  try {
    const success = await telegramService.deleteWebhook()
    return NextResponse.json({ success })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}
