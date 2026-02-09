/**
 * API для управления юридическими документами
 * PUT /api/admin/documents/[id] - обновление документа
 * PATCH /api/admin/documents/[id] - изменение статуса
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { isTechAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'
import { adminService } from '@/services/admin.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isTechAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { content, version } = body

    const document = await prisma.legalDocument.update({
      where: { id },
      data: {
        content,
        version,
        updatedAt: new Date(),
      },
    })

    await adminService.logAction({
      adminId: user.id,
      action: 'UPDATE',
      entity: 'LegalDocument',
      entityId: id,
      details: { version },
    })

    return NextResponse.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка обновления документа' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isTechAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    const document = await prisma.legalDocument.update({
      where: { id },
      data: {
        isActive,
      },
    })

    await adminService.logAction({
      adminId: user.id,
      action: 'UPDATE',
      entity: 'LegalDocument',
      entityId: id,
      details: { isActive },
    })

    return NextResponse.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('Error updating document status:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка изменения статуса' },
      { status: 500 }
    )
  }
}
