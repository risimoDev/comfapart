'use client'

import * as React from 'react'
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { cardHover, cardImageHover, staggerItem } from '@/lib/animations'
import { Heart, MapPin, Star } from 'lucide-react'

// ============================================
// BASE CARD
// ============================================

type CardVariant = 'default' | 'outline' | 'filled' | 'elevated'

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  hover?: boolean
  hoverable?: boolean
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingSizes = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800',
  outline: 'bg-transparent border border-neutral-200 dark:border-neutral-700',
  filled: 'bg-neutral-50 dark:bg-neutral-800/50 border-0',
  elevated: 'bg-white dark:bg-neutral-900 border-0 shadow-lg shadow-black/5',
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, hover = false, hoverable = false, variant = 'default', padding = 'md', className, ...props }, ref) => {
    const shouldHover = hover || hoverable
    
    return (
      <motion.div
        ref={ref}
        initial={shouldHover ? cardHover.initial : undefined}
        whileHover={shouldHover ? cardHover.hover : undefined}
        whileTap={shouldHover ? cardHover.tap : undefined}
        className={cn(
          'rounded-2xl overflow-hidden',
          'transition-colors duration-200',
          variantStyles[variant],
          paddingSizes[padding],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
Card.displayName = 'Card'

// ============================================
// CARD PARTS
// ============================================

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('mb-4', className)}>
    {children}
  </div>
)

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h3 className={cn('text-lg font-semibold text-neutral-900 dark:text-white', className)}>
    {children}
  </h3>
)

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <p className={cn('text-sm text-neutral-500 dark:text-neutral-400 mt-1', className)}>
    {children}
  </p>
)

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('', className)}>
    {children}
  </div>
)

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800', className)}>
    {children}
  </div>
)

// ============================================
// APARTMENT CARD (Premium Design)
// ============================================

interface ApartmentCardProps {
  id: string
  title: string
  location: string
  price: number
  priceUnit?: string
  rating?: number
  reviewCount?: number
  images: string[]
  isFavorite?: boolean
  onFavoriteToggle?: () => void
  onClick?: () => void
  badge?: string
  className?: string
}

export const ApartmentCard: React.FC<ApartmentCardProps> = ({
  title,
  location,
  price,
  priceUnit = 'ночь',
  rating,
  reviewCount,
  images,
  isFavorite = false,
  onFavoriteToggle,
  onClick,
  badge,
  className,
}) => {
  const [currentImage, setCurrentImage] = React.useState(0)
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <motion.article
      variants={staggerItem}
      initial="initial"
      animate="animate"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-2xl overflow-hidden',
        'bg-white dark:bg-neutral-900',
        className
      )}
    >
      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        {/* Main image */}
        <motion.div
          initial={cardImageHover.initial}
          animate={isHovered ? cardImageHover.hover : cardImageHover.initial}
          className="absolute inset-0"
        >
          {images[currentImage] ? (
            <img
              src={images[currentImage]}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700" />
          )}
        </motion.div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badge */}
        {badge && (
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 text-xs font-medium bg-white/95 backdrop-blur-sm text-neutral-900 rounded-full shadow-sm">
              {badge}
            </span>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onFavoriteToggle?.()
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md group/fav"
        >
          <Heart
            className={cn(
              'w-5 h-5 transition-all duration-200',
              isFavorite
                ? 'fill-rose-500 text-rose-500'
                : 'text-neutral-600 group-hover/fav:text-rose-500'
            )}
          />
        </button>

        {/* Image pagination */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {images.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentImage(idx)
                }}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  idx === currentImage
                    ? 'bg-white w-4'
                    : 'bg-white/60 hover:bg-white/80'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-3 space-y-1">
        {/* Title & Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-neutral-900 dark:text-white line-clamp-1 text-[15px]">
            {title}
          </h3>
          {rating !== undefined && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-4 h-4 fill-neutral-900 dark:fill-white text-neutral-900 dark:text-white" />
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {rating.toFixed(1)}
              </span>
              {reviewCount !== undefined && (
                <span className="text-sm text-neutral-400">({reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-sm line-clamp-1">{location}</span>
        </div>

        {/* Price */}
        <p className="pt-1">
          <span className="font-semibold text-neutral-900 dark:text-white">
            {price.toLocaleString('ru-RU')} ₽
          </span>
          <span className="text-neutral-500 dark:text-neutral-400 text-sm">
            {' '}/ {priceUnit}
          </span>
        </p>
      </div>
    </motion.article>
  )
}

// ============================================
// STATS CARD
// ============================================

interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    trend?: 'up' | 'down' | 'neutral'
    label?: string
  }
  icon?: React.ReactNode
  className?: string
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon,
  className,
}) => {
  const trendColors = {
    up: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400',
    down: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400',
    neutral: 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800',
  }
  
  // Auto-detect trend if not provided
  const trend = change?.trend ?? (change?.value ? (change.value > 0 ? 'up' : change.value < 0 ? 'down' : 'neutral') : 'neutral')

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        'p-5 bg-white dark:bg-neutral-900 rounded-2xl',
        'border border-neutral-200/60 dark:border-neutral-800',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-white mt-1">{value}</p>
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
              trendColors[trend]
            )}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {change.value > 0 ? '+' : ''}{change.value}%
          </span>
          {change.label && (
            <span className="text-xs text-neutral-500">{change.label}</span>
          )}
        </div>
      )}
    </motion.div>
  )
}
