/**
 * API для дашборда админ-панели
 * GET /api/admin/dashboard - статистика
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, RequestContext } from '@/lib/auth'
import { getOwnerFilter, isTechAdmin } from '@/lib/rbac'
import { adminService } from '@/services/admin.service'

async function handler(request: NextRequest, ctx: RequestContext) {
  try {
    const ownerFilter = getOwnerFilter(ctx.user)
    
    const [stats, trends, pendingActions] = await Promise.all([
      adminService.getDashboardStats(ownerFilter.ownerId),
      adminService.getBookingTrends(30, ownerFilter.ownerId),
      adminService.getPendingActions(ownerFilter.ownerId),
    ])

    return NextResponse.json({
      stats,
      trends,
      pendingActions,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки данных' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
