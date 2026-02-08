/**
 * SettingsService - Управление настройками системы и компании
 */

import prisma from '@/lib/prisma'

type SettingsCategory = 'general' | 'finance' | 'booking' | 'notification'

interface UpdateSettingParams {
  key: string
  value: unknown
  description?: string
  category?: SettingsCategory
}

interface CompanySettingsUpdate {
  name?: string
  legalName?: string
  description?: string
  inn?: string
  ogrn?: string
  bankAccount?: string
  bankName?: string
  bik?: string
  address?: string
  phone?: string
  email?: string
  cancellationPolicy?: string
  termsOfService?: string
  privacyPolicy?: string
  socialLinks?: object
  defaultServiceFee?: number
}

// Дефолтные настройки системы
const DEFAULT_SETTINGS: Record<string, { value: unknown; description: string; category: SettingsCategory }> = {
  'booking.minDays': {
    value: 1,
    description: 'Минимальное количество ночей для бронирования',
    category: 'booking',
  },
  'booking.maxDays': {
    value: 30,
    description: 'Максимальное количество ночей для бронирования',
    category: 'booking',
  },
  'booking.advanceBookingDays': {
    value: 365,
    description: 'За сколько дней можно бронировать заранее',
    category: 'booking',
  },
  'booking.autoConfirm': {
    value: false,
    description: 'Автоматически подтверждать бронирования',
    category: 'booking',
  },
  'booking.requirePayment': {
    value: true,
    description: 'Требовать оплату для подтверждения',
    category: 'booking',
  },
  'booking.depositPercent': {
    value: 30,
    description: 'Процент предоплаты',
    category: 'booking',
  },
  'finance.currency': {
    value: 'RUB',
    description: 'Основная валюта',
    category: 'finance',
  },
  'finance.taxRate': {
    value: 0,
    description: 'Ставка налога (%)',
    category: 'finance',
  },
  'finance.commissionRate': {
    value: 0,
    description: 'Комиссия платформы (%)',
    category: 'finance',
  },
  'notification.emailBookingNew': {
    value: true,
    description: 'Уведомлять о новых бронированиях',
    category: 'notification',
  },
  'notification.emailBookingCancel': {
    value: true,
    description: 'Уведомлять об отменах бронирований',
    category: 'notification',
  },
  'notification.emailReviewNew': {
    value: true,
    description: 'Уведомлять о новых отзывах',
    category: 'notification',
  },
  'general.maintenanceMode': {
    value: false,
    description: 'Режим обслуживания (сайт недоступен)',
    category: 'general',
  },
  'general.allowRegistration': {
    value: true,
    description: 'Разрешить регистрацию пользователей',
    category: 'general',
  },
}

export class SettingsService {
  /**
   * Инициализирует дефолтные настройки
   */
  async initializeDefaults() {
    const existingSettings = await prisma.systemSettings.findMany()
    const existingKeys = new Set(existingSettings.map((s) => s.key))

    const settingsToCreate = Object.entries(DEFAULT_SETTINGS)
      .filter(([key]) => !existingKeys.has(key))
      .map(([key, { value, description, category }]) => ({
        key,
        value: value as object,
        description,
        category,
      }))

    if (settingsToCreate.length > 0) {
      await prisma.systemSettings.createMany({
        data: settingsToCreate,
      })
    }

    return settingsToCreate.length
  }

  /**
   * Получает все системные настройки
   */
  async getAllSettings() {
    const settings = await prisma.systemSettings.findMany({
      orderBy: { category: 'asc' },
    })

    // Группируем по категориям
    const grouped: Record<string, Array<{
      key: string
      value: unknown
      description: string | null
    }>> = {}

    for (const setting of settings) {
      const category = setting.category || 'general'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push({
        key: setting.key,
        value: setting.value,
        description: setting.description,
      })
    }

    return grouped
  }

