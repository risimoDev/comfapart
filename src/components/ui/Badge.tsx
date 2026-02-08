'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  Clock, 
  Star,
  X 
} from 'lucide-react'

// ============================================================================
// Badge Variants & Types
// ============================================================================

type BadgeVariant = 
  | 'default' 
  | 'primary' 
  | 'secondary'
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'purple'
  | 'outline'

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
  dot?: boolean
  removable?: boolean
  onRemove?: () => void
  animated?: boolean
}

// ============================================================================
// Style Maps
// ============================================================================

const variantStyles: Record<BadgeVariant, string> = {
  default: `
    bg-neutral-100 text-neutral-700 
    dark:bg-neutral-800 dark:text-neutral-300
  `,
  primary: `
    bg-primary-50 text-primary-700 
    dark:bg-primary-900/30 dark:text-primary-400
  `,
  secondary: `
    bg-neutral-200 text-neutral-800 
    dark:bg-neutral-700 dark:text-neutral-200
  `,
  success: `
    bg-success-50 text-success-700 
    dark:bg-success-900/30 dark:text-success-400
  `,
  warning: `
    bg-warning-50 text-warning-700 
    dark:bg-warning-900/30 dark:text-warning-400
  `,
  danger: `
    bg-danger-50 text-danger-700 
    dark:bg-danger-900/30 dark:text-danger-400
  `,
  info: `
    bg-info-50 text-info-700 
    dark:bg-info-900/30 dark:text-info-400
  `,
  purple: `
    bg-purple-50 text-purple-700 
    dark:bg-purple-900/30 dark:text-purple-400
  `,
  outline: `
    bg-transparent border border-neutral-300 text-neutral-700
    dark:border-neutral-600 dark:text-neutral-300
  `,
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-neutral-500',
  primary: 'bg-primary-500',
  secondary: 'bg-neutral-600',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  purple: 'bg-purple-500',
  outline: 'bg-neutral-500',
}

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] leading-tight gap-1',
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
}

const dotSizes: Record<BadgeSize, string> = {
  xs: 'w-1 h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2 h-2',
}

const iconSizes: Record<BadgeSize, string> = {
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
}

// ============================================================================
// Main Badge Component
// ============================================================================

export function Badge({ 
  variant = 'default', 
  size = 'sm',
  children, 
  className,
  icon,
  dot = false,
  removable = false,
  onRemove,
  animated = false,
}: BadgeProps) {
  const Component = animated ? motion.span : 'span'
  const animationProps = animated ? {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.15 }
  } : {}
  
  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-full',
        'transition-colors duration-200',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...animationProps}
    >
      {dot && (
        <span 
          className={cn(
            'rounded-full flex-shrink-0',
            dotColors[variant],
            dotSizes[size]
          )} 
        />
      )}
      
      {icon && (
        <span className={cn('flex-shrink-0', iconSizes[size])}>
          {icon}
        </span>
      )}
      
      <span>{children}</span>
      
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className={cn(
            'flex-shrink-0 rounded-full p-0.5 -mr-1',
            'hover:bg-black/10 dark:hover:bg-white/10',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            'focus:ring-neutral-400'
          )}
        >
          <X className={iconSizes[size]} />
        </button>
      )}
    </Component>
  )
}

// ============================================================================
// Status Badge - With icon indicators
// ============================================================================

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away'
  showLabel?: boolean
  size?: BadgeSize
  className?: string
}

const statusConfig = {
  online: { color: 'bg-success-500', label: 'Онлайн', pulse: true },
  offline: { color: 'bg-neutral-400', label: 'Оффлайн', pulse: false },
  busy: { color: 'bg-danger-500', label: 'Занят', pulse: false },
  away: { color: 'bg-warning-500', label: 'Отошёл', pulse: false },
}

export function StatusBadge({ 
  status, 
  showLabel = true, 
  size = 'sm',
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        sizeStyles[size],
        className
      )}
    >
      <span className="relative flex-shrink-0">
        <span className={cn('block w-2 h-2 rounded-full', config.color)} />
        {config.pulse && (
          <span 
            className={cn(
              'absolute inset-0 rounded-full animate-ping',
              config.color,
              'opacity-75'
            )} 
          />
        )}
      </span>
      {showLabel && (
        <span className="text-neutral-600 dark:text-neutral-400 text-xs">
          {config.label}
        </span>
      )}
    </span>
  )
}

// ============================================================================
// Counter Badge - For notifications, cart items, etc.
// ============================================================================

interface CounterBadgeProps {
  count: number
  max?: number
  variant?: 'primary' | 'danger' | 'default'
  size?: 'sm' | 'md' | 'lg'
  showZero?: boolean
  className?: string
}

