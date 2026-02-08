import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import {
  Building2,
  Calendar,
  Users,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star,
  AlertTriangle
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'

// Получение статистики
async function getStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalApartments,
    publishedApartments,
    totalBookings,
    monthBookings,
    lastMonthBookings,
    totalUsers,
    monthUsers,
    pendingBookings,
    recentBookings,
    topApartments,
    recentReviews
  ] = await Promise.all([
    // Всего апартаментов
    prisma.apartment.count(),
    // Опубликованных
    prisma.apartment.count({ where: { status: 'PUBLISHED' } }),
    // Всего бронирований
    prisma.booking.count(),
    // Бронирований за месяц
    prisma.booking.count({
      where: {
        createdAt: { gte: startOfMonth }
      }
    }),
    // Бронирований за прошлый месяц
    prisma.booking.count({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
      }
    }),
    // Всего пользователей
    prisma.user.count(),
    // Новых пользователей за месяц
    prisma.user.count({
      where: { createdAt: { gte: startOfMonth } }
    }),
    // Ожидающих подтверждения
    prisma.booking.count({
      where: { status: 'PENDING' }
    }),
    // Последние бронирования
    prisma.booking.findMany({
      include: {
        apartment: { select: { title: true, slug: true } },
        user: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    // Топ апартаментов
    prisma.apartment.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        _count: { select: { bookings: true } }
      },
      orderBy: { bookings: { _count: 'desc' } },
      take: 5
    }),
    // Последние отзывы
    prisma.review.findMany({
      include: {
        apartment: { select: { title: true, slug: true } },
        user: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ])

  // Выручка за месяц
  const monthRevenue = await prisma.booking.aggregate({
    where: {
      createdAt: { gte: startOfMonth },
      status: { in: ['CONFIRMED', 'COMPLETED'] }
    },
    _sum: { totalPrice: true }
  })

  const lastMonthRevenue = await prisma.booking.aggregate({
    where: {
      createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      status: { in: ['CONFIRMED', 'COMPLETED'] }
    },
    _sum: { totalPrice: true }
  })

  return {
    apartments: {
      total: totalApartments,
      published: publishedApartments
    },
    bookings: {
      total: totalBookings,
      month: monthBookings,
      lastMonth: lastMonthBookings,
      pending: pendingBookings
    },
    users: {
      total: totalUsers,
      month: monthUsers
    },
    revenue: {
      month: Number(monthRevenue._sum.totalPrice) || 0,
      lastMonth: Number(lastMonthRevenue._sum.totalPrice) || 0
    },
    recentBookings,
    topApartments,
    recentReviews
  }
}

// Компонент карточки статистики
function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color 
}: { 
  title: string
  value: string | number
  change?: number
  icon: any
  color: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{Math.abs(change)}% к прошлому месяцу</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  const bookingsChange = stats.bookings.lastMonth > 0
    ? Math.round(((stats.bookings.month - stats.bookings.lastMonth) / stats.bookings.lastMonth) * 100)
    : 0

  const revenueChange = stats.revenue.lastMonth > 0
    ? Math.round(((stats.revenue.month - stats.revenue.lastMonth) / stats.revenue.lastMonth) * 100)
    : 0

  return (
    <div className="p-8">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Дашборд</h1>
        <p className="text-gray-500">Обзор ключевых показателей</p>
      </div>

      {/* Карточки статистики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Апартаменты"
          value={stats.apartments.published}
          icon={Building2}
          color="bg-blue-500"
        />
        <StatCard
          title="Бронирования (месяц)"
          value={stats.bookings.month}
          change={bookingsChange}
          icon={Calendar}
          color="bg-green-500"
        />
        <StatCard
          title="Пользователи"
          value={stats.users.total}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          title="Выручка (месяц)"
          value={formatPrice(stats.revenue.month, 'RUB')}
          change={revenueChange}
          icon={DollarSign}
          color="bg-primary"
        />
      </div>

      {/* Предупреждения */}
      {stats.bookings.pending > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-8 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <div>
            <p className="font-medium">Требуют внимания</p>
            <p className="text-sm text-gray-600">
              {stats.bookings.pending} бронирований ожидают подтверждения
            </p>
          </div>
          <Link
            href="/admin/bookings?status=PENDING"
            className="ml-auto text-primary hover:underline"
          >
            Посмотреть
          </Link>
        </div>
      )}

      {/* Основной контент */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Последние бронирования */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Последние бронирования</h2>
            <Link href="/admin/bookings" className="text-primary text-sm hover:underline">
              Все бронирования
            </Link>
          </div>

          <div className="space-y-4">
            {stats.recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className={`w-2 h-2 rounded-full ${
                  booking.status === 'CONFIRMED' ? 'bg-green-500' :
                  booking.status === 'PENDING' ? 'bg-yellow-500' :
                  booking.status === 'CANCELED' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{booking.apartment.title}</p>
                  <p className="text-sm text-gray-500">
                    {booking.user?.firstName} {booking.user?.lastName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(Number(booking.totalPrice), 'RUB')}</p>
                  <p className="text-sm text-gray-500">{formatDate(booking.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Топ апартаментов */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Топ апартаментов</h2>
            <Link href="/admin/apartments" className="text-primary text-sm hover:underline">
              Все объекты
            </Link>
          </div>

          <div className="space-y-4">
            {stats.topApartments.map((apartment, index) => (
              <div key={apartment.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/admin/apartments/${apartment.id}`}
                    className="font-medium hover:text-primary truncate block"
                  >
                    {apartment.title}
                  </Link>
                </div>
                <div className="text-right">
                  <p className="font-medium">{apartment._count.bookings}</p>
                  <p className="text-sm text-gray-500">бронирований</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Последние отзывы */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Последние отзывы</h2>
            <Link href="/admin/reviews" className="text-primary text-sm hover:underline">
              Все отзывы
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.recentReviews.map((review) => (
              <div key={review.id} className="p-4 rounded-xl border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {review.comment}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {review.user.firstName} {review.user.lastName}
                  </span>
                  <Link
                    href={`/apartments/${review.apartment.slug}`}
                    className="text-primary hover:underline"
                  >
                    {review.apartment.title}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
