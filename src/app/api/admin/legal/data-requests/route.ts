/**
 * API для обработки запросов на данные (удаление/выгрузка)
 * POST - обработать запрос
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, RequestContext } from '@/lib/auth'
import { legalService } from '@/services/legal.service'
import { adminService } from '@/services/admin.service'
import { z } from 'zod'

const processRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  responseNote: z.string().optional(),
})

// POST /api/admin/legal/data-requests - обработать запрос
async function postHandler(request: NextRequest, ctx: RequestContext) {
  try {
    const body = await request.json()
    const { requestId, action, responseNote } = processRequestSchema.parse(body)

    if (action === 'approve') {
      const result = await legalService.processDataDeletionRequest(
        requestId,
        ctx.user.id
      )

      await adminService.logAction({
        adminId: ctx.user.id,
        action: 'UPDATE',
        entity: 'DataRequest',
        entityId: requestId,
        details: { action: 'approved', requestType: result.requestType },
      })

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Запрос обработан',
      })
    } else {
      // Отклонение запроса
      const prisma = (await import('@/lib/prisma')).default
      
      const result = await prisma.dataRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          processedAt: new Date(),
          processedBy: ctx.user.id,
          responseNote: responseNote || 'Запрос отклонён',
        },
      })

      await adminService.logAction({
        adminId: ctx.user.id,
        action: 'UPDATE',
        entity: 'DataRequest',
        entityId: requestId,
        details: { action: 'rejected', reason: responseNote },
      })

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Запрос отклонён',
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Process data request error:', error)
    return NextResponse.json(
      { error: 'Ошибка обработки запроса' },
      { status: 500 }
    )
  }
}

export const POST = withAdminAuth(postHandler)
