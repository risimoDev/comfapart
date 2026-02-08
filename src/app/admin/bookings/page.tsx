import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@prisma/client'
import { 
  Search, 
  Filter,
  Eye,
  Check,
  X,
  Clock,
  Calendar,
  MapPin
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button, Badge, BookingStatusBadge } from '@/components/ui'

interface SearchParams {
  status?: string
  search?: string
  page?: string
}

async function getBookings(searchParams: SearchParams) {
  const { status, search, page = '1' } = searchParams
  const pageSize = 15
  const currentPage = parseInt(page)

  const where: any = {}

  if (status) {
    where.status = status
  }

  if (search) {
    where.OR = [
      { bookingNumber: { contains: search, mode: 'insensitive' } },
      { guestName: { contains: search, mode: 'insensitive' } },
      { guestEmail: { contains: search, mode: 'insensitive' } },
      { apartment: { title: { contains: search, mode: 'insensitive' } } }
    ]
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        apartment: {
          select: { id: true, title: true, slug: true, city: true }
        },
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize
    }),
    prisma.booking.count({ where })
  ])

  return {
    bookings,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage
  }
}

// Подсчет по статусам
async function getStatusCounts() {
  const statuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELED, BookingStatus.COMPLETED]
  const counts: Record<string, number> = {}

  for (const status of statuses) {
    counts[status] = await prisma.booking.count({ where: { status } })
  }

  counts.all = await prisma.booking.count()

  return counts
}

export default async function AdminBookingsPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  const [{ bookings, total, totalPages, currentPage }, statusCounts] = await Promise.all([
    getBookings(searchParams),
    getStatusCounts()
  ])

  const statusTabs = [
    { value: '', label: 'Все', count: statusCounts.all },
    { value: 'PENDING', label: 'Ожидают', count: statusCounts.PENDING },
    { value: 'CONFIRMED', label: 'Подтверждены', count: statusCounts.CONFIRMED },
    { value: 'COMPLETED', label: 'Завершены', count: statusCounts.COMPLETED },
    { value: 'CANCELED', label: 'Отменены', count: statusCounts.CANCELED },
  ]

  return (
    <div className="p-8">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Бронирования</h1>
        <p className="text-gray-500">Управление бронированиями</p>
      </div>

      {/* Табы статусов */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/bookings${tab.value ? `?status=${tab.value}` : ''}`}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
              (searchParams.status || '') === tab.value
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              (searchParams.status || '') === tab.value
                ? 'bg-white/20'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Поиск */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 shadow-sm">
        <form className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchParams.search}
                placeholder="Поиск по номеру, имени гостя или апартаментам..."
                className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <Button type="submit" variant="secondary">
            <Search className="w-4 h-4 mr-2" />
            Найти
          </Button>
        </form>
      </div>

      {/* Список бронирований */}
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-wrap items-start gap-4">
              {/* Основная информация */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm text-primary">
                    #{booking.bookingNumber}
                  </span>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <h3 className="font-semibold mb-1">
                  <Link 
                    href={`/apartments/${booking.apartment.slug}`}
                    className="hover:text-primary"
                    target="_blank"
                  >
                    {booking.apartment.title}
                  </Link>
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {booking.apartment.city}
                </p>
              </div>

              {/* Даты */}
              <div className="w-48">
                <p className="text-sm text-gray-500 mb-1">Даты</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {formatDate(booking.checkIn)} — {formatDate(booking.checkOut)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {booking.guests} гостей
                </p>
              </div>

              {/* Гость */}
              <div className="w-48">
                <p className="text-sm text-gray-500 mb-1">Гость</p>
                <p className="font-medium">
                  {booking.contactName || `${booking.user?.firstName} ${booking.user?.lastName}`}
                </p>
                <p className="text-sm text-gray-500">
                  {booking.contactEmail || booking.user?.email}
                </p>
              </div>

              {/* Стоимость */}
              <div className="w-32 text-right">
                <p className="text-sm text-gray-500 mb-1">Стоимость</p>
                <p className="text-xl font-bold">
                  {formatPrice(Number(booking.totalPrice), booking.currency)}
                </p>
              </div>

              {/* Действия */}
              <div className="flex flex-col gap-2">
                <Link href={`/admin/bookings/${booking.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Подробнее
                  </Button>
                </Link>
                
                {booking.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <form action={`/api/admin/bookings/${booking.id}/confirm`} method="POST">
                      <Button size="sm" type="submit">
                        <Check className="w-4 h-4" />
                      </Button>
                    </form>
                    <form action={`/api/admin/bookings/${booking.id}/cancel`} method="POST">
                      <Button variant="danger" size="sm" type="submit">
                        <X className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Дополнительная информация */}
            {booking.guestComment && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Комментарий:</p>
                <p className="text-sm">{booking.guestComment}</p>
              </div>
            )}

            {/* Время */}
            <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Создано: {formatDate(booking.createdAt)}
              </span>
            </div>
          </div>
        ))}

        {bookings.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Бронирования не найдены</p>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1
            return (
              <Link
                key={pageNum}
                href={`/admin/bookings?${new URLSearchParams({
                  ...searchParams,
                  page: String(pageNum)
                })}`}
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                  pageNum === currentPage
                    ? 'bg-primary text-white'
                    : 'border hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
