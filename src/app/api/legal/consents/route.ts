/**
 * API для управления согласиями пользователей
 * GET - получить согласия
 * POST - создать согласие
 * DELETE - отозвать согласие
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { legalService } from '@/services/legal.service'
import { ConsentType, LegalDocumentType } from '@prisma/client'
import { z } from 'zod'

const createConsentSchema = z.object({
  consentType: z.nativeEnum(ConsentType),
  documentType: z.nativeEnum(LegalDocumentType).optional(),
})

const withdrawConsentSchema = z.object({
  consentType: z.nativeEnum(ConsentType),
  reason: z.string().optional(),
})

// GET /api/legal/consents - получить согласия пользователя
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    const consents = await legalService.getUserConsents(user.id)
    const requiredCheck = await legalService.hasRequiredConsents(user.id)

    return NextResponse.json({
      success: true,
      data: {
        consents,
        requiredConsentsValid: requiredCheck.valid,
        missingConsents: requiredCheck.missing,
      },
    })
  } catch (error) {
    console.error('Get consents error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения согласий' },
      { status: 500 }
    )
  }
}

// POST /api/legal/consents - создать согласие
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { consentType, documentType } = createConsentSchema.parse(body)

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      request.ip
    const userAgent = request.headers.get('user-agent')

    const consent = await legalService.createConsent({
      userId: user.id,
      consentType,
      documentType,
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
    console.error('Create consent error:', error)
    return NextResponse.json(
      { error: 'Ошибка создания согласия' },
      { status: 500 }
    )
  }
}

// DELETE /api/legal/consents - отозвать согласие
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { consentType, reason } = withdrawConsentSchema.parse(body)

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      request.ip
    const userAgent = request.headers.get('user-agent')

    const consent = await legalService.withdrawConsent(
      user.id,
      consentType,
      reason,
      ipAddress || undefined,
      userAgent || undefined
    )

    if (!consent) {
      return NextResponse.json(
        { error: 'Согласие не найдено' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: consent,
      message: 'Согласие успешно отозвано',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Withdraw consent error:', error)
    return NextResponse.json(
      { error: 'Ошибка отзыва согласия' },
      { status: 500 }
    )
  }
}
