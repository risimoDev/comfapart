/**
 * Email Service - Production-Ready Email Sending
 * 
 * Поддерживает несколько провайдеров:
 * - Resend (рекомендуется для production)
 * - SendGrid
 * - SMTP (для локальной разработки)
 * - Console (для тестирования)
 * 
 * Настройка через переменные окружения:
 * EMAIL_PROVIDER=resend|sendgrid|smtp|console
 * RESEND_API_KEY=re_xxxx
 * SENDGRID_API_KEY=SG.xxxx
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * EMAIL_FROM=noreply@comfortapartments.com
 * APP_URL=https://comfortapartments.com
 */

// Types
export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export type EmailTemplate =
  | 'verification'
  | 'welcome'
  | 'password-reset'
  | 'password-changed'
  | 'booking-confirmed'
  | 'booking-cancelled'
  | 'payment-received'
  | 'security-alert'
  | 'new-device-login'

// Configuration
const config = {
  provider: process.env.EMAIL_PROVIDER || 'console',
  from: process.env.EMAIL_FROM || 'noreply@comfortapartments.com',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  appName: 'Comfort Apartments',
  resendApiKey: process.env.RESEND_API_KEY,
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}

// Email Templates
const templates: Record<EmailTemplate, (data: Record<string, unknown>) => { subject: string; html: string; text: string }> = {
  verification: (data) => ({
    subject: `${config.appName} - Подтвердите ваш email`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Подтверждение email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${config.appName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px;">Здравствуйте${data.name ? `, ${data.name}` : ''}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Благодарим вас за регистрацию в ${config.appName}. Для завершения регистрации и активации вашего аккаунта, пожалуйста, подтвердите ваш email адрес.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Подтвердить email
                </a>
              </div>
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br>
                <a href="${data.verificationUrl}" style="color: #667eea; word-break: break-all;">${data.verificationUrl}</a>
              </p>
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                Ссылка действительна в течение 24 часов.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                Если вы не регистрировались в ${config.appName}, просто проигнорируйте это письмо.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0;">
                © ${new Date().getFullYear()} ${config.appName}. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Здравствуйте${data.name ? `, ${data.name}` : ''}!

Благодарим вас за регистрацию в ${config.appName}. Для подтверждения email перейдите по ссылке:

${data.verificationUrl}

Ссылка действительна в течение 24 часов.

Если вы не регистрировались, просто проигнорируйте это письмо.

© ${new Date().getFullYear()} ${config.appName}
    `.trim(),
  }),

  welcome: (data) => ({
    subject: `Добро пожаловать в ${config.appName}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Добро пожаловать!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px;">Здравствуйте, ${data.name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Ваш email успешно подтверждён! Теперь вы можете пользоваться всеми возможностями ${config.appName}.
              </p>
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #333333; margin: 0 0 15px; font-size: 16px;">Что вы можете делать:</h3>
                <ul style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Бронировать комфортные апартаменты</li>
                  <li>Управлять своими бронированиями</li>
                  <li>Получать персональные предложения</li>
                  <li>Копить бонусы за бронирования</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.appUrl}/apartments" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Смотреть апартаменты
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${config.appName}. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Добро пожаловать, ${data.name}!

Ваш email успешно подтверждён! Теперь вы можете пользоваться всеми возможностями ${config.appName}.

Что вы можете делать:
- Бронировать комфортные апартаменты
- Управлять своими бронированиями
- Получать персональные предложения
- Копить бонусы за бронирования

Перейдите на сайт: ${config.appUrl}/apartments

© ${new Date().getFullYear()} ${config.appName}
    `.trim(),
  }),

  'password-reset': (data) => ({
    subject: `${config.appName} - Сброс пароля`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Сброс пароля</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px;">Здравствуйте${data.name ? `, ${data.name}` : ''}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Мы получили запрос на сброс пароля для вашего аккаунта. Нажмите на кнопку ниже, чтобы создать новый пароль.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Сбросить пароль
                </a>
              </div>
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="color: #856404; font-size: 14px; margin: 0;">
                  <strong>⚠️ Важно:</strong> Ссылка действительна только 1 час. Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
                </p>
              </div>
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                Если кнопка не работает, скопируйте эту ссылку в браузер:<br>
                <a href="${data.resetUrl}" style="color: #667eea; word-break: break-all;">${data.resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${config.appName}. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Здравствуйте${data.name ? `, ${data.name}` : ''}!

Мы получили запрос на сброс пароля для вашего аккаунта.

Для создания нового пароля перейдите по ссылке:
${data.resetUrl}

⚠️ Важно: Ссылка действительна только 1 час.

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

© ${new Date().getFullYear()} ${config.appName}
    `.trim(),
  }),

  'password-changed': (data) => ({
    subject: `${config.appName} - Пароль успешно изменён`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Пароль изменён</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px;">Здравствуйте, ${data.name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Пароль вашего аккаунта был успешно изменён.
              </p>
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #666666; font-size: 14px; margin: 0;">
                  <strong>Дата изменения:</strong> ${new Date().toLocaleString('ru-RU')}<br>
                  <strong>IP адрес:</strong> ${data.ipAddress || 'Неизвестен'}
                </p>
              </div>
              <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
                <p style="color: #721c24; font-size: 14px; margin: 0;">
                  <strong>⚠️ Если это были не вы</strong>, немедленно свяжитесь с нашей службой поддержки и заблокируйте свой аккаунт.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${config.appName}. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Здравствуйте, ${data.name}!

Пароль вашего аккаунта был успешно изменён.

Дата изменения: ${new Date().toLocaleString('ru-RU')}
IP адрес: ${data.ipAddress || 'Неизвестен'}

⚠️ Если это были не вы, немедленно свяжитесь с нашей службой поддержки!

© ${new Date().getFullYear()} ${config.appName}
    `.trim(),
  }),

  'booking-confirmed': (data) => ({
    subject: `${config.appName} - Бронирование подтверждено #${data.bookingNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏠 Бронирование подтверждено!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px;">Здравствуйте, ${data.name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Ваше бронирование успешно подтверждено. Детали бронирования:
              </p>
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #333333; font-size: 14px; margin: 0; line-height: 1.8;">
                  <strong>Номер бронирования:</strong> ${data.bookingNumber}<br>
                  <strong>Апартаменты:</strong> ${data.apartmentName}<br>
                  <strong>Адрес:</strong> ${data.address}<br>
                  <strong>Заезд:</strong> ${data.checkIn}<br>
                  <strong>Выезд:</strong> ${data.checkOut}<br>
                  <strong>Гостей:</strong> ${data.guests}<br>
                  <strong>Стоимость:</strong> ${data.totalPrice} ₽
                </p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.appUrl}/bookings/${data.bookingId}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Посмотреть бронирование
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${config.appName}. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Здравствуйте, ${data.name}!

Ваше бронирование успешно подтверждено.

Детали бронирования:
- Номер: ${data.bookingNumber}
- Апартаменты: ${data.apartmentName}
- Адрес: ${data.address}
- Заезд: ${data.checkIn}
- Выезд: ${data.checkOut}
- Гостей: ${data.guests}
- Стоимость: ${data.totalPrice} ₽

Посмотреть бронирование: ${config.appUrl}/bookings/${data.bookingId}

© ${new Date().getFullYear()} ${config.appName}
    `.trim(),
  }),

  'booking-cancelled': (data) => ({
    subject: `${config.appName} - Бронирование отменено #${data.bookingNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">❌ Бронирование отменено</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px;">Здравствуйте, ${data.name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Ваше бронирование #${data.bookingNumber} было отменено.
              </p>
              ${data.refundAmount ? `
              <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
                <p style="color: #155724; font-size: 14px; margin: 0;">
                  💰 <strong>Возврат средств:</strong> ${data.refundAmount} ₽ будет зачислен в течение 5-10 рабочих дней.
                </p>
              </div>
              ` : ''}
              <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                Причина отмены: ${data.reason || 'Не указана'}
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.appUrl}/apartments" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Забронировать другие апартаменты
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${config.appName}. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Здравствуйте, ${data.name}!

Ваше бронирование #${data.bookingNumber} было отменено.

${data.refundAmount ? `Возврат средств: ${data.refundAmount} ₽ будет зачислен в течение 5-10 рабочих дней.\n` : ''}
Причина отмены: ${data.reason || 'Не указана'}

Забронировать другие апартаменты: ${config.appUrl}/apartments

© ${new Date().getFullYear()} ${config.appName}
    `.trim(),
  }),

  'payment-received': (data) => ({
    subject: `${config.appName} - Оплата получена`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">💳 Оплата получена</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px;">Здравствуйте, ${data.name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Мы получили вашу оплату. Спасибо!
              </p>
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #333333; font-size: 14px; margin: 0; line-height: 1.8;">
                  <strong>Сумма:</strong> ${data.amount} ₽<br>
                  <strong>Номер бронирования:</strong> ${data.bookingNumber}<br>
                  <strong>Дата:</strong> ${new Date().toLocaleString('ru-RU')}<br>
                  <strong>Способ оплаты:</strong> ${data.paymentMethod || 'Банковская карта'}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${config.appName}. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Здравствуйте, ${data.name}!

Мы получили вашу оплату. Спасибо!

Детали:
- Сумма: ${data.amount} ₽
- Номер бронирования: ${data.bookingNumber}
- Дата: ${new Date().toLocaleString('ru-RU')}
- Способ оплаты: ${data.paymentMethod || 'Банковская карта'}

© ${new Date().getFullYear()} ${config.appName}
    `.trim(),
  }),

  'security-alert': (data) => ({
    subject: `⚠️ ${config.appName} - Предупреждение безопасности`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⚠️ Предупреждение безопасности</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px;">Здравствуйте, ${data.name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Обнаружена подозрительная активность в вашем аккаунте:
              </p>
              <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0;">
                <p style="color: #721c24; font-size: 14px; margin: 0; line-height: 1.8;">
                  <strong>Событие:</strong> ${data.event}<br>
                  <strong>Время:</strong> ${data.timestamp || new Date().toLocaleString('ru-RU')}<br>
                  <strong>IP адрес:</strong> ${data.ipAddress || 'Неизвестен'}<br>
                  <strong>Устройство:</strong> ${data.userAgent || 'Неизвестно'}
                </p>
              </div>
              <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                Если это были вы, можете проигнорировать это письмо. В противном случае, рекомендуем немедленно сменить пароль.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.appUrl}/settings/security" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Проверить настройки безопасности
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${config.appName}. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
⚠️ Предупреждение безопасности

Здравствуйте, ${data.name}!

Обнаружена подозрительная активность в вашем аккаунте:

- Событие: ${data.event}
- Время: ${data.timestamp || new Date().toLocaleString('ru-RU')}
- IP адрес: ${data.ipAddress || 'Неизвестен'}
- Устройство: ${data.userAgent || 'Неизвестно'}

Если это были вы, можете проигнорировать это письмо.
В противном случае, рекомендуем немедленно сменить пароль:
${config.appUrl}/settings/security

© ${new Date().getFullYear()} ${config.appName}
    `.trim(),
  }),

  'new-device-login': (data) => ({
    subject: `${config.appName} - Вход с нового устройства`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📱 Новый вход в аккаунт</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px;">Здравствуйте, ${data.name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Мы заметили вход в ваш аккаунт с нового устройства:
              </p>
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #333333; font-size: 14px; margin: 0; line-height: 1.8;">
                  <strong>Время:</strong> ${data.timestamp || new Date().toLocaleString('ru-RU')}<br>
                  <strong>IP адрес:</strong> ${data.ipAddress || 'Неизвестен'}<br>
                  <strong>Местоположение:</strong> ${data.location || 'Неизвестно'}<br>
                  <strong>Устройство:</strong> ${data.device || 'Неизвестно'}<br>
                  <strong>Браузер:</strong> ${data.browser || 'Неизвестно'}
                </p>
              </div>
              <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                Если это были вы — всё в порядке. Если нет — рекомендуем немедленно сменить пароль и проверить активные сессии.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.appUrl}/settings/sessions" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Управление сессиями
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${config.appName}. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Здравствуйте, ${data.name}!

Мы заметили вход в ваш аккаунт с нового устройства:

- Время: ${data.timestamp || new Date().toLocaleString('ru-RU')}
- IP адрес: ${data.ipAddress || 'Неизвестен'}
- Местоположение: ${data.location || 'Неизвестно'}
- Устройство: ${data.device || 'Неизвестно'}
- Браузер: ${data.browser || 'Неизвестно'}

Если это были вы — всё в порядке.
Если нет — рекомендуем сменить пароль: ${config.appUrl}/settings/sessions

© ${new Date().getFullYear()} ${config.appName}
    `.trim(),
  }),
}

