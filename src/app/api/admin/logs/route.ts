/**
 * API для логов действий администраторов
 * GET /api/admin/logs - получение логов с пагинацией
 * Только для TECH_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { withTechAdminAuth, RequestContext } from '@/lib/auth'
import { adminService } from '@/services/admin.service'
import { AdminAction } from '@prisma/client'

async function handler(request: NextRequest, ctx: RequestContext) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action') as AdminAction | null
    const entity = searchParams.get('entity')
    const adminId = searchParams.get('adminId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const result = await adminService.getAdminLogs({
      page,
      limit,
      action: action || undefined,
      entity: entity || undefined,
      adminId: adminId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Logs API error:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки логов' },
      { status: 500 }
    )
  }
}

export const GET = withTechAdminAuth(handler)
