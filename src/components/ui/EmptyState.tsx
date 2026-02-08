'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  Search, 
  FileX, 
  FolderOpen, 
  AlertTriangle, 
  WifiOff, 
  ServerCrash,
  RefreshCw,
  Home,
  Plus,
  Calendar,
  Building,
  Users,
  MessageSquare,
  Settings,
  Database
} from 'lucide-react'
import { Button } from './Button'
import { fadeInScale } from '@/lib/animations'

// ============================================================================
// Types
// ============================================================================

type EmptyStateVariant = 
  | 'default'
  | 'search'
  | 'no-data'
  | 'no-results'
  | 'no-bookings'
  | 'no-apartments'
  | 'no-reviews'
  | 'no-users'
  | 'settings'

type ErrorStateVariant =
  | 'general'
  | 'network'
  | 'server'
  | '404'
  | '403'
  | '500'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  compact?: boolean
}

interface ErrorStateProps {
  variant?: ErrorStateVariant
  title?: string
  description?: string
  icon?: React.ReactNode
  onRetry?: () => void
  onGoHome?: () => void
  retryLabel?: string
  homeLabel?: string
  className?: string
  showHomeButton?: boolean
  compact?: boolean
}

// ============================================================================
// Default Content Maps
// ============================================================================

const emptyStateDefaults: Record<EmptyStateVariant, { 
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}> = {
  default: {
    icon: FolderOpen,
    title: 'Здесь пока пусто',
    description: 'Данные появятся позже',
  },
  search: {
    icon: Search,
    title: 'Ничего не найдено',
    description: 'Попробуйте изменить параметры поиска или фильтры',
  },
  'no-data': {
    icon: Database,
    title: 'Нет данных',
    description: 'Данные для отображения отсутствуют',
  },
  'no-results': {
    icon: FileX,
    title: 'Результаты не найдены',
    description: 'По вашему запросу ничего не найдено. Попробуйте другие параметры',
  },
  'no-bookings': {
    icon: Calendar,
    title: 'Нет бронирований',
    description: 'У вас пока нет активных бронирований',
  },
  'no-apartments': {
    icon: Building,
    title: 'Апартаменты не найдены',
    description: 'Добавьте свой первый объект размещения',
  },
  'no-reviews': {
    icon: MessageSquare,
    title: 'Пока нет отзывов',
    description: 'Отзывы появятся после завершения бронирований',
  },
  'no-users': {
    icon: Users,
    title: 'Пользователи не найдены',
    description: 'Список пользователей пуст',
  },
  settings: {
    icon: Settings,
    title: 'Настройки не заданы',
    description: 'Добавьте настройки для начала работы',
  },
}

const errorStateDefaults: Record<ErrorStateVariant, {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}> = {
  general: {
    icon: AlertTriangle,
    title: 'Что-то пошло не так',
    description: 'Произошла непредвиденная ошибка. Попробуйте обновить страницу',
  },
  network: {
    icon: WifiOff,
    title: 'Нет подключения к сети',
    description: 'Проверьте подключение к интернету и попробуйте снова',
  },
  server: {
    icon: ServerCrash,
    title: 'Ошибка сервера',
    description: 'Сервер временно недоступен. Попробуйте позже',
  },
  '404': {
    icon: FileX,
    title: 'Страница не найдена',
    description: 'Запрашиваемая страница не существует или была перемещена',
  },
  '403': {
    icon: AlertTriangle,
    title: 'Доступ запрещён',
    description: 'У вас нет прав для просмотра этой страницы',
  },
  '500': {
    icon: ServerCrash,
    title: 'Внутренняя ошибка сервера',
    description: 'Произошла ошибка на сервере. Наши специалисты уже работают над решением',
  },
}

// ============================================================================
// Empty State Component
// ============================================================================

