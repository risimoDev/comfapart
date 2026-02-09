'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { pageTransition, staggerContainer, staggerItem } from '@/lib/animations'

// ============================================================================
// Container - Main wrapper with max-width and padding
// ============================================================================

interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  as?: React.ElementType
  padding?: boolean
}

const containerSizes = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-[1400px]',
  full: 'max-w-full',
}

export function Container({
  children,
  className,
  size = 'xl',
  as: Component = 'div',
  padding = true,
}: ContainerProps) {
  return (
    <Component
      className={cn(
        'mx-auto w-full',
        containerSizes[size],
        padding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </Component>
  )
}

// ============================================================================
// Page Layout - Animated page wrapper
// ============================================================================

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
  animate?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export function PageLayout({
  children,
  className,
  animate = true,
  maxWidth = 'xl',
}: PageLayoutProps) {
  const Wrapper = animate ? motion.div : 'div'
  const wrapperProps = animate ? {
    variants: pageTransition,
    initial: 'initial',
    animate: 'animate',
    exit: 'exit',
  } : {}
  
  return (
    <Wrapper
      {...wrapperProps}
      className={cn('flex-1 w-full', className)}
    >
      <Container size={maxWidth} className="py-6 md:py-8">
        {children}
      </Container>
    </Wrapper>
  )
}

// ============================================================================
// Page Header - Title and actions section
// ============================================================================

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: React.ReactNode
  className?: string
  back?: {
    label: string
    href: string
  }
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
  back,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 md:mb-8', className)}>
      {breadcrumbs && (
        <div className="mb-4">
          {breadcrumbs}
        </div>
      )}
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className={cn(
            'text-2xl font-bold tracking-tight',
            'text-neutral-900 dark:text-white',
            'sm:text-3xl'
          )}>
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 sm:text-base">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Section - Content section with optional title
// ============================================================================

interface SectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function Section({
  children,
  title,
  description,
  actions,
  className,
  contentClassName,
}: SectionProps) {
  return (
    <section className={cn('mb-8 last:mb-0', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  )
}

// ============================================================================
// Grid Layouts
// ============================================================================

interface GridProps {
  children: React.ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  responsive?: boolean
}

const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
}

const gridGaps = {
  sm: 'gap-3',
  md: 'gap-4 md:gap-6',
  lg: 'gap-6 md:gap-8',
  xl: 'gap-8 md:gap-10',
}

export function Grid({
  children,
  className,
  cols = 3,
  gap = 'md',
}: GridProps) {
  return (
    <div className={cn('grid', gridCols[cols], gridGaps[gap], className)}>
      {children}
    </div>
  )
}

// Animated grid
export function AnimatedGrid({
  children,
  className,
  cols = 3,
  gap = 'md',
}: GridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={cn('grid', gridCols[cols], gridGaps[gap], className)}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={staggerItem}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

// ============================================================================
// Flex Layouts
// ============================================================================

interface FlexProps {
  children: React.ReactNode
  className?: string
  direction?: 'row' | 'col'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const flexAlign = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
}

const flexJustify = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
}

const flexGaps = {
  none: '',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

export function Flex({
  children,
  className,
  direction = 'row',
  align = 'center',
  justify = 'start',
  wrap = false,
  gap = 'md',
}: FlexProps) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'col' ? 'flex-col' : 'flex-row',
        flexAlign[align],
        flexJustify[justify],
        wrap && 'flex-wrap',
        flexGaps[gap],
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Split Layout - Two column layout
// ============================================================================

interface SplitLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
  leftWidth?: string
  rightWidth?: string
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  reverseOnMobile?: boolean
  stickyRight?: boolean
}

export function SplitLayout({
  left,
  right,
  leftWidth = '2fr',
  rightWidth = '1fr',
  gap = 'lg',
  className,
  reverseOnMobile = false,
  stickyRight = false,
}: SplitLayoutProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 lg:grid-cols-[var(--left-width)_var(--right-width)]',
        gridGaps[gap],
        reverseOnMobile && 'flex flex-col-reverse lg:grid',
        className
      )}
      style={{
        '--left-width': leftWidth,
        '--right-width': rightWidth,
      } as React.CSSProperties}
    >
      <div>{left}</div>
      <div className={cn(stickyRight && 'lg:sticky lg:top-24 lg:self-start')}>
        {right}
      </div>
    </div>
  )
}

// ============================================================================
// Sidebar Layout - Main content with sidebar
// ============================================================================

interface SidebarLayoutProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  sidebarPosition?: 'left' | 'right'
  sidebarWidth?: string
  collapsedWidth?: string
  className?: string
  sidebarClassName?: string
  contentClassName?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  mobileBreakpoint?: 'sm' | 'md' | 'lg' | 'xl'
  onCollapsedChange?: (collapsed: boolean) => void
}

