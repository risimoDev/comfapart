import { NextRequest, NextResponse } from 'next/server'
import { apartmentService } from '@/services'
import { updateApartmentSchema } from '@/lib/validations'
import { getUserFromRequest } from '@/lib/auth'
import { hasAdminAccess, getOwnerFilter } from '@/lib/rbac'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
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
    
    const apartment = await apartmentService.getApartmentById(id)
    
    return NextResponse.json({
      success: true,
      data: apartment,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении апартамента',
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Проверяем доступ владельца через прямой запрос
    const ownerFilter = getOwnerFilter(user)
    const whereClause = ownerFilter.ownerId 
      ? { id, ownerId: ownerFilter.ownerId }
      : { id }
    
    const existing = await prisma.apartment.findFirst({ where: whereClause })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Апартамент не найден или доступ запрещён' }, { status: 404 })
    }
    
    // Валидация
    const validatedData = updateApartmentSchema.parse(body)
    
    const apartment = await apartmentService.updateApartment(id, validatedData)
    
    return NextResponse.json({
      success: true,
      data: apartment,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Ошибка валидации',
        details: error.errors,
      }, { status: 400 })
    }
    
    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
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
    
    const existing = await prisma.apartment.findFirst({ where: whereClause })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Апартамент не найден или доступ запрещён' }, { status: 404 })
    }

    await apartmentService.deleteApartment(id)
    
    return NextResponse.json({
      success: true,
      message: 'Апартамент удален',
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении апартамента',
    }, { status: 500 })
  }
}