export function EmptyState({
  variant = 'default',
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  const defaults = emptyStateDefaults[variant]
  const Icon = icon ? () => <>{icon}</> : defaults.icon
  
  return (
    <motion.div
      variants={fadeInScale}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex items-center justify-center rounded-full',
        'bg-neutral-100 dark:bg-neutral-800',
        compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'
      )}>
        <Icon className={cn(
          'text-neutral-400 dark:text-neutral-500',
          compact ? 'w-6 h-6' : 'w-8 h-8'
        )} />
      </div>
      
      {/* Title */}
      <h3 className={cn(
        'font-semibold text-neutral-900 dark:text-white',
        compact ? 'text-base mb-1' : 'text-lg mb-2'
      )}>
        {title || defaults.title}
      </h3>
      
      {/* Description */}
      <p className={cn(
        'text-neutral-500 dark:text-neutral-400 max-w-sm',
        compact ? 'text-sm mb-4' : 'text-sm mb-6'
      )}>
        {description || defaults.description}
      </p>
      
      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              size={compact ? 'sm' : 'md'}
              leftIcon={action.icon}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              size={compact ? 'sm' : 'md'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// Error State Component
// ============================================================================

export function ErrorState({
  variant = 'general',
  title,
  description,
  icon,
  onRetry,
  onGoHome,
  retryLabel = 'Попробовать снова',
  homeLabel = 'На главную',
  className,
  showHomeButton = true,
  compact = false,
}: ErrorStateProps) {
  const defaults = errorStateDefaults[variant]
  const Icon = icon ? () => <>{icon}</> : defaults.icon
  
  return (
    <motion.div
      variants={fadeInScale}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex items-center justify-center rounded-full',
        'bg-danger-50 dark:bg-danger-900/20',
        compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'
      )}>
        <Icon className={cn(
          'text-danger-500',
          compact ? 'w-6 h-6' : 'w-8 h-8'
        )} />
      </div>
      
      {/* Title */}
      <h3 className={cn(
        'font-semibold text-neutral-900 dark:text-white',
        compact ? 'text-base mb-1' : 'text-lg mb-2'
      )}>
        {title || defaults.title}
      </h3>
      
      {/* Description */}
      <p className={cn(
        'text-neutral-500 dark:text-neutral-400 max-w-sm',
        compact ? 'text-sm mb-4' : 'text-sm mb-6'
      )}>
        {description || defaults.description}
      </p>
      
      {/* Actions */}
      {(onRetry || (showHomeButton && onGoHome)) && (
        <div className="flex items-center gap-3">
          {onRetry && (
            <Button
              onClick={onRetry}
              size={compact ? 'sm' : 'md'}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              {retryLabel}
            </Button>
          )}
          {showHomeButton && onGoHome && (
            <Button
              variant="ghost"
              onClick={onGoHome}
              size={compact ? 'sm' : 'md'}
              leftIcon={<Home className="w-4 h-4" />}
            >
              {homeLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// Inline Empty/Error States (for small sections)
// ============================================================================

interface InlineEmptyProps {
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function InlineEmpty({ message, action, className }: InlineEmptyProps) {
  return (
    <div className={cn(
      'flex items-center justify-center gap-2 py-4 px-3',
      'text-sm text-neutral-500 dark:text-neutral-400',
      'bg-neutral-50 dark:bg-neutral-800/50 rounded-lg',
      className
    )}>
      <span>{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

interface InlineErrorProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-3 py-3 px-4',
      'bg-danger-50 dark:bg-danger-900/20 rounded-lg',
      'border border-danger-100 dark:border-danger-800',
      className
    )}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0" />
        <span className="text-sm text-danger-700 dark:text-danger-400">
          {message}
        </span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'text-sm font-medium text-danger-600 dark:text-danger-400',
            'hover:text-danger-700 dark:hover:text-danger-300',
            'transition-colors flex items-center gap-1'
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Повторить
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Loading State Component
// ============================================================================

interface LoadingStateProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({ 
  message = 'Загрузка...', 
  className,
  size = 'md' 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-16',
    lg: 'py-24',
  }
  
  const spinnerSizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-12 h-12 border-3',
  }
  
  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      sizeClasses[size],
      className
    )}>
      <div 
        className={cn(
          'rounded-full border-primary-200 border-t-primary-500 animate-spin',
          spinnerSizes[size]
        )} 
      />
      {message && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          {message}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Full Page States
// ============================================================================

interface FullPageErrorProps extends ErrorStateProps {
  onBack?: () => void
}

export function FullPageError({
  variant = 'general',
  title,
  description,
  onRetry,
  onGoHome,
  onBack,
  ...props
}: FullPageErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <ErrorState
        variant={variant}
        title={title}
        description={description}
        onRetry={onRetry}
        onGoHome={onGoHome}
        {...props}
      />
    </div>
  )
}

export function FullPageLoading({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <LoadingState message={message} size="lg" />
    </div>
  )
}