export function SidebarLayout({
  children,
  sidebar,
  sidebarPosition = 'left',
  sidebarWidth = '280px',
  collapsedWidth = '64px',
  className,
  sidebarClassName,
  contentClassName,
  collapsible = false,
  defaultCollapsed = false,
  mobileBreakpoint = 'lg',
  onCollapsedChange,
}: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  const handleToggle = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    onCollapsedChange?.(newState)
  }

  const breakpointClasses = {
    sm: { hidden: 'hidden sm:flex', visible: 'sm:hidden' },
    md: { hidden: 'hidden md:flex', visible: 'md:hidden' },
    lg: { hidden: 'hidden lg:flex', visible: 'lg:hidden' },
    xl: { hidden: 'hidden xl:flex', visible: 'xl:hidden' },
  }

  return (
    <div
      className={cn(
        'flex min-h-screen relative',
        sidebarPosition === 'right' && 'flex-row-reverse',
        className
      )}
    >
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={cn(
          'fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-neutral-800 shadow-lg border',
          breakpointClasses[mobileBreakpoint].visible
        )}
        aria-label="Открыть меню"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className={cn('fixed inset-0 bg-black/50 z-40', breakpointClasses[mobileBreakpoint].visible)}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base styles
          'flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800',
          'bg-white dark:bg-neutral-900 transition-all duration-300',
          sidebarPosition === 'right' && 'border-r-0 border-l',
          // Desktop - hidden by default, shown on breakpoint
          breakpointClasses[mobileBreakpoint].hidden,
          // Mobile - absolute positioned when open
          isMobileOpen && 'fixed inset-y-0 left-0 z-50 flex w-72',
          sidebarClassName
        )}
        style={{ 
          width: isMobileOpen ? '288px' : (collapsible && isCollapsed ? collapsedWidth : sidebarWidth)
        }}
      >
        <div className="flex flex-col h-full w-full overflow-hidden">
          {collapsible && (
            <button
              onClick={handleToggle}
              className={cn(
                'hidden self-end p-2 m-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
                breakpointClasses[mobileBreakpoint].hidden.replace('hidden', 'lg:flex')
              )}
              aria-label={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
            >
              <svg 
                className={cn('w-5 h-5 transition-transform', isCollapsed && 'rotate-180')} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1 overflow-y-auto">
            {sidebar}
          </div>
        </div>
        
        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Закрыть меню"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </aside>
      
      <main className={cn('flex-1 min-w-0', contentClassName)}>
        {children}
      </main>
    </div>
  )
}

// ============================================================================
// Dashboard Layout - Header, sidebar, content
// ============================================================================

interface DashboardLayoutProps {
  children: React.ReactNode
  header?: React.ReactNode
  sidebar?: React.ReactNode
  footer?: React.ReactNode
  sidebarWidth?: string
  className?: string
}

export function DashboardLayout({
  children,
  header,
  sidebar,
  footer,
  sidebarWidth = '260px',
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      {header && (
        <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          {header}
        </header>
      )}
      
      <div className="flex-1 flex">
        {sidebar && (
          <aside
            className="hidden lg:block flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900"
            style={{ width: sidebarWidth }}
          >
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              {sidebar}
            </div>
          </aside>
        )}
        
        <main className="flex-1 min-w-0 bg-neutral-50 dark:bg-neutral-950">
          {children}
        </main>
      </div>
      
      {footer && (
        <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          {footer}
        </footer>
      )}
    </div>
  )
}

// ============================================================================
// Card Grid - Specifically for card layouts
// ============================================================================

interface CardGridProps {
  children: React.ReactNode
  className?: string
  minCardWidth?: string
}

export function CardGrid({
  children,
  className,
  minCardWidth = '280px',
}: CardGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4 md:gap-6',
        className
      )}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}, 1fr))`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Spacer - Adds vertical or horizontal space
// ============================================================================

interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const spacerSizes = {
  xs: 'h-2',
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-8',
  xl: 'h-12',
  '2xl': 'h-16',
}

export function Spacer({ size = 'md', className }: SpacerProps) {
  return <div className={cn(spacerSizes[size], className)} aria-hidden />
}

// ============================================================================
// Divider - Horizontal line separator
// ============================================================================

interface DividerProps {
  className?: string
  label?: string
}

export function Divider({ className, label }: DividerProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-4 my-6', className)}>
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
      </div>
    )
  }
  
  return (
    <hr className={cn(
      'my-6 border-t border-neutral-200 dark:border-neutral-800',
      className
    )} />
  )
}
