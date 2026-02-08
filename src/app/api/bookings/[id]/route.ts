import { NextRequest, NextResponse } from 'next/server'
import { bookingService } from '@/services'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')
    const { id } = await params
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован',
      }, { status: 401 })
    }
    
    const booking = await bookingService.getBookingById(id)
    
    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Бронирование не найдено',
      }, { status: 404 })
    }
    
    // Проверяем доступ: пользователь может видеть только свои бронирования
    // Админы и менеджеры могут видеть все
    if (booking.userId !== userId && userRole === 'USER') {
      return NextResponse.json({
        success: false,
        error: 'Доступ запрещен',
      }, { status: 403 })
    }
    
    return NextResponse.json({
      success: true,
      data: booking,
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирования',
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')
    const { id } = await params
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован',
      }, { status: 401 })
    }
    
    const body = await request.json()
    const { status, adminComment, cancelReason } = body
    
    // Получаем текущее бронирование
    const booking = await bookingService.getBookingById(id)
    
    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Бронирование не найдено',
      }, { status: 404 })
    }
    
    // Пользователь может только отменить свое бронирование
    if (userRole === 'USER') {
      if (booking.userId !== userId) {
        return NextResponse.json({
          success: false,
          error: 'Доступ запрещен',
        }, { status: 403 })
      }
      if (status !== 'CANCELED') {
        return NextResponse.json({
          success: false,
          error: 'Вы можете только отменить бронирование',
        }, { status: 403 })
      }
    }
    
    const updatedBooking = await bookingService.updateBookingStatus({
      bookingId: id,
      status,
      adminId: userRole !== 'USER' ? userId : undefined,
      comment: adminComment,
      cancelReason,
    })
    
    return NextResponse.json({
      success: true,
      data: updatedBooking,
    })
  } catch (error) {
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
