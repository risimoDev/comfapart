import { NextRequest, NextResponse } from 'next/server'
import { apartmentService } from '@/services'

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params
    
    const apartment = await apartmentService.getApartmentBySlug(slug)
    
    if (!apartment) {
      return NextResponse.json({
        success: false,
        error: 'Апартамент не найден',
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: apartment,
    })
  } catch (error) {
    console.error('Error fetching apartment:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении апартамента',
    }, { status: 500 })
  }
}
