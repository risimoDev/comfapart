/**
 * API для отдельного отзыва пользователя
 * PUT /api/account/reviews/[id] - обновление отзыва
 * DELETE /api/account/reviews/[id] - удаление отзыва
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { comment, rating } = body

    // Проверяем, что отзыв принадлежит пользователю
    const existingReview = await prisma.review.findFirst({
      where: { id, userId: user.id }
    })

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Отзыв не найден' },
        { status: 404 }
      )
    }

    const review = await prisma.review.update({
      where: { id },
      data: {
        comment,
        rating: Math.min(5, Math.max(1, rating)),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      review
    })
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка обновления отзыва' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = params

    // Проверяем, что отзыв принадлежит пользователю
    const existingReview = await prisma.review.findFirst({
      where: { id, userId: user.id }
    })

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Отзыв не найден' },
        { status: 404 }
      )
    }

    await prisma.review.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Отзыв удалён'
    })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка удаления отзыва' },
      { status: 500 }
    )
  }
}
