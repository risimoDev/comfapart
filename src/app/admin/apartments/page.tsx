'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

interface Apartment {
  id: string
  title: string
  slug: string
  city: string
  address: string
  status: 'PUBLISHED' | 'DRAFT' | 'HIDDEN' | 'ARCHIVED'
  averageRating: number | null
  reviewCount: number
  createdAt: string
  pricing?: {
    basePrice: number
    currency: string
  }
  images: { url: string; isPrimary: boolean }[]
  _count: {
    bookings: number
  }
}

interface ApartmentsResponse {
  success: boolean
  apartments: Apartment[]
  total: number
  page: number
  totalPages: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PUBLISHED: { label: 'Опубликован', color: 'text-green-700', bg: 'bg-green-100' },
  DRAFT: { label: 'Черновик', color: 'text-gray-700', bg: 'bg-gray-100' },
  HIDDEN: { label: 'Скрыт', color: 'text-orange-700', bg: 'bg-orange-100' },
  ARCHIVED: { label: 'В архиве', color: 'text-red-700', bg: 'bg-red-100' },
}

export default function AdminApartmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken } = useAuth()
  
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchApartments()
  }, [searchParams])

  const fetchApartments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const page = searchParams.get('page') || '1'
      const status = searchParams.get('status') || ''
      const searchQuery = searchParams.get('search') || ''
      
      params.set('page', page)
      params.set('limit', '10')
      if (status) params.set('status', status)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/admin/apartments?${params.toString()}`, {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        }
      })
      if (response.ok) {
        const data: ApartmentsResponse = await response.json()
        setApartments(data.apartments || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      showNotification('error', 'Ошибка загрузки апартаментов')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const updateFilters = (newSearch?: string, newStatus?: string) => {
    const params = new URLSearchParams()
    const searchValue = newSearch !== undefined ? newSearch : search
    const statusValue = newStatus !== undefined ? newStatus : statusFilter
    
    if (searchValue) params.set('search', searchValue)
    if (statusValue) params.set('status', statusValue)
    params.set('page', '1')
    
    router.push(`/admin/apartments?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters(search, statusFilter)
  }

  const handleToggleVisibility = async (apartment: Apartment) => {
    setActionLoading(apartment.id)
    try {
      const newStatus = apartment.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED'
      
      const response = await fetch(`/api/admin/apartments/${apartment.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        showNotification('success', newStatus === 'HIDDEN' ? 'Объект скрыт от пользователей' : 'Объект опубликован')
        fetchApartments()
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Ошибка изменения статуса')
      }
    } catch (error) {
      showNotification('error', 'Ошибка сети')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!apartmentToDelete) return
    
    setActionLoading(apartmentToDelete.id)
    try {
      const response = await fetch(`/api/admin/apartments/${apartmentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        }
      })

      if (response.ok) {
        showNotification('success', 'Объект удалён')
        setShowDeleteModal(false)
        setApartmentToDelete(null)
        fetchApartments()
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Ошибка удаления')
      }
    } catch (error) {
      showNotification('error', 'Ошибка сети')
    } finally {
      setActionLoading(null)
    }
  }

  const formatPrice = (price: number, currency: string = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`/admin/apartments?${params.toString()}`)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Апартаменты</h1>
          <p className="text-gray-500 mt-1">Всего объектов: {total}</p>
        </div>
        <Link
          href="/admin/apartments/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          Добавить объект
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: 'Все', icon: BuildingOffice2Icon },
            { value: 'PUBLISHED', label: 'Опубликованные', color: 'green' },
            { value: 'DRAFT', label: 'Черновики', color: 'gray' },
            { value: 'HIDDEN', label: 'Скрытые', color: 'orange' },
            { value: 'ARCHIVED', label: 'В архиве', color: 'red' },
          ].map((tab) => {
            const isActive = statusFilter === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value)
                  updateFilters(search, tab.value)
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.icon && <tab.icon className="h-4 w-4" />}
                {tab.label}
                {tab.color && !isActive && (
                  <span className={`w-2 h-2 rounded-full bg-${tab.color}-500`} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию или адресу..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              updateFilters(search, e.target.value)
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все статусы</option>
            <option value="PUBLISHED">Опубликован</option>
            <option value="DRAFT">Черновик</option>
            <option value="HIDDEN">Скрыт</option>
            <option value="ARCHIVED">В архиве</option>
          </select>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <FunnelIcon className="h-5 w-5" />
            Применить
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : apartments.length === 0 ? (
          <div className="text-center py-20">
            <BuildingOffice2Icon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Апартаменты не найдены</p>
            <Link
              href="/admin/apartments/new"
              className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              Добавить первый объект
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Объект</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Город</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Цена</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Рейтинг</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Брони</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Статус</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {apartments.map((apartment) => {
                  const statusConfig = STATUS_CONFIG[apartment.status] || STATUS_CONFIG.DRAFT
                  const primaryImage = apartment.images?.find(img => img.isPrimary) || apartment.images?.[0]

                  return (
                    <tr key={apartment.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {primaryImage ? (
                              <img
                                src={primaryImage.url}
                                alt={apartment.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BuildingOffice2Icon className="h-6 w-6 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/admin/apartments/${apartment.id}/edit`}
                              className="font-medium text-gray-900 hover:text-blue-600 transition"
                            >
                              {apartment.title}
                            </Link>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPinIcon className="h-3 w-3" />
                              {apartment.address}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{apartment.city}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {apartment.pricing 
                          ? formatPrice(apartment.pricing.basePrice, apartment.pricing.currency)
                          : '—'
                        }
                      </td>
                      <td className="px-6 py-4">
                        {apartment.averageRating ? (
                          <div className="flex items-center gap-1">
                            <StarSolid className="h-4 w-4 text-yellow-400" />
                            <span className="font-medium">{apartment.averageRating.toFixed(1)}</span>
                            <span className="text-gray-400 text-sm">({apartment.reviewCount})</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{apartment._count?.bookings || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle visibility */}
                          <button
                            onClick={() => handleToggleVisibility(apartment)}
                            disabled={actionLoading === apartment.id}
                            className={`p-2 rounded-lg transition ${
                              apartment.status === 'PUBLISHED'
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-green-600 hover:bg-green-50'
                            } disabled:opacity-50`}
                            title={apartment.status === 'PUBLISHED' ? 'Скрыть от пользователей' : 'Опубликовать'}
                          >
                            {apartment.status === 'PUBLISHED' ? (
                              <EyeSlashIcon className="h-5 w-5" />
                            ) : (
                              <EyeIcon className="h-5 w-5" />
                            )}
                          </button>

                          {/* View on site */}
                          {apartment.status === 'PUBLISHED' && (
                            <Link
                              href={`/apartments/${apartment.slug}`}
                              target="_blank"
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                              title="Открыть на сайте"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </Link>
                          )}

                          {/* Edit */}
                          <Link
                            href={`/admin/apartments/${apartment.id}/edit`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Редактировать"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setApartmentToDelete(apartment)
                              setShowDeleteModal(true)
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Удалить"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`w-10 h-10 rounded-lg font-medium transition ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && apartmentToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Удалить объект?</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    Это действие нельзя отменить. Все связанные данные будут удалены.
                  </p>
                </div>
                <p className="text-gray-600">
                  Вы уверены, что хотите удалить объект <strong>&quot;{apartmentToDelete.title}&quot;</strong>?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === apartmentToDelete.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                >
                  {actionLoading === apartmentToDelete.id ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
