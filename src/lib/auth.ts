/**
 * Auth utilities для API routes
 * Предоставляет функции авторизации и RBAC
 */

import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import prisma from '@/lib/prisma'
import type { User, UserRole } from '@/types'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  avatar: string | null
  role: UserRole
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING'
  emailVerified: boolean
  telegramVerified: boolean
  telegramUsername: string | null
  createdAt: Date
}

export interface RequestContext {
  user: AuthUser
  token: string
  ipAddress: string | null
  userAgent: string | null
}

/**
 * Извлекает токен из Authorization header
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.replace('Bearer ', '')
}

/**
 * Получает пользователя из запроса
 * Проверяет токен и возвращает данные пользователя
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const token = extractToken(request)
  
  if (!token) {
    return null
  }

  const payload = await authService.verifyToken(token)
  if (!payload) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
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
      telegramVerified: true,
      telegramUsername: true,
      createdAt: true,
    },
  })

  if (!user || user.status === 'BLOCKED') {
    return null
  }

  return user as AuthUser
}

/**
 * Получает полный контекст авторизации
 */
export async function getRequestContext(request: NextRequest): Promise<RequestContext | null> {
  const token = extractToken(request)
  
  if (!token) {
    return null
  }

  const user = await getUserFromRequest(request)
  if (!user) {
    return null
  }

  return {
    user,
    token,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') ||
               request.ip || null,
    userAgent: request.headers.get('user-agent'),
  }
}

/**
 * Проверяет роль пользователя
 */
export function hasRole(user: AuthUser, roles: UserRole | UserRole[]): boolean {
  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  return allowedRoles.includes(user.role)
}

/**
 * Middleware для проверки авторизации
 */
export function withAuth<T extends unknown[]>(
  handler: (request: NextRequest, context: RequestContext, ...args: T) => Promise<NextResponse>,
  options?: {
    roles?: UserRole[]
    requireEmailVerified?: boolean
  }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const ctx = await getRequestContext(request)

    if (!ctx) {
      return NextResponse.json(
        { error: 'Требуется авторизация', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Проверка роли
    if (options?.roles && !hasRole(ctx.user, options.roles)) {
      return NextResponse.json(
        { error: 'Доступ запрещён', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Проверка верификации email
    if (options?.requireEmailVerified && !ctx.user.emailVerified) {
      return NextResponse.json(
        { error: 'Требуется подтверждение email', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 }
      )
    }

    return handler(request, ctx, ...args)
  }
}

/**
 * Middleware только для админов (OWNER + TECH_ADMIN)
 */
export function withAdminAuth<T extends unknown[]>(
  handler: (request: NextRequest, context: RequestContext, ...args: T) => Promise<NextResponse>
) {
  return withAuth(handler, { roles: ['OWNER', 'TECH_ADMIN'] })
}

/**
 * Middleware только для технических администраторов
 */
export function withTechAdminAuth<T extends unknown[]>(
  handler: (request: NextRequest, context: RequestContext, ...args: T) => Promise<NextResponse>
) {
  return withAuth(handler, { roles: ['TECH_ADMIN'] })
}
