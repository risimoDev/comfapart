'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  X,
  CalendarDays
} from 'lucide-react'
import { dropdownMenu } from '@/lib/animations'

// ============================================================================
// Types & Constants
// ============================================================================

type DatePickerMode = 'single' | 'range'
type DatePickerView = 'days' | 'months' | 'years'

interface DateRange {
  from: Date | null
  to: Date | null
}

interface DatePickerProps {
  mode?: DatePickerMode
  value?: Date | null
  onChange?: (date: Date | null) => void
  rangeValue?: DateRange
  onRangeChange?: (range: DateRange) => void
  placeholder?: string
  placeholderFrom?: string
  placeholderTo?: string
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  disabledDaysOfWeek?: number[]
  locale?: string
  firstDayOfWeek?: 0 | 1
  showOutsideDays?: boolean
  showToday?: boolean
  className?: string
  inputClassName?: string
  calendarClassName?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  clearable?: boolean
  label?: string
  error?: string
  hint?: string
  required?: boolean
  numberOfMonths?: 1 | 2
}

const DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const DAYS_SHORT_MON = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]
const MONTHS_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
]

// ============================================================================
// Utility Functions
// ============================================================================

function isSameDay(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function isDateInRange(date: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false
  const time = date.getTime()
  return time > from.getTime() && time < to.getTime()
}

function isDateDisabled(
  date: Date,
  minDate?: Date,
  maxDate?: Date,
  disabledDates?: Date[],
  disabledDaysOfWeek?: number[]
): boolean {
  if (minDate && date < minDate) return true
  if (maxDate && date > maxDate) return true
  if (disabledDaysOfWeek?.includes(date.getDay())) return true
  if (disabledDates?.some(d => isSameDay(d, date))) return true
  return false
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDate(date: Date | null, locale = 'ru-RU'): string {
  if (!date) return ''
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateShort(date: Date | null): string {
  if (!date) return ''
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}

// ============================================================================
// Size Styles
// ============================================================================

const sizeStyles = {
  sm: {
    input: 'h-9 text-sm px-3',
    icon: 'w-4 h-4',
    calendar: 'text-sm',
    day: 'w-8 h-8 text-xs',
  },
  md: {
    input: 'h-11 text-sm px-4',
    icon: 'w-5 h-5',
    calendar: 'text-sm',
    day: 'w-10 h-10 text-sm',
  },
  lg: {
    input: 'h-12 text-base px-4',
    icon: 'w-5 h-5',
    calendar: 'text-base',
    day: 'w-12 h-12 text-base',
  },
}

// ============================================================================
// Calendar Month Component
// ============================================================================

interface CalendarMonthProps {
  year: number
  month: number
  selectedDate: Date | null
  rangeStart: Date | null
  rangeEnd: Date | null
  mode: DatePickerMode
  firstDayOfWeek: 0 | 1
  showOutsideDays: boolean
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  disabledDaysOfWeek?: number[]
  onSelectDate: (date: Date) => void
  size: 'sm' | 'md' | 'lg'
  hoverDate: Date | null
  onHoverDate: (date: Date | null) => void
}

function CalendarMonth({
  year,
  month,
  selectedDate,
  rangeStart,
  rangeEnd,
  mode,
  firstDayOfWeek,
  showOutsideDays,
  minDate,
  maxDate,
  disabledDates,
  disabledDaysOfWeek,
  onSelectDate,
  size,
  hoverDate,
  onHoverDate,
}: CalendarMonthProps) {
  const styles = sizeStyles[size]
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  
  // Adjust for firstDayOfWeek
  let startOffset = firstDayOfWeek === 1 
    ? (firstDay === 0 ? 6 : firstDay - 1) 
    : firstDay
  
  const days: (Date | null)[] = []
  
  // Previous month days
  if (showOutsideDays) {
    const prevMonthDays = getDaysInMonth(year, month - 1)
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthDays - i))
    }
  } else {
    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day))
  }
  
  // Next month days
  const remainingDays = 42 - days.length // 6 weeks * 7 days
  if (showOutsideDays) {
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i))
    }
  }
  
  const weekDays = firstDayOfWeek === 1 ? DAYS_SHORT_MON : DAYS_SHORT
  const today = new Date()
  
  // For range preview
  const previewEnd = mode === 'range' && rangeStart && !rangeEnd ? hoverDate : rangeEnd
  
  return (
    <div className="p-3">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className={cn(
              'text-center font-medium text-neutral-400 dark:text-neutral-500',
              styles.day,
              'flex items-center justify-center'
            )}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          if (!date) {
            return <div key={i} className={styles.day} />
          }
          
          const isOutside = date.getMonth() !== month
          const isDisabled = isDateDisabled(date, minDate, maxDate, disabledDates, disabledDaysOfWeek)
          const isToday = isSameDay(date, today)
          const isSelected = mode === 'single' && isSameDay(date, selectedDate)
          const isRangeStart = mode === 'range' && isSameDay(date, rangeStart)
          const isRangeEnd = mode === 'range' && isSameDay(date, rangeEnd || previewEnd)
          const isInRange = mode === 'range' && isDateInRange(date, rangeStart, previewEnd)
          
          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled || isOutside}
              onClick={() => !isDisabled && !isOutside && onSelectDate(date)}
              onMouseEnter={() => mode === 'range' && rangeStart && !rangeEnd && onHoverDate(date)}
              onMouseLeave={() => onHoverDate(null)}
              className={cn(
                styles.day,
                'relative flex items-center justify-center rounded-lg',
                'transition-all duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                
                // Outside month
                isOutside && 'opacity-0 pointer-events-none',
                
                // Disabled
                isDisabled && 'opacity-30 cursor-not-allowed',
                
                // Default state
                !isSelected && !isRangeStart && !isRangeEnd && !isInRange && !isDisabled && !isOutside &&
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                
                // Today indicator
                isToday && !isSelected && !isRangeStart && !isRangeEnd &&
                  'font-semibold text-primary-600 dark:text-primary-400',
                
                // Selected (single mode)
                isSelected && 'bg-primary-500 text-white font-medium',
                
                // Range start/end
                (isRangeStart || isRangeEnd) && 'bg-primary-500 text-white font-medium',
                
                // In range
                isInRange && 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
                
                // Range visual connection
                isRangeStart && rangeEnd && 'rounded-r-none',
                isRangeEnd && rangeStart && 'rounded-l-none',
                isInRange && 'rounded-none'
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Main DatePicker Component
// ============================================================================

export function DatePicker({
  mode = 'single',
  value,
  onChange,
  rangeValue,
  onRangeChange,
  placeholder = 'Выберите дату',
  placeholderFrom = 'Заезд',
  placeholderTo = 'Выезд',
  minDate,
  maxDate,
  disabledDates,
  disabledDaysOfWeek,
  locale = 'ru-RU',
  firstDayOfWeek = 1,
  showOutsideDays = true,
  showToday = true,
  className,
  inputClassName,
  calendarClassName,
  size = 'md',
  disabled = false,
  clearable = true,
  label,
  error,
  hint,
  required = false,
  numberOfMonths = 1,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<DatePickerView>('days')
  const [viewDate, setViewDate] = useState(() => {
    if (mode === 'single' && value) return new Date(value)
    if (mode === 'range' && rangeValue?.from) return new Date(rangeValue.from)
    return new Date()
  })
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLButtonElement>(null)
  
  const styles = sizeStyles[size]
  
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.focus()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])
  
  // Navigation handlers
  const goToPrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  
  const goToNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }
  
  const goToToday = () => {
    setViewDate(new Date())
  }
  
  // Date selection handler
  const handleSelectDate = (date: Date) => {
    if (mode === 'single') {
      onChange?.(date)
      setIsOpen(false)
    } else {
      // Range mode
      if (!rangeValue?.from || (rangeValue.from && rangeValue.to)) {
        // Start new range
        onRangeChange?.({ from: date, to: null })
      } else {
        // Complete range
        if (date < rangeValue.from) {
          onRangeChange?.({ from: date, to: rangeValue.from })
        } else {
          onRangeChange?.({ from: rangeValue.from, to: date })
        }
        setIsOpen(false)
      }
    }
  }
  
  // Clear handler
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (mode === 'single') {
      onChange?.(null)
    } else {
      onRangeChange?.({ from: null, to: null })
    }
  }
  
  // Display value
  const displayValue = useMemo(() => {
    if (mode === 'single') {
      return value ? formatDate(value, locale) : null
    }
    if (rangeValue?.from && rangeValue?.to) {
      return `${formatDateShort(rangeValue.from)} — ${formatDateShort(rangeValue.to)}`
    }
    if (rangeValue?.from) {
      return `${formatDateShort(rangeValue.from)} — ...`
    }
    return null
  }, [mode, value, rangeValue, locale])
  
  const hasValue = mode === 'single' ? !!value : !!(rangeValue?.from || rangeValue?.to)
  
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1.5">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input trigger */}
      <button
        ref={inputRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 rounded-xl border',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          styles.input,
          inputClassName,
          
          // States
          disabled && 'opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800',
          error 
            ? 'border-danger-300 dark:border-danger-700' 
            : 'border-neutral-200 dark:border-neutral-700',
          isOpen && !error && 'ring-2 ring-primary-500 border-primary-500',
          
          // Background
          !disabled && 'bg-white dark:bg-neutral-800',
          'hover:border-neutral-300 dark:hover:border-neutral-600'
        )}
      >
        <Calendar className={cn('flex-shrink-0 text-neutral-400', styles.icon)} />
        
        {mode === 'single' ? (
          <span className={cn(
            'flex-1 text-left truncate',
            displayValue ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
          )}>
            {displayValue || placeholder}
          </span>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <span className={cn(
              'flex-1 text-left truncate',
              rangeValue?.from ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
            )}>
              {rangeValue?.from ? formatDateShort(rangeValue.from) : placeholderFrom}
            </span>
            <span className="text-neutral-300">→</span>
            <span className={cn(
              'flex-1 text-left truncate',
              rangeValue?.to ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
            )}>
              {rangeValue?.to ? formatDateShort(rangeValue.to) : placeholderTo}
            </span>
          </div>
        )}
        
        {clearable && hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        )}
      </button>
      
      {/* Error/Hint text */}
      {(error || hint) && (
        <p className={cn(
          'mt-1.5 text-xs',
          error ? 'text-danger-500' : 'text-neutral-500 dark:text-neutral-400'
        )}>
          {error || hint}
        </p>
      )}
      
      {/* Calendar dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownMenu}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={cn(
              'absolute z-50 mt-2',
              'bg-white dark:bg-neutral-900',
              'rounded-2xl border border-neutral-200 dark:border-neutral-700',
              'shadow-lg shadow-black/10',
              numberOfMonths === 2 ? 'left-0' : 'left-0',
              calendarClassName
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={goToPrevMonth}
                className={cn(
                  'p-2 rounded-lg',
                  'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'transition-colors'
                )}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4">
                {Array.from({ length: numberOfMonths }).map((_, i) => {
                  const monthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + i, 1)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setView(view === 'months' ? 'days' : 'months')}
                      className={cn(
                        'font-semibold text-neutral-900 dark:text-white',
                        'hover:text-primary-500 transition-colors'
                      )}
                    >
                      {MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
                    </button>
                  )
                })}
              </div>
              
              <button
                type="button"
                onClick={goToNextMonth}
                className={cn(
                  'p-2 rounded-lg',
                  'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'transition-colors'
                )}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            {/* Calendar body */}
            <div className={cn(
              'flex',
              numberOfMonths === 2 && 'divide-x divide-neutral-100 dark:divide-neutral-800'
            )}>
              {view === 'days' && Array.from({ length: numberOfMonths }).map((_, i) => {
                const monthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + i, 1)
                return (
                  <CalendarMonth
                    key={i}
                    year={monthDate.getFullYear()}
                    month={monthDate.getMonth()}
                    selectedDate={mode === 'single' ? value ?? null : null}
                    rangeStart={mode === 'range' ? rangeValue?.from ?? null : null}
                    rangeEnd={mode === 'range' ? rangeValue?.to ?? null : null}
                    mode={mode}
                    firstDayOfWeek={firstDayOfWeek}
                    showOutsideDays={showOutsideDays}
                    minDate={minDate}
                    maxDate={maxDate}
                    disabledDates={disabledDates}
                    disabledDaysOfWeek={disabledDaysOfWeek}
                    onSelectDate={handleSelectDate}
                    size={size}
                    hoverDate={hoverDate}
                    onHoverDate={setHoverDate}
                  />
                )
              })}
              
              {/* Month picker view */}
              {view === 'months' && (
                <div className="p-3 grid grid-cols-3 gap-2">
                  {MONTHS.map((monthName, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setViewDate(new Date(viewDate.getFullYear(), i, 1))
                        setView('days')
                      }}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium',
                        'transition-colors',
                        viewDate.getMonth() === i 
                          ? 'bg-primary-500 text-white'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      )}
                    >
                      {MONTHS_SHORT[i]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {showToday && (
              <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={goToToday}
                  className={cn(
                    'text-sm font-medium text-primary-500 hover:text-primary-600',
                    'transition-colors'
                  )}
                >
                  Сегодня
                </button>
                
                {mode === 'range' && rangeValue?.from && !rangeValue?.to && (
                  <span className="text-xs text-neutral-400">
                    Выберите дату окончания
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Date Range Picker (Convenience wrapper)
// ============================================================================

interface DateRangePickerProps extends Omit<DatePickerProps, 'mode' | 'value' | 'onChange'> {
  value?: DateRange
  onChange?: (range: DateRange) => void
}

export function DateRangePicker({
  value,
  onChange,
  numberOfMonths = 2,
  ...props
}: DateRangePickerProps) {
  return (
    <DatePicker
      mode="range"
      rangeValue={value}
      onRangeChange={onChange}
      numberOfMonths={numberOfMonths}
      {...props}
    />
  )
}