  /**
   * Получает настройку по ключу
   */
  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const setting = await prisma.systemSettings.findUnique({
      where: { key },
    })
    return setting?.value as T | null
  }

  /**
   * Получает несколько настроек по ключам
   */
  async getSettings(keys: string[]): Promise<Record<string, unknown>> {
    const settings = await prisma.systemSettings.findMany({
      where: { key: { in: keys } },
    })

    return settings.reduce((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {} as Record<string, unknown>)
  }

  /**
   * Обновляет настройку
   */
  async updateSetting(params: UpdateSettingParams) {
    const { key, value, description, category } = params

    return prisma.systemSettings.upsert({
      where: { key },
      update: {
        value: value as object,
        ...(description && { description }),
        ...(category && { category }),
      },
      create: {
        key,
        value: value as object,
        description: description || DEFAULT_SETTINGS[key]?.description,
        category: category || DEFAULT_SETTINGS[key]?.category || 'general',
      },
    })
  }

  /**
   * Обновляет несколько настроек
   */
  async updateSettings(settings: UpdateSettingParams[]) {
    const results = await Promise.all(
      settings.map((s) => this.updateSetting(s))
    )
    return results.length
  }

  // ===== Настройки компании =====

  /**
   * Получает настройки компании
   */
  async getCompanySettings() {
    let company = await prisma.companySettings.findFirst()
    
    // Создаём дефолтные если нет
    if (!company) {
      company = await prisma.companySettings.create({
        data: {
          name: 'Comfort Apartments',
          email: 'info@comfort-apartments.ru',
          phone: '+7 (342) 200-00-00',
          address: 'г. Пермь',
        },
      })
    }

    return company
  }

  /**
   * Обновляет настройки компании
   */
  async updateCompanySettings(data: CompanySettingsUpdate) {
    const existing = await prisma.companySettings.findFirst()
    
    if (existing) {
      return prisma.companySettings.update({
        where: { id: existing.id },
        data,
      })
    }

    return prisma.companySettings.create({
      data: {
        name: data.name || 'Comfort Apartments',
        email: data.email || '',
        ...data,
      },
    })
  }

  // ===== Валидация настроек бронирования =====

  /**
   * Проверяет настройки бронирования
   */
  async validateBookingSettings() {
    const settings = await this.getSettings([
      'booking.minDays',
      'booking.maxDays',
      'booking.advanceBookingDays',
      'booking.depositPercent',
    ])

    const errors: string[] = []

    const minDays = settings['booking.minDays'] as number
    const maxDays = settings['booking.maxDays'] as number
    const advanceDays = settings['booking.advanceBookingDays'] as number
    const deposit = settings['booking.depositPercent'] as number

    if (minDays && maxDays && minDays > maxDays) {
      errors.push('Минимальное кол-во ночей не может превышать максимальное')
    }

    if (advanceDays && advanceDays < 1) {
      errors.push('Предварительное бронирование должно быть минимум 1 день')
    }

    if (deposit && (deposit < 0 || deposit > 100)) {
      errors.push('Процент предоплаты должен быть от 0 до 100')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // ===== Экспорт/Импорт настроек =====

  /**
   * Экспортирует все настройки в JSON
   */
  async exportSettings() {
    const [systemSettings, companySettings] = await Promise.all([
      prisma.systemSettings.findMany(),
      this.getCompanySettings(),
    ])

    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      system: systemSettings.map((s) => ({
        key: s.key,
        value: s.value,
        category: s.category,
      })),
      company: {
        name: companySettings.name,
        legalName: companySettings.legalName,
        inn: companySettings.inn,
        ogrn: companySettings.ogrn,
        address: companySettings.address,
        phone: companySettings.phone,
        email: companySettings.email,
      },
    }
  }

  /**
   * Импортирует настройки из JSON
   */
  async importSettings(data: {
    system?: Array<{ key: string; value: unknown; category?: string }>
    company?: CompanySettingsUpdate
  }) {
    const results = { system: 0, company: false }

    // Импорт системных настроек
    if (data.system && Array.isArray(data.system)) {
      for (const setting of data.system) {
        await this.updateSetting({
          key: setting.key,
          value: setting.value,
          category: setting.category as SettingsCategory,
        })
        results.system++
      }
    }

    // Импорт настроек компании
    if (data.company) {
      await this.updateCompanySettings(data.company)
      results.company = true
    }

    return results
  }
}

export const settingsService = new SettingsService()
