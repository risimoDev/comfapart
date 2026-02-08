import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, role } = body
    
    let user
    
    switch (action) {
      case 'block':
        user = await authService.blockUser(id)
        break
      case 'unblock':
        user = await authService.unblockUser(id)
        break
      case 'changeRole':
        if (!role) {
          return NextResponse.json({
            success: false,
            error: 'Укажите новую роль',
          }, { status: 400 })
        }
        user = await authService.changeRole(id, role)
        break
      default:
        return NextResponse.json({
          success: false,
          error: 'Неизвестное действие',
        }, { status: 400 })
    }
    
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