export function CounterBadge({
  count,
  max = 99,
  variant = 'danger',
  size = 'sm',
  showZero = false,
  className,
}: CounterBadgeProps) {
  if (count === 0 && !showZero) return null
  
  const displayCount = count > max ? `${max}+` : count
  
  const sizeClasses = {
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    md: 'min-w-[20px] h-5 text-xs px-1.5',
    lg: 'min-w-[24px] h-6 text-sm px-2',
  }
  
  const variantClasses = {
    primary: 'bg-primary-500 text-white',
    danger: 'bg-danger-500 text-white',
    default: 'bg-neutral-600 text-white',
  }
  
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'inline-flex items-center justify-center',
        'font-semibold rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {displayCount}
    </motion.span>
  )
}

// ============================================================================
// Booking Status Badge - For booking workflow states
// ============================================================================

interface BookingStatusBadgeProps {
  status: string
  size?: BadgeSize
  showIcon?: boolean
}

const bookingStatusConfig: Record<string, { 
  variant: BadgeVariant
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  PENDING: { variant: 'warning', label: 'Ожидает', icon: Clock },
  CONFIRMED: { variant: 'info', label: 'Подтверждено', icon: CheckCircle },
  PAID: { variant: 'success', label: 'Оплачено', icon: CheckCircle },
  CANCELED: { variant: 'danger', label: 'Отменено', icon: XCircle },
  COMPLETED: { variant: 'purple', label: 'Завершено', icon: Star },
  REFUNDED: { variant: 'default', label: 'Возврат', icon: AlertCircle },
}

export function BookingStatusBadge({ 
  status, 
  size = 'sm',
  showIcon = true 
}: BookingStatusBadgeProps) {
  const config = bookingStatusConfig[status] || { 
    variant: 'default' as BadgeVariant, 
    label: status,
    icon: Info 
  }
  const Icon = config.icon
  
  return (
    <Badge 
      variant={config.variant} 
      size={size}
      icon={showIcon ? <Icon className="w-full h-full" /> : undefined}
      dot={!showIcon}
    >
      {config.label}
    </Badge>
  )
}

// ============================================================================
// Apartment Status Badge - For listing states
// ============================================================================

interface ApartmentStatusBadgeProps {
  status: string
  size?: BadgeSize
  showIcon?: boolean
}

const apartmentStatusConfig: Record<string, { 
  variant: BadgeVariant
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  DRAFT: { variant: 'default', label: 'Черновик', icon: Clock },
  PUBLISHED: { variant: 'success', label: 'Опубликован', icon: CheckCircle },
  HIDDEN: { variant: 'warning', label: 'Скрыт', icon: AlertCircle },
  ARCHIVED: { variant: 'danger', label: 'В архиве', icon: XCircle },
}

export function ApartmentStatusBadge({ 
  status,
  size = 'sm',
  showIcon = true 
}: ApartmentStatusBadgeProps) {
  const config = apartmentStatusConfig[status] || { 
    variant: 'default' as BadgeVariant, 
    label: status,
    icon: Info 
  }
  const Icon = config.icon
  
  return (
    <Badge 
      variant={config.variant} 
      size={size}
      icon={showIcon ? <Icon className="w-full h-full" /> : undefined}
      dot={!showIcon}
    >
      {config.label}
    </Badge>
  )
}

// ============================================================================
// Priority Badge - For task/ticket priority
// ============================================================================

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent'
  size?: BadgeSize
  className?: string
}

const priorityConfig = {
  low: { variant: 'default' as BadgeVariant, label: 'Низкий' },
  medium: { variant: 'info' as BadgeVariant, label: 'Средний' },
  high: { variant: 'warning' as BadgeVariant, label: 'Высокий' },
  urgent: { variant: 'danger' as BadgeVariant, label: 'Срочный' },
}

export function PriorityBadge({ priority, size = 'sm', className }: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  
  return (
    <Badge variant={config.variant} size={size} dot className={className}>
      {config.label}
    </Badge>
  )
}

// ============================================================================
// Tag Badge - For categories, labels, filters
// ============================================================================

interface TagBadgeProps {
  children: React.ReactNode
  color?: string
  removable?: boolean
  onRemove?: () => void
  size?: BadgeSize
  className?: string
}

export function TagBadge({
  children,
  color,
  removable = false,
  onRemove,
  size = 'sm',
  className,
}: TagBadgeProps) {
  return (
    <span style={color ? { color } : undefined}>
      <Badge
        variant="outline"
        size={size}
        removable={removable}
        onRemove={onRemove}
        className={cn(
          color && `border-current text-current`,
          className
        )}
      >
        {children}
      </Badge>
    </span>
  )
}
