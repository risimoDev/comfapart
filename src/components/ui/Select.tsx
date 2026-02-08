'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dropdownMenu } from '@/lib/animations'

// ============================================
// SELECT COMPONENT
// ============================================

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const selectSizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-4 text-base',
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  disabled = false,
  error,
  label,
  size = 'md',
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          const option = options[highlightedIndex]
          if (!option.disabled) {
            onChange?.(option.value)
            setIsOpen(false)
          }
        } else {
          setIsOpen(true)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between gap-2',
            'bg-white dark:bg-neutral-900',
            'border border-neutral-200 dark:border-neutral-800 rounded-lg',
            'text-left transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            isOpen && 'ring-2 ring-primary-500/20 border-primary-500',
            error && 'border-red-500 focus:ring-red-500/20',
            disabled && 'opacity-50 cursor-not-allowed',
            selectSizes[size]
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={cn('truncate', !selectedOption && 'text-neutral-400')}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-neutral-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.ul
              ref={listRef}
              variants={dropdownMenu}
              initial="initial"
              animate="animate"
              exit="exit"
              className={cn(
                'absolute z-50 w-full mt-1',
                'bg-white dark:bg-neutral-900',
                'border border-neutral-200 dark:border-neutral-800 rounded-lg',
                'shadow-lg overflow-hidden',
                'max-h-60 overflow-y-auto'
              )}
              role="listbox"
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  onClick={() => {
                    if (!option.disabled) {
                      onChange?.(option.value)
                      setIsOpen(false)
                    }
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'flex items-center justify-between px-4 py-2.5 cursor-pointer',
                    'transition-colors duration-100',
                    option.value === value && 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
                    highlightedIndex === index && option.value !== value && 'bg-neutral-50 dark:bg-neutral-800',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled}
                >
                  <span className="text-sm">{option.label}</span>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-primary-600" />
                  )}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  )
}

// ============================================
// MULTI-SELECT COMPONENT
// ============================================

interface MultiSelectProps {
  options: SelectOption[]
  value?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  maxDisplay?: number
  className?: string
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Выберите...',
  disabled = false,
  error,
  label,
  maxDisplay = 3,
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedOptions = options.filter((opt) => value.includes(opt.value))

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange?.(newValue)
  }

  const removeOption = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation()
    onChange?.(value.filter((v) => v !== optionValue))
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full min-h-[40px] flex items-center flex-wrap gap-1.5 px-3 py-1.5',
            'bg-white dark:bg-neutral-900',
            'border border-neutral-200 dark:border-neutral-800 rounded-lg',
            'text-left transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            isOpen && 'ring-2 ring-primary-500/20 border-primary-500',
            error && 'border-red-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-sm text-neutral-400">{placeholder}</span>
          ) : (
            <>
              {selectedOptions.slice(0, maxDisplay).map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md text-sm"
                >
                  {opt.label}
                  <button
                    type="button"
                    onClick={(e) => removeOption(e, opt.value)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedOptions.length > maxDisplay && (
                <span className="text-sm text-neutral-500">
                  +{selectedOptions.length - maxDisplay}
                </span>
              )}
            </>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-neutral-400 ml-auto transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.ul
              variants={dropdownMenu}
              initial="initial"
              animate="animate"
              exit="exit"
              className={cn(
                'absolute z-50 w-full mt-1',
                'bg-white dark:bg-neutral-900',
                'border border-neutral-200 dark:border-neutral-800 rounded-lg',
                'shadow-lg overflow-hidden',
                'max-h-60 overflow-y-auto'
              )}
            >
              {options.map((option) => {
                const isSelected = value.includes(option.value)
                return (
                  <li
                    key={option.value}
                    onClick={() => !option.disabled && toggleOption(option.value)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 cursor-pointer',
                      'transition-colors duration-100 hover:bg-neutral-50 dark:hover:bg-neutral-800',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-neutral-300 dark:border-neutral-600'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  )
}
