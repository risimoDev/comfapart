/**
 * API для настроек
 * GET /api/admin/settings - получение настроек (TECH_ADMIN only)
 * PUT /api/admin/settings - обновление настроек (TECH_ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { RequestContext } from '@/lib/auth'
import { withTechAdminAccess } from '@/lib/rbac'
import { settingsService } from '@/services/settings.service'
import { adminService } from '@/services/admin.service'

async function getHandler(request: NextRequest, ctx: RequestContext) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'system': {
        // Инициализируем дефолтные настройки если их нет
        await settingsService.initializeDefaults()
        const settings = await settingsService.getAllSettings()
        return NextResponse.json(settings)
      }

      case 'company': {
        const company = await settingsService.getCompanySettings()
        return NextResponse.json(company)
      }

      case 'export': {
        const exportData = await settingsService.exportSettings()
        return NextResponse.json(exportData)
      }

      default: {
        await settingsService.initializeDefaults()
        const [systemSettings, companySettings] = await Promise.all([
          settingsService.getAllSettings(),
          settingsService.getCompanySettings(),
        ])
        return NextResponse.json({ system: systemSettings, company: companySettings })
      }
    }
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки настроек' },
      { status: 500 }
    )
  }
}

async function putHandler(request: NextRequest, ctx: RequestContext) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    switch (type) {
      case 'system': {
        const { settings } = data
        
        if (!Array.isArray(settings)) {
          return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
        }

        const count = await settingsService.updateSettings(settings)

        await adminService.logAction({
          adminId: ctx.user.id,
          action: 'UPDATE',
          entity: 'SystemSettings',
          details: { updatedCount: count },
        })

        return NextResponse.json({ updated: count })
      }

      case 'company': {
        const company = await settingsService.updateCompanySettings(data)

        await adminService.logAction({
          adminId: ctx.user.id,
          action: 'UPDATE',
          entity: 'CompanySettings',
          entityId: company.id,
          details: { fields: Object.keys(data) },
        })

        return NextResponse.json(company)
      }

      case 'import': {
        const { importData } = data
        const result = await settingsService.importSettings(importData)

        await adminService.logAction({
          adminId: ctx.user.id,
          action: 'UPDATE',
          entity: 'Settings',
          details: { imported: result },
        })

        return NextResponse.json(result)
      }

      default:
        return NextResponse.json({ error: 'Неизвестный тип настроек' }, { status: 400 })
    }
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'Ошибка сохранения настроек' },
      { status: 500 }
    )
  }
}

export const GET = withTechAdminAccess(getHandler)
export const PUT = withTechAdminAccess(putHandler)
