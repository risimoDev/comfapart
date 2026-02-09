/**
 * SecurityService - Production-grade security service
 * Rate limiting, login tracking, security events, token management
 */

import prisma from '@/lib/prisma'
import crypto from 'crypto'
import type { SecurityEventType, EventSeverity, TokenType } from '@prisma/client'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number
}

interface DeviceInfo {
  browser: string
  os: string
  device: string
  isMobile: boolean
}

export class SecurityService {
  private readonly MAX_LOGIN_ATTEMPTS = 5
  private readonly LOGIN_ATTEMPT_WINDOW_MINUTES = 15
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30
  private readonly ACCESS_TOKEN_EXPIRY_MINUTES = 15
  private readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24
  private readonly PASSWORD_RESET_EXPIRY_HOURS = 1

  // ==================== Rate Limiting ====================

  /**
   * Проверяет лимит попыток входа
   */
  async checkLoginRateLimit(email: string, ipAddress: string): Promise<RateLimitResult> {
    const windowStart = new Date()
    windowStart.setMinutes(windowStart.getMinutes() - this.LOGIN_ATTEMPT_WINDOW_MINUTES)

    // Считаем неудачные попытки по email и IP
    const [emailAttempts, ipAttempts] = await Promise.all([
      prisma.loginAttempt.count({
        where: {
          email: email.toLowerCase(),
          success: false,
          createdAt: { gte: windowStart },
        },
      }),
      prisma.loginAttempt.count({
        where: {
          ipAddress,
          success: false,
          createdAt: { gte: windowStart },
        },
      }),
    ])

    const attempts = Math.max(emailAttempts, ipAttempts)
    const remaining = Math.max(0, this.MAX_LOGIN_ATTEMPTS - attempts)
    const resetAt = new Date(windowStart.getTime() + this.LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000)

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
      }
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    }
  }

  /**
   * Проверяет лимит запросов сброса пароля (5 попыток / 15 минут)
   */
  async checkPasswordResetRateLimit(email: string, ipAddress: string): Promise<RateLimitResult> {
    const windowStart = new Date()
    windowStart.setMinutes(windowStart.getMinutes() - this.LOGIN_ATTEMPT_WINDOW_MINUTES)

    // Считаем попытки запроса сброса пароля по email и IP
    const [emailAttempts, ipAttempts] = await Promise.all([
      prisma.loginAttempt.count({
        where: {
          email: email.toLowerCase(),
          failReason: 'password_reset_request',
          createdAt: { gte: windowStart },
        },
      }),
      prisma.loginAttempt.count({
        where: {
          ipAddress,
          failReason: 'password_reset_request',
          createdAt: { gte: windowStart },
        },
      }),
    ])

    const attempts = Math.max(emailAttempts, ipAttempts)
    const remaining = Math.max(0, this.MAX_LOGIN_ATTEMPTS - attempts)
    const resetAt = new Date(windowStart.getTime() + this.LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000)

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
      }
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    }
  }

  /**
   * Записывает попытку запроса сброса пароля
   */
  async recordPasswordResetAttempt(params: {
    email: string
    ipAddress: string
    userAgent?: string
  }): Promise<void> {
    await prisma.loginAttempt.create({
      data: {
        email: params.email.toLowerCase(),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        success: true, // Всегда успех, чтобы не раскрывать существование email
        failReason: 'password_reset_request', // Используем как маркер типа запроса
      },
    })
  }

  /**
   * Записывает попытку входа
   */
  async recordLoginAttempt(params: {
    email: string
    ipAddress: string
    userAgent?: string
    success: boolean
    failReason?: string
  }): Promise<void> {
    await prisma.loginAttempt.create({
      data: {
        email: params.email.toLowerCase(),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        success: params.success,
        failReason: params.failReason,
      },
    })
  }

  /**
   * Очищает старые записи попыток входа
   */
  async cleanupOldAttempts(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)

    const result = await prisma.loginAttempt.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })

    return result.count
  }

  // ==================== Token Management ====================

  /**
   * Генерирует криптографически безопасный токен
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Создаёт refresh token с rotation support
   */
  async createRefreshToken(params: {
    userId: string
    ipAddress?: string
    userAgent?: string
    familyId?: string
  }): Promise<{ token: string; expiresAt: Date }> {
    const token = this.generateSecureToken(64)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS)

    const deviceInfo = params.userAgent ? this.parseUserAgent(params.userAgent) : null
    const familyId = params.familyId || this.generateSecureToken(16)

    await prisma.refreshToken.create({
      data: {
        userId: params.userId,
        token,
        familyId,
        ipAddress: params.ipAddress,
        deviceInfo: deviceInfo ? (deviceInfo as object) : undefined,
        expiresAt,
      },
    })

    return { token, expiresAt }
  }

  /**
   * Верифицирует и ротирует refresh token
   */
  async rotateRefreshToken(oldToken: string, ipAddress?: string): Promise<{
    newToken: string
    expiresAt: Date
    userId: string
  } | null> {
    const existing = await prisma.refreshToken.findUnique({
      where: { token: oldToken },
    })

    if (!existing || existing.isRevoked || existing.expiresAt < new Date()) {
      // Если токен уже отозван — потенциальная атака, отзываем всю семью
      if (existing?.isRevoked) {
        await this.revokeTokenFamily(existing.familyId)
        await this.logSecurityEvent({
          userId: existing.userId,
          eventType: 'SUSPICIOUS_ACTIVITY',
          ipAddress,
          metadata: { reason: 'Reused revoked refresh token', familyId: existing.familyId },
          severity: 'CRITICAL',
        })
      }
      return null
    }

    // Отзываем старый токен
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { isRevoked: true },
    })

    // Создаём новый токен в той же семье
    const newTokenData = await this.createRefreshToken({
      userId: existing.userId,
      ipAddress,
      familyId: existing.familyId,
    })

    return {
      newToken: newTokenData.token,
      expiresAt: newTokenData.expiresAt,
      userId: existing.userId,
    }
  }

  /**
   * Отзывает все токены семьи (при подозрительной активности)
   */
  async revokeTokenFamily(familyId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { familyId },
      data: { isRevoked: true },
    })
    return result.count
  }

  /**
   * Отзывает все refresh токены пользователя
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    })
    return result.count
  }

  // ==================== Verification Tokens ====================

  /**
   * Создаёт токен верификации email
   */
  async createVerificationToken(userId: string, type: TokenType): Promise<string> {
    // Инвалидируем старые токены того же типа
    await prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    })

    const token = this.generateSecureToken(32)
    const expiresAt = new Date()
    
    if (type === 'PASSWORD_RESET') {
      expiresAt.setHours(expiresAt.getHours() + this.PASSWORD_RESET_EXPIRY_HOURS)
    } else {
      expiresAt.setHours(expiresAt.getHours() + this.VERIFICATION_TOKEN_EXPIRY_HOURS)
    }

    await prisma.verificationToken.create({
      data: {
        userId,
        token,
        type,
        expiresAt,
      },
    })

    return token
  }

  /**
   * Верифицирует и использует токен
   */
  async verifyAndUseToken(token: string, expectedType: TokenType): Promise<string | null> {
    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (
      !tokenRecord ||
      tokenRecord.type !== expectedType ||
      tokenRecord.usedAt !== null ||
      tokenRecord.expiresAt < new Date()
    ) {
      return null
    }

    // Помечаем токен как использованный
    await prisma.verificationToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    })

    return tokenRecord.userId
  }

  // ==================== Security Events ====================

  /**
   * Логирует security event
   */
  async logSecurityEvent(params: {
    userId?: string
    eventType: SecurityEventType
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, unknown>
    severity?: EventSeverity
  }): Promise<void> {
    await prisma.securityEvent.create({
      data: {
        userId: params.userId,
        eventType: params.eventType,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata ? (params.metadata as object) : undefined,
        severity: params.severity || 'INFO',
      },
    })
  }

  /**
   * Получает security events пользователя
   */
  async getUserSecurityEvents(userId: string, limit: number = 50) {
    return prisma.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Получает недавние security events (для мониторинга)
   */
  async getRecentSecurityEvents(params: {
    severity?: EventSeverity
    eventType?: SecurityEventType
    hours?: number
    limit?: number
  }) {
    const { severity, eventType, hours = 24, limit = 100 } = params
    const since = new Date()
    since.setHours(since.getHours() - hours)

    const where: Record<string, unknown> = {
      createdAt: { gte: since },
    }

    if (severity) where.severity = severity
    if (eventType) where.eventType = eventType

    return prisma.securityEvent.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  // ==================== Profile Change Tracking ====================

  /**
   * Записывает изменение профиля
   */
  async logProfileChange(params: {
    userId: string
    changedBy: string
    fieldName: string
    oldValue: string | null
    newValue: string | null
    ipAddress?: string
  }): Promise<void> {
    await prisma.profileChangeLog.create({
      data: {
        userId: params.userId,
        changedBy: params.changedBy,
        fieldName: params.fieldName,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
      },
    })
  }

  /**
   * Получает историю изменений профиля
   */
  async getProfileChangeHistory(userId: string, limit: number = 50) {
    return prisma.profileChangeLog.findMany({
      where: { userId },
      include: {
        changedByUser: { select: { email: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  // ==================== Session Management ====================

  /**
   * Получает активные сессии пользователя
   */
  async getUserSessions(userId: string) {
    const [sessions, refreshTokens] = await Promise.all([
      prisma.session.findMany({
        where: { userId, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.refreshToken.findMany({
        where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return refreshTokens.map((rt) => ({
      id: rt.id,
      deviceInfo: rt.deviceInfo,
      ipAddress: rt.ipAddress,
      createdAt: rt.createdAt,
      expiresAt: rt.expiresAt,
      isCurrent: false, // Будет установлено на клиенте
    }))
  }

  /**
   * Отзывает конкретную сессию
   */
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await prisma.refreshToken.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true },
    })
    return result.count > 0
  }

  // ==================== Helpers ====================

  /**
   * Парсит User-Agent для информации об устройстве
   */
  private parseUserAgent(userAgent: string): DeviceInfo {
    // Simplified parsing - в production использовать ua-parser-js
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent)
    
    let browser = 'Unknown'
    if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) browser = 'Chrome'
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox'
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari'
    else if (/Edg/i.test(userAgent)) browser = 'Edge'
    else if (/MSIE|Trident/i.test(userAgent)) browser = 'Internet Explorer'

    let os = 'Unknown'
    if (/Windows/i.test(userAgent)) os = 'Windows'
    else if (/Mac OS/i.test(userAgent)) os = 'macOS'
    else if (/Linux/i.test(userAgent)) os = 'Linux'
    else if (/Android/i.test(userAgent)) os = 'Android'
    else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS'

    return {
      browser,
      os,
      device: isMobile ? 'Mobile' : 'Desktop',
      isMobile,
    }
  }

  /**
   * Очистка устаревших данных
   */
  async cleanupExpiredData(): Promise<{
    refreshTokens: number
    verificationTokens: number
    loginAttempts: number
    sessions: number
  }> {
    const now = new Date()
    const oldAttemptsCutoff = new Date()
    oldAttemptsCutoff.setDate(oldAttemptsCutoff.getDate() - 30)

    const [refreshTokens, verificationTokens, loginAttempts, sessions] = await Promise.all([
      prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isRevoked: true, createdAt: { lt: oldAttemptsCutoff } },
          ],
        },
      }),
      prisma.verificationToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.loginAttempt.deleteMany({
        where: { createdAt: { lt: oldAttemptsCutoff } },
      }),
      prisma.session.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ])

    return {
      refreshTokens: refreshTokens.count,
      verificationTokens: verificationTokens.count,
      loginAttempts: loginAttempts.count,
      sessions: sessions.count,
    }
  }
}

export const securityService = new SecurityService()
