import { NextRequest, NextResponse } from 'next/server'
import { bookingService } from '@/services'
import { getUserFromRequest } from '@/lib/auth'
import { getOwnerFilter, hasAdminAccess } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const ownerFilter = getOwnerFilter(user)
    
    const options = {
      status: searchParams.get('status')?.split(',') as any[] | undefined,
      apartmentId: searchParams.get('apartmentId') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      search: searchParams.get('search') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      ownerId: ownerFilter.ownerId,
    }
    
    const result = await bookingService.getAllBookings(options)
    
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований',
    }, { status: 500 })
  }
}
