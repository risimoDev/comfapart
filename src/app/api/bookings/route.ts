import { NextRequest, NextResponse } from 'next/server'
import { bookingService } from '@/services'
import { createBookingSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован',
      }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 10
    const status = searchParams.get('status')?.split(',') as any[] | undefined
    
    const result = await bookingService.getUserBookings(userId, {
      status,
      page,
      limit,
    })
    
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован',
      }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Валидация
    const validatedData = createBookingSchema.parse(body)
    
    // Создаем бронирование
    const booking = await bookingService.createBooking({
      ...validatedData,
      userId,
    })
    
    return NextResponse.json({
      success: true,
      data: booking,
    }, { status: 201 })
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
