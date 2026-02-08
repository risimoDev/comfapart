import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authService } from '@/services'

// Публичные маршруты (не требуют авторизации)
const publicRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/apartments',
  '/api/cities',
  '/api/categories',
  '/api/amenities',
]

// Маршруты, которые всегда публичные (любой метод)
const alwaysPublicRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/logout', // logout работает даже без валидного токена
  '/api/telegram/webhook', // webhook от Telegram
]

// Маршруты только для админов
const adminRoutes = [
  '/api/admin',
]

// Маршруты для менеджеров и админов
const managerRoutes = [
  '/api/manage',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Пропускаем статические файлы и внутренние маршруты Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Проверяем всегда публичные маршруты
  if (alwaysPublicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // Проверяем публичные маршруты (только GET)
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route) && request.method === 'GET'
  )

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Для защищенных маршрутов проверяем токен
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    const payload = await authService.verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Недействительный токен' },
        { status: 401 }
      )
    }

    // Проверяем доступ к админ маршрутам (только TECH_ADMIN)
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (payload.role !== 'TECH_ADMIN') {
        return NextResponse.json(
          { error: 'Доступ запрещен' },
          { status: 403 }
        )
      }
    }

    // Проверяем доступ к маршрутам владельцев (OWNER и TECH_ADMIN)
    if (managerRoutes.some(route => pathname.startsWith(route))) {
      if (payload.role !== 'TECH_ADMIN' && payload.role !== 'OWNER') {
        return NextResponse.json(
          { error: 'Доступ запрещен' },
          { status: 403 }
        )
      }
    }

    // Добавляем информацию о пользователе в заголовки
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role', payload.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
