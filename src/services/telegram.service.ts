/**
 * Telegram Service - Верификация и уведомления через Telegram
 * 
 * Настройка:
 * 1. Создайте бота через @BotFather
 * 2. Установите переменные окружения:
 *    TELEGRAM_BOT_TOKEN=your_bot_token
 *    TELEGRAM_BOT_USERNAME=your_bot_username (без @)
 *    APP_URL=https://your-domain.com
 */

import prisma from '@/lib/prisma'
import crypto from 'crypto'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'ComfortApartmentsBot'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000 // 10 минут

interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: {
    id: number
    type: string
    first_name?: string
    username?: string
  }
  date: number
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: {
    id: string
    from: TelegramUser
    message?: TelegramMessage
    data?: string
  }
}

export class TelegramService {
  private apiUrl: string

  constructor() {
    this.apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
  }

  /**
   * Проверяет настроен ли бот
   */
  isConfigured(): boolean {
    return !!TELEGRAM_BOT_TOKEN
  }

  /**
   * Получает имя бота
   */
  getBotUsername(): string {
    return TELEGRAM_BOT_USERNAME
  }

  /**
   * Генерирует 6-значный код верификации
   */
  generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString()
  }

  /**
   * Создаёт код верификации для пользователя
   */
  async createVerificationCode(userId: string): Promise<string> {
    // Удаляем старые неиспользованные коды
    await prisma.telegramVerification.deleteMany({
      where: {
        userId,
        used: false,
      },
    })

    const code = this.generateVerificationCode()
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY)

    await prisma.telegramVerification.create({
      data: {
        userId,
        code,
        expiresAt,
      },
    })

    return code
  }

  /**
   * Проверяет код верификации и связывает Telegram
   */
  async verifyCode(
    code: string,
    telegramId: bigint,
    telegramUsername?: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    const verification = await prisma.telegramVerification.findUnique({
      where: { code },
      include: { user: true },
    })

    if (!verification) {
      return { success: false, error: 'Код не найден' }
    }

    if (verification.used) {
      return { success: false, error: 'Код уже использован' }
    }

    if (verification.expiresAt < new Date()) {
      return { success: false, error: 'Код истёк. Запросите новый код' }
    }

    // Проверяем, не привязан ли уже этот Telegram к другому аккаунту
    const existingUser = await prisma.user.findUnique({
      where: { telegramId },
    })

    if (existingUser && existingUser.id !== verification.userId) {
      return { 
        success: false, 
        error: 'Этот Telegram аккаунт уже привязан к другому пользователю' 
      }
    }

    // Обновляем верификацию и пользователя в транзакции
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
          status: 'ACTIVE', // Активируем аккаунт
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

    // Обновляем статистику бота
    await this.updateBotStats({ verifiedUsers: { increment: 1 } })

    return { success: true, userId: verification.userId }
  }

  /**
   * Отвязывает Telegram от аккаунта
   */
  async unlinkTelegram(userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          telegramVerified: false,
          telegramId: null,
          telegramUsername: null,
        },
      }),
      prisma.securityEvent.create({
        data: {
          userId,
          eventType: 'TELEGRAM_UNLINKED',
        },
      }),
    ])
  }

  /**
   * Отправляет сообщение в Telegram
   */
  async sendMessage(
    chatId: number | bigint,
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
      replyMarkup?: object
      disableNotification?: boolean
    }
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('[Telegram] Bot not configured - TELEGRAM_BOT_TOKEN is not set')
      return false
    }

    try {
      console.log(`[Telegram] Sending message to chat ${chatId}`)
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.toString(),
          text,
          parse_mode: options?.parseMode || 'HTML',
          reply_markup: options?.replyMarkup,
          disable_notification: options?.disableNotification,
        }),
      })

      const result = await response.json()
      
      // Логируем
      await this.logMessage(BigInt(chatId.toString()), 'notification', 'outgoing', text, result.ok)

      if (!result.ok) {
        console.error('Telegram send error:', result.description)
        return false
      }

      await this.updateBotStats({ messagesSent: { increment: 1 } })
      return true
    } catch (error) {
      console.error('Telegram API error:', error)
      await this.logMessage(
        BigInt(chatId.toString()), 
        'notification', 
        'outgoing', 
        text, 
        false, 
        error instanceof Error ? error.message : 'Unknown error'
      )
      return false
    }
  }

  /**
   * Отправляет уведомление пользователю
   */
  async sendNotification(userId: string, text: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, telegramVerified: true },
    })

    if (!user?.telegramVerified || !user.telegramId) {
      return false
    }

    return this.sendMessage(user.telegramId, text)
  }

  /**
   * Обрабатывает webhook от Telegram
   */
  async handleWebhook(update: TelegramUpdate): Promise<void> {
    try {
      if (update.message?.text) {
        await this.handleMessage(update.message)
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query)
      }
    } catch (error) {
      console.error('Webhook handling error:', error)
    }
  }

  /**
   * Обрабатывает входящее сообщение
   */
  private async handleMessage(message: TelegramMessage): Promise<void> {
    const { text, from, chat } = message
    const telegramId = BigInt(from.id)

    // Логируем входящее сообщение
    await this.logMessage(telegramId, 'command', 'incoming', text)

    if (!text) return

    // Команда /start
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      if (parts.length > 1) {
        // Deep link с кодом верификации: /start verify_123456
        const payload = parts[1]
        if (payload.startsWith('verify_')) {
          const code = payload.replace('verify_', '')
          await this.handleVerification(chat.id, telegramId, from.username, code)
          return
        }
      }
      
      await this.sendWelcomeMessage(chat.id)
      return
    }

    // Команда /verify CODE
    if (text.startsWith('/verify ') || text.startsWith('/verify_')) {
      const code = text.replace('/verify ', '').replace('/verify_', '').trim()
      await this.handleVerification(chat.id, telegramId, from.username, code)
      return
    }

    // 6-значный код (просто цифры)
    if (/^\d{6}$/.test(text.trim())) {
      await this.handleVerification(chat.id, telegramId, from.username, text.trim())
      return
    }

    // Команда /help
    if (text === '/help') {
      await this.sendHelpMessage(chat.id)
      return
    }

    // Команда /status
    if (text === '/status') {
      await this.sendStatusMessage(chat.id, telegramId)
      return
    }

    // Команда /unlink
    if (text === '/unlink') {
      await this.handleUnlink(chat.id, telegramId)
      return
    }

    // Неизвестная команда
    await this.sendMessage(
      chat.id,
      '❓ Неизвестная команда. Используйте /help для списка команд.'
    )
  }

  /**
   * Обрабатывает callback query (нажатия на кнопки)
   */
  private async handleCallbackQuery(query: {
    id: string
    from: TelegramUser
    message?: TelegramMessage
    data?: string
  }): Promise<void> {
    // Отвечаем на callback, чтобы убрать "часики"
    await fetch(`${this.apiUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: query.id }),
    })

    // Обрабатываем данные
    if (query.data && query.message) {
      const chatId = query.message.chat.id
      const telegramId = BigInt(query.from.id)

      if (query.data === 'help') {
        await this.sendHelpMessage(chatId)
      } else if (query.data === 'status') {
        await this.sendStatusMessage(chatId, telegramId)
      }
    }
  }

  /**
   * Обрабатывает верификацию
   */
  private async handleVerification(
    chatId: number,
    telegramId: bigint,
    username: string | undefined,
    code: string
  ): Promise<void> {
    const result = await this.verifyCode(code, telegramId, username)

    if (result.success) {
      await this.sendMessage(
        chatId,
        `✅ <b>Верификация успешна!</b>\n\n` +
        `Ваш Telegram аккаунт успешно привязан к Comfort Apartments.\n\n` +
        `Теперь вы можете:\n` +
        `• Получать уведомления о бронированиях\n` +
        `• Использовать все функции сервиса\n\n` +
        `🏠 <a href="${APP_URL}">Перейти на сайт</a>`,
        { parseMode: 'HTML' }
      )
    } else {
      await this.sendMessage(
        chatId,
        `❌ <b>Ошибка верификации</b>\n\n${result.error}\n\n` +
        `Получите новый код на сайте: ${APP_URL}/auth/verify-telegram`
      )
    }
  }

  /**
   * Отправляет приветственное сообщение
   */
  private async sendWelcomeMessage(chatId: number): Promise<void> {
    await this.sendMessage(
      chatId,
      `👋 <b>Добро пожаловать в Comfort Apartments!</b>\n\n` +
      `Этот бот поможет вам:\n` +
      `• Подтвердить ваш аккаунт\n` +
      `• Получать уведомления о бронированиях\n` +
      `• Быть в курсе важных событий\n\n` +
      `📝 <b>Для верификации:</b>\n` +
      `1. Зарегистрируйтесь на сайте\n` +
      `2. Получите код верификации\n` +
      `3. Отправьте код сюда\n\n` +
      `🔗 <a href="${APP_URL}">Открыть сайт</a>`,
      {
        parseMode: 'HTML',
        replyMarkup: {
          inline_keyboard: [
            [
              { text: '🌐 Открыть сайт', url: APP_URL },
            ],
            [
              { text: '❓ Помощь', callback_data: 'help' },
              { text: '📊 Статус', callback_data: 'status' },
            ],
          ],
        },
      }
    )

    await this.updateBotStats({ totalUsers: { increment: 1 } })
  }

  /**
   * Отправляет справку
   */
  private async sendHelpMessage(chatId: number): Promise<void> {
    await this.sendMessage(
      chatId,
      `📖 <b>Справка по командам:</b>\n\n` +
      `/start - Начать работу с ботом\n` +
      `/verify XXXXXX - Ввести код верификации\n` +
      `/status - Проверить статус аккаунта\n` +
      `/unlink - Отвязать Telegram от аккаунта\n` +
      `/help - Показать эту справку\n\n` +
      `💡 Вы также можете просто отправить 6-значный код верификации.\n\n` +
      `🔗 Сайт: ${APP_URL}`
    )
  }

  /**
   * Отправляет статус
   */
  private async sendStatusMessage(chatId: number, telegramId: bigint): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        telegramVerified: true,
        status: true,
      },
    })

    if (user) {
      await this.sendMessage(
        chatId,
        `📊 <b>Статус аккаунта:</b>\n\n` +
        `👤 ${user.firstName} ${user.lastName}\n` +
        `📧 ${user.email}\n` +
        `✅ Telegram: Привязан\n` +
        `📌 Статус: ${user.status === 'ACTIVE' ? '🟢 Активен' : '🟡 Ожидает'}\n\n` +
        `🔗 <a href="${APP_URL}/profile">Открыть профиль</a>`
      )
    } else {
      await this.sendMessage(
        chatId,
        `📊 <b>Статус:</b>\n\n` +
        `❌ Telegram не привязан ни к одному аккаунту.\n\n` +
        `Для привязки:\n` +
        `1. Зарегистрируйтесь на ${APP_URL}\n` +
        `2. Получите код верификации\n` +
        `3. Отправьте его сюда`
      )
    }
  }

  /**
   * Обрабатывает отвязку
   */
  private async handleUnlink(chatId: number, telegramId: bigint): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { telegramId },
    })

    if (!user) {
      await this.sendMessage(
        chatId,
        `❌ Ваш Telegram не привязан ни к одному аккаунту.`
      )
      return
    }

    await this.unlinkTelegram(user.id)

    await this.sendMessage(
      chatId,
      `✅ Telegram успешно отвязан от аккаунта ${user.email}.\n\n` +
      `Вы больше не будете получать уведомления.\n` +
      `Для повторной привязки получите новый код на сайте.`
    )
  }

  /**
   * Логирует сообщение
   */
  private async logMessage(
    telegramId: bigint,
    messageType: string,
    direction: string,
    content?: string,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    try {
      await prisma.telegramBotLog.create({
        data: {
          telegramId,
          messageType,
          direction,
          content: content?.substring(0, 4000), // Ограничиваем длину
          success,
          error,
        },
      })
    } catch (e) {
      console.error('Failed to log telegram message:', e)
    }
  }

  /**
   * Обновляет статистику бота
   */
  private async updateBotStats(data: {
    totalUsers?: { increment: number }
    verifiedUsers?: { increment: number }
    messagesSent?: { increment: number }
  }): Promise<void> {
    try {
      await prisma.telegramBotSettings.upsert({
        where: { id: 'singleton' },
        update: data,
        create: {
          id: 'singleton',
          botUsername: TELEGRAM_BOT_USERNAME,
          totalUsers: data.totalUsers?.increment || 0,
          verifiedUsers: data.verifiedUsers?.increment || 0,
          messagesSent: data.messagesSent?.increment || 0,
        },
      })
    } catch (e) {
      console.error('Failed to update bot stats:', e)
    }
  }

  /**
   * Получает статистику бота
   */
  async getBotStats(): Promise<{
    totalUsers: number
    verifiedUsers: number
    messagesSent: number
    isActive: boolean
  }> {
    const settings = await prisma.telegramBotSettings.findUnique({
      where: { id: 'singleton' },
    })

    return {
      totalUsers: settings?.totalUsers || 0,
      verifiedUsers: settings?.verifiedUsers || 0,
      messagesSent: settings?.messagesSent || 0,
      isActive: settings?.isActive ?? true,
    }
  }

  /**
   * Устанавливает webhook
   */
  async setWebhook(url: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false
    }

    try {
      const response = await fetch(`${this.apiUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          allowed_updates: ['message', 'callback_query'],
        }),
      })

      const result = await response.json()
      
      if (result.ok) {
        await prisma.telegramBotSettings.upsert({
          where: { id: 'singleton' },
          update: { webhookUrl: url },
          create: { id: 'singleton', webhookUrl: url },
        })
      }

      return result.ok
    } catch (error) {
      console.error('Failed to set webhook:', error)
      return false
    }
  }

  /**
   * Удаляет webhook
   */
  async deleteWebhook(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false
    }

    try {
      const response = await fetch(`${this.apiUrl}/deleteWebhook`, {
        method: 'POST',
      })
      const result = await response.json()
      return result.ok
    } catch {
      return false
    }
  }

  /**
   * Шаблоны уведомлений
   */
  readonly templates = {
    bookingConfirmed: (data: {
      bookingNumber: string
      apartmentName: string
      checkIn: string
      checkOut: string
      totalPrice: number
    }) => `
🏠 <b>Бронирование подтверждено!</b>

📋 Номер: <code>${data.bookingNumber}</code>
🏡 ${data.apartmentName}
📅 ${data.checkIn} — ${data.checkOut}
💰 ${data.totalPrice.toLocaleString('ru-RU')} ₽

<a href="${APP_URL}/bookings">Мои бронирования</a>
    `.trim(),

    bookingCancelled: (data: {
      bookingNumber: string
      reason?: string
    }) => `
❌ <b>Бронирование отменено</b>

📋 Номер: <code>${data.bookingNumber}</code>
${data.reason ? `📝 Причина: ${data.reason}` : ''}

<a href="${APP_URL}/apartments">Найти другие апартаменты</a>
    `.trim(),

    paymentReceived: (data: {
      amount: number
      bookingNumber: string
    }) => `
💳 <b>Оплата получена!</b>

💰 Сумма: ${data.amount.toLocaleString('ru-RU')} ₽
📋 Бронирование: <code>${data.bookingNumber}</code>

Спасибо за оплату!
    `.trim(),

    securityAlert: (data: {
      event: string
      time: string
      ip?: string
    }) => `
⚠️ <b>Предупреждение безопасности</b>

🔐 ${data.event}
🕐 ${data.time}
${data.ip ? `📍 IP: ${data.ip}` : ''}

Если это были не вы, немедленно смените пароль!

<a href="${APP_URL}/settings/security">Настройки безопасности</a>
    `.trim(),

    passwordReset: (data: {
      resetUrl: string
      email: string
    }) => `
🔐 <b>Восстановление пароля</b>

Вы запросили сброс пароля для аккаунта:
📧 ${data.email}

🔗 <a href="${data.resetUrl}">Нажмите здесь для сброса пароля</a>

Или скопируйте ссылку:
<code>${data.resetUrl}</code>

⚠️ <b>Ссылка действительна 30 минут.</b>
⚠️ <b>Никому не передавайте эту ссылку!</b>
    `.trim(),
  }

  /**
   * Отправляет ссылку сброса пароля через Telegram
   */
  async sendPasswordResetLink(
    email: string,
    resetToken: string
  ): Promise<{ success: boolean; error?: string }> {
    // Находим пользователя по email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { 
        id: true,
        telegramId: true, 
        telegramVerified: true,
        email: true,
      },
    })

    if (!user) {
      return { success: false, error: 'Пользователь не найден' }
    }

    if (!user.telegramVerified || !user.telegramId) {
      return { 
        success: false, 
        error: 'Telegram не привязан к этому аккаунту. Используйте восстановление через email.' 
      }
    }

    const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`
    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3')

    // Telegram не разрешает localhost или http:// URL в inline кнопках
    // Отправляем кнопку только для https:// URL
    const isSecureUrl = resetUrl.startsWith('https://')
    
    const messageOptions: {
      parseMode: 'HTML'
      replyMarkup?: object
    } = {
      parseMode: 'HTML',
    }
    
    if (isSecureUrl) {
      messageOptions.replyMarkup = {
        inline_keyboard: [[
          { text: '🔑 Сбросить пароль', url: resetUrl }
        ]]
      }
    }

    const sent = await this.sendMessage(
      user.telegramId,
      this.templates.passwordReset({ resetUrl, email: maskedEmail }),
      messageOptions
    )

    if (!sent) {
      // Проверяем конкретную причину ошибки
      if (!this.isConfigured()) {
        return { 
          success: false, 
          error: 'Telegram бот не настроен. Добавьте TELEGRAM_BOT_TOKEN в переменные окружения.' 
        }
      }
      return { 
        success: false, 
        error: 'Не удалось отправить сообщение в Telegram. Убедитесь, что вы начали диалог с ботом @' + TELEGRAM_BOT_USERNAME 
      }
    }

    // Логируем событие безопасности
    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        eventType: 'PASSWORD_RESET_REQUESTED',
        metadata: { method: 'telegram', email },
      }
    })

    return { success: true }
  }
}

export const telegramService = new TelegramService()
export default telegramService
