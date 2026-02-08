import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const amenities = await prisma.amenity.findMany({
      orderBy: { category: 'asc' },
    })
    
    // Группируем по категориям
    const grouped = amenities.reduce((acc, amenity) => {
      if (!acc[amenity.category]) {
        acc[amenity.category] = []
      }
      acc[amenity.category].push(amenity)
      return acc
    }, {} as Record<string, typeof amenities>)
    
    return NextResponse.json({
      success: true,
      data: {
        all: amenities,
        grouped,
      },
    })
  } catch (error) {
    console.error('Error fetching amenities:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении удобств',
    }, { status: 500 })
  }
}
