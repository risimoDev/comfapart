/**
 * Legal Service - сервис для работы с юридическими документами и согласиями
 * Соответствие требованиям 152-ФЗ, Роскомнадзора
 */

import prisma from '@/lib/prisma'
import { 
  LegalDocumentType, 
  ConsentType, 
  ConsentStatus,
  LegalDocument,
  UserConsent,
  CookieConsent,
  DataRequest
} from '@prisma/client'
import legalDocuments, { OPERATOR_INFO } from '@/data/legal-documents'

export interface ConsentInput {
  userId: string
  consentType: ConsentType
  documentType?: LegalDocumentType
  ipAddress?: string
  userAgent?: string
}

export interface CookieConsentInput {
  visitorId: string
  userId?: string
  essential: boolean
  analytics: boolean
  marketing: boolean
  ipAddress?: string
  userAgent?: string
}

export interface DataRequestInput {
  userId: string
  requestType: 'deletion' | 'export' | 'restriction'
  reason?: string
  requestedData?: string[]
  ipAddress?: string
  userAgent?: string
}

class LegalService {
  // ==================== ДОКУМЕНТЫ ====================

  /**
   * Получить документ по типу
   */
  async getDocumentByType(type: LegalDocumentType): Promise<LegalDocument | null> {
    return prisma.legalDocument.findUnique({
      where: { type },
    })
  }

  /**
   * Получить документ по slug
   */
  async getDocumentBySlug(slug: string): Promise<LegalDocument | null> {
    return prisma.legalDocument.findUnique({
      where: { slug },
    })
  }

