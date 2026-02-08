import { NextRequest, NextResponse } from 'next/server'
import { apartmentService } from '@/services'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const apartment = await apartmentService.publishApartment(id)
    
    return NextResponse.json({
      success: true,
      data: apartment,
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
      error: 'Ошибка при публикации апартамента',
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const apartment = await apartmentService.hideApartment(id)
    
    return NextResponse.json({
      success: true,
      data: apartment,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при скрытии апартамента',
    }, { status: 500 })
  }
}
