'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Building2,
  Calendar,
  CalendarDays,
  Users,
  Settings,
  BarChart3,
  MessageSquare,
  Gift,
  Menu,
  X,
  ChevronRight,
  Home,
  Wallet,
  ClipboardList,
  FileText,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  roles?: ('OWNER' | 'TECH_ADMIN')[]
  children?: { label: string; href: string; roles?: ('OWNER' | 'TECH_ADMIN')[] }[]
}

const menuItems: MenuItem[] = [
  { 
    icon: LayoutDashboard, 
    label: 'Дашборд', 
    href: '/admin' 
  },
  { 
    icon: Building2, 
    label: 'Апартаменты', 
    href: '/admin/apartments',
    children: [
      { label: 'Все объекты', href: '/admin/apartments' },
      { label: 'Добавить', href: '/admin/apartments/new' },
    ]
  },
  { 
    icon: CalendarDays, 
    label: 'Календарь', 
    href: '/admin/calendar' 
  },
  { 
    icon: Calendar, 
    label: 'Бронирования', 
    href: '/admin/bookings' 
  },
  { 
    icon: Wallet, 
    label: 'Бухгалтерия', 
    href: '/admin/accounting' 
  },
  { 
    icon: Gift, 
    label: 'Промокоды', 
    href: '/admin/promo' 
  },
  { 
    icon: MessageSquare, 
    label: 'Отзывы', 
    href: '/admin/reviews' 
  },
  { 
    icon: BarChart3, 
    label: 'Статистика', 
    href: '/admin/stats' 
  },
  { 
    icon: Settings, 
    label: 'Настройки', 
    href: '/admin/settings' 
  },
  // Только для TECH_ADMIN
  { 
    icon: Users, 
    label: 'Пользователи', 
    href: '/admin/users',
    roles: ['TECH_ADMIN']
  },
  { 
    icon: FileText, 
    label: 'Документы', 
    href: '/admin/documents',
    roles: ['TECH_ADMIN']
  },
  { 
    icon: ClipboardList, 
    label: 'Журнал действий', 
    href: '/admin/logs',
    roles: ['TECH_ADMIN']
  },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Закрываем мобильное меню при смене страницы
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // На десктопе sidebar открыт по умолчанию
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true)
        setIsMobileMenuOpen(false)
      } else {
        setIsSidebarOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=' + encodeURIComponent(pathname))
      return
    }

    if (!isLoading && user && user.role !== 'OWNER' && user.role !== 'TECH_ADMIN') {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, user, router, pathname])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(h => h !== href)
        : [...prev, href]
    )
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true
    return user && item.roles.includes(user.role as 'OWNER' | 'TECH_ADMIN')
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || (user.role !== 'OWNER' && user.role !== 'TECH_ADMIN')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Мобильный header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 shadow-md z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Открыть меню"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <Link href="/admin" className="text-xl font-bold text-primary">
          {user.role === 'TECH_ADMIN' ? 'Tech Admin' : 'Мои объекты'}
        </Link>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Overlay для мобильного меню */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 z-50',
          // Desktop
          'hidden lg:block',
          isSidebarOpen ? 'lg:w-64' : 'lg:w-20',
          // Mobile
          isMobileMenuOpen && 'block w-72'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {(isSidebarOpen || isMobileMenuOpen) && (
            <div>
              <Link href="/admin" className="text-xl font-bold text-primary">
                {user.role === 'TECH_ADMIN' ? 'Tech Admin' : 'Мои объекты'}
              </Link>
              <p className="text-xs text-gray-500">
                {user.role === 'TECH_ADMIN' ? 'Полный доступ' : 'Владелец'}
              </p>
            </div>
          )}
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setIsSidebarOpen(!isSidebarOpen)
              } else {
                setIsMobileMenuOpen(false)
              }
            }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {(isSidebarOpen || isMobileMenuOpen) ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-10rem)]">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const isExpanded = expandedItems.includes(item.href)
            const hasChildren = item.children && item.children.length > 0

            const filteredChildren = item.children?.filter(child => {
              if (!child.roles) return true
              return user && child.roles.includes(user.role as 'OWNER' | 'TECH_ADMIN')
            })

            return (
              <div key={item.href}>
                <Link
                  href={hasChildren ? '#' : item.href}
                  onClick={(e) => {
                    if (hasChildren) {
                      e.preventDefault()
                      toggleExpanded(item.href)
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {(isSidebarOpen || isMobileMenuOpen) && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {hasChildren && (
                        <ChevronRight 
                          className={cn(
                            'w-4 h-4 transition-transform',
                            isExpanded && 'rotate-90'
                          )} 
                        />
                      )}
                    </>
                  )}
                </Link>

                {hasChildren && (isSidebarOpen || isMobileMenuOpen) && isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-8 mt-1 space-y-1"
                  >
                    {filteredChildren?.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'block px-3 py-2 text-sm rounded-lg transition-colors',
                          pathname === child.href
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white dark:bg-gray-800">
          {(isSidebarOpen || isMobileMenuOpen) && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          )}
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
              !(isSidebarOpen || isMobileMenuOpen) && 'justify-center'
            )}
          >
            <Home className="w-5 h-5" />
            {(isSidebarOpen || isMobileMenuOpen) && <span>На сайт</span>}
          </Link>
        </div>
      </aside>

      <main
        className={cn(
          'transition-all duration-300 min-h-screen',
          // Desktop margins
          'lg:ml-20',
          isSidebarOpen && 'lg:ml-64',
          // Mobile top padding for header
          'pt-16 lg:pt-0'
        )}
      >
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