// Email Providers
async function sendViaResend(options: EmailOptions): Promise<EmailResult> {
  if (!config.resendApiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Resend API error',
      }
    }

    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
  if (!config.sendgridApiKey) {
    throw new Error('SENDGRID_API_KEY not configured')
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({ email })),
        }],
        from: { email: config.from },
        subject: options.subject,
        content: [
          { type: 'text/plain', value: options.text || '' },
          { type: 'text/html', value: options.html },
        ],
        reply_to: options.replyTo ? { email: options.replyTo } : undefined,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: errorText || 'SendGrid API error',
      }
    }

    return {
      success: true,
      messageId: response.headers.get('X-Message-Id') || undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function sendViaSmtp(options: EmailOptions): Promise<EmailResult> {
  // SMTP implementation would require nodemailer
  // For now, log that SMTP is not implemented
  console.warn('SMTP provider not implemented. Use Resend or SendGrid for production.')
  return sendViaConsole(options)
}

async function sendViaConsole(options: EmailOptions): Promise<EmailResult> {
  console.log('\n========== EMAIL (Console Provider) ==========')
  console.log(`To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`)
  console.log(`Subject: ${options.subject}`)
  console.log(`From: ${config.from}`)
  console.log('--- TEXT ---')
  console.log(options.text || '(no text version)')
  console.log('--- HTML ---')
  console.log('(HTML content omitted for readability)')
  console.log('==============================================\n')

  return {
    success: true,
    messageId: `console-${Date.now()}`,
  }
}

// Main Service Class
class EmailService {
  /**
   * Отправляет email напрямую
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    switch (config.provider) {
      case 'resend':
        return sendViaResend(options)
      case 'sendgrid':
        return sendViaSendGrid(options)
      case 'smtp':
        return sendViaSmtp(options)
      case 'console':
      default:
        return sendViaConsole(options)
    }
  }

  /**
   * Отправляет email по шаблону
   */
  async sendTemplate(
    template: EmailTemplate,
    to: string | string[],
    data: Record<string, unknown>
  ): Promise<EmailResult> {
    const templateFn = templates[template]
    if (!templateFn) {
      return {
        success: false,
        error: `Template "${template}" not found`,
      }
    }

    const { subject, html, text } = templateFn(data)
    return this.send({ to, subject, html, text })
  }

  /**
   * Отправляет письмо подтверждения email
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    token: string
  ): Promise<EmailResult> {
    const verificationUrl = `${config.appUrl}/auth/verify-email?token=${token}`
    return this.sendTemplate('verification', email, { name, verificationUrl })
  }

  /**
   * Отправляет письмо для сброса пароля
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string
  ): Promise<EmailResult> {
    const resetUrl = `${config.appUrl}/auth/reset-password?token=${token}`
    return this.sendTemplate('password-reset', email, { name, resetUrl })
  }

  /**
   * Отправляет приветственное письмо
   */
  async sendWelcomeEmail(email: string, name: string): Promise<EmailResult> {
    return this.sendTemplate('welcome', email, { name })
  }

  /**
   * Отправляет уведомление о смене пароля
   */
  async sendPasswordChangedEmail(
    email: string,
    name: string,
    ipAddress?: string
  ): Promise<EmailResult> {
    return this.sendTemplate('password-changed', email, { name, ipAddress })
  }

  /**
   * Отправляет подтверждение бронирования
   */
  async sendBookingConfirmation(
    email: string,
    data: {
      name: string
      bookingId: string
      bookingNumber: string
      apartmentName: string
      address: string
      checkIn: string
      checkOut: string
      guests: number
      totalPrice: number
    }
  ): Promise<EmailResult> {
    return this.sendTemplate('booking-confirmed', email, data)
  }

  /**
   * Отправляет уведомление об отмене бронирования
   */
  async sendBookingCancellation(
    email: string,
    data: {
      name: string
      bookingNumber: string
      refundAmount?: number
      reason?: string
    }
  ): Promise<EmailResult> {
    return this.sendTemplate('booking-cancelled', email, data)
  }

  /**
   * Отправляет уведомление об оплате
   */
  async sendPaymentReceivedEmail(
    email: string,
    data: {
      name: string
      amount: number
      bookingNumber: string
      paymentMethod?: string
    }
  ): Promise<EmailResult> {
    return this.sendTemplate('payment-received', email, data)
  }

  /**
   * Отправляет предупреждение безопасности
   */
  async sendSecurityAlert(
    email: string,
    data: {
      name: string
      event: string
      ipAddress?: string
      userAgent?: string
      timestamp?: string
    }
  ): Promise<EmailResult> {
    return this.sendTemplate('security-alert', email, data)
  }

  /**
   * Отправляет уведомление о входе с нового устройства
   */
  async sendNewDeviceLoginEmail(
    email: string,
    data: {
      name: string
      ipAddress?: string
      location?: string
      device?: string
      browser?: string
      timestamp?: string
    }
  ): Promise<EmailResult> {
    return this.sendTemplate('new-device-login', email, data)
  }

  /**
   * Проверяет конфигурацию провайдера
   */
  getProviderStatus(): {
    provider: string
    configured: boolean
    from: string
    appUrl: string
  } {
    let configured = false

    switch (config.provider) {
      case 'resend':
        configured = !!config.resendApiKey
        break
      case 'sendgrid':
        configured = !!config.sendgridApiKey
        break
      case 'smtp':
        configured = !!(config.smtp.host && config.smtp.user && config.smtp.pass)
        break
      case 'console':
        configured = true
        break
    }

    return {
      provider: config.provider,
      configured,
      from: config.from,
      appUrl: config.appUrl,
    }
  }
}

export const emailService = new EmailService()
export default emailService
