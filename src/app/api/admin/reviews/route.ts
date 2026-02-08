import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { hasAdminAccess, getOwnerFilter } from '@/lib/rbac'

// GET /api/admin/reviews - Получение списка отзывов
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || '' // 'pending' | 'approved' | 'rejected'
    const rating = searchParams.get('rating') // 1-5
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const ownerFilter = getOwnerFilter(user)
    const where: any = {}

    // Для OWNER - только отзывы на его апартаменты
    if (ownerFilter.ownerId) {
      where.apartment = { ownerId: ownerFilter.ownerId }
    }

    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { apartment: { title: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (status === 'pending') {
      where.isApproved = false
      where.isPublished = false
    } else if (status === 'approved') {
      where.isApproved = true
      where.isPublished = true
    } else if (status === 'rejected') {
      where.isApproved = false
      where.isPublished = false
      // Отклонённые = есть ownerReply и не одобрены
    }

    if (rating) {
      where.rating = parseInt(rating)
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          apartment: { select: { id: true, title: true, slug: true, images: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    // Статистика
    const baseWhere = ownerFilter.ownerId ? { apartment: { ownerId: ownerFilter.ownerId } } : {}
    
    const [totalStats, pendingCount, approvedCount, avgRating] = await Promise.all([
      prisma.review.count({ where: baseWhere }),
      prisma.review.count({ where: { ...baseWhere, isApproved: false, isPublished: false } }),
      prisma.review.count({ where: { ...baseWhere, isApproved: true, isPublished: true } }),
      prisma.review.aggregate({
        where: { ...baseWhere, isPublished: true },
        _avg: { rating: true }
      })
    ])

    // Преобразуем отзывы для фронтенда
    const reviewsWithStatus = reviews.map(r => ({
      ...r,
      user: {
        id: r.user.id,
        name: [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || 'Гость',
        email: r.user.email,
      },
      status: r.isApproved && r.isPublished ? 'APPROVED' : 
              !r.isApproved && !r.isPublished && r.ownerReply ? 'REJECTED' : 'PENDING',
    }))

    return NextResponse.json({
      reviews: reviewsWithStatus,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: totalStats,
        pending: pendingCount,
        approved: approvedCount,
        rejected: totalStats - pendingCount - approvedCount,
        avgRating: avgRating._avg.rating || 0,
      }
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/reviews - Модерация отзывов
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body
    const ownerFilter = getOwnerFilter(user)

    switch (action) {
      case 'approve': {
        const { id } = body

        const review = await prisma.review.findUnique({
          where: { id },
          include: { apartment: { select: { ownerId: true, id: true } } }
        })

        if (!review) {
          return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
        }

        // OWNER может модерировать только отзывы на свои апартаменты
        if (ownerFilter.ownerId && review.apartment.ownerId !== ownerFilter.ownerId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const updated = await prisma.review.update({
          where: { id },
          data: { 
            isApproved: true,
            isPublished: true,
          },
        })

        // Обновляем средний рейтинг апартамента
        await updateApartmentRating(review.apartmentId)

        return NextResponse.json(updated)
      }

      case 'reject': {
        const { id, reason } = body

        const review = await prisma.review.findUnique({
          where: { id },
          include: { apartment: { select: { ownerId: true } } }
        })

        if (!review) {
          return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
        }

        if (ownerFilter.ownerId && review.apartment.ownerId !== ownerFilter.ownerId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const updated = await prisma.review.update({
          where: { id },
          data: { 
            isApproved: false,
            isPublished: false,
          },
        })

        return NextResponse.json(updated)
      }

      case 'reply': {
        const { id, reply } = body

        const review = await prisma.review.findUnique({
          where: { id },
          include: { apartment: { select: { ownerId: true } } }
        })

        if (!review) {
          return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
        }

        // Только владелец апартамента или TECH_ADMIN может отвечать
        if (ownerFilter.ownerId && review.apartment.ownerId !== ownerFilter.ownerId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const updated = await prisma.review.update({
          where: { id },
          data: { 
            ownerReply: reply,
            ownerReplyDate: new Date(),
          },
        })

        return NextResponse.json(updated)
      }

      case 'delete': {
        const { id } = body

        const review = await prisma.review.findUnique({
          where: { id },
          include: { apartment: { select: { ownerId: true } } }
        })

        if (!review) {
          return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
        }

        // Только TECH_ADMIN может удалять отзывы
        if (user.role !== 'TECH_ADMIN') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await prisma.review.delete({ where: { id } })

        // Обновляем средний рейтинг апартамента
        await updateApartmentRating(review.apartmentId)

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error managing review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Вспомогательная функция для обновления среднего рейтинга апартамента
async function updateApartmentRating(apartmentId: string) {
  const result = await prisma.review.aggregate({
    where: { 
      apartmentId,
      isPublished: true
    },
    _avg: { rating: true },
    _count: true,
  })

  await prisma.apartment.update({
    where: { id: apartmentId },
    data: { 
      averageRating: result._avg.rating || 0,
      reviewCount: result._count,
    },
  })
}
