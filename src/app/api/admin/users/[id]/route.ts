import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services'
import { getUserFromRequest } from '@/lib/auth'
import { isTechAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/admin/users/[id] - получение полной информации о пользователе
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const currentUser = await getUserFromRequest(request)
    if (!currentUser || !isTechAdmin(currentUser)) {
      return NextResponse.json({
        success: false,
        error: 'Доступ запрещён. Требуется роль TECH_ADMIN',
      }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        securityEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        bookings: {
          select: {
            id: true,
            status: true,
            checkIn: true,
            checkOut: true,
            totalPrice: true,
            apartment: { select: { title: true, slug: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            apartment: { select: { title: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        ownedApartments: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true
          }
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
            favorites: true,
            ownedApartments: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден',
      }, { status: 404 })
    }

    // Удаляем чувствительные данные
    const { passwordHash, ...safeUser } = user

    return NextResponse.json({
      success: true,
      data: safeUser,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка загрузки данных пользователя',
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    // Проверка авторизации - только TECH_ADMIN может управлять пользователями
    const currentUser = await getUserFromRequest(request)
    if (!currentUser || !isTechAdmin(currentUser)) {
      return NextResponse.json({
        success: false,
        error: 'Доступ запрещён. Требуется роль TECH_ADMIN',
      }, { status: 403 })
    }

    const { id } = await params
    
    // Запрет на изменение своей роли/статуса
    if (id === currentUser.id) {
      return NextResponse.json({
        success: false,
        error: 'Нельзя изменять свой аккаунт',
      }, { status: 400 })
    }

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
