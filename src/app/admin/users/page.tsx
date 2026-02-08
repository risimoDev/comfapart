import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { 
  Search, 
  Filter,
  MoreVertical,
  Shield,
  Ban,
  Mail,
  Phone,
  Calendar,
  Star
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Button, Badge } from '@/components/ui'

interface SearchParams {
  role?: string
  search?: string
  page?: string
}

async function getUsers(searchParams: SearchParams) {
  const { role, search, page = '1' } = searchParams
  const pageSize = 20
  const currentPage = parseInt(page)

  const where: any = {}

  if (role) {
    where.role = role
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true,
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize
    }),
    prisma.user.count({ where })
  ])

  return {
    users,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage
  }
}

function RoleBadge({ role }: { role: string }) {
  const roleMap: Record<string, { label: string; color: string }> = {
    'TECH_ADMIN': { label: 'Тех.админ', color: 'bg-red-100 text-red-600' },
    'OWNER': { label: 'Владелец', color: 'bg-blue-100 text-blue-600' },
    'USER': { label: 'Пользователь', color: 'bg-gray-100 text-gray-600' }
  }

  const config = roleMap[role] || { label: role, color: 'bg-gray-100 text-gray-600' }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  const { users, total, totalPages, currentPage } = await getUsers(searchParams)

  return (
    <div className="p-8">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Пользователи</h1>
        <p className="text-gray-500">Всего: {total}</p>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 shadow-sm">
        <form className="flex flex-wrap gap-4">
          {/* Поиск */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchParams.search}
                placeholder="Поиск по имени, email или телефону..."
                className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Роль */}
          <select
            name="role"
            defaultValue={searchParams.role}
            className="px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Все роли</option>
            <option value="USER">Пользователи</option>
            <option value="MANAGER">Менеджеры</option>
            <option value="ADMIN">Админы</option>
          </select>

          <Button type="submit" variant="secondary">
            <Filter className="w-4 h-4 mr-2" />
            Применить
          </Button>
        </form>
      </div>

      {/* Таблица */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Пользователь</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Контакты</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Роль</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Активность</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Регистрация</th>
              <th className="text-right px-6 py-4 font-medium text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <span className="font-medium text-primary">
                          {user.firstName?.[0] || 'U'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.status === 'BLOCKED' && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <Ban className="w-3 h-3" /> Заблокирован
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {user.email}
                    </p>
                    {user.phone && (
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {user.phone}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {user._count.bookings} бронирований
                    </p>
                    <p className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gray-400" />
                      {user._count.reviews} отзывов
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Пользователи не найдены</p>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1
            return (
              <Link
                key={pageNum}
                href={`/admin/users?${new URLSearchParams({
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
