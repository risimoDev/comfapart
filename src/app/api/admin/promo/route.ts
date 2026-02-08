import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { hasAdminAccess, getOwnerFilter, isTechAdmin } from '@/lib/rbac'

// GET /api/admin/promo - Получение списка промокодов
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') // 'active' | 'inactive' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const ownerFilter = getOwnerFilter(user)
    const where: any = {}

    // Для OWNER - только его промокоды
    if (ownerFilter.ownerId) {
      // Получаем апартаменты владельца
      const ownerApartments = await prisma.apartment.findMany({
        where: { ownerId: ownerFilter.ownerId },
        select: { id: true }
      })
      const apartmentIds = ownerApartments.map(a => a.id)
      // Промокоды, привязанные к его апартаментам
      where.apartmentIds = { hasSome: apartmentIds }
    }

    if (search) {
      where.code = { contains: search, mode: 'insensitive' }
    }

    const now = new Date()
    if (status === 'active') {
      where.isActive = true
      where.OR = [
        { startDate: null },
        { startDate: { lte: now } }
      ]
      where.AND = [
        { OR: [{ endDate: null }, { endDate: { gte: now } }] }
      ]
    } else if (status === 'inactive') {
      where.OR = [
        { isActive: false },
        { endDate: { lt: now } }
      ]
    }

    const [promoCodes, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        include: {
          bookings: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.promoCode.count({ where }),
    ])

    // Статистика
    const stats = await prisma.promoCode.aggregate({
      where: ownerFilter.ownerId ? where : {},
      _count: true,
      _sum: { usageCount: true },
    })

    const activeCount = await prisma.promoCode.count({
      where: {
        ...where,
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
      }
    })

    return NextResponse.json({
      promoCodes: promoCodes.map(promo => ({
        ...promo,
        _count: { bookings: promo.bookings.length }
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: stats._count,
        active: activeCount,
        totalUsage: stats._sum.usageCount || 0,
      }
    })
  } catch (error) {
    console.error('Error fetching promo codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/promo - Создание/обновление/удаление промокода
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
      case 'create': {
        const { code, type, value, description, validFrom, validUntil, usageLimit, apartmentIds } = body

        // Проверяем уникальность кода
        const existing = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } })
        if (existing) {
          return NextResponse.json({ error: 'Промокод уже существует' }, { status: 400 })
        }

        // Для OWNER проверяем, что апартаменты принадлежат ему
        if (apartmentIds?.length && ownerFilter.ownerId) {
          const apartments = await prisma.apartment.findMany({
            where: { id: { in: apartmentIds }, ownerId: ownerFilter.ownerId }
          })
          if (apartments.length !== apartmentIds.length) {
            return NextResponse.json({ error: 'Некоторые апартаменты не найдены' }, { status: 404 })
          }
        }

        const promoCode = await prisma.promoCode.create({
          data: {
            code: code.toUpperCase(),
            type,
            value: parseFloat(value),
            startDate: validFrom ? new Date(validFrom) : null,
            endDate: validUntil ? new Date(validUntil) : null,
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            apartmentIds: apartmentIds || [],
            isActive: true,
          },
        })

        return NextResponse.json(promoCode)
      }

      case 'update': {
        const { id, ...updateData } = body

        const existingPromo = await prisma.promoCode.findUnique({
          where: { id },
        })

        if (!existingPromo) {
          return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 })
        }

        const updated = await prisma.promoCode.update({
          where: { id },
          data: {
            code: updateData.code?.toUpperCase(),
            type: updateData.type,
            value: updateData.value ? parseFloat(updateData.value) : undefined,
            startDate: updateData.validFrom ? new Date(updateData.validFrom) : undefined,
            endDate: updateData.validUntil ? new Date(updateData.validUntil) : null,
            usageLimit: updateData.usageLimit ? parseInt(updateData.usageLimit) : null,
            isActive: updateData.isActive,
            apartmentIds: updateData.apartmentIds,
          },
        })

        return NextResponse.json(updated)
      }

      case 'toggle': {
        const { id, isActive } = body

        const existingPromo = await prisma.promoCode.findUnique({
          where: { id },
        })

        if (!existingPromo) {
          return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 })
        }

        const updated = await prisma.promoCode.update({
          where: { id },
          data: { isActive },
        })

        return NextResponse.json(updated)
      }

      case 'delete': {
        const { id } = body

        const existingPromo = await prisma.promoCode.findUnique({
          where: { id },
        })

        if (!existingPromo) {
          return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 })
        }

        await prisma.promoCode.delete({ where: { id } })

        return NextResponse.json({ success: true })
      }

      case 'generate': {
        // Генерация случайного кода
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        // Проверяем уникальность
        const existing = await prisma.promoCode.findUnique({ where: { code } })
        if (existing) {
          // Пробуем ещё раз
          code = ''
          for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
          }
        }

        return NextResponse.json({ code })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error managing promo code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/promo - Обновление промокода (альтернативный метод)
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID промокода обязателен' }, { status: 400 })
    }

    const existingPromo = await prisma.promoCode.findUnique({
      where: { id },
    })

    if (!existingPromo) {
      return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 })
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        code: updateData.code?.toUpperCase(),
        type: updateData.type,
        value: updateData.value !== undefined ? parseFloat(updateData.value) : undefined,
        minNights: updateData.minNights !== undefined ? updateData.minNights : undefined,
        minAmount: updateData.minAmount !== undefined ? parseFloat(updateData.minAmount) : undefined,
        maxDiscount: updateData.maxDiscount !== undefined ? parseFloat(updateData.maxDiscount) : undefined,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : null,
        usageLimit: updateData.usageLimit !== undefined ? parseInt(updateData.usageLimit) : undefined,
        perUserLimit: updateData.perUserLimit !== undefined ? parseInt(updateData.perUserLimit) : undefined,
        isActive: updateData.isActive,
        apartmentIds: updateData.apartmentIds,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating promo code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/promo - Удаление промокода
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID промокода обязателен' }, { status: 400 })
    }

    const existingPromo = await prisma.promoCode.findUnique({
      where: { id },
    })

    if (!existingPromo) {
      return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 })
    }

    await prisma.promoCode.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting promo code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
