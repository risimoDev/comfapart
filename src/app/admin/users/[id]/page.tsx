'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Globe,
  MapPin,
  Clock,
  Activity,
  Home,
  Star,
  MessageSquare,
  Heart,
  Ban,
  UserCheck,
  UserX,
  Edit,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Monitor,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

interface Session {
  id: string
  token: string
  userAgent: string | null
  ipAddress: string | null
  expiresAt: string
  createdAt: string
}

interface SecurityEvent {
  id: string
  eventType: string
  ipAddress: string | null
  userAgent: string | null
  metadata: any
  severity: string
  createdAt: string
}

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  avatar: string | null
  role: string
  status: string
  emailVerified: boolean
  preferredLocale: string
  preferredCurrency: string
  createdAt: string
  updatedAt: string
  telegramId: string | null
  telegramUsername: string | null
  telegramVerified: boolean
  sessions: Session[]
  securityEvents: SecurityEvent[]
  bookings: any[]
  reviews: any[]
  ownedApartments: any[]
  _count: {
    bookings: number
    reviews: number
    favorites: number
    ownedApartments: number
  }
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { accessToken } = useAuth()
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'security' | 'activity'>('overview')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (params.id && accessToken) {
      fetchUser()
    }
  }, [params.id, accessToken])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        headers: { 
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.data)
      } else {
        toast.error('Пользователь не найден')
        router.push('/admin/users')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Ошибка загрузки данных')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (action: 'block' | 'unblock', role?: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ action, role }),
      })

      if (response.ok) {
        toast.success(action === 'block' ? 'Пользователь заблокирован' : 'Пользователь разблокирован')
        fetchUser()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Ошибка')
      }
    } catch (error) {
      toast.error('Ошибка выполнения операции')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleChangeRole = async (newRole: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ action: 'changeRole', role: newRole }),
      })

      if (response.ok) {
        toast.success('Роль изменена')
        fetchUser()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Ошибка')
      }
    } catch (error) {
      toast.error('Ошибка изменения роли')
    } finally {
      setIsProcessing(false)
    }
  }

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return { browser: 'Неизвестно', os: 'Неизвестно', device: 'Неизвестно' }
    
    let browser = 'Неизвестно'
    let os = 'Неизвестно'
    let device = 'Десктоп'

    // Browser detection
    if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari')) browser = 'Safari'
    else if (ua.includes('Edge')) browser = 'Edge'
    else if (ua.includes('Opera')) browser = 'Opera'

    // OS detection
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) { os = 'Android'; device = 'Мобильный' }
    else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; device = 'Мобильный' }

    return { browser, os, device }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-300'
      case 'WARNING': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'INFO': return 'bg-blue-100 text-blue-700 border-blue-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LOGIN: 'Вход в систему',
      LOGOUT: 'Выход из системы',
      PASSWORD_CHANGE: 'Смена пароля',
      PASSWORD_RESET_REQUEST: 'Запрос сброса пароля',
      PASSWORD_RESET: 'Сброс пароля',
      FAILED_LOGIN: 'Неудачный вход',
      ACCOUNT_BLOCKED: 'Аккаунт заблокирован',
      ACCOUNT_UNBLOCKED: 'Аккаунт разблокирован',
      EMAIL_VERIFIED: 'Email подтверждён',
      ROLE_CHANGED: 'Роль изменена',
      SUSPICIOUS_ACTIVITY: 'Подозрительная активность',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Пользователь не найден</p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: User },
    { id: 'sessions', label: 'Сессии', icon: Monitor },
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'activity', label: 'Активность', icon: Activity },
  ]

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Пользователь</h1>
      </div>

      {/* User info card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-grow">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold">{user.firstName} {user.lastName}</h2>
              <Badge variant={user.status === 'ACTIVE' ? 'success' : user.status === 'BLOCKED' ? 'danger' : 'warning'}>
                {user.status === 'ACTIVE' ? 'Активен' : user.status === 'BLOCKED' ? 'Заблокирован' : 'Ожидает'}
              </Badge>
              <Badge variant={user.role === 'TECH_ADMIN' ? 'danger' : user.role === 'OWNER' ? 'primary' : 'secondary'}>
                {user.role === 'TECH_ADMIN' ? 'Тех.админ' : user.role === 'OWNER' ? 'Владелец' : 'Пользователь'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
                {user.emailVerified ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Регистрация: {formatDate(user.createdAt)}</span>
              </div>
              {user.telegramUsername && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>@{user.telegramUsername}</span>
                  {user.telegramVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {user.status === 'ACTIVE' ? (
              <Button 
                variant="outline" 
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => handleAction('block')}
                loading={isProcessing}
              >
                <Ban className="w-4 h-4 mr-2" />
                Заблокировать
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => handleAction('unblock')}
                loading={isProcessing}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Разблокировать
              </Button>
            )}
            <select
              value={user.role}
              onChange={(e) => handleChangeRole(e.target.value)}
              disabled={isProcessing}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="USER">Пользователь</option>
              <option value="OWNER">Владелец</option>
              <option value="TECH_ADMIN">Тех. админ</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{user._count.bookings}</p>
            <p className="text-sm text-gray-500">Бронирований</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{user._count.reviews}</p>
            <p className="text-sm text-gray-500">Отзывов</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{user._count.favorites}</p>
            <p className="text-sm text-gray-500">В избранном</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{user._count.ownedApartments}</p>
            <p className="text-sm text-gray-500">Объектов</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b flex overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-6">
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User details */}
              <div>
                <h3 className="font-semibold mb-4">Подробная информация</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">ID</span>
                    <span className="font-mono text-xs">{user.id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Предпочитаемый язык</span>
                    <span>{user.preferredLocale.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Валюта</span>
                    <span>{user.preferredCurrency}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Email подтверждён</span>
                    <span>{user.emailVerified ? 'Да' : 'Нет'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Telegram подключён</span>
                    <span>{user.telegramVerified ? 'Да' : 'Нет'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Последнее обновление</span>
                    <span>{formatDate(user.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Owned apartments */}
              {user.ownedApartments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Объекты ({user.ownedApartments.length})</h3>
                  <div className="space-y-2">
                    {user.ownedApartments.map(apt => (
                      <Link
                        key={apt.id}
                        href={`/admin/apartments/${apt.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-gray-400" />
                          <span>{apt.title}</span>
                        </div>
                        <Badge variant={apt.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                          {apt.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent bookings */}
              {user.bookings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Последние бронирования</h3>
                  <div className="space-y-2">
                    {user.bookings.slice(0, 5).map(booking => (
                      <div key={booking.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{booking.apartment.title}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                            </p>
                          </div>
                          <Badge variant={booking.status === 'CONFIRMED' ? 'success' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent reviews */}
              {user.reviews.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Последние отзывы</h3>
                  <div className="space-y-2">
                    {user.reviews.slice(0, 5).map(review => (
                      <div key={review.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium">{review.apartment.title}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span>{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sessions tab */}
          {activeTab === 'sessions' && (
            <div>
              <h3 className="font-semibold mb-4">Активные сессии ({user.sessions.length})</h3>
              {user.sessions.length === 0 ? (
                <p className="text-gray-500">Нет активных сессий</p>
              ) : (
                <div className="space-y-3">
                  {user.sessions.map(session => {
                    const { browser, os, device } = parseUserAgent(session.userAgent)
                    const isExpired = new Date(session.expiresAt) < new Date()
                    
                    return (
                      <div 
                        key={session.id} 
                        className={`p-4 rounded-lg border ${isExpired ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Monitor className="w-5 h-5 text-gray-400" />
                              <span className="font-medium">{browser} на {os}</span>
                              <Badge variant={isExpired ? 'secondary' : 'success'}>
                                {isExpired ? 'Истекла' : 'Активна'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                <span>IP: {session.ipAddress || 'Неизвестно'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                <span>Устройство: {device}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>Создана: {formatDate(session.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>Истекает: {formatDate(session.expiresAt)}</span>
                              </div>
                            </div>
                            
                            {session.userAgent && (
                              <details className="text-xs text-gray-400">
                                <summary className="cursor-pointer hover:text-gray-600">User Agent</summary>
                                <p className="mt-1 font-mono break-all">{session.userAgent}</p>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Security tab */}
          {activeTab === 'security' && (
            <div>
              <h3 className="font-semibold mb-4">События безопасности</h3>
              {user.securityEvents.length === 0 ? (
                <p className="text-gray-500">Нет событий безопасности</p>
              ) : (
                <div className="space-y-2">
                  {user.securityEvents.map(event => (
                    <div 
                      key={event.id} 
                      className={`p-4 rounded-lg border ${getSeverityColor(event.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {event.severity === 'CRITICAL' && <AlertTriangle className="w-4 h-4" />}
                            {event.severity === 'WARNING' && <AlertTriangle className="w-4 h-4" />}
                            {event.severity === 'INFO' && <Info className="w-4 h-4" />}
                            <span className="font-medium">{getEventTypeLabel(event.eventType)}</span>
                            <Badge variant={event.severity === 'CRITICAL' ? 'danger' : event.severity === 'WARNING' ? 'warning' : 'secondary'}>
                              {event.severity}
                            </Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            {event.ipAddress && (
                              <p>IP: {event.ipAddress}</p>
                            )}
                            <p className="text-gray-500">{formatDate(event.createdAt)}</p>
                          </div>
                          {event.metadata && (
                            <details className="mt-2 text-xs">
                              <summary className="cursor-pointer hover:text-gray-600">Подробности</summary>
                              <pre className="mt-1 p-2 bg-white/50 rounded overflow-auto">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity tab */}
          {activeTab === 'activity' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* All bookings */}
              <div>
                <h3 className="font-semibold mb-4">Все бронирования</h3>
                {user.bookings.length === 0 ? (
                  <p className="text-gray-500">Нет бронирований</p>
                ) : (
                  <div className="space-y-2">
                    {user.bookings.map(booking => (
                      <div key={booking.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{booking.apartment.title}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                            </p>
                            <p className="text-sm font-medium text-primary">
                              {booking.totalPrice?.toLocaleString()} ₽
                            </p>
                          </div>
                          <Badge variant={booking.status === 'CONFIRMED' ? 'success' : booking.status === 'CANCELLED' ? 'danger' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All reviews */}
              <div>
                <h3 className="font-semibold mb-4">Все отзывы</h3>
                {user.reviews.length === 0 ? (
                  <p className="text-gray-500">Нет отзывов</p>
                ) : (
                  <div className="space-y-2">
                    {user.reviews.map(review => (
                      <div key={review.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium">{review.apartment.title}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span>{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">{review.comment}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(review.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
