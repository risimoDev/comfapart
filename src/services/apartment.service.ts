/**
 * Сервис апартаментов
 * CRUD операции, поиск, фильтрация
 */

import prisma from '@/lib/prisma'
import type { Apartment, ApartmentFilters, PaginatedResponse, ApartmentStatus } from '@/types'
import { slugify } from '@/lib/utils'
import { ApartmentStatus as PrismaApartmentStatus, Prisma } from '@prisma/client'

interface CreateApartmentData {
  title: string
  description: string
  shortDescription?: string
  city: string
  address: string
  district?: string
  latitude?: number | null
  longitude?: number | null
  area: number
  rooms: number
  bedrooms: number
  bathrooms: number
  floor?: number | null
  totalFloors?: number | null
  maxGuests?: number
  minNights?: number
  maxNights?: number
  checkInTime?: string
  checkOutTime?: string
  metaTitle?: string
  metaDescription?: string
  ownerId?: string
  status?: string
  // Связанные данные
  amenityIds?: string[]
  rules?: { rule: string; isAllowed: boolean }[]
  images?: { url: string; alt: string; isPrimary: boolean }[]
  // Pricing
  basePrice?: number
  cleaningFee?: number
  serviceFee?: number
  securityDeposit?: number
  weeklyDiscount?: number
  monthlyDiscount?: number
}

interface UpdateApartmentData extends Partial<CreateApartmentData> {
  status?: ApartmentStatus
}

export class ApartmentService {
  /**
   * Создает новый апартамент со всеми связанными данными
   */
  async createApartment(data: CreateApartmentData): Promise<Apartment> {
    const slug = slugify(data.title) + '-' + Date.now().toString(36)

    // Выделяем связанные данные
    const { 
      amenityIds, 
      rules, 
      images, 
      basePrice, 
      cleaningFee, 
      serviceFee, 
      securityDeposit, 
      weeklyDiscount, 
      monthlyDiscount,
      status,
      ...apartmentData 
    } = data

    const apartment = await prisma.apartment.create({
      data: {
        ...apartmentData,
        slug,
        status: (status || 'DRAFT') as PrismaApartmentStatus,
        // Создаём удобства
        ...(amenityIds && amenityIds.length > 0 && {
          amenities: {
            create: amenityIds.map(amenityId => ({ amenityId }))
          }
        }),
        // Создаём правила
        ...(rules && rules.length > 0 && {
          rules: {
            create: rules.map(r => ({ rule: r.rule, isAllowed: r.isAllowed }))
          }
        }),
        // Создаём изображения
        ...(images && images.length > 0 && {
          images: {
            create: images.map((img, index) => ({ 
              url: img.url, 
              alt: img.alt || '',
              isPrimary: img.isPrimary,
              order: index
            }))
          }
        }),
        // Создаём pricing
        ...(basePrice && {
          pricing: {
            create: {
              basePrice,
              cleaningFee: cleaningFee || 0,
              serviceFee: serviceFee || 0,
              securityDeposit: securityDeposit || 0,
              weeklyDiscount: weeklyDiscount || 0,
              monthlyDiscount: monthlyDiscount || 0,
            }
          }
        }),
      },
      include: this.getFullInclude(),
    })

    return apartment as unknown as Apartment
  }

