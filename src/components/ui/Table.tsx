'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Check,
  Minus
} from 'lucide-react'
import { Skeleton } from './Skeleton'
import { staggerContainer, staggerItem } from '@/lib/animations'

// ============================================================================
// Types
// ============================================================================

export type SortDirection = 'asc' | 'desc' | null

export interface Column<T> {
  key: string
  header: string | React.ReactNode
  cell?: (row: T, index: number) => React.ReactNode
  sortable?: boolean
  width?: string | number
  minWidth?: string | number
  maxWidth?: string | number
  align?: 'left' | 'center' | 'right'
  sticky?: boolean
  className?: string
  headerClassName?: string
}

export interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T, index: number) => string | number
  
  // Sorting
  sortable?: boolean
  sortKey?: string
  sortDirection?: SortDirection
  onSort?: (key: string, direction: SortDirection) => void
  
  // Selection
  selectable?: boolean
  selectedRows?: Set<string | number>
  onSelectRow?: (key: string | number, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
  
  // Pagination
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (size: number) => void
    pageSizeOptions?: number[]
  }
  
  // States
  loading?: boolean
  emptyMessage?: string | React.ReactNode
  
  // Styling
  className?: string
  headerClassName?: string
  bodyClassName?: string
  rowClassName?: string | ((row: T, index: number) => string)
  
  // Row interactions
  onRowClick?: (row: T, index: number) => void
  rowActions?: (row: T, index: number) => React.ReactNode
  
  // Variants
  variant?: 'default' | 'striped' | 'bordered'
  size?: 'sm' | 'md' | 'lg'
  stickyHeader?: boolean
  hoverable?: boolean
  animated?: boolean
}

// ============================================================================
// Style Maps
// ============================================================================

const cellPaddingSizes = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
}

const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

// ============================================================================
// Sub-components
// ============================================================================

interface TableContainerProps {
  children: React.ReactNode
  className?: string
}

export function TableContainer({ children, className }: TableContainerProps) {
  return (
    <div className={cn(
      'w-full overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800',
      'bg-white dark:bg-neutral-900',
      'shadow-sm',
      className
    )}>
      {children}
    </div>
  )
}

// Checkbox component for selection
interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

function Checkbox({ checked, indeterminate, onChange, disabled, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-4 h-4 rounded border-2 flex items-center justify-center',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        checked || indeterminate
          ? 'bg-primary-500 border-primary-500 text-white'
          : 'border-neutral-300 dark:border-neutral-600 bg-transparent',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {indeterminate ? (
        <Minus className="w-3 h-3" />
      ) : checked ? (
        <Check className="w-3 h-3" />
      ) : null}
    </button>
  )
}

// Sort indicator
interface SortIndicatorProps {
  direction: SortDirection
  active: boolean
}

function SortIndicator({ direction, active }: SortIndicatorProps) {
  return (
    <span className={cn(
      'inline-flex flex-col ml-1',
      active ? 'text-primary-500' : 'text-neutral-400'
    )}>
      {direction === null ? (
        <ChevronsUpDown className="w-4 h-4" />
      ) : direction === 'asc' ? (
        <ChevronUp className="w-4 h-4" />
      ) : (
        <ChevronDown className="w-4 h-4" />
      )}
    </span>
  )
}

// ============================================================================
// Main Table Component
// ============================================================================

