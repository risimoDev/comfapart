'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { skeletonPulse } from '@/lib/animations'

// ============================================
// BASE SKELETON
// ============================================

interface SkeletonProps {
  className?: string
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
}

export function Skeleton({ className, rounded = 'lg' }: SkeletonProps) {
  return (
    <motion.div
      variants={skeletonPulse}
      initial="initial"
      animate="animate"
      className={cn(
        'bg-neutral-200 dark:bg-neutral-800',
        roundedClasses[rounded],
        className
      )}
    />
  )
}

// ============================================
// TEXT SKELETON
// ============================================

interface TextSkeletonProps {
  lines?: number
  lastLineWidth?: string
  className?: string
}

export function TextSkeleton({ lines = 3, lastLineWidth = '75%', className }: TextSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? `w-[${lastLineWidth}]` : 'w-full'
          )}
          rounded="md"
        />
      ))}
    </div>
  )
}

// ============================================
// APARTMENT CARD SKELETON
// ============================================

export function ApartmentCardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Image */}
      <Skeleton className="w-full aspect-[4/3]" rounded="xl" />
      
      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-2/3" rounded="md" />
          <Skeleton className="h-4 w-12" rounded="md" />
        </div>
        <Skeleton className="h-4 w-1/2" rounded="md" />
        <Skeleton className="h-5 w-1/3" rounded="md" />
      </div>
    </div>
  )
}

// ============================================
// APARTMENT DETAILS SKELETON
// ============================================

export function ApartmentDetailsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Gallery */}
      <Skeleton className="w-full h-[400px] lg:h-[500px]" rounded="xl" />
      
      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3" rounded="md" />
            <Skeleton className="h-5 w-1/3" rounded="md" />
          </div>
          
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-20" rounded="lg" />
            ))}
          </div>
          
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <TextSkeleton lines={4} />
          </div>
        </div>
        
        {/* Sidebar */}
        <div>
          <Skeleton className="h-[400px] w-full" rounded="xl" />
        </div>
      </div>
    </div>
  )
}

// ============================================
// BOOKING CARD SKELETON
// ============================================

export function BookingCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-100 dark:border-neutral-800">
      <div className="flex items-start gap-4">
        <Skeleton className="w-20 h-20 flex-shrink-0" rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" rounded="md" />
          <Skeleton className="h-4 w-1/2" rounded="md" />
          <Skeleton className="h-4 w-1/3" rounded="md" />
        </div>
        <Skeleton className="h-6 w-20" rounded="full" />
      </div>
    </div>
  )
}

// ============================================
// TABLE SKELETON
// ============================================

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" rounded="md" />
        ))}
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-6 py-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn('h-4 flex-1', colIndex === 0 && 'max-w-[200px]')}
                rounded="md"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// STATS CARD SKELETON
// ============================================

export function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-100 dark:border-neutral-800">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" rounded="md" />
          <Skeleton className="h-8 w-32" rounded="md" />
        </div>
        <Skeleton className="h-10 w-10" rounded="lg" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Skeleton className="h-5 w-16" rounded="full" />
        <Skeleton className="h-4 w-20" rounded="md" />
      </div>
    </div>
  )
}