  /**
   * Обновляет апартамент
   */
  async updateApartment(id: string, data: UpdateApartmentData): Promise<Apartment> {
    // Выделяем связанные данные
    const { 
      amenityIds, 
      rules, 
      images, 
      basePrice, 
      cleaningFee, 
      serviceFee, 
      securityDeposit, 
      weeklyDiscount, 
      monthlyDiscount,
      status,
      ownerId,
      ...updateData 
    } = data

    const apartment = await prisma.apartment.update({
      where: { id },
      data: {
        ...updateData,
        ...(status && { status: status as PrismaApartmentStatus }),
        ...(ownerId && { owner: { connect: { id: ownerId } } }),
        // Обновляем удобства
        ...(amenityIds !== undefined && {
          amenities: {
            deleteMany: {},
            ...(amenityIds.length > 0 && {
              create: amenityIds.map(amenityId => ({ amenityId }))
            })
          }
        }),
        // Обновляем правила
        ...(rules !== undefined && {
          rules: {
            deleteMany: {},
            ...(rules.length > 0 && {
              create: rules.map(r => ({ rule: r.rule, isAllowed: r.isAllowed }))
            })
          }
        }),
        // Обновляем изображения
        ...(images !== undefined && {
          images: {
            deleteMany: {},
            ...(images.length > 0 && {
              create: images.map((img, index) => ({ 
                url: img.url, 
                alt: img.alt || '',
                isPrimary: img.isPrimary,
                order: index
              }))
            })
          }
        }),
        // Обновляем цены
        ...((basePrice !== undefined || cleaningFee !== undefined || serviceFee !== undefined || 
             securityDeposit !== undefined || weeklyDiscount !== undefined || monthlyDiscount !== undefined) && {
          pricing: {
            upsert: {
              create: {
                basePrice: basePrice || 0,
                cleaningFee: cleaningFee || 0,
                serviceFee: serviceFee || 0,
                securityDeposit: securityDeposit || 0,
                weeklyDiscount: weeklyDiscount || 0,
                monthlyDiscount: monthlyDiscount || 0,
              },
              update: {
                ...(basePrice !== undefined && { basePrice }),
                ...(cleaningFee !== undefined && { cleaningFee }),
                ...(serviceFee !== undefined && { serviceFee }),
                ...(securityDeposit !== undefined && { securityDeposit }),
                ...(weeklyDiscount !== undefined && { weeklyDiscount }),
                ...(monthlyDiscount !== undefined && { monthlyDiscount }),
              }
            }
          }
        }),
      },
      include: this.getFullInclude(),
    })
    return apartment as unknown as Apartment
  }

  /**
   * Удаляет апартамент (мягкое удаление - архивирование)
   */
  async deleteApartment(id: string): Promise<void> {
    await prisma.apartment.update({
      where: { id },
      data: { status: 'ARCHIVED' as PrismaApartmentStatus },
    })
  }

  /**
   * Полное удаление апартамента (для админа)
   */
  async hardDeleteApartment(id: string): Promise<void> {
    await prisma.apartment.delete({
      where: { id },
    })
  }

  /**
   * Получает апартамент по ID
   */
  async getApartmentById(id: string): Promise<Apartment | null> {
    const apartment = await prisma.apartment.findUnique({
      where: { id },
      include: this.getFullInclude(),
    })
    return apartment as unknown as Apartment | null
  }

  /**
   * Получает апартамент по slug
   */
  async getApartmentBySlug(slug: string): Promise<Apartment | null> {
    const apartment = await prisma.apartment.findUnique({
      where: { slug },
      include: this.getFullInclude(),
    })
    return apartment as unknown as Apartment | null
  }

