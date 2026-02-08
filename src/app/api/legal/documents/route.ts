/**
 * API для получения юридических документов
 * GET - получить документ по slug
 */

import { NextRequest, NextResponse } from 'next/server'
import { legalService } from '@/services/legal.service'

// GET /api/legal/documents?slug=privacy
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    // Инициализируем документы если нужно
    await legalService.initializeDocuments()

    if (slug) {
      const document = await legalService.getDocumentBySlug(slug)
      
      if (!document) {
        return NextResponse.json(
          { error: 'Документ не найден' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: document,
      })
    }

    // Возвращаем все документы
    const documents = await legalService.getAllDocuments()

    return NextResponse.json({
      success: true,
      data: documents,
    })
  } catch (error) {
    console.error('Get documents error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения документов' },
      { status: 500 }
    )
  }
}
