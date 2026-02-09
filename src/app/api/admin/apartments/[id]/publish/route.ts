import { NextRequest, NextResponse } from 'next/server'
import { apartmentService } from '@/services'
import { getUserFromRequest } from '@/lib/auth'
import { hasAdminAccess, getOwnerFilter, isTechAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 })
    }

    const { id } = await params

    // Проверяем доступ владельца через прямой запрос
    const ownerFilter = getOwnerFilter(user)
    const whereClause = ownerFilter.ownerId 
      ? { id, ownerId: ownerFilter.ownerId }
      : { id }
    
    const apartmentCheck = await prisma.apartment.findFirst({ where: whereClause })
    if (!apartmentCheck) {
      return NextResponse.json({ success: false, error: 'Апартамент не найден или доступ запрещён' }, { status: 404 })
    }

    const apartment = await apartmentService.publishApartment(id, user.id, isTechAdmin(user))
    
    return NextResponse.json({
      success: true,
      data: apartment,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Доступ запрещён') {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 403 })
      }
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при публикации апартамента',
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 })
    }

    const { id } = await params

    // Проверяем доступ владельца через прямой запрос
    const ownerFilter = getOwnerFilter(user)
    const whereClause = ownerFilter.ownerId 
      ? { id, ownerId: ownerFilter.ownerId }
      : { id }
    
    const apartmentCheck = await prisma.apartment.findFirst({ where: whereClause })
    if (!apartmentCheck) {
      return NextResponse.json({ success: false, error: 'Апартамент не найден или доступ запрещён' }, { status: 404 })
    }

    const apartment = await apartmentService.hideApartment(id, user.id, isTechAdmin(user))
    
    return NextResponse.json({
      success: true,
      data: apartment,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Доступ запрещён') {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 403 })
    }
    return NextResponse.json({
      success: false,
      error: 'Ошибка при скрытии апартамента',
    }, { status: 500 })
  }
}
