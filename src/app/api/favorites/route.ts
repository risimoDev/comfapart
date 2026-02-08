import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/favorites - получить избранное пользователя
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        apartment: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 5 },
            reviews: { select: { rating: true } },
            tags: { include: { tag: true } },
            pricing: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedFavorites = favorites.map((fav) => {
      const avgRating = fav.apartment.reviews.length > 0
        ? fav.apartment.reviews.reduce((sum, r) => sum + r.rating, 0) / fav.apartment.reviews.length
        : 0

      return {
        id: fav.apartment.id,
        slug: fav.apartment.slug,
        title: fav.apartment.title,
        shortDescription: fav.apartment.shortDescription,
        basePrice: Number(fav.apartment.pricing?.basePrice || 0),
        currency: fav.apartment.pricing?.currency || 'RUB',
        city: fav.apartment.city,
        address: fav.apartment.address,
        rooms: fav.apartment.rooms,
        maxGuests: fav.apartment.maxGuests,
        images: fav.apartment.images.map((img) => img.url),
        rating: avgRating,
        reviewsCount: fav.apartment.reviews.length,
        isFeatured: false,
        tags: fav.apartment.tags.map((t) => ({
          name: t.tag.name,
          color: t.tag.slug
        }))
      }
    })

    return NextResponse.json({ favorites: formattedFavorites })
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/favorites - добавить в избранное
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { apartmentId } = await request.json()

    if (!apartmentId) {
      return NextResponse.json(
        { error: 'Apartment ID is required' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли апартамент
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId }
    })

    if (!apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      )
    }

    // Проверяем, есть ли уже в избранном
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_apartmentId: {
          userId: user.id,
          apartmentId
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Already in favorites' },
        { status: 400 }
      )
    }

    // Добавляем в избранное
    const favorite = await prisma.favorite.create({
      data: {
        userId: user.id,
        apartmentId
      }
    })

    return NextResponse.json({ success: true, favorite })
  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
