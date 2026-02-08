'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApartmentImage } from '@/types'

interface ImageGalleryProps {
  images: ApartmentImage[]
  title: string
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary) return -1
    if (b.isPrimary) return 1
    return a.order - b.order
  })

  const goToPrev = () => {
    setSelectedIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length)
  }

  const goToNext = () => {
    setSelectedIndex((prev) => (prev + 1) % sortedImages.length)
  }

  if (sortedImages.length === 0) {
    return (
      <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
        <span className="text-gray-500">Нет изображений</span>
      </div>
    )
  }

  return (
    <>
      {/* Галерея */}
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[500px] rounded-2xl overflow-hidden">
        {/* Главное изображение */}
        <div 
          className="col-span-2 row-span-2 relative cursor-pointer group"
          onClick={() => setIsFullscreen(true)}
        >
          <Image
            src={sortedImages[0]?.url || '/placeholder.jpg'}
            alt={`${title} - фото 1`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Дополнительные изображения */}
        {sortedImages.slice(1, 5).map((image, index) => (
          <div
            key={image.id}
            className="relative cursor-pointer group"
            onClick={() => {
              setSelectedIndex(index + 1)
              setIsFullscreen(true)
            }}
          >
            <Image
              src={image.url}
              alt={`${title} - фото ${index + 2}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            
            {/* Показать еще */}
            {index === 3 && sortedImages.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  +{sortedImages.length - 5} фото
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen галерея */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            {/* Закрыть */}
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Счетчик */}
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
              {selectedIndex + 1} / {sortedImages.length}
            </div>

            {/* Изображение */}
            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="relative w-full h-full max-w-6xl max-h-[80vh] mx-4"
            >
              <Image
                src={sortedImages[selectedIndex].url}
                alt={`${title} - фото ${selectedIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </motion.div>

            {/* Навигация */}
            {sortedImages.length > 1 && (
              <>
                <button
                  onClick={goToPrev}
                  className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-8 h-8 text-white" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-8 h-8 text-white" />
                </button>
              </>
            )}

            {/* Миниатюры */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4 pb-2">
              {sortedImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    'relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all',
                    index === selectedIndex
                      ? 'ring-2 ring-white'
                      : 'opacity-50 hover:opacity-100'
                  )}
                >
                  <Image
                    src={image.url}
                    alt={`Миниатюра ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
