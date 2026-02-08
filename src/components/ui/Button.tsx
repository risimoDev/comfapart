'use client'

import * as React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// BUTTON VARIANTS & SIZES
// ============================================

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: `
    bg-neutral-900 text-white hover:bg-neutral-800 
    dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100
    shadow-sm hover:shadow-md active:shadow-sm
  `,
  secondary: `
    bg-neutral-100 text-neutral-900 hover:bg-neutral-200 
    dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700
  `,
  outline: `
    bg-transparent border border-neutral-200 text-neutral-700 
    hover:bg-neutral-50 hover:border-neutral-300
    dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800
  `,
  ghost: `
    bg-transparent text-neutral-600 hover:bg-neutral-100 
    dark:text-neutral-400 dark:hover:bg-neutral-800
  `,
  danger: `
    bg-red-600 text-white hover:bg-red-700 
    shadow-sm hover:shadow-md active:shadow-sm
  `,
  success: `
    bg-emerald-600 text-white hover:bg-emerald-700 
    shadow-sm hover:shadow-md active:shadow-sm
  `,
}

const buttonSizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2 rounded-xl',
  xl: 'h-12 px-6 text-base gap-2.5 rounded-xl',
}

const iconSizes: Record<ButtonSize, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-5 h-5',
}

// ============================================
// BUTTON COMPONENT
// ============================================

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
  fullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      fullWidth = false,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.1 }}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center',
          'font-medium whitespace-nowrap select-none',
          'transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          // Variant & size
          buttonVariants[variant],
          buttonSizes[size],
          // Full width
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && <Loader2 className={cn('animate-spin', iconSizes[size])} />}
        {!loading && leftIcon && <span className={cn(iconSizes[size], 'flex-shrink-0')}>{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className={cn(iconSizes[size], 'flex-shrink-0')}>{rightIcon}</span>}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
