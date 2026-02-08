import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ApartmentCard } from '@/components/apartments'
import { ApartmentCardSkeleton } from '@/components/ui'
import { Prisma } from '@prisma/client'

interface SearchParams {
  city?: string
  category?: string
  checkIn?: string
  checkOut?: string
  guests?: string
  minPrice?: string
  maxPrice?: string
  amenities?: string
  rooms?: string
  sort?: string
  page?: string
}

interface ApartmentsPageProps {
  searchParams: SearchParams
}

async function getApartments(searchParams: SearchParams) {
  const {
    city,
    category,
    checkIn,
    checkOut,
    guests,
    rooms,
    sort = 'createdAt_desc',
    page = '1'
  } = searchParams

  const where: Prisma.ApartmentWhereInput = {
    status: 'PUBLISHED'
  }

  // Фильтр по городу (по строковому полю)
  if (city) {
    where.city = { contains: city, mode: 'insensitive' }
  }

  // Фильтр по категории
  if (category) {
    where.categories = {
      some: { category: { slug: category } }
    }
  }

  // Фильтр по гостям
  if (guests) {
    where.maxGuests = { gte: parseInt(guests) }
  }

  // Фильтр по комнатам
  if (rooms) {
    where.rooms = parseInt(rooms)
  }

  // Фильтр по доступности
  if (checkIn && checkOut) {
    const startDate = new Date(checkIn)
    const endDate = new Date(checkOut)

    where.NOT = {
      OR: [
        {
          blockedDates: {
            some: {
              date: {
                gte: startDate,
                lte: endDate
              }
            }
          }
        },
        {
          bookings: {
            some: {
              status: { in: ['PENDING', 'CONFIRMED', 'PAID'] },
              checkIn: { lt: endDate },
              checkOut: { gt: startDate }
            }
          }
        }
      ]
    }
  }

  // Сортировка
  let orderBy: Prisma.ApartmentOrderByWithRelationInput = { createdAt: 'desc' }
  
  switch (sort) {
    case 'price_asc':
      orderBy = { pricing: { basePrice: 'asc' } }
      break
    case 'price_desc':
      orderBy = { pricing: { basePrice: 'desc' } }
      break
    case 'rating_desc':
      orderBy = { averageRating: 'desc' }
      break
    case 'createdAt_desc':
    default:
      orderBy = { createdAt: 'desc' }
  }

  const pageSize = 12
  const currentPage = parseInt(page)
  const skip = (currentPage - 1) * pageSize

  const [apartments, total] = await Promise.all([
    prisma.apartment.findMany({
      where,
      include: {
        images: { orderBy: { order: 'asc' }, take: 5 },
        pricing: true,
        reviews: { select: { rating: true } },
        tags: { include: { tag: true } },
        amenities: { include: { amenity: true }, take: 5 }
      },
      orderBy,
      skip,
      take: pageSize
    }),
    prisma.apartment.count({ where })
  ])

  return {
    apartments,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage
  }
}

async function getFilterOptions() {
  const [categories, amenities, priceRange] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: 'asc' }
    }),
    prisma.amenity.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.pricing.aggregate({
      _min: { basePrice: true },
      _max: { basePrice: true }
    })
  ])

  return {
    categories,
    amenities,
    priceRange: {
      min: priceRange._min.basePrice || 0,
      max: priceRange._max.basePrice || 100000
    }
  }
}

// Компонент списка
async function ApartmentsList({ searchParams }: { searchParams: SearchParams }) {
  const { apartments, total, totalPages, currentPage } = await getApartments(searchParams)

  if (apartments.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🏠</div>
        <h3 className="text-xl font-semibold mb-2">Ничего не найдено</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Попробуйте изменить параметры поиска
        </p>
        <Link 
          href="/apartments"
          className="text-primary hover:underline"
        >
          Сбросить фильтры
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Результаты */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Найдено {total} {total === 1 ? 'объект' : total < 5 ? 'объекта' : 'объектов'}
        </p>
      </div>

      {/* Сетка */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apartments.map((apartment, index) => {
          const avgRating = apartment.reviews.length > 0
            ? apartment.reviews.reduce((sum, r) => sum + r.rating, 0) / apartment.reviews.length
            : 0

          return (
            <div
              key={apartment.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ApartmentCard
                apartment={{
                  id: apartment.id,
                  slug: apartment.slug,
                  title: apartment.title,
                  shortDescription: apartment.shortDescription,
                  city: apartment.city,
                  district: apartment.district,
                  rooms: apartment.rooms,
                  maxGuests: apartment.maxGuests,
                  pricing: apartment.pricing,
                  images: apartment.images,
                  rating: avgRating,
                  reviewsCount: apartment.reviews.length,
                  tags: apartment.tags
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {currentPage > 1 && (
            <Link
              href={`/apartments?page=${currentPage - 1}`}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Назад
            </Link>
          )}

          {[...Array(Math.min(totalPages, 7))].map((_, i) => {
            let pageNum: number
            if (totalPages <= 7) {
              pageNum = i + 1
            } else if (currentPage <= 4) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 3) {
              pageNum = totalPages - 6 + i
            } else {
              pageNum = currentPage - 3 + i
            }

            const isActive = pageNum === currentPage

            return (
              <Link
                key={pageNum}
                href={`/apartments?page=${pageNum}`}
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'border hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {pageNum}
              </Link>
            )
          })}

          {currentPage < totalPages && (
            <Link
              href={`/apartments?page=${currentPage + 1}`}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Далее
            </Link>
          )}
        </div>
      )}
    </>
  )
}

export default async function ApartmentsPage({ searchParams }: ApartmentsPageProps) {
  const filterOptions = await getFilterOptions()

  // Определяем заголовок
  let title = 'Апартаменты в Перми'
  if (searchParams.category) {
    const category = filterOptions.categories.find(c => c.slug === searchParams.category)
    if (category) title = `${category.name} в Перми`
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Шапка */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-display font-bold mb-6">{title}</h1>
          
          {/* Быстрые фильтры по категориям */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/apartments"
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                !searchParams.category
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Все
            </Link>
            {filterOptions.categories.map(category => (
              <Link
                key={category.id}
                href={`/apartments?category=${category.slug}`}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  searchParams.category === category.slug
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="container mx-auto px-4 py-8">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <ApartmentCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <ApartmentsList searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}

export const metadata = {
  title: 'Апартаменты в Перми',
  description: 'Найдите идеальные апартаменты для вашего отдыха в Перми. Большой выбор проверенных объектов с удобным бронированием.'
}
