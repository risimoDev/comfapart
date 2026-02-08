import { NextRequest, NextResponse } from 'next/server'
import { pricingService } from '@/services'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, apartmentId, amount, nights, userId } = body
    
    if (!code || !apartmentId || !amount || !nights) {
      return NextResponse.json({
        success: false,
        error: 'Укажите все обязательные параметры',
      }, { status: 400 })
    }
    
    const result = await pricingService.validatePromoCode(
      code,
      apartmentId,
      amount,
      nights,
      userId
    )
    
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Error validating promo code:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при проверке промокода',
    }, { status: 500 })
  }
}
