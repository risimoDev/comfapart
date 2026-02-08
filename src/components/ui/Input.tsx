'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Search, X, AlertCircle, Check, Eye, EyeOff } from 'lucide-react'

// ============================================
// INPUT SIZES & STYLES
// ============================================

type InputSize = 'sm' | 'md' | 'lg'

const inputSizes: Record<InputSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-12 px-4 text-base rounded-xl',
}

// ============================================
// INPUT COMPONENT
// ============================================

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize
  error?: string
  success?: boolean | string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onClear?: () => void
  label?: string
  hint?: string
  icon?: React.ReactNode // Legacy support
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      error,
      success,
      leftIcon,
      rightIcon,
      icon, // Legacy
      onClear,
      label,
      hint,
      className,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const hasValue = value !== undefined && value !== ''
    const actualLeftIcon = leftIcon || icon

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {actualLeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {actualLeftIcon}
            </div>
          )}

          <input
            ref={ref}
            disabled={disabled}
            value={value}
            className={cn(
              // Base
              'w-full bg-white dark:bg-neutral-900',
              'border border-neutral-200 dark:border-neutral-800',
              'text-neutral-900 dark:text-neutral-100',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-600',
              // Focus
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              // Transitions
              'transition-all duration-200',
              // States
              error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
              success && 'border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500',
              disabled && 'opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800',
              // Size
              inputSizes[size],
              // Padding adjustments
              actualLeftIcon && 'pl-10',
              (rightIcon || onClear || error || success) && 'pr-10',
              className
            )}
            {...props}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {onClear && hasValue && !disabled && (
              <button
                type="button"
                onClick={onClear}
                className="p-0.5 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {error && <AlertCircle className="w-4 h-4 text-red-500" />}
            {success && <Check className="w-4 h-4 text-emerald-500" />}
            {rightIcon && !error && !success && (
              <span className="text-neutral-400">{rightIcon}</span>
            )}
          </div>
        </div>

        {(hint || error || (typeof success === 'string' && success)) && (
          <p className={cn(
            'mt-1.5 text-sm', 
            error ? 'text-red-500' : typeof success === 'string' ? 'text-emerald-500' : 'text-neutral-500'
          )}>
            {error || (typeof success === 'string' ? success : hint)}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ============================================
// SEARCH INPUT
// ============================================

interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onSearch?.(e.target.value)
    }

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search className="w-4 h-4" />}
        onChange={handleChange}
        value={value}
        onClear={value ? () => onSearch?.('') : undefined}
        placeholder="Поиск..."
        {...props}
      />
    )
  }
)
SearchInput.displayName = 'SearchInput'

// ============================================
// PASSWORD INPUT
// ============================================

const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        {...props}
      />
    )
  }
)
PasswordInput.displayName = 'PasswordInput'

// ============================================
// TEXTAREA
// ============================================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  success?: boolean
  label?: string
  hint?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, success, label, hint, className, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full min-h-[100px] px-4 py-3 bg-white dark:bg-neutral-900',
            'border border-neutral-200 dark:border-neutral-800 rounded-xl',
            'text-neutral-900 dark:text-neutral-100 text-sm',
            'placeholder:text-neutral-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            'transition-all duration-200 resize-y',
            error && 'border-red-500 focus:ring-red-500/20',
            success && 'border-emerald-500 focus:ring-emerald-500/20',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        />
        {(hint || error) && (
          <p className={cn('mt-1.5 text-sm', error ? 'text-red-500' : 'text-neutral-500')}>
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Input, SearchInput, PasswordInput, Textarea }
