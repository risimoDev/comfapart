import { NextRequest, NextResponse } from 'next/server'
import { apartmentService } from '@/services'
import { apartmentFilterSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Парсим параметры
    const filters = {
      city: searchParams.get('city') || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      checkIn: searchParams.get('checkIn') ? new Date(searchParams.get('checkIn')!) : undefined,
      checkOut: searchParams.get('checkOut') ? new Date(searchParams.get('checkOut')!) : undefined,
      guests: searchParams.get('guests') ? Number(searchParams.get('guests')) : undefined,
      bedrooms: searchParams.get('bedrooms') ? Number(searchParams.get('bedrooms')) : undefined,
      amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || undefined,
      categories: searchParams.get('categories')?.split(',').filter(Boolean) || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      sortBy: searchParams.get('sortBy') as 'price_asc' | 'price_desc' | 'rating' | 'newest' | undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 12,
    }
    
    // Валидация
    const validatedFilters = apartmentFilterSchema.parse(filters)
    
    // Получаем апартаменты
    const result = await apartmentService.getApartments(validatedFilters)
    
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error fetching apartments:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении апартаментов',
    }, { status: 500 })
  }
}
