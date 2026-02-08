/**
 * POST /api/auth/logout - Выход из системы
 */

import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    const refreshToken = request.cookies.get('refreshToken')?.value
    const { all } = await request.json().catch(() => ({ all: false }))

    const meta = {
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 request.ip || undefined,
    }

    if (user) {
      if (all) {
        // Выход со всех устройств
        await authService.logoutAll(user.id, meta)
      } else {
        // Выход с текущего устройства
        await authService.logout(user.id, refreshToken, meta)
      }
    }

    // Удаляем refresh token cookie
    const response = NextResponse.json({
      success: true,
      message: all ? 'Выход со всех устройств выполнен' : 'Выход выполнен',
    })

    response.cookies.delete('refreshToken')

    return response
  } catch (error) {
    // Даже при ошибке удаляем cookie
    const response = NextResponse.json({
      success: true,
      message: 'Выход выполнен',
    })

    response.cookies.delete('refreshToken')

    return response
  }
}
