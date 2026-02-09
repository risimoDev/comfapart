'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  Star,
  MessageSquare,
  Calendar,
  Home,
  Edit,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Review {
  id: string
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
  ownerResponse: string | null
  apartment: {
    id: string
    title: string
    slug: string
    images: { url: string }[]
  }
}

export default function MyReviewsPage() {
  const { accessToken } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingReview, setEditingReview] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editRating, setEditRating] = useState(5)

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/account/reviews', {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        }
      })
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (review: Review) => {
    setEditingReview(review.id)
    setEditText(review.comment)
    setEditRating(review.rating)
  }

  const cancelEdit = () => {
    setEditingReview(null)
    setEditText('')
    setEditRating(5)
  }

  const saveEdit = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/account/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ comment: editText, rating: editRating }),
      })

      if (!response.ok) {
        throw new Error('Ошибка сохранения')
      }

      toast.success('Отзыв обновлён')
      setEditingReview(null)
      fetchReviews()
    } catch (error) {
      toast.error('Не удалось сохранить отзыв')
    }
  }

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Вы уверены, что хотите удалить отзыв?')) return

    try {
      const response = await fetch(`/api/account/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка удаления')
      }

      toast.success('Отзыв удалён')
      setReviews(reviews.filter(r => r.id !== reviewId))
    } catch (error) {
      toast.error('Не удалось удалить отзыв')
    }
  }

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star 
              className={`w-5 h-5 ${
                star <= rating 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Мои отзывы</h1>
          <span className="text-gray-500">Всего: {reviews.length}</span>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">У вас пока нет отзывов</h3>
            <p className="text-gray-500 mb-4">
              После завершения бронирования вы сможете оставить отзыв об апартаментах
            </p>
            <Link href="/apartments">
              <Button>Найти апартаменты</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border dark:border-gray-700 rounded-xl p-4"
              >
                {/* Apartment info */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {review.apartment.images[0] ? (
                      <img 
                        src={review.apartment.images[0].url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <Link 
                      href={`/apartments/${review.apartment.slug}`}
                      className="font-semibold hover:text-primary"
                    >
                      {review.apartment.title}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDate(review.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(review)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Rating and comment */}
                {editingReview === review.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Оценка:</span>
                      {renderStars(editRating, true, setEditRating)}
                    </div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(review.id)}>
                        Сохранить
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2">
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                  </>
                )}

                {/* Owner response */}
                {review.ownerResponse && (
                  <div className="mt-4 p-3 bg-primary/5 rounded-xl">
                    <p className="text-sm font-medium text-primary mb-1">Ответ владельца:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {review.ownerResponse}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
