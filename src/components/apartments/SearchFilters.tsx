'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Calendar, Users, SlidersHorizontal, X } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/utils'

interface SearchFiltersProps {
  cities?: { city: string; count: number }[]
  onSearch?: (filters: SearchFilters) => void
}

interface SearchFilters {
  city?: string
  checkIn?: string
  checkOut?: string
  guests?: number
  minPrice?: number
  maxPrice?: number
}

export function SearchFilters({ cities = [], onSearch }: SearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const [filters, setFilters] = useState<SearchFilters>({
    city: searchParams.get('city') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: searchParams.get('guests') ? Number(searchParams.get('guests')) : undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
  })

  const handleSearch = () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      }
    })
    
    router.push(`/apartments?${params.toString()}`)
    onSearch?.(filters)
  }

  const clearFilters = () => {
    setFilters({})
    router.push('/apartments')
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      {/* Заголовок с городом */}
      <div className="flex items-center gap-2 mb-4 text-gray-600 dark:text-gray-400">
        <MapPin className="w-5 h-5 text-primary" />
        <span className="font-medium">Апартаменты в Перми</span>
      </div>

      {/* Основные фильтры */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Даты заезда */}
        <div>
          <label className="form-label">Заезд</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={filters.checkIn || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, checkIn: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="form-input pl-10"
            />
          </div>
        </div>

        {/* Дата выезда */}
        <div>
          <label className="form-label">Выезд</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={filters.checkOut || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, checkOut: e.target.value }))}
              min={filters.checkIn || new Date().toISOString().split('T')[0]}
              className="form-input pl-10"
            />
          </div>
        </div>

        {/* Гости */}
        <div>
          <label className="form-label">Гости</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filters.guests || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, guests: e.target.value ? Number(e.target.value) : undefined }))}
              className="form-input pl-10 appearance-none cursor-pointer"
            >
              <option value="">Любое</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'гость' : n < 5 ? 'гостя' : 'гостей'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Кнопка поиска */}
        <div className="flex items-end gap-2">
          <Button onClick={handleSearch} fullWidth className="h-[50px]">
            <Search className="w-5 h-5 mr-2" />
            Найти
          </Button>
        </div>
      </div>

      {/* Кнопка расширенных фильтров */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showAdvanced ? 'Скрыть фильтры' : 'Расширенные фильтры'}
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Расширенные фильтры */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {/* Цена от */}
              <div>
                <label className="form-label">Цена от (₽/ночь)</label>
                <Input
                  type="number"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="0"
                />
              </div>

              {/* Цена до */}
              <div>
                <label className="form-label">Цена до (₽/ночь)</label>
                <Input
                  type="number"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="100000"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
