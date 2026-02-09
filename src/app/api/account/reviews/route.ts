/**
 * API для отзывов пользователя
 * GET /api/account/reviews - получение отзывов текущего пользователя
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      include: {
        apartment: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: {
              select: { url: true },
              take: 1,
              orderBy: { order: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      reviews
    })
  } catch (error) {
    console.error('Error fetching user reviews:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки отзывов' },
      { status: 500 }
    )
  }
}
