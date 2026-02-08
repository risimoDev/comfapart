'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, MapPin, Users, Bed, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'

// Упрощённый интерфейс для карточки
interface ApartmentCardData {
  id: string
  slug: string
  title: string
  shortDescription?: string | null
  city: string
  address?: string | null
  district?: string | null
  bedrooms?: number
  rooms?: number
  maxGuests: number
  // Может быть массив объектов с url или массив строк
  images?: Array<{ url: string; isPrimary?: boolean } | string>
  // Может быть объект pricing или прямое значение
  pricing?: { basePrice: number; currency?: string } | null
  basePrice?: number
  currency?: string
  averageRating?: number | null
  rating?: number
  reviewCount?: number
  reviewsCount?: number
  tags?: Array<{ tag?: { id?: string; name: string }; name?: string }>
}

interface ApartmentCardProps {
  apartment: ApartmentCardData
  onFavorite?: (id: string) => void
  isFavorite?: boolean
}

export function ApartmentCard({ apartment, onFavorite, isFavorite = false }: ApartmentCardProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  // Нормализуем изображения - могут быть строками или объектами
  const rawImages = apartment.images || []
  const displayImages = rawImages.slice(0, 5).map(img => 
    typeof img === 'string' ? img : img.url
  )

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImage((prev) => (prev + 1) % displayImages.length)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImage((prev) => (prev - 1 + displayImages.length) % displayImages.length)
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onFavorite?.(apartment.id)
  }

  // Нормализуем цену
  const price = apartment.pricing?.basePrice ?? apartment.basePrice ?? 0
  
  // Нормализуем рейтинг
  const rating = apartment.averageRating ?? apartment.rating ?? null
  const reviewCount = apartment.reviewCount ?? apartment.reviewsCount ?? 0
  
  // Нормализуем спальни
  const bedrooms = apartment.bedrooms ?? apartment.rooms ?? 1

  return (
    <Link href={`/apartments/${apartment.slug}`}>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3 }}
        className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Изображение */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {displayImages.length > 0 ? (
            <>
              <Image
                src={displayImages[currentImage] || '/placeholder.jpg'}
                alt={apartment.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              
              {/* Навигация по изображениям */}
              {displayImages.length > 1 && isHovered && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Индикаторы */}
              {displayImages.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {displayImages.map((_, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full transition-all',
                        idx === currentImage
                          ? 'bg-white w-3'
                          : 'bg-white/60'
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400">Нет фото</span>
            </div>
          )}

          {/* Кнопка избранного */}
          <button
            onClick={handleFavorite}
            className={cn(
              'absolute top-3 right-3 p-2 rounded-full transition-all',
              isFavorite
                ? 'bg-red-500 text-white'
                : 'bg-white/90 hover:bg-white text-gray-700 hover:text-red-500'
            )}
          >
            <Heart className={cn('w-5 h-5', isFavorite && 'fill-current')} />
          </button>

          {/* Теги */}
          {apartment.tags && apartment.tags.length > 0 && (
            <div className="absolute top-3 left-3 flex gap-2">
              {apartment.tags.slice(0, 2).map((tagData, idx) => (
                <span
                  key={tagData.tag?.id || idx}
                  className="px-2 py-1 text-xs font-medium bg-primary-500 text-white rounded-full"
                >
                  {tagData.tag?.name || tagData.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Контент */}
        <div className="p-5">
          {/* Локация */}
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm mb-2">
            <MapPin className="w-4 h-4" />
            <span>{apartment.city}{apartment.district && `, ${apartment.district}`}</span>
          </div>

          {/* Название */}
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
            {apartment.title}
          </h3>

          {/* Характеристики */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              {bedrooms} {bedrooms === 1 ? 'спальня' : bedrooms < 5 ? 'спальни' : 'спален'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              до {apartment.maxGuests} гостей
            </span>
          </div>

          {/* Цена и рейтинг */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {price > 0 ? formatPrice(price) : '—'}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm"> / ночь</span>
            </div>
            
            {rating !== null && rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{rating.toFixed(1)}</span>
                {reviewCount > 0 && (
                  <span className="text-gray-500 text-sm">({reviewCount})</span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.article>
    </Link>
  )
}

// Скелетон для карточки апартамента
export function ApartmentCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm animate-pulse">
      {/* Изображение */}
      <div className="relative aspect-[4/3] bg-gray-200 dark:bg-gray-700" />
      
      {/* Контент */}
      <div className="p-4 space-y-3">
        {/* Заголовок */}
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        
        {/* Локация */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        
        {/* Характеристики */}
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
        
        {/* Цена и рейтинг */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
        </div>
      </div>
    </div>
  )
}
