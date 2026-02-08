import { NextRequest, NextResponse } from 'next/server'
import { apartmentService } from '@/services'
import { createApartmentSchema } from '@/lib/validations'
import { getUserFromRequest } from '@/lib/auth'
import { getOwnerFilter, hasAdminAccess, isTechAdmin } from '@/lib/rbac'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const ownerFilter = getOwnerFilter(user)
    
    const options = {
      status: searchParams.get('status')?.split(',') as any[] | undefined,
      search: searchParams.get('search') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      ownerId: ownerFilter.ownerId,
    }
    
    const result = await apartmentService.getAllApartmentsAdmin(options)
    
    return NextResponse.json({
      success: true,
      apartments: result.items,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    })
  } catch (error) {
    console.error('Error fetching apartments:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении апартаментов',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createApartmentSchema.parse(body)
    
    const apartment = await apartmentService.createApartment({
      ...validatedData,
      ownerId: user.id,
    })
    
    return NextResponse.json({
      success: true,
      data: apartment,
      id: apartment.id,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating apartment:', error)
    
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
