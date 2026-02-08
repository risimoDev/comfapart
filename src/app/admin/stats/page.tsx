'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  BuildingOffice2Icon,
  StarIcon,
} from '@heroicons/react/24/outline'

// Интерфейс для данных из API
interface ApiStatsData {
  success: boolean
  data: {
    overview: {
      totalApartments: number
      publishedApartments: number
      totalBookings: number
      pendingBookings: number
      totalRevenue: number
      thisMonthRevenue: number
      averageRating: number
    }
    revenueByMonth: { period: string; revenue: number; bookings: number }[]
    bookingsByStatus: Record<string, number>
    topApartments: { apartmentId: string; title: string; _sum: { totalPrice: number }; _count: number }[]
  }
}

export default function StatsPage() {
  const [stats, setStats] = useState<ApiStatsData['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchStats()
  }, [period, selectedYear])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/stats?period=${period}&year=${selectedYear}`)
      if (response.ok) {
        const result: ApiStatsData = await response.json()
        if (result.success && result.data) {
          setStats(result.data)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/admin/stats/export?format=${format}&period=${period}&year=${selectedYear}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `stats_${period}_${selectedYear}.${format}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <ChartBarIcon className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-lg">Нет данных для отображения</p>
        <p className="text-sm">Создайте апартаменты и бронирования для просмотра статистики</p>
      </div>
    )
  }

  const maxRevenue = stats.revenueByMonth.length > 0 
    ? Math.max(...stats.revenueByMonth.map(m => Number(m.revenue) || 0))
    : 0

  // Преобразуем bookingsByStatus в массив для отображения
  const bookingStatusArray = Object.entries(stats.bookingsByStatus || {}).map(([status, count]) => ({
    status,
    count: count as number
  }))

  const statusLabels: Record<string, { label: string; color: string }> = {
    COMPLETED: { label: 'Завершено', color: 'bg-green-500' },
    CONFIRMED: { label: 'Подтверждено', color: 'bg-blue-500' },
    PAID: { label: 'Оплачено', color: 'bg-emerald-500' },
    PENDING: { label: 'Ожидает', color: 'bg-yellow-500' },
    CANCELED: { label: 'Отменено', color: 'bg-red-500' },
    REFUNDED: { label: 'Возврат', color: 'bg-orange-500' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Статистика</h1>
          <p className="text-gray-500 mt-1">Аналитика и отчёты по бизнесу</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Period selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  period === p ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : p === 'quarter' ? 'Квартал' : 'Год'}
              </button>
            ))}
          </div>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Export */}
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <DocumentArrowDownIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm">CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Общая выручка</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(Number(stats.overview.totalRevenue) || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            За этот месяц: {formatCurrency(Number(stats.overview.thisMonthRevenue) || 0)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Бронирования</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.overview.totalBookings}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Ожидают подтверждения: {stats.overview.pendingBookings}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Апартаменты</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.overview.totalApartments}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BuildingOffice2Icon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Опубликовано: {stats.overview.publishedApartments}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Средний рейтинг</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.overview.averageRating ? stats.overview.averageRating.toFixed(1) : '—'}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <StarIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            На основе отзывов
          </p>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Выручка по месяцам</h3>
          {stats.revenueByMonth.length > 0 ? (
            <div className="h-64 flex items-end justify-between gap-2">
              {stats.revenueByMonth.map((item, idx) => {
                const revenue = Number(item.revenue) || 0
                const height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs text-gray-500 mb-1">
                        {(revenue / 1000).toFixed(0)}k
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: idx * 0.05, duration: 0.5 }}
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md min-h-[4px]"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{item.period}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Нет данных за выбранный период
            </div>
          )}
        </div>

        {/* Top Apartments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Топ апартаментов по доходу</h3>
          {stats.topApartments.length > 0 ? (
            <div className="space-y-4">
              {stats.topApartments.map((apt, idx) => (
                <div key={apt.apartmentId} className="flex items-center gap-4">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{apt.title}</p>
                    <p className="text-xs text-gray-500">{apt._count} бронирований</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(Number(apt._sum.totalPrice) || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Нет данных о бронированиях
            </div>
          )}
        </div>
      </div>

      {/* Booking Statuses */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статусы бронирований</h3>
        {bookingStatusArray.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {bookingStatusArray.map((item) => {
              const config = statusLabels[item.status] || { label: item.status, color: 'bg-gray-500' }
              return (
                <div key={item.status} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${config.color} mx-auto mb-2`} />
                  <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                  <p className="text-sm text-gray-500">{config.label}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            Нет данных о бронированиях
          </div>
        )}
      </div>
    </div>
  )
}
