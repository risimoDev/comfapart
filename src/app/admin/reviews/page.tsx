'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  StarIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  ClockIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

interface Review {
  id: string
  apartmentId: string
  userId: string
  rating: number
  title: string | null
  comment: string
  cleanlinessRating: number | null
  locationRating: number | null
  valueRating: number | null
  communicationRating: number | null
  isApproved: boolean
  isPublished: boolean
  ownerReply: string | null
  ownerReplyDate: string | null
  createdAt: string
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  apartment: {
    id: string
    title: string
    slug: string
    images?: string[]
  }
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ReviewStats {
  total: number
  pending: number
  approved: number
  rejected: number
  averageRating: number
}

export default function ReviewsPage() {
  const { accessToken } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [filterStatus, filterRating])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterRating) params.set('rating', filterRating.toString())

      const response = await fetch(`/api/admin/reviews?${params}`, {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        }
      })
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (review: Review) => {
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          action: 'approve',
          id: review.id,
        }),
      })

      if (response.ok) {
        fetchReviews()
      }
    } catch (error) {
      console.error('Ошибка:', error)
    }
  }

  const handleReject = async (review: Review) => {
    if (!confirm('Отклонить этот отзыв?')) return

    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          action: 'reject',
          id: review.id,
        }),
      })

      if (response.ok) {
        fetchReviews()
      }
    } catch (error) {
      console.error('Ошибка:', error)
    }
  }

  const handleDelete = async (review: Review) => {
    if (!confirm('Удалить этот отзыв? Это действие нельзя отменить.')) return

    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          action: 'delete',
          id: review.id,
        }),
      })

      if (response.ok) {
        fetchReviews()
      }
    } catch (error) {
      console.error('Ошибка:', error)
    }
  }

  const openReplyModal = (review: Review) => {
    setSelectedReview(review)
    setReplyText(review.ownerReply || '')
    setShowReplyModal(true)
  }

  const handleReply = async () => {
    if (!selectedReview) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          action: 'reply',
          id: selectedReview.id,
          reply: replyText.trim() || null,
        }),
      })

      if (response.ok) {
        setShowReplyModal(false)
        fetchReviews()
      }
    } catch (error) {
      console.error('Ошибка:', error)
    } finally {
      setSaving(false)
    }
  }

  const filteredReviews = reviews.filter(review => {
    const searchLower = searchQuery.toLowerCase()
    return (
      review.comment.toLowerCase().includes(searchLower) ||
      (review.user.name || '').toLowerCase().includes(searchLower) ||
      review.apartment.title.toLowerCase().includes(searchLower)
    )
  })

  const renderStars = (rating: number, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <StarSolid
            key={star}
            className={`${sizeClass} ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading && !reviews.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Отзывы</h1>
        <p className="text-gray-500 mt-1">Модерация и управление отзывами гостей</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChatBubbleLeftIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Всего</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">На модерации</p>
                <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Одобрено</p>
                <p className="text-xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XMarkIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Отклонено</p>
                <p className="text-xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <StarIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Средний рейтинг</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
                  {renderStars(Math.round(stats.averageRating), 'sm')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по отзывам..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterStatus === status
                    ? status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      status === 'approved' ? 'bg-green-100 text-green-700' :
                      status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Все' :
                 status === 'pending' ? 'На модерации' :
                 status === 'approved' ? 'Одобренные' : 'Отклонённые'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filterRating || ''}
              onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : null)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Любой рейтинг</option>
              <option value="5">5 звёзд</option>
              <option value="4">4 звезды</option>
              <option value="3">3 звезды</option>
              <option value="2">2 звезды</option>
              <option value="1">1 звезда</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Нет отзывов для отображения</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {review.user.name || 'Аноним'}
                      </p>
                      <p className="text-sm text-gray-500">{review.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      !review.isApproved && !review.isPublished
                        ? 'bg-yellow-100 text-yellow-700'
                        : review.isApproved && review.isPublished
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {!review.isApproved && !review.isPublished
                        ? 'На модерации'
                        : review.isApproved && review.isPublished
                        ? 'Опубликован'
                        : 'Отклонён'}
                    </span>
                  </div>
                </div>

                {/* Apartment */}
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  <span>{review.apartment.title}</span>
                  <span className="text-gray-300">•</span>
                  <span>{formatDate(review.createdAt)}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {renderStars(review.rating)}
                    <span className="font-bold text-lg">{review.rating}</span>
                  </div>

                  {/* Sub-ratings */}
                  {(review.cleanlinessRating || review.locationRating || review.valueRating || review.communicationRating) && (
                    <div className="flex items-center gap-4 text-sm text-gray-500 border-l border-gray-200 pl-4">
                      {review.cleanlinessRating && (
                        <span>Чистота: {review.cleanlinessRating}</span>
                      )}
                      {review.locationRating && (
                        <span>Расположение: {review.locationRating}</span>
                      )}
                      {review.valueRating && (
                        <span>Цена/качество: {review.valueRating}</span>
                      )}
                      {review.communicationRating && (
                        <span>Связь: {review.communicationRating}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Title & Comment */}
                {review.title && (
                  <h3 className="font-semibold text-gray-900 mb-2">{review.title}</h3>
                )}
                <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>

                {/* Owner Reply */}
                {review.ownerReply && (
                  <div className="mt-4 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Ответ владельца</span>
                      {review.ownerReplyDate && (
                        <span className="text-xs text-blue-400">
                          {formatDate(review.ownerReplyDate)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-blue-800">{review.ownerReply}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {!review.isApproved && !review.isPublished && (
                      <>
                        <button
                          onClick={() => handleApprove(review)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <CheckIcon className="h-4 w-4" />
                          Одобрить
                        </button>
                        <button
                          onClick={() => handleReject(review)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                        >
                          <XMarkIcon className="h-4 w-4" />
                          Отклонить
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openReplyModal(review)}
                      className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                      {review.ownerReply ? 'Изменить ответ' : 'Ответить'}
                    </button>
                    <button
                      onClick={() => handleDelete(review)}
                      className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {showReplyModal && selectedReview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl max-w-lg w-full"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Ответ на отзыв
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedReview.user.name || 'Аноним'} — {selectedReview.apartment.title}
                </p>
              </div>

              <div className="p-6">
                {/* Original review */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {renderStars(selectedReview.rating, 'sm')}
                    <span className="text-sm font-medium">{selectedReview.rating}/5</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">{selectedReview.comment}</p>
                </div>

                {/* Reply textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ваш ответ
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    placeholder="Напишите ответ на отзыв гостя..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-4">
                  {selectedReview.ownerReply && (
                    <button
                      onClick={() => setReplyText('')}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Удалить ответ
                    </button>
                  )}
                  <button
                    onClick={() => setShowReplyModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