  /**
   * Получить все активные документы
   */
  async getAllDocuments(): Promise<LegalDocument[]> {
    return prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: { title: 'asc' },
    })
  }

  /**
   * Инициализировать документы из шаблонов
   */
  async initializeDocuments(): Promise<void> {
    for (const doc of legalDocuments) {
      const existing = await prisma.legalDocument.findUnique({
        where: { type: doc.type },
      })

      if (!existing) {
        await prisma.legalDocument.create({
          data: {
            type: doc.type,
            title: doc.title,
            slug: doc.slug,
            content: doc.content,
            version: doc.version,
            effectiveDate: new Date(),
            metaTitle: doc.metaTitle,
            metaDescription: doc.metaDescription,
            isActive: true,
          },
        })
      }
    }
  }

  /**
   * Обновить документ (с версионированием)
   */
  async updateDocument(
    type: LegalDocumentType,
    content: string,
    version: string,
    changeReason: string,
    changedBy: string
  ): Promise<LegalDocument> {
    const current = await this.getDocumentByType(type)
    if (!current) {
      throw new Error('Document not found')
    }

    // Сохраняем текущую версию в историю
    await prisma.legalDocumentVersion.create({
      data: {
        documentId: current.id,
        version: current.version,
        content: current.content,
        effectiveDate: current.effectiveDate,
        changeReason,
        changedBy,
      },
    })

    // Обновляем документ
    return prisma.legalDocument.update({
      where: { type },
      data: {
        content,
        version,
        effectiveDate: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Получить историю версий документа
   */
  async getDocumentHistory(type: LegalDocumentType) {
    const document = await this.getDocumentByType(type)
    if (!document) return []

    return prisma.legalDocumentVersion.findMany({
      where: { documentId: document.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ==================== СОГЛАСИЯ ПОЛЬЗОВАТЕЛЕЙ ====================

  /**
   * Создать согласие пользователя
   */
  async createConsent(input: ConsentInput): Promise<UserConsent> {
    const { userId, consentType, documentType, ipAddress, userAgent } = input

    // Получаем документ для связи
    let document: LegalDocument | null = null
    let consentText: string | null = null

    if (documentType) {
      document = await this.getDocumentByType(documentType)
      consentText = document?.content || null
    }

    // Проверяем существующее согласие
    const existing = await prisma.userConsent.findFirst({
      where: {
        userId,
        consentType,
        status: 'GRANTED',
      },
    })

    if (existing) {
      // Обновляем существующее
      return prisma.userConsent.update({
        where: { id: existing.id },
        data: {
          documentVersion: document?.version,
          ipAddress,
          userAgent,
          grantedAt: new Date(),
        },
      })
    }

    // Создаем новое согласие
    const consent = await prisma.userConsent.create({
      data: {
        userId,
        consentType,
        status: 'GRANTED',
        documentId: document?.id,
        documentVersion: document?.version,
        consentText,
        ipAddress,
        userAgent,
        grantedAt: new Date(),
      },
    })

    // Логируем
    await this.logConsentAction(consent.id, 'granted', null, 'GRANTED', ipAddress, userAgent)

    return consent
  }

  /**
   * Отозвать согласие
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserConsent | null> {
    const consent = await prisma.userConsent.findFirst({
      where: {
        userId,
        consentType,
        status: 'GRANTED',
      },
    })

    if (!consent) return null

    const updated = await prisma.userConsent.update({
      where: { id: consent.id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
      },
    })

    // Логируем отзыв
    await this.logConsentAction(
      consent.id,
      'withdrawn',
      'GRANTED',
      'WITHDRAWN',
      ipAddress,
      userAgent,
      reason
    )

    return updated
  }

  /**
   * Получить согласия пользователя
   */
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return prisma.userConsent.findMany({
      where: { userId },
      include: {
        document: {
          select: { title: true, version: true },
        },
      },
      orderBy: { grantedAt: 'desc' },
    })
  }

  /**
   * Проверить наличие согласия
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await prisma.userConsent.findFirst({
      where: {
        userId,
        consentType,
        status: 'GRANTED',
      },
    })
    return !!consent
  }

  /**
   * Проверить все обязательные согласия
   */
  async hasRequiredConsents(userId: string): Promise<{
    valid: boolean
    missing: ConsentType[]
  }> {
    const requiredTypes: ConsentType[] = [
      'PERSONAL_DATA',
      'TERMS_ACCEPTANCE',
    ]

    const consents = await prisma.userConsent.findMany({
      where: {
        userId,
        consentType: { in: requiredTypes },
        status: 'GRANTED',
      },
    })

    const grantedTypes = consents.map(c => c.consentType)
    const missing = requiredTypes.filter(t => !grantedTypes.includes(t))

    return {
      valid: missing.length === 0,
      missing,
    }
  }

  /**
   * Записать множественные согласия (при регистрации)
   */
  async createMultipleConsents(
    userId: string,
    consents: { type: ConsentType; documentType?: LegalDocumentType }[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserConsent[]> {
    const results: UserConsent[] = []

    for (const consent of consents) {
      const result = await this.createConsent({
        userId,
        consentType: consent.type,
        documentType: consent.documentType,
        ipAddress,
        userAgent,
      })
      results.push(result)
    }

    return results
  }

  /**
   * Логирование изменений согласий
   */
  private async logConsentAction(
    consentId: string,
    action: string,
    previousStatus: ConsentStatus | null,
    newStatus: ConsentStatus,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    await prisma.consentLog.create({
      data: {
        consentId,
        action,
        previousStatus,
        newStatus,
        ipAddress,
        userAgent,
        reason,
      },
    })
  }

  // ==================== COOKIE СОГЛАСИЯ ====================

  /**
   * Сохранить/обновить cookie согласие
   */
  async saveCookieConsent(input: CookieConsentInput): Promise<CookieConsent> {
    const { visitorId, userId, essential, analytics, marketing, ipAddress, userAgent } = input

    return prisma.cookieConsent.upsert({
      where: { visitorId },
      update: {
        userId,
        essential: true, // Всегда true
        analytics,
        marketing,
        ipAddress,
        userAgent,
        updatedAt: new Date(),
      },
      create: {
        visitorId,
        userId,
        essential: true,
        analytics,
        marketing,
        ipAddress,
        userAgent,
      },
    })
  }

  /**
   * Получить cookie согласие
   */
  async getCookieConsent(visitorId: string): Promise<CookieConsent | null> {
    return prisma.cookieConsent.findUnique({
      where: { visitorId },
    })
  }

  /**
   * Связать cookie согласие с пользователем после регистрации
   */
  async linkCookieConsentToUser(visitorId: string, userId: string): Promise<void> {
    await prisma.cookieConsent.updateMany({
      where: { visitorId },
      data: { userId },
    })
  }

  // ==================== ЗАПРОСЫ НА УДАЛЕНИЕ/ВЫГРУЗКУ ДАННЫХ ====================

  /**
   * Создать запрос на обработку данных
   */
  async createDataRequest(input: DataRequestInput): Promise<DataRequest> {
    return prisma.dataRequest.create({
      data: {
        userId: input.userId,
        requestType: input.requestType,
        reason: input.reason,
        requestedData: input.requestedData ? JSON.stringify(input.requestedData) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        status: 'pending',
      },
    })
  }

  /**
   * Получить запросы пользователя
   */
  async getUserDataRequests(userId: string): Promise<DataRequest[]> {
    return prisma.dataRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Обработать запрос на удаление данных
   */
  async processDataDeletionRequest(
    requestId: string,
    processedBy: string
  ): Promise<DataRequest> {
    const request = await prisma.dataRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      throw new Error('Request not found')
    }

    // Помечаем как обрабатываемый
    await prisma.dataRequest.update({
      where: { id: requestId },
      data: { status: 'processing' },
    })

    try {
      // Удаляем/анонимизируем данные пользователя
      await this.anonymizeUserData(request.userId)

      // Отзываем все согласия
      await prisma.userConsent.updateMany({
        where: { userId: request.userId },
        data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
      })

      return prisma.dataRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          processedAt: new Date(),
          processedBy,
          responseNote: 'Данные успешно удалены/анонимизированы',
        },
      })
    } catch (error) {
      return prisma.dataRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          processedAt: new Date(),
          processedBy,
          responseNote: `Ошибка обработки: ${error}`,
        },
      })
    }
  }

  /**
   * Экспорт данных пользователя (право на переносимость)
   */
  async exportUserData(userId: string): Promise<object> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        preferredLocale: true,
        preferredCurrency: true,
      },
    })

    const bookings = await prisma.booking.findMany({
      where: { userId },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        guests: true,
        totalPrice: true,
        status: true,
        createdAt: true,
        apartment: {
          select: { title: true, address: true },
        },
      },
    })

    const reviews = await prisma.review.findMany({
      where: { userId },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    })

    const consents = await prisma.userConsent.findMany({
      where: { userId },
      select: {
        consentType: true,
        status: true,
        grantedAt: true,
        withdrawnAt: true,
      },
    })

    return {
      exportDate: new Date().toISOString(),
      operator: OPERATOR_INFO.name,
      user,
      bookings,
      reviews,
      consents,
    }
  }

  /**
   * Анонимизация данных пользователя
   */
  private async anonymizeUserData(userId: string): Promise<void> {
    const anonymizedEmail = `deleted_${Date.now()}@anonymous.local`
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        firstName: 'Удалено',
        lastName: 'Удалено',
        phone: null,
        avatar: null,
        telegramId: null,
        telegramUsername: null,
        status: 'BLOCKED',
      },
    })

    // Анонимизируем отзывы
    await prisma.review.updateMany({
      where: { userId },
      data: {
        comment: '[Отзыв удален по запросу пользователя]',
      },
    })
  }

  // ==================== АДМИНИСТРАТИВНЫЕ ФУНКЦИИ ====================

  /**
   * Статистика по согласиям
   */
  async getConsentStats(): Promise<{
    totalUsers: number
    consentsByType: { type: ConsentType; count: number }[]
    recentWithdrawals: number
    pendingDataRequests: number
  }> {
    const totalUsers = await prisma.user.count()

    const consentsByType = await prisma.userConsent.groupBy({
      by: ['consentType'],
      where: { status: 'GRANTED' },
      _count: { consentType: true },
    })

    const recentWithdrawals = await prisma.userConsent.count({
      where: {
        status: 'WITHDRAWN',
        withdrawnAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 дней
        },
      },
    })

    const pendingDataRequests = await prisma.dataRequest.count({
      where: { status: 'pending' },
    })

    return {
      totalUsers,
      consentsByType: consentsByType.map(c => ({
        type: c.consentType,
        count: c._count.consentType,
      })),
      recentWithdrawals,
      pendingDataRequests,
    }
  }

  /**
   * Получить все запросы на обработку данных (для админки)
   */
  async getAllDataRequests(status?: string): Promise<DataRequest[]> {
    return prisma.dataRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    })
  }
}

export const legalService = new LegalService()
export default legalService