export function Table<T>({
  data,
  columns,
  keyExtractor,
  sortable = false,
  sortKey,
  sortDirection,
  onSort,
  selectable = false,
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  pagination,
  loading = false,
  emptyMessage = 'Нет данных для отображения',
  className,
  headerClassName,
  bodyClassName,
  rowClassName,
  onRowClick,
  rowActions,
  variant = 'default',
  size = 'md',
  stickyHeader = false,
  hoverable = true,
  animated = true,
}: TableProps<T>) {
  
  // Computed values
  const allSelected = data.length > 0 && data.every((row, i) => 
    selectedRows.has(keyExtractor(row, i))
  )
  const someSelected = data.some((row, i) => 
    selectedRows.has(keyExtractor(row, i))
  ) && !allSelected
  
  // Handlers
  const handleSort = useCallback((key: string) => {
    if (!onSort) return
    
    let newDirection: SortDirection = 'asc'
    if (sortKey === key) {
      if (sortDirection === 'asc') newDirection = 'desc'
      else if (sortDirection === 'desc') newDirection = null
    }
    
    onSort(key, newDirection)
  }, [onSort, sortKey, sortDirection])
  
  const handleSelectAll = useCallback(() => {
    onSelectAll?.(!allSelected)
  }, [onSelectAll, allSelected])
  
  const handleSelectRow = useCallback((key: string | number) => {
    onSelectRow?.(key, !selectedRows.has(key))
  }, [onSelectRow, selectedRows])
  
  // Render loading state
  if (loading) {
    return (
      <TableContainer className={className}>
        <table className="w-full">
          <thead>
            <tr>
              {selectable && (
                <th className={cn(cellPaddingSizes[size], 'w-10')}>
                  <Skeleton className="w-4 h-4 rounded" />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className={cn(cellPaddingSizes[size])}>
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                {selectable && (
                  <td className={cn(cellPaddingSizes[size])}>
                    <Skeleton className="w-4 h-4 rounded" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cn(cellPaddingSizes[size])}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>
    )
  }
  
  // Render empty state
  if (data.length === 0) {
    return (
      <TableContainer className={className}>
        <table className="w-full">
          <thead className={cn(
            'bg-neutral-50 dark:bg-neutral-800/50',
            headerClassName
          )}>
            <tr>
              {selectable && (
                <th className={cn(
                  cellPaddingSizes[size],
                  'w-10',
                  textSizes[size],
                  'font-medium text-neutral-500 dark:text-neutral-400 text-left'
                )}>
                  <Checkbox
                    checked={false}
                    onChange={() => {}}
                    disabled
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    cellPaddingSizes[size],
                    textSizes[size],
                    'font-medium text-neutral-500 dark:text-neutral-400',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    !col.align && 'text-left',
                    col.headerClassName
                  )}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth,
                    maxWidth: col.maxWidth,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="flex items-center justify-center py-16 text-neutral-500 dark:text-neutral-400">
          {typeof emptyMessage === 'string' ? (
            <p className="text-sm">{emptyMessage}</p>
          ) : emptyMessage}
        </div>
      </TableContainer>
    )
  }
  
  return (
    <div className="space-y-4">
      <TableContainer className={className}>
        <table className="w-full">
          {/* Header */}
          <thead className={cn(
            'bg-neutral-50 dark:bg-neutral-800/50',
            stickyHeader && 'sticky top-0 z-10',
            headerClassName
          )}>
            <tr>
              {selectable && (
                <th className={cn(
                  cellPaddingSizes[size],
                  'w-10',
                  textSizes[size]
                )}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    cellPaddingSizes[size],
                    textSizes[size],
                    'font-medium text-neutral-500 dark:text-neutral-400',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    !col.align && 'text-left',
                    (sortable && col.sortable !== false) && 'cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors',
                    col.sticky && 'sticky left-0 bg-neutral-50 dark:bg-neutral-800/50',
                    col.headerClassName
                  )}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth,
                    maxWidth: col.maxWidth,
                  }}
                  onClick={() => {
                    if (sortable && col.sortable !== false) {
                      handleSort(col.key)
                    }
                  }}
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {sortable && col.sortable !== false && (
                      <SortIndicator
                        direction={sortKey === col.key && sortDirection !== undefined ? sortDirection : null}
                        active={sortKey === col.key}
                      />
                    )}
                  </span>
                </th>
              ))}
              {rowActions && (
                <th className={cn(cellPaddingSizes[size], 'w-10')} />
              )}
            </tr>
          </thead>
          
          {/* Body */}
          <motion.tbody
            className={bodyClassName}
            variants={animated ? staggerContainer : undefined}
            initial={animated ? 'hidden' : undefined}
            animate={animated ? 'visible' : undefined}
          >
            {data.map((row, index) => {
              const rowKey = keyExtractor(row, index)
              const isSelected = selectedRows.has(rowKey)
              const computedRowClassName = typeof rowClassName === 'function' 
                ? rowClassName(row, index) 
                : rowClassName
              
              const RowComponent = animated ? motion.tr : 'tr'
              const rowProps = animated ? { variants: staggerItem } : {}
              
              return (
                <RowComponent
                  key={rowKey}
                  {...rowProps}
                  className={cn(
                    'border-t border-neutral-100 dark:border-neutral-800',
                    'transition-colors duration-150',
                    variant === 'striped' && index % 2 === 1 && 'bg-neutral-50/50 dark:bg-neutral-800/30',
                    hoverable && 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                    isSelected && 'bg-primary-50/50 dark:bg-primary-900/20',
                    onRowClick && 'cursor-pointer',
                    computedRowClassName
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {selectable && (
                    <td 
                      className={cn(cellPaddingSizes[size])}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowKey)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        cellPaddingSizes[size],
                        textSizes[size],
                        'text-neutral-900 dark:text-neutral-100',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.sticky && 'sticky left-0 bg-white dark:bg-neutral-900',
                        col.className
                      )}
                      style={{
                        width: col.width,
                        minWidth: col.minWidth,
                        maxWidth: col.maxWidth,
                      }}
                    >
                      {col.cell 
                        ? col.cell(row, index) 
                        : (row as Record<string, unknown>)[col.key] as React.ReactNode
                      }
                    </td>
                  ))}
                  {rowActions && (
                    <td 
                      className={cn(cellPaddingSizes[size], 'text-right')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rowActions(row, index)}
                    </td>
                  )}
                </RowComponent>
              )
            })}
          </motion.tbody>
        </table>
      </TableContainer>
      
      {/* Pagination */}
      {pagination && (
        <TablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={pagination.pageSizeOptions}
        />
      )}
    </div>
  )
}

