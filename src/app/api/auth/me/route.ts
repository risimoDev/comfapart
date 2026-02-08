import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован',
      }, { status: 401 })
    }
    
    const user = await authService.getUserById(userId)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден',
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован',
      }, { status: 401 })
    }
    
    const body = await request.json()
    const user = await authService.updateProfile(userId, body)
    
    return NextResponse.json({
      success: true,
      data: user,
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