  /**
   * Получает список апартаментов с фильтрацией
   */
  async getApartments(filters: ApartmentFilters): Promise<PaginatedResponse<Apartment>> {
    const {
      city,
      minPrice,
      maxPrice,
      checkIn,
      checkOut,
      guests,
      bedrooms,
      amenities,
      categories,
      tags,
      sortBy,
      page = 1,
      limit = 12,
    } = filters

    const skip = (page - 1) * limit

    // Базовый фильтр - только опубликованные
    const where: Prisma.ApartmentWhereInput = {
      status: 'PUBLISHED' as PrismaApartmentStatus,
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    if (guests) {
      where.maxGuests = { gte: guests }
    }

    if (bedrooms !== undefined) {
      where.bedrooms = { gte: bedrooms }
    }

    // Фильтр по цене
    if (minPrice || maxPrice) {
      where.pricing = {
        basePrice: {
          ...(minPrice && { gte: minPrice }),
          ...(maxPrice && { lte: maxPrice }),
        },
      }
    }

    // Фильтр по удобствам
    if (amenities?.length) {
      where.amenities = {
        some: {
          amenity: {
            name: { in: amenities },
          },
        },
      }
    }

    // Фильтр по категориям
    if (categories?.length) {
      where.categories = {
        some: {
          category: {
            slug: { in: categories },
          },
        },
      }
    }

    // Фильтр по тегам
    if (tags?.length) {
      where.tags = {
        some: {
          tag: {
            slug: { in: tags },
          },
        },
      }
    }

    // Фильтр по доступности дат
    if (checkIn && checkOut) {
      where.bookings = {
        none: {
          AND: [
            { checkIn: { lt: checkOut } },
            { checkOut: { gt: checkIn } },
            { status: { in: ['PENDING', 'CONFIRMED', 'PAID'] } },
          ],
        },
      }
      where.blockedDates = {
        none: {
          date: {
            gte: checkIn,
            lt: checkOut,
          },
        },
      }
    }

    // Сортировка
    let orderBy: Prisma.ApartmentOrderByWithRelationInput = { createdAt: 'desc' }
    if (sortBy === 'price_asc') {
      orderBy = { pricing: { basePrice: 'asc' } }
    } else if (sortBy === 'price_desc') {
      orderBy = { pricing: { basePrice: 'desc' } }
    } else if (sortBy === 'rating') {
      orderBy = { averageRating: 'desc' }
    }

    const [apartments, total] = await Promise.all([
      prisma.apartment.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' }, take: 5 },
          pricing: true,
          amenities: {
            include: { amenity: true },
            take: 6,
          },
          categories: {
            include: { category: true },
          },
          tags: {
            include: { tag: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.apartment.count({ where }),
    ])

    return {
      items: apartments as unknown as Apartment[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + apartments.length < total,
    }
  }

  /**
   * Получает все апартаменты для админки
   */
  async getAllApartmentsAdmin(options?: {
    status?: ApartmentStatus[]
    search?: string
    page?: number
    limit?: number
    ownerId?: string  // Фильтр по владельцу
  }): Promise<PaginatedResponse<Apartment>> {
    const { status, search, page = 1, limit = 20, ownerId } = options || {}
    const skip = (page - 1) * limit

    const where: Prisma.ApartmentWhereInput = {}

    // Фильтрация по владельцу - каждый админ видит только свои квартиры
    if (ownerId) {
      where.ownerId = ownerId
    }

    if (status?.length) {
      where.status = { in: status as PrismaApartmentStatus[] }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [apartments, total] = await Promise.all([
      prisma.apartment.findMany({
        where,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          pricing: true,
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { bookings: true, reviews: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.apartment.count({ where }),
    ])

    return {
      items: apartments as unknown as Apartment[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + apartments.length < total,
    }
  }

  /**
   * Публикует апартамент
   */
  async publishApartment(id: string): Promise<Apartment> {
    // Проверяем обязательные поля
    const apartment = await prisma.apartment.findUnique({
      where: { id },
      include: { images: true, pricing: true },
    })

    if (!apartment) {
      throw new Error('Апартамент не найден')
    }

    if (apartment.images.length === 0) {
      throw new Error('Добавьте хотя бы одно изображение')
    }

    if (!apartment.pricing) {
      throw new Error('Установите цену')
    }

    const updated = await prisma.apartment.update({
      where: { id },
      data: { status: 'PUBLISHED' as PrismaApartmentStatus },
      include: this.getFullInclude(),
    })

    return updated as unknown as Apartment
  }

  /**
   * Скрывает апартамент
   */
  async hideApartment(id: string): Promise<Apartment> {
    const updated = await prisma.apartment.update({
      where: { id },
      data: { status: 'HIDDEN' as PrismaApartmentStatus },
      include: this.getFullInclude(),
    })
    return updated as unknown as Apartment
  }

  /**
   * Добавляет изображение
   */
  async addImage(
    apartmentId: string,
    imageUrl: string,
    options?: { alt?: string; isPrimary?: boolean }
  ) {
    const maxOrder = await prisma.apartmentImage.findFirst({
      where: { apartmentId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    // Если это главное изображение, сбрасываем флаг у других
    if (options?.isPrimary) {
      await prisma.apartmentImage.updateMany({
        where: { apartmentId },
        data: { isPrimary: false },
      })
    }

    return prisma.apartmentImage.create({
      data: {
        apartmentId,
        url: imageUrl,
        alt: options?.alt,
        order: (maxOrder?.order ?? -1) + 1,
        isPrimary: options?.isPrimary ?? false,
      },
    })
  }

  /**
   * Удаляет изображение
   */
  async removeImage(imageId: string) {
    return prisma.apartmentImage.delete({
      where: { id: imageId },
    })
  }

  /**
   * Добавляет удобства к апартаменту
   */
  async addAmenities(apartmentId: string, amenityIds: string[]) {
    const data = amenityIds.map(amenityId => ({
      apartmentId,
      amenityId,
    }))

    await prisma.apartmentAmenity.createMany({
      data,
      skipDuplicates: true,
    })
  }

  /**
   * Обновляет удобства апартамента
   */
  async updateAmenities(apartmentId: string, amenityIds: string[]) {
    await prisma.$transaction([
      prisma.apartmentAmenity.deleteMany({ where: { apartmentId } }),
      prisma.apartmentAmenity.createMany({
        data: amenityIds.map(amenityId => ({ apartmentId, amenityId })),
      }),
    ])
  }

  /**
   * Добавляет категории к апартаменту
   */
  async updateCategories(apartmentId: string, categoryIds: string[]) {
    await prisma.$transaction([
      prisma.apartmentCategory.deleteMany({ where: { apartmentId } }),
      prisma.apartmentCategory.createMany({
        data: categoryIds.map(categoryId => ({ apartmentId, categoryId })),
      }),
    ])
  }

  /**
   * Добавляет теги к апартаменту
   */
  async updateTags(apartmentId: string, tagIds: string[]) {
    await prisma.$transaction([
      prisma.apartmentTag.deleteMany({ where: { apartmentId } }),
      prisma.apartmentTag.createMany({
        data: tagIds.map(tagId => ({ apartmentId, tagId })),
      }),
    ])
  }

  /**
   * Получает список городов с апартаментами
   */
  async getCities(): Promise<{ city: string; count: number }[]> {
    const cities = await prisma.apartment.groupBy({
      by: ['city'],
      where: { status: 'PUBLISHED' as PrismaApartmentStatus },
      _count: true,
      orderBy: { _count: { city: 'desc' } },
    })

    return cities.map(c => ({ city: c.city, count: c._count }))
  }

  /**
   * Обновляет рейтинг апартамента (вызывается после добавления отзыва)
   */
  async updateRating(apartmentId: string) {
    const stats = await prisma.review.aggregate({
      where: {
        apartmentId,
        isPublished: true,
      },
      _avg: { rating: true },
      _count: true,
    })

    await prisma.apartment.update({
      where: { id: apartmentId },
      data: {
        averageRating: stats._avg.rating,
        reviewCount: stats._count,
      },
    })
  }

  /**
   * Получает похожие апартаменты
   */
  async getSimilarApartments(apartmentId: string, limit: number = 4): Promise<Apartment[]> {
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { city: true, bedrooms: true, pricing: { select: { basePrice: true } } },
    })

    if (!apartment) return []

    const priceRange = apartment.pricing?.basePrice || 10000
    const minPrice = priceRange * 0.7
    const maxPrice = priceRange * 1.3

    const similar = await prisma.apartment.findMany({
      where: {
        id: { not: apartmentId },
        status: 'PUBLISHED' as PrismaApartmentStatus,
        OR: [
          { city: apartment.city },
          { bedrooms: apartment.bedrooms },
          {
            pricing: {
              basePrice: { gte: minPrice, lte: maxPrice },
            },
          },
        ],
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        pricing: true,
      },
      take: limit,
    })

    return similar as unknown as Apartment[]
  }

  private getFullInclude() {
    return {
      images: { orderBy: { order: 'asc' as const } },
      amenities: { include: { amenity: true } },
      rules: true,
      pricing: true,
      seasonalPrices: { where: { isActive: true } },
      weekdayPrices: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    }
  }
}

export const apartmentService = new ApartmentService()
