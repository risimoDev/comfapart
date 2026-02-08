'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, 
  X, 
  User, 
  Heart, 
  Calendar, 
  LogOut,
  Settings,
  Building2,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, logout: authLogout } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Отслеживаем скролл
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    setIsUserMenuOpen(false)
    await authLogout()
    router.push('/auth/login?logout=true')
  }

  const isHomePage = pathname === '/'
  const headerBg = isHomePage && !isScrolled
    ? 'bg-primary/90 backdrop-blur-md'
    : 'bg-white dark:bg-gray-900 shadow-sm'
  const textColor = isHomePage && !isScrolled
    ? 'text-white'
    : 'text-gray-800 dark:text-white'

  return (
    <header className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-300', headerBg)}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Логотип */}
          <Link href="/" className="flex items-center gap-2">
            <span className={cn('text-2xl font-display font-bold transition-colors', 
              isHomePage && !isScrolled ? 'text-white' : 'text-primary'
            )}>
              Comfort
            </span>
          </Link>

          {/* Навигация - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/apartments"
              className={cn(
                'font-medium transition-colors hover:text-primary',
                textColor,
                pathname === '/apartments' && 'text-primary'
              )}
            >
              Апартаменты
            </Link>
            <Link
              href="/about"
              className={cn(
                'font-medium transition-colors hover:text-primary',
                textColor,
                pathname === '/about' && 'text-primary'
              )}
            >
              О нас
            </Link>
            <Link
              href="/contacts"
              className={cn(
                'font-medium transition-colors hover:text-primary',
                textColor,
                pathname === '/contacts' && 'text-primary'
              )}
            >
              Контакты
            </Link>
          </nav>

          {/* Правая часть */}
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                {/* Избранное */}
                <Link
                  href="/account/favorites"
                  className={cn('p-2 rounded-full hover:bg-black/10 transition-colors', textColor)}
                >
                  <Heart className="w-5 h-5" />
                </Link>

                {/* Меню пользователя */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-full border transition-colors',
                      isHomePage && !isScrolled 
                        ? 'border-white/30 hover:bg-white/10' 
                        : 'border-gray-200 hover:border-gray-300',
                      textColor
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <span className="text-sm font-medium text-primary">
                          {user.firstName[0]}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:block font-medium">{user.firstName}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 border"
                      >
                        <div className="px-4 py-2 border-b">
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>

                        <div className="py-2">
                          <Link
                            href="/account"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User className="w-4 h-4" />
                            Мой профиль
                          </Link>
                          <Link
                            href="/account/bookings"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Calendar className="w-4 h-4" />
                            Мои бронирования
                          </Link>
                          <Link
                            href="/account/favorites"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Heart className="w-4 h-4" />
                            Избранное
                          </Link>
                          
                          {/* Владелец/Тех.админ - доступ к админке */}
                          {(user.role === 'TECH_ADMIN' || user.role === 'OWNER') && (
                            <>
                              <div className="border-t my-2" />
                              <Link
                                href="/admin"
                                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                <Building2 className="w-4 h-4" />
                                {user.role === 'TECH_ADMIN' ? 'Админ-панель' : 'Мои объекты'}
                              </Link>
                            </>
                          )}
                        </div>

                        <div className="border-t pt-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <LogOut className="w-4 h-4" />
                            Выйти
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="hidden sm:block">
                  <Button 
                    variant={isHomePage && !isScrolled ? 'ghost' : 'outline'}
                    className={isHomePage && !isScrolled ? 'text-white border-white/30 hover:bg-white/10' : ''}
                  >
                    Войти
                  </Button>
                </Link>
                <Link href="/auth/register" className="hidden sm:block">
                  <Button>Регистрация</Button>
                </Link>
              </>
            )}

            {/* Мобильное меню */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn('md:hidden p-2', textColor)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Мобильное меню */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-900 border-t"
          >
            <nav className="container mx-auto px-4 py-4 space-y-4">
              <Link
                href="/apartments"
                className="block py-2 font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Апартаменты
              </Link>
              <Link
                href="/about"
                className="block py-2 font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                О нас
              </Link>
              <Link
                href="/contacts"
                className="block py-2 font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Контакты
              </Link>

              {!isAuthenticated && (
                <div className="pt-4 border-t space-y-2">
                  <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Войти</Button>
                  </Link>
                  <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full">Регистрация</Button>
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