// ============================================================================
// Pagination Component
// ============================================================================

interface TablePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: TablePaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)
  
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5
    
    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      
      if (page > 3) pages.push('ellipsis')
      
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      
      for (let i = start; i <= end; i++) pages.push(i)
      
      if (page < totalPages - 2) pages.push('ellipsis')
      
      pages.push(totalPages)
    }
    
    return pages
  }
  
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      {/* Info */}
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Показано <span className="font-medium text-neutral-700 dark:text-neutral-200">{startItem}</span>
        {' '}-{' '}
        <span className="font-medium text-neutral-700 dark:text-neutral-200">{endItem}</span>
        {' '}из{' '}
        <span className="font-medium text-neutral-700 dark:text-neutral-200">{total}</span>
      </p>
      
      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Строк:
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(
                'h-8 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700',
                'bg-white dark:bg-neutral-800',
                'text-sm text-neutral-700 dark:text-neutral-200',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                'cursor-pointer'
              )}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Page numbers */}
        <nav className="flex items-center gap-1">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {/* Page buttons */}
          {getPageNumbers().map((pageNum, i) => 
            pageNum === 'ellipsis' ? (
              <span 
                key={`ellipsis-${i}`} 
                className="px-2 text-neutral-400"
              >
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium',
                  'transition-colors duration-150',
                  pageNum === page
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                )}
              >
                {pageNum}
              </button>
            )
          )}
          
          {/* Next button */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </div>
  )
}

// ============================================================================
// Simple Table Components (for custom layouts)
// ============================================================================

export const SimpleTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
))
SimpleTable.displayName = 'SimpleTable'

export const TableHead = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('[&_tr]:border-b', className)}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-neutral-100/50 dark:bg-neutral-800/50 font-medium [&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-neutral-100 dark:border-neutral-800',
      'transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
      'data-[state=selected]:bg-neutral-100 dark:data-[state=selected]:bg-neutral-800',
      className
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

export const TableHeaderCell = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium',
      'text-neutral-500 dark:text-neutral-400',
      '[&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
))
TableHeaderCell.displayName = 'TableHeaderCell'

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-4 align-middle [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-neutral-500 dark:text-neutral-400', className)}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'
