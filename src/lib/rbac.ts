/**
 * Role-Based Access Control (RBAC) System
 * Строгое разграничение доступа по ролям
 */

import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/types'
import { AuthUser, getRequestContext, RequestContext } from './auth'

// Определяем разрешения
export type Permission =
  // Апартаменты
  | 'apartments:read'
  | 'apartments:read_own'
  | 'apartments:create'
  | 'apartments:update'
  | 'apartments:update_own'
  | 'apartments:delete'
  | 'apartments:delete_own'
  | 'apartments:publish'
  // Бронирования
  | 'bookings:read'
  | 'bookings:read_own'
  | 'bookings:create'
  | 'bookings:update'
  | 'bookings:update_own'
  | 'bookings:cancel'
  // Календарь
  | 'calendar:read'
  | 'calendar:read_own'
  | 'calendar:update'
  | 'calendar:update_own'
  // Бухгалтерия
  | 'accounting:read'
  | 'accounting:read_own'
  | 'accounting:write'
  | 'accounting:export'
  // Промокоды
  | 'promo:read'
  | 'promo:read_own'
  | 'promo:create'
  | 'promo:update'
  | 'promo:delete'
  // Отзывы
  | 'reviews:read'
  | 'reviews:read_own'
  | 'reviews:moderate'
  | 'reviews:respond'
  // Пользователи
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:manage_roles'
  // Настройки
  | 'settings:read'
  | 'settings:read_own'
  | 'settings:write'
  | 'settings:system'
  // Логи и аудит
  | 'logs:read'
  // Юридические документы
  | 'legal:read'
  | 'legal:write'
  // Статистика
  | 'stats:read'
  | 'stats:read_own'

// Роли и их разрешения
const rolePermissions: Record<UserRole, Permission[]> = {
  USER: [
    'apartments:read',
    'bookings:create',
    'reviews:read',
  ],

  OWNER: [
    // Апартаменты - только свои
    'apartments:read_own',
    'apartments:create',
    'apartments:update_own',
    'apartments:delete_own',
    'apartments:publish',
    // Бронирования - только свои апартаменты
    'bookings:read_own',
    'bookings:update_own',
    'bookings:cancel',
    // Календарь - только свои апартаменты
    'calendar:read_own',
    'calendar:update_own',
    // Бухгалтерия - только свои данные
    'accounting:read_own',
    'accounting:export',
    // Промокоды - только свои
    'promo:read_own',
    'promo:create',
    'promo:update',
    'promo:delete',
    // Отзывы - модерация и ответы на свои
    'reviews:read_own',
    'reviews:respond',
    // Настройки - ограниченные
    'settings:read_own',
    // Статистика - только свои
    'stats:read_own',
  ],

  TECH_ADMIN: [
    // Полный доступ ко всему
    'apartments:read',
    'apartments:read_own',
    'apartments:create',
    'apartments:update',
    'apartments:update_own',
    'apartments:delete',
    'apartments:delete_own',
    'apartments:publish',
    'bookings:read',
    'bookings:read_own',
    'bookings:create',
    'bookings:update',
    'bookings:update_own',
    'bookings:cancel',
    'calendar:read',
    'calendar:read_own',
    'calendar:update',
    'calendar:update_own',
    'accounting:read',
    'accounting:read_own',
    'accounting:write',
    'accounting:export',
    'promo:read',
    'promo:read_own',
    'promo:create',
    'promo:update',
    'promo:delete',
    'reviews:read',
    'reviews:read_own',
    'reviews:moderate',
    'reviews:respond',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'users:manage_roles',
    'settings:read',
    'settings:read_own',
    'settings:write',
    'settings:system',
    'logs:read',
    'legal:read',
    'legal:write',
    'stats:read',
    'stats:read_own',
  ],
}

/**
 * Проверяет наличие разрешения у пользователя
 */
export function hasPermission(user: AuthUser, permission: Permission): boolean {
  const permissions = rolePermissions[user.role] || []
  return permissions.includes(permission)
}

/**
 * Проверяет наличие любого из указанных разрешений
 */
export function hasAnyPermission(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p))
}

/**
 * Проверяет наличие всех указанных разрешений
 */
export function hasAllPermissions(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p))
}

/**
 * Проверяет, является ли пользователь технич. администратором
 */
export function isTechAdmin(user: AuthUser): boolean {
  return user.role === 'TECH_ADMIN'
}

/**
 * Проверяет, является ли пользователь владельцем (OWNER)
 */
export function isOwner(user: AuthUser): boolean {
  return user.role === 'OWNER'
}

/**
 * Проверяет, имеет ли пользователь админ-доступ (OWNER или TECH_ADMIN)
 */
export function hasAdminAccess(user: AuthUser): boolean {
  return user.role === 'OWNER' || user.role === 'TECH_ADMIN'
}

/**
 * Middleware для проверки разрешений
 */
export function withPermission<T extends unknown[]>(
  permission: Permission | Permission[],
  handler: (request: NextRequest, context: RequestContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const ctx = await getRequestContext(request)

    if (!ctx) {
      return NextResponse.json(
        { error: 'Требуется авторизация', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const permissions = Array.isArray(permission) ? permission : [permission]
    const hasAccess = permissions.some(p => hasPermission(ctx.user, p))

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Доступ запрещён', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return handler(request, ctx, ...args)
  }
}

/**
 * Middleware для владельцев апартаментов (OWNER) и тех. админов
 */
export function withOwnerAccess<T extends unknown[]>(
  handler: (request: NextRequest, context: RequestContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const ctx = await getRequestContext(request)

    if (!ctx) {
      return NextResponse.json(
        { error: 'Требуется авторизация', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    if (!hasAdminAccess(ctx.user)) {
      return NextResponse.json(
        { error: 'Доступ запрещён', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return handler(request, ctx, ...args)
  }
}

/**
 * Middleware только для технических администраторов
 */
export function withTechAdminAccess<T extends unknown[]>(
  handler: (request: NextRequest, context: RequestContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const ctx = await getRequestContext(request)

    if (!ctx) {
      return NextResponse.json(
        { error: 'Требуется авторизация', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    if (!isTechAdmin(ctx.user)) {
      return NextResponse.json(
        { error: 'Доступ запрещён. Требуются права технического администратора', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return handler(request, ctx, ...args)
  }
}

/**
 * Фильтрует данные в зависимости от роли
 * OWNER видит только свои данные, TECH_ADMIN - все
 */
export function getOwnerFilter(user: AuthUser): { ownerId?: string } {
  if (isTechAdmin(user)) {
    return {} // Тех. админ видит всё
  }
  return { ownerId: user.id }
}

/**
 * Проверяет, может ли пользователь редактировать ресурс
 */
export function canEditResource(user: AuthUser, resourceOwnerId: string | null): boolean {
  if (isTechAdmin(user)) return true
  if (isOwner(user) && resourceOwnerId === user.id) return true
  return false
}

/**
 * Получает доступные пункты меню для роли
 */
export function getMenuItemsForRole(role: UserRole): string[] {
  const baseItems = ['dashboard', 'apartments', 'calendar', 'bookings', 'accounting', 'promo', 'reviews', 'stats', 'settings']
  
  if (role === 'TECH_ADMIN') {
    return [...baseItems, 'users', 'logs', 'legal']
  }
  
  if (role === 'OWNER') {
    return baseItems
  }
  
  return []
}
