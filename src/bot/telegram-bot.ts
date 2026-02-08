/**
 * Telegram Bot for Comfort Apartments
 * 
 * Этот файл содержит standalone версию бота для запуска через polling.
 * В production рекомендуется использовать webhook (/api/telegram/webhook).
 * 
 * Запуск в режиме разработки:
 * npx ts-node --project tsconfig.json src/bot/telegram-bot.ts
 * 
 * Или добавьте в package.json:
 * "scripts": {
 *   "bot": "ts-node --project tsconfig.json src/bot/telegram-bot.ts"
 * }
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const POLL_INTERVAL = 1000 // 1 секунда

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set!')
  process.exit(1)
}

const API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      first_name: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    text?: string
  }
}

let lastUpdateId = 0

/**
 * Отправка сообщения
 */
async function sendMessage(
  chatId: number,
  text: string,
  parseMode: string = 'HTML',
  replyMarkup?: object
) {
  try {
    const response = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      }),
    })
    
    const result = await response.json()
    if (!result.ok) {
      console.error('Send error:', result.description)
    }
    return result.ok
  } catch (error) {
    console.error('Send error:', error)
    return false
  }
}

/**
 * Генерация кода верификации
 */
function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString()
}

/**
 * Верификация пользователя
 */
async function verifyUser(
  code: string,
  telegramId: bigint,
  telegramUsername?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const verification = await prisma.telegramVerification.findUnique({
      where: { code },
    })

    if (!verification) {
      return { success: false, error: 'Код не найден' }
    }

    if (verification.used) {
      return { success: false, error: 'Код уже использован' }
    }

    if (verification.expiresAt < new Date()) {
      return { success: false, error: 'Код истёк' }
    }

    // Проверяем не привязан ли уже этот Telegram
    const existing = await prisma.user.findUnique({
      where: { telegramId },
    })

    if (existing && existing.id !== verification.userId) {
      return { success: false, error: 'Этот Telegram уже привязан к другому аккаунту' }
    }

    // Обновляем
    await prisma.$transaction([
      prisma.telegramVerification.update({
        where: { id: verification.id },
        data: { used: true, usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verification.userId },
        data: {
          telegramVerified: true,
          telegramId,
          telegramUsername,
          status: 'ACTIVE',
        },
      }),
      prisma.securityEvent.create({
        data: {
          userId: verification.userId,
          eventType: 'TELEGRAM_VERIFIED',
          metadata: { telegramId: telegramId.toString(), telegramUsername },
        },
      }),
    ])

    return { success: true }
  } catch (error) {
    console.error('Verify error:', error)
    return { success: false, error: 'Ошибка верификации' }
  }
}

/**
 * Обработка сообщения
 */
async function handleMessage(message: TelegramUpdate['message']) {
  if (!message || !message.text) return

  const chatId = message.chat.id
  const text = message.text.trim()
  const telegramId = BigInt(message.from.id)
  const username = message.from.username

  console.log(`📩 ${message.from.first_name} (${message.from.id}): ${text}`)

  // /start
  if (text.startsWith('/start')) {
    const parts = text.split(' ')
    if (parts.length > 1 && parts[1].startsWith('verify_')) {
      const code = parts[1].replace('verify_', '')
      const result = await verifyUser(code, telegramId, username)
      
      if (result.success) {
        await sendMessage(chatId, 
          `✅ <b>Верификация успешна!</b>\n\n` +
          `Ваш Telegram привязан к аккаунту.\n\n` +
          `🏠 <a href="${APP_URL}">Перейти на сайт</a>`
        )
      } else {
        await sendMessage(chatId, `❌ <b>Ошибка:</b> ${result.error}`)
      }
      return
    }

    await sendMessage(
      chatId,
      `👋 <b>Добро пожаловать в Comfort Apartments!</b>\n\n` +
      `Этот бот поможет вам:\n` +
      `• Подтвердить аккаунт\n` +
      `• Получать уведомления о бронированиях\n\n` +
      `📝 Для верификации отправьте 6-значный код с сайта.\n\n` +
      `🔗 <a href="${APP_URL}">Открыть сайт</a>`,
      'HTML',
      {
        inline_keyboard: [[{ text: '🌐 Открыть сайт', url: APP_URL }]],
      }
    )
    return
  }

  // /help
  if (text === '/help') {
    await sendMessage(
      chatId,
      `📖 <b>Команды:</b>\n\n` +
      `/start - Начать\n` +
      `/status - Статус аккаунта\n` +
      `/help - Справка\n\n` +
      `💡 Просто отправьте код верификации (6 цифр).`
    )
    return
  }

  // /status
  if (text === '/status') {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { firstName: true, lastName: true, email: true, status: true },
    })

    if (user) {
      await sendMessage(
        chatId,
        `📊 <b>Статус:</b>\n\n` +
        `👤 ${user.firstName} ${user.lastName}\n` +
        `📧 ${user.email}\n` +
        `✅ Telegram: Привязан\n` +
        `📌 ${user.status === 'ACTIVE' ? '🟢 Активен' : '🟡 Ожидает'}`
      )
    } else {
      await sendMessage(chatId, `❌ Telegram не привязан.\nОтправьте код с сайта.`)
    }
    return
  }

  // 6-значный код
  if (/^\d{6}$/.test(text)) {
    const result = await verifyUser(text, telegramId, username)
    
    if (result.success) {
      await sendMessage(
        chatId,
        `✅ <b>Верификация успешна!</b>\n\n` +
        `Теперь вы можете использовать все функции сервиса.\n\n` +
        `🏠 <a href="${APP_URL}">Перейти на сайт</a>`
      )
    } else {
      await sendMessage(chatId, `❌ <b>Ошибка:</b> ${result.error}`)
    }
    return
  }

  // Неизвестная команда
  await sendMessage(chatId, `❓ Используйте /help для списка команд.`)
}

/**
 * Получение обновлений (long polling)
 */
async function getUpdates(): Promise<TelegramUpdate[]> {
  try {
    const response = await fetch(
      `${API_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`
    )
    const data = await response.json()
    
    if (data.ok && data.result.length > 0) {
      lastUpdateId = data.result[data.result.length - 1].update_id
      return data.result
    }
    return []
  } catch (error) {
    console.error('Get updates error:', error)
    return []
  }
}

/**
 * Основной цикл
 */
async function main() {
  console.log('🤖 Telegram Bot запущен!')
  console.log(`📡 APP_URL: ${APP_URL}`)
  
  // Удаляем webhook если есть
  await fetch(`${API_URL}/deleteWebhook`)
  
  // Получаем инфо о боте
  const meResponse = await fetch(`${API_URL}/getMe`)
  const meData = await meResponse.json()
  if (meData.ok) {
    console.log(`👤 Bot: @${meData.result.username}`)
  }

  // Polling loop
  while (true) {
    try {
      const updates = await getUpdates()
      
      for (const update of updates) {
        if (update.message) {
          await handleMessage(update.message)
        }
      }
    } catch (error) {
      console.error('Polling error:', error)
    }
    
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Завершение работы...')
  await prisma.$disconnect()
  process.exit(0)
})

main().catch(console.error)
