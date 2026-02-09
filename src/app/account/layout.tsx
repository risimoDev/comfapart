'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  User, 
  Calendar, 
  Heart, 
  Settings, 
  MessageSquare,
  LogOut,
  CalendarDays,
  BarChart3,
  Menu,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

// Базовые пункты меню для всех пользователей
const baseMenuItems = [
  { icon: User, label: 'Профиль', href: '/account' },
  { icon: Calendar, label: 'Мои бронирования', href: '/account/bookings' },
  { icon: Heart, label: 'Избранное', href: '/account/favorites' },
  { icon: MessageSquare, label: 'Мои отзывы', href: '/account/reviews' },
  { icon: Settings, label: 'Настройки', href: '/account/settings' },
]

// Дополнительные пункты для владельцев (OWNER)
const ownerMenuItems = [
  { icon: CalendarDays, label: 'Календарь занятости', href: '/account/calendar' },
  { icon: BarChart3, label: 'Статистика', href: '/account/stats' },
]

export default function AccountLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Закрываем мобильное меню при смене страницы
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Формируем меню в зависимости от роли
  const isOwner = user?.role === 'OWNER' || user?.role === 'TECH_ADMIN'
  const menuItems = isOwner ? [...baseMenuItems, ...ownerMenuItems] : baseMenuItems

  // Текущий активный пункт меню для мобильной версии
  const currentMenuItem = menuItems.find(item => pathname === item.href) || menuItems[0]

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 lg:py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
          {/* Мобильный dropdown меню */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <currentMenuItem.icon className="w-5 h-5 text-primary" />
                <span className="font-medium">{currentMenuItem.label}</span>
              </div>
              <ChevronDown className={cn(
                'w-5 h-5 transition-transform',
                isMobileMenuOpen && 'rotate-180'
              )} />
            </button>

            {isMobileMenuOpen && (
              <div className="mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <nav className="p-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                          isActive
                            ? 'bg-primary text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    )
                  })}

                  <hr className="my-2" />

                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Выйти
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* Десктоп сайдбар */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm sticky top-24">
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  )
                })}

                <hr className="my-4" />

                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Выйти
                </button>
              </nav>
            </div>
          </div>

          {/* Контент */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
