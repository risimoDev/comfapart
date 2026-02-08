import { NextRequest, NextResponse } from 'next/server'
import { pricingService } from '@/services'

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    
    const checkIn = searchParams.get('checkIn')
    const checkOut = searchParams.get('checkOut')
    const guests = searchParams.get('guests')
    const promoCode = searchParams.get('promoCode') || undefined
    
    if (!checkIn || !checkOut || !guests) {
      return NextResponse.json({
        success: false,
        error: 'Укажите даты заезда, выезда и количество гостей',
      }, { status: 400 })
    }
    
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
    
    const priceCalculation = await pricingService.calculatePrice({
      apartmentId: apartment.id,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: Number(guests),
      promoCode,
    })
    
    return NextResponse.json({
      success: true,
      data: priceCalculation,
    })
  } catch (error) {
    console.error('Error calculating price:', error)
    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 })
    }
    return NextResponse.json({
      success: false,
      error: 'Ошибка при расчете цены',
    }, { status: 500 })
  }
}
