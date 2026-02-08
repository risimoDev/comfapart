'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

type TabsVariant = 'default' | 'pills' | 'underline' | 'enclosed'
type TabsSize = 'sm' | 'md' | 'lg'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (value: string) => void
  variant: TabsVariant
  size: TabsSize
}

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  variant?: TabsVariant
  size?: TabsSize
  className?: string
  children: React.ReactNode
}

interface TabsListProps {
  className?: string
  children: React.ReactNode
  fullWidth?: boolean
}

interface TabsTriggerProps {
  value: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
}

interface TabsContentProps {
  value: string
  className?: string
  children: React.ReactNode
  forceMount?: boolean
}

// ============================================================================
// Context
// ============================================================================

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider')
  }
  return context
}

// ============================================================================
// Style Maps
// ============================================================================

const listVariantStyles: Record<TabsVariant, string> = {
  default: 'bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl',
  pills: 'gap-2',
  underline: 'border-b border-neutral-200 dark:border-neutral-700 gap-4',
  enclosed: 'border-b border-neutral-200 dark:border-neutral-700',
}

const triggerBaseStyles = `
  relative inline-flex items-center justify-center gap-2
  font-medium transition-all duration-200
  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
`

const triggerVariantStyles: Record<TabsVariant, { active: string; inactive: string }> = {
  default: {
    active: 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm',
    inactive: 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white',
  },
  pills: {
    active: 'bg-primary-500 text-white shadow-md shadow-primary-500/25',
    inactive: 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
  },
  underline: {
    active: 'text-primary-600 dark:text-primary-400',
    inactive: 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white',
  },
  enclosed: {
    active: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 border border-b-0 text-neutral-900 dark:text-white -mb-px rounded-t-lg',
    inactive: 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-transparent',
  },
}

const triggerSizeStyles: Record<TabsSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-base rounded-xl',
}

// ============================================================================
// Main Components
// ============================================================================

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  variant = 'default',
  size = 'md',
  className,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '')
  
  const activeTab = value !== undefined ? value : internalValue
  const setActiveTab = useCallback((newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }, [value, onValueChange])
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant, size }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children, fullWidth = false }: TabsListProps) {
  const { variant } = useTabsContext()
  
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center',
        listVariantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  disabled = false,
  className,
  children,
  icon,
  badge,
}: TabsTriggerProps) {
  const { activeTab, setActiveTab, variant, size } = useTabsContext()
  const isActive = activeTab === value
  
  const styles = triggerVariantStyles[variant]
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={cn(
        triggerBaseStyles,
        triggerSizeStyles[size],
        isActive ? styles.active : styles.inactive,
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge && <span className="flex-shrink-0">{badge}</span>}
      
      {/* Underline indicator for underline variant */}
      {variant === 'underline' && isActive && (
        <motion.div
          layoutId="tabs-underline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        />
      )}
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children,
  forceMount = false,
}: TabsContentProps) {
  const { activeTab } = useTabsContext()
  const isActive = activeTab === value
  
  if (!forceMount && !isActive) return null
  
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={value}
          role="tabpanel"
          id={`panel-${value}`}
          aria-labelledby={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn('mt-4 focus:outline-none', className)}
          tabIndex={0}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Vertical Tabs
// ============================================================================

interface VerticalTabsProps extends Omit<TabsProps, 'variant'> {
  variant?: 'default' | 'pills'
}

export function VerticalTabs({
  variant = 'default',
  ...props
}: VerticalTabsProps) {
  return <Tabs variant={variant} {...props} />
}

interface VerticalTabsListProps {
  className?: string
  children: React.ReactNode
}

export function VerticalTabsList({ className, children }: VerticalTabsListProps) {
  const { variant } = useTabsContext()
  
  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      className={cn(
        'flex flex-col gap-1',
        variant === 'default' && 'p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl',
        className
      )}
    >
      {children}
    </div>
  )
}

interface VerticalTabsTriggerProps extends TabsTriggerProps {
  description?: string
}

export function VerticalTabsTrigger({
  value,
  disabled = false,
  className,
  children,
  icon,
  badge,
  description,
}: VerticalTabsTriggerProps) {
  const { activeTab, setActiveTab, variant, size } = useTabsContext()
  const isActive = activeTab === value
  
  const styles = triggerVariantStyles[variant]
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={cn(
        'relative flex items-center gap-3 w-full text-left',
        'font-medium transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        triggerSizeStyles[size],
        isActive ? styles.active : styles.inactive,
        className
      )}
    >
      {icon && (
        <span className={cn(
          'flex-shrink-0 w-5 h-5',
          isActive ? 'text-primary-500' : 'text-neutral-400'
        )}>
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <span className="block truncate">{children}</span>
        {description && (
          <span className={cn(
            'block text-xs truncate mt-0.5',
            isActive ? 'text-neutral-500' : 'text-neutral-400'
          )}>
            {description}
          </span>
        )}
      </div>
      {badge && <span className="flex-shrink-0">{badge}</span>}
      
      {/* Left indicator for active state */}
      {variant === 'default' && isActive && (
        <motion.div
          layoutId="vertical-tabs-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-full"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        />
      )}
    </button>
  )
}

export function VerticalTabsContent({
  value,
  className,
  children,
  forceMount = false,
}: TabsContentProps) {
  const { activeTab } = useTabsContext()
  const isActive = activeTab === value
  
  if (!forceMount && !isActive) return null
  
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={value}
          role="tabpanel"
          id={`panel-${value}`}
          aria-labelledby={value}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className={cn('focus:outline-none', className)}
          tabIndex={0}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Scrollable Tabs (for mobile or many tabs)
// ============================================================================

interface ScrollableTabsListProps extends TabsListProps {
  showArrows?: boolean
}

export function ScrollableTabsList({ 
  className, 
  children, 
  showArrows = true,
}: ScrollableTabsListProps) {
  const { variant } = useTabsContext()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  
  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftArrow(scrollLeft > 0)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
  }, [])
  
  React.useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [checkScroll])
  
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.5
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }
  
  return (
    <div className="relative">
      {/* Left fade + arrow */}
      {showArrows && showLeftArrow && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none" />
          <button
            onClick={() => scroll('left')}
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 z-20',
              'w-8 h-8 flex items-center justify-center',
              'bg-white dark:bg-neutral-800 rounded-full shadow-md',
              'text-neutral-600 dark:text-neutral-300',
              'hover:bg-neutral-50 dark:hover:bg-neutral-700',
              'transition-all duration-200'
            )}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </>
      )}
      
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        role="tablist"
        className={cn(
          'flex items-center overflow-x-auto scrollbar-hide',
          listVariantStyles[variant],
          className
        )}
      >
        {children}
      </div>
      
      {/* Right fade + arrow */}
      {showArrows && showRightArrow && (
        <>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none" />
          <button
            onClick={() => scroll('right')}
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2 z-20',
              'w-8 h-8 flex items-center justify-center',
              'bg-white dark:bg-neutral-800 rounded-full shadow-md',
              'text-neutral-600 dark:text-neutral-300',
              'hover:bg-neutral-50 dark:hover:bg-neutral-700',
              'transition-all duration-200'
            )}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
