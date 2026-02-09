'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Star,
  Building2,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
} from 'recharts'

interface OwnerStats {
  overview: {
    totalRevenue: number
    totalBookings: number
    completedBookings: number
    averageRating: number
    totalReviews: number
    apartmentsCount: number
  }
  revenueByMonth: {
    period: string
    revenue: number
    bookings: number
  }[]
  occupancyByMonth: {
    period: string
    occupancy: number
    bookedNights: number
    totalNights: number
  }[]
  apartmentStats: {
    id: string
    title: string
    status: string
    revenue: number
    bookings: number
    averageRating: number | null
    reviewCount: number
  }[]
}

export default function AccountStatsPage() {
  const router = useRouter()
  const { user, accessToken, isAuthenticated, isLoading: authLoading } = useAuth()

  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonths, setSelectedMonths] = useState(12)

  // Проверка авторизации
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/account/stats')
    }
  }, [authLoading, isAuthenticated, router])

  // Проверка роли
  useEffect(() => {
    if (user && user.role !== 'OWNER' && user.role !== 'TECH_ADMIN') {
      router.push('/account')
    }
  }, [user, router])

  // Загрузка статистики
  useEffect(() => {
    if (!accessToken) return

    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/account/stats?months=${selectedMonths}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        const data = await res.json()
        
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [accessToken, selectedMonths])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Нет данных</h2>
        <p className="text-gray-500">
          Добавьте апартаменты и получите бронирования для просмотра статистики
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-primary" />
          Статистика доходности
        </h1>

        <select
          className="px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600"
          value={selectedMonths}
          onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
        >
          <option value={3}>3 месяца</option>
          <option value={6}>6 месяцев</option>
          <option value={12}>12 месяцев</option>
        </select>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Общий доход</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.overview.totalRevenue)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Бронирований</span>
          </div>
          <p className="text-2xl font-bold">
            {stats.overview.completedBookings}
            <span className="text-sm font-normal text-gray-500 ml-1">
              / {stats.overview.totalBookings}
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Средний рейтинг</span>
          </div>
          <p className="text-2xl font-bold">
            {stats.overview.averageRating.toFixed(1)}
            <span className="text-sm font-normal text-gray-500 ml-1">
              ({stats.overview.totalReviews} отзывов)
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Апартаментов</span>
          </div>
          <p className="text-2xl font-bold">{stats.overview.apartmentsCount}</p>
        </motion.div>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Доход по месяцам */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Доход по месяцам
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'Доход']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]}
                  name="Доход"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Загрузка по месяцам */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Загрузка (%)
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.occupancyByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'occupancy') return [`${value}%`, 'Загрузка']
                    return [value, name]
                  }}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.2}
                  name="occupancy"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Статистика по апартаментам */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-500" />
          Статистика по апартаментам
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b dark:border-gray-700">
                <th className="pb-3 font-medium">Апартамент</th>
                <th className="pb-3 font-medium text-right">Доход</th>
                <th className="pb-3 font-medium text-right">Бронирований</th>
                <th className="pb-3 font-medium text-right">Рейтинг</th>
                <th className="pb-3 font-medium text-center">Статус</th>
              </tr>
            </thead>
            <tbody>
              {stats.apartmentStats.map((apt) => (
                <tr 
                  key={apt.id} 
                  className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-4">
                    <p className="font-medium truncate max-w-xs">{apt.title}</p>
                  </td>
                  <td className="py-4 text-right text-green-600 font-medium">
                    {formatCurrency(apt.revenue)}
                  </td>
                  <td className="py-4 text-right">{apt.bookings}</td>
                  <td className="py-4 text-right">
                    {apt.averageRating ? (
                      <span className="flex items-center justify-end gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        {apt.averageRating.toFixed(1)}
                        <span className="text-gray-400 text-sm">({apt.reviewCount})</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-4 text-center">
                    <span className={`
                      inline-block px-2 py-1 rounded-full text-xs font-medium
                      ${apt.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : ''}
                      ${apt.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' : ''}
                      ${apt.status === 'HIDDEN' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${apt.status === 'ARCHIVED' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {apt.status === 'PUBLISHED' && 'Активен'}
                      {apt.status === 'DRAFT' && 'Черновик'}
                      {apt.status === 'HIDDEN' && 'Скрыт'}
                      {apt.status === 'ARCHIVED' && 'В архиве'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {stats.apartmentStats.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            У вас пока нет апартаментов
          </p>
        )}
      </motion.div>
    </div>
  )
}
