'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Trash2 } from 'lucide-react'
import { ApartmentCard, ApartmentCardSkeleton } from '@/components/apartments'
import { Button } from '@/components/ui'

interface FavoriteApartment {
  id: string
  slug: string
  title: string
  shortDescription: string
  basePrice: number
  currency: string
  city: string
  address: string
  rooms: number
  maxGuests: number
  images: string[]
  rating: number
  reviewsCount: number
  isFeatured: boolean
  tags: { name: string; color: string }[]
}

export default function AccountFavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteApartment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await fetch('/api/favorites')
        if (response.ok) {
          const data = await response.json()
          setFavorites(data.favorites || [])
        }
      } catch (error) {
        console.error('Error fetching favorites:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFavorites()
  }, [])

  const removeFavorite = async (apartmentId: string) => {
    try {
      const response = await fetch(`/api/favorites/${apartmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setFavorites(prev => prev.filter(f => f.id !== apartmentId))
      }
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Избранное</h1>

        {/* Загрузка */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <ApartmentCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Список избранного */}
        {!isLoading && favorites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {favorites.map((apartment, index) => (
              <motion.div
                key={apartment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <ApartmentCard apartment={apartment} />
                <button
                  onClick={() => removeFavorite(apartment.id)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                  title="Удалить из избранного"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Пустое состояние */}
        {!isLoading && favorites.length === 0 && (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет избранных объектов</h3>
            <p className="text-gray-500 mb-6">
              Добавляйте понравившиеся апартаменты в избранное, чтобы не потерять их
            </p>
            <Link href="/apartments">
              <Button>Найти апартаменты</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
