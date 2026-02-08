/**
 * API для администрирования юридических документов
 * GET - список документов
 * PUT - обновление документа
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, RequestContext } from '@/lib/auth'
import { legalService } from '@/services/legal.service'
import { adminService } from '@/services/admin.service'
import { LegalDocumentType } from '@prisma/client'
import { z } from 'zod'

const updateDocumentSchema = z.object({
  type: z.nativeEnum(LegalDocumentType),
  content: z.string().min(1),
  version: z.string(),
  changeReason: z.string().min(1),
})

// GET /api/admin/legal - получить документы и статистику
async function getHandler(request: NextRequest, ctx: RequestContext) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Инициализируем документы
    await legalService.initializeDocuments()

    switch (action) {
      case 'stats': {
        const stats = await legalService.getConsentStats()
        return NextResponse.json({ success: true, data: stats })
      }

      case 'data-requests': {
        const status = searchParams.get('status') || undefined
        const requests = await legalService.getAllDataRequests(status)
        return NextResponse.json({ success: true, data: requests })
      }

      case 'history': {
        const type = searchParams.get('type') as LegalDocumentType
        if (!type) {
          return NextResponse.json({ error: 'type обязателен' }, { status: 400 })
        }
        const history = await legalService.getDocumentHistory(type)
        return NextResponse.json({ success: true, data: history })
      }

      default: {
        const documents = await legalService.getAllDocuments()
        const stats = await legalService.getConsentStats()
        return NextResponse.json({
          success: true,
          data: { documents, stats },
        })
      }
    }
  } catch (error) {
    console.error('Admin legal GET error:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки данных' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/legal - обновить документ
async function putHandler(request: NextRequest, ctx: RequestContext) {
  try {
    const body = await request.json()
    const { type, content, version, changeReason } = updateDocumentSchema.parse(body)

    const document = await legalService.updateDocument(
      type,
      content,
      version,
      changeReason,
      ctx.user.id
    )

    // Логируем действие
    await adminService.logAction({
      adminId: ctx.user.id,
      action: 'UPDATE',
      entity: 'LegalDocument',
      entityId: document.id,
      details: { type, version, changeReason },
    })

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Документ обновлён',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Admin legal PUT error:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления документа' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(getHandler)
export const PUT = withAdminAuth(putHandler)
