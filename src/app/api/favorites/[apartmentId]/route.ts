import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// DELETE /api/favorites/[apartmentId] - удалить из избранного
export async function DELETE(
  request: NextRequest,
  { params }: { params: { apartmentId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { apartmentId } = params

    // Удаляем из избранного
    await prisma.favorite.deleteMany({
      where: {
        userId: user.id,
        apartmentId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/favorites/[apartmentId] - проверить, есть ли в избранном
export async function GET(
  request: NextRequest,
  { params }: { params: { apartmentId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ isFavorite: false })
    }

    const { apartmentId } = params

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_apartmentId: {
          userId: user.id,
          apartmentId
        }
      }
    })

    return NextResponse.json({ isFavorite: !!favorite })
  } catch (error) {
    console.error('Check favorite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
