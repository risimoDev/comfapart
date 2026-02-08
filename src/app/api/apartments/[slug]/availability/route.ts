import { NextRequest, NextResponse } from 'next/server'
import { availabilityService } from '@/services'

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    
    const year = Number(searchParams.get('year')) || new Date().getFullYear()
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1
    
    // Получаем ID апартамента по slug
    const prisma = (await import('@/lib/prisma')).default
    const apartment = await prisma.apartment.findUnique({
      where: { slug },
      select: { id: true },
    })
    
    if (!apartment) {
      return NextResponse.json({
        success: false,
        error: 'Апартамент не найден',
      }, { status: 404 })
    }
    
    const calendar = await availabilityService.getAvailabilityCalendar(
      apartment.id,
      year,
      month
    )
    
    return NextResponse.json({
      success: true,
      data: calendar,
    })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении календаря',
    }, { status: 500 })
  }
}
