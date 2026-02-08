import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import { getUserFromRequest } from '@/lib/auth'
import { isTechAdmin } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user || !isTechAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён. Требуются права технического администратора' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const options = {
      role: searchParams.get('role') as 'USER' | 'OWNER' | 'TECH_ADMIN' | undefined,
      status: searchParams.get('status') as 'ACTIVE' | 'BLOCKED' | 'PENDING' | undefined,
      search: searchParams.get('search') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
    }
    
    const result = await authService.getAllUsers(options)
    
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении пользователей',
    }, { status: 500 })
  }
}
