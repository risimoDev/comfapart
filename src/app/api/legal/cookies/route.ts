/**
 * API для Cookie согласий
 * GET - получить согласие
 * POST - сохранить/обновить согласие
 */

import { NextRequest, NextResponse } from 'next/server'
import { legalService } from '@/services/legal.service'
import { z } from 'zod'

const cookieConsentSchema = z.object({
  visitorId: z.string().uuid(),
  analytics: z.boolean(),
  marketing: z.boolean(),
})

// GET /api/legal/cookies?visitorId=xxx - получить cookie согласие
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')

    if (!visitorId) {
      return NextResponse.json(
        { error: 'visitorId обязателен' },
        { status: 400 }
      )
    }

    const consent = await legalService.getCookieConsent(visitorId)

    return NextResponse.json({
      success: true,
      data: consent || {
        essential: true,
        analytics: false,
        marketing: false,
      },
    })
  } catch (error) {
    console.error('Get cookie consent error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения согласия' },
      { status: 500 }
    )
  }
}

// POST /api/legal/cookies - сохранить cookie согласие
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitorId, analytics, marketing } = cookieConsentSchema.parse(body)

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      request.ip
    const userAgent = request.headers.get('user-agent')

    const consent = await legalService.saveCookieConsent({
      visitorId,
      essential: true, // Всегда true
      analytics,
      marketing,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    })

    return NextResponse.json({
      success: true,
      data: consent,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Save cookie consent error:', error)
    return NextResponse.json(
      { error: 'Ошибка сохранения согласия' },
      { status: 500 }
    )
  }
}
