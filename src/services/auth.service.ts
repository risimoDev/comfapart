/**
 * AuthService - Production-grade authentication service
 * JWT токены с access/refresh, сессии, rate limiting, security events
 */

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { securityService } from './security.service'
import { emailService } from './email.service'
import type { User, UserRole } from '@/types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || (() => { 
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production')
    }
    return 'dev-secret-change-in-production'
  })()
)

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30')

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

interface LoginData {
  email: string
  password: string
}

interface LoginMeta {
  userAgent?: string
  ipAddress?: string
}

interface TokenPayload {
  userId: string
  email: string
  role: UserRole
  type?: 'access' | 'refresh'
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
}

interface AuthResult {
  user: User
  tokens: AuthTokens
}

export class AuthService {
  /**
   * Регистрация нового пользователя
   */
  async register(
    data: RegisterData,
    meta?: LoginMeta
  ): Promise<AuthResult> {
    const { email, password, firstName, lastName, phone } = data

    // Проверяем существование пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует')
    }

    // Валидация пароля
    this.validatePassword(password)

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 12)

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        role: 'USER',
        status: 'PENDING', // Требуется верификация email
        emailVerified: false,
      },
    })

    // Создаём токен верификации email
    const verificationToken = await securityService.createVerificationToken(
      user.id,
      'EMAIL_VERIFICATION'
    )

    // Отправляем email с верификацией
    await emailService.sendVerificationEmail(
      email,
      firstName,
      verificationToken
    )

    // Генерируем токены
    const tokens = await this.generateTokenPair(user, meta)

    // Логируем событие
    await securityService.logSecurityEvent({
      userId: user.id,
      eventType: 'LOGIN_SUCCESS',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { action: 'register' },
    })

    return {
      user: this.sanitizeUser(user),
      tokens,
    }
  }

  /**
   * Вход пользователя
   */
  async login(
    data: LoginData,
    meta?: LoginMeta
  ): Promise<AuthResult> {
    const { email, password } = data
    const normalizedEmail = email.toLowerCase()

    // Проверяем rate limit
    const rateLimit = await securityService.checkLoginRateLimit(
      normalizedEmail,
      meta?.ipAddress || 'unknown'
    )

    if (!rateLimit.allowed) {
      await securityService.recordLoginAttempt({
        email: normalizedEmail,
        ipAddress: meta?.ipAddress || 'unknown',
        userAgent: meta?.userAgent,
        success: false,
        failReason: 'Rate limit exceeded',
      })

      throw new Error(
        `Слишком много попыток входа. Повторите через ${Math.ceil(rateLimit.retryAfter! / 60)} минут`
      )
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      await securityService.recordLoginAttempt({
        email: normalizedEmail,
        ipAddress: meta?.ipAddress || 'unknown',
        userAgent: meta?.userAgent,
        success: false,
        failReason: 'User not found',
      })
      throw new Error('Неверный email или пароль')
    }

    // Проверяем статус
    if (user.status === 'BLOCKED') {
      await securityService.recordLoginAttempt({
        email: normalizedEmail,
        ipAddress: meta?.ipAddress || 'unknown',
        userAgent: meta?.userAgent,
        success: false,
        failReason: 'Account blocked',
      })
      await securityService.logSecurityEvent({
        userId: user.id,
        eventType: 'LOGIN_FAILED',
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { reason: 'Account blocked' },
        severity: 'WARNING',
      })
      throw new Error('Ваш аккаунт заблокирован')
    }

    // Проверяем верификацию email
    if (user.status === 'PENDING' || !user.emailVerified) {
      await securityService.recordLoginAttempt({
        email: normalizedEmail,
        ipAddress: meta?.ipAddress || 'unknown',
        userAgent: meta?.userAgent,
        success: false,
        failReason: 'Email not verified',
      })
      await securityService.logSecurityEvent({
        userId: user.id,
        eventType: 'LOGIN_FAILED',
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { reason: 'Email not verified' },
        severity: 'INFO',
      })
      throw new Error('Подтвердите email для входа. Проверьте почту или запросите новое письмо.')
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      await securityService.recordLoginAttempt({
        email: normalizedEmail,
        ipAddress: meta?.ipAddress || 'unknown',
        userAgent: meta?.userAgent,
        success: false,
        failReason: 'Invalid password',
      })
      await securityService.logSecurityEvent({
        userId: user.id,
        eventType: 'LOGIN_FAILED',
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { remainingAttempts: rateLimit.remaining - 1 },
        severity: 'WARNING',
      })
      throw new Error('Неверный email или пароль')
    }

    // Успешный вход
    await securityService.recordLoginAttempt({
      email: normalizedEmail,
      ipAddress: meta?.ipAddress || 'unknown',
      userAgent: meta?.userAgent,
      success: true,
    })

    // Генерируем токены
    const tokens = await this.generateTokenPair(user, meta)

    await securityService.logSecurityEvent({
      userId: user.id,
      eventType: 'LOGIN_SUCCESS',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    })

    return {
      user: this.sanitizeUser(user),
      tokens,
    }
  }

  /**
   * Обновление access token по refresh token
   */
  async refreshTokens(refreshToken: string, meta?: LoginMeta): Promise<AuthTokens> {
    const rotationResult = await securityService.rotateRefreshToken(
      refreshToken,
      meta?.ipAddress
    )

    if (!rotationResult) {
      throw new Error('Недействительный refresh token')
    }

    const user = await prisma.user.findUnique({
      where: { id: rotationResult.userId },
    })

    if (!user || user.status === 'BLOCKED') {
      throw new Error('Пользователь не найден или заблокирован')
    }

    const accessToken = await this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    })

    const accessTokenExpiresAt = this.parseExpiresIn(ACCESS_TOKEN_EXPIRES_IN)

    return {
      accessToken,
      refreshToken: rotationResult.newToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt: rotationResult.expiresAt,
    }
  }

  /**
   * Выход (отзыв токенов)
   */
  async logout(userId: string, refreshToken?: string, meta?: LoginMeta): Promise<void> {
    if (refreshToken) {
      const token = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      })

      if (token && token.userId === userId) {
        await securityService.revokeTokenFamily(token.familyId)
      }
    }

    await prisma.session.deleteMany({
      where: { userId },
    })

    await securityService.logSecurityEvent({
      userId,
      eventType: 'LOGOUT',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    })
  }

  /**
   * Выход со всех устройств
   */
  async logoutAll(userId: string, meta?: LoginMeta): Promise<void> {
    await Promise.all([
      securityService.revokeAllUserTokens(userId),
      prisma.session.deleteMany({ where: { userId } }),
    ])

    await securityService.logSecurityEvent({
      userId,
      eventType: 'ALL_SESSIONS_REVOKED',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    })
  }

  /**
   * Верификация access token
   */
  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)

      // Проверяем что это access token (или старый формат без type)
      if (payload.type && payload.type !== 'access') {
        return null
      }

      return {
        userId: payload.userId as string,
        email: payload.email as string,
        role: payload.role as UserRole,
        type: 'access',
      }
    } catch {
      return null
    }
  }

  /**
   * Верификация email
   */
  async verifyEmail(token: string): Promise<boolean> {
    const userId = await securityService.verifyAndUseToken(token, 'EMAIL_VERIFICATION')
    
    if (!userId) {
      return false
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
      },
    })

    // Отправляем приветственное письмо
    await emailService.sendWelcomeEmail(user.email, user.firstName)

    await securityService.logSecurityEvent({
      userId,
      eventType: 'EMAIL_VERIFIED',
    })

    return true
  }

  /**
   * Запрос сброса пароля
   */
  async requestPasswordReset(email: string, meta?: LoginMeta): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Не раскрываем существование пользователя
    if (!user) {
      return
    }

    const token = await securityService.createVerificationToken(user.id, 'PASSWORD_RESET')

    // Отправляем email со ссылкой сброса
    await emailService.sendPasswordResetEmail(
      email,
      user.firstName,
      token
    )

    await securityService.logSecurityEvent({
      userId: user.id,
      eventType: 'PASSWORD_RESET_REQUESTED',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    })
  }

  /**
   * Сброс пароля по токену
   */
  async resetPassword(token: string, newPassword: string, meta?: LoginMeta): Promise<boolean> {
    const userId = await securityService.verifyAndUseToken(token, 'PASSWORD_RESET')
    
    if (!userId) {
      return false
    }

    this.validatePassword(newPassword)

    const passwordHash = await bcrypt.hash(newPassword, 12)

    const user = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    await this.logoutAll(userId)

    // Отправляем уведомление о смене пароля
    await emailService.sendPasswordChangedEmail(
      user.email,
      user.firstName,
      meta?.ipAddress
    )

    await securityService.logSecurityEvent({
      userId,
      eventType: 'PASSWORD_RESET_COMPLETED',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    })

    return true
  }

  /**
   * Получение пользователя по ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })
    return user ? this.sanitizeUser(user) : null
  }

  /**
   * Обновление профиля пользователя с логированием изменений
   */
  async updateProfile(
    userId: string,
    data: {
      firstName?: string
      lastName?: string
      phone?: string
      preferredLocale?: string
      preferredCurrency?: string
    },
    changedBy?: string,
    meta?: LoginMeta
  ): Promise<User> {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!currentUser) {
      throw new Error('Пользователь не найден')
    }

    // Логируем изменения если указан changedBy
    if (changedBy) {
      const changes: Promise<void>[] = []
      for (const [key, newValue] of Object.entries(data)) {
        if (newValue !== undefined) {
          const oldValue = currentUser[key as keyof typeof currentUser]
          if (oldValue !== newValue) {
            changes.push(
              securityService.logProfileChange({
                userId,
                changedBy,
                fieldName: key,
                oldValue: oldValue?.toString() || null,
                newValue: newValue?.toString() || null,
                ipAddress: meta?.ipAddress,
              })
            )
          }
        }
      }
      await Promise.all(changes)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    })

    return this.sanitizeUser(user) as User
  }

  /**
   * Смена пароля (для авторизованного пользователя)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    meta?: LoginMeta
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      throw new Error('Неверный текущий пароль')
    }

    this.validatePassword(newPassword)

    const newPasswordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    })

    // Отзываем все токены
    await securityService.revokeAllUserTokens(userId)

    await securityService.logSecurityEvent({
      userId,
      eventType: 'PASSWORD_CHANGED',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    })
  }

  /**
   * Блокировка пользователя (админ)
   */
  async blockUser(userId: string, adminId?: string, meta?: LoginMeta): Promise<User> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: 'BLOCKED' },
    })

    // Удаляем все сессии
    await this.logoutAll(userId)

    await securityService.logSecurityEvent({
      userId,
      eventType: 'ACCOUNT_BLOCKED',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { blockedBy: adminId },
    })

    return this.sanitizeUser(user) as User
  }

  /**
   * Разблокировка пользователя (админ)
   */
  async unblockUser(userId: string, adminId?: string, meta?: LoginMeta): Promise<User> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    })

    await securityService.logSecurityEvent({
      userId,
      eventType: 'ACCOUNT_UNBLOCKED',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { unblockedBy: adminId },
    })

    return this.sanitizeUser(user)
  }

  /**
   * Смена роли пользователя (админ)
   */
  async changeRole(userId: string, role: UserRole, adminId?: string, meta?: LoginMeta): Promise<User> {
    const oldUser = await prisma.user.findUnique({ where: { id: userId } })
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    })

    await securityService.logSecurityEvent({
      userId,
      eventType: 'ROLE_CHANGED',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { oldRole: oldUser?.role, newRole: role, changedBy: adminId },
    })

    return this.sanitizeUser(user)
  }

  /**
   * Получение активных сессий пользователя
   */
  async getUserSessions(userId: string) {
    return securityService.getUserSessions(userId)
  }

  /**
   * Отзыв конкретной сессии
   */
  async revokeSession(sessionId: string, userId: string, meta?: LoginMeta): Promise<boolean> {
    const result = await securityService.revokeSession(sessionId, userId)
    
    if (result) {
      await securityService.logSecurityEvent({
        userId,
        eventType: 'SESSION_REVOKED',
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { sessionId },
      })
    }

    return result
  }

  /**
   * Получение всех пользователей (админ)
   */
  async getAllUsers(options?: {
    role?: UserRole
    status?: 'ACTIVE' | 'BLOCKED' | 'PENDING'
    search?: string
    page?: number
    limit?: number
  }) {
    const { role, status, search, page = 1, limit = 20 } = options || {}
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (role) where.role = role
    if (status) where.status = status
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          _count: {
            select: { bookings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return {
      items: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + users.length < total,
    }
  }

  // ==================== Private Methods ====================

  /**
   * Генерирует пару токенов (access + refresh)
   */
  private async generateTokenPair(
    user: { id: string; email: string; role: string },
    meta?: LoginMeta
  ): Promise<AuthTokens> {
    const accessToken = await this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    })

    const refreshTokenData = await securityService.createRefreshToken({
      userId: user.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    })

    const accessTokenExpiresAt = this.parseExpiresIn(ACCESS_TOKEN_EXPIRES_IN)

    return {
      accessToken,
      refreshToken: refreshTokenData.token,
      accessTokenExpiresAt,
      refreshTokenExpiresAt: refreshTokenData.expiresAt,
    }
  }

  /**
   * Генерирует access token
   */
  private async generateAccessToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
    return new SignJWT({ ...payload, type: 'access' } as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
      .sign(JWT_SECRET)
  }

  /**
   * Парсит время жизни токена
   */
  private parseExpiresIn(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/)
    const expiresAt = new Date()

    if (match) {
      const value = parseInt(match[1])
      const unit = match[2]
      switch (unit) {
        case 's': expiresAt.setSeconds(expiresAt.getSeconds() + value); break
        case 'm': expiresAt.setMinutes(expiresAt.getMinutes() + value); break
        case 'h': expiresAt.setHours(expiresAt.getHours() + value); break
        case 'd': expiresAt.setDate(expiresAt.getDate() + value); break
      }
    } else {
      expiresAt.setMinutes(expiresAt.getMinutes() + 15) // Default 15 minutes
    }

    return expiresAt
  }

  /**
   * Запрос сброса пароля через Telegram
   * Для пользователей с привязанным Telegram аккаунтом
   */
  async requestPasswordResetViaTelegram(telegramId: bigint): Promise<{ token: string; email: string } | null> {
    const user = await prisma.user.findUnique({
      where: { telegramId },
    })

    if (!user) {
      return null
    }

    if (!user.telegramVerified) {
      return null
    }

    const token = await securityService.createVerificationToken(user.id, 'PASSWORD_RESET')

    await securityService.logSecurityEvent({
      userId: user.id,
      eventType: 'PASSWORD_RESET_REQUESTED',
      metadata: { method: 'telegram' },
    })

    return { token, email: user.email }
  }

  /**
   * Валидация пароля
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Пароль должен быть минимум 8 символов')
    }

    if (!/[a-z]/.test(password)) {
      throw new Error('Пароль должен содержать строчную букву')
    }

    if (!/[A-Z]/.test(password)) {
      throw new Error('Пароль должен содержать заглавную букву')
    }

    if (!/\d/.test(password)) {
      throw new Error('Пароль должен содержать цифру')
    }
  }

  /**
   * Удаление чувствительных данных из объекта пользователя
   * и конвертация BigInt в строку для JSON сериализации
   */
  private sanitizeUser<T extends { passwordHash?: string; telegramId?: bigint | null }>(user: T): Omit<T, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, telegramId, ...rest } = user
    return {
      ...rest,
      // Конвертируем BigInt в строку для JSON сериализации
      telegramId: telegramId ? telegramId.toString() : null,
    } as Omit<T, 'passwordHash'>
  }
}

export const authService = new AuthService()
