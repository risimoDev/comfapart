'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  RefreshCw, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import { ru } from 'date-fns/locale'

interface Apartment {
  id: string
  title: string
  slug: string
}

interface CalendarEvent {
  id: string
  apartmentId: string
  apartmentTitle: string
  startDate: string
  endDate: string
  type: 'booking' | 'blocked' | 'external'
  status?: string
  source?: string
  guestName?: string
  color: string
}

interface CalendarSync {
  id: string
  type: 'EXPORT' | 'IMPORT'
  status: string
  exportUrl?: string | null
  importUrl?: string | null
  sourceName?: string | null
  lastSyncAt?: string | null
  lastSyncError?: string | null
  eventsImported: number
  eventsExported: number
  apartment?: { id: string; title: string } | null
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function AdminCalendarPage() {
  const router = useRouter()
  const { user, accessToken, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [selectedApartment, setSelectedApartment] = useState<string>('')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [syncs, setSyncs] = useState<CalendarSync[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  
  // Форма добавления синхронизации
  const [newSyncType, setNewSyncType] = useState<'EXPORT' | 'IMPORT'>('EXPORT')
  const [newSyncUrl, setNewSyncUrl] = useState('')
  const [newSyncSource, setNewSyncSource] = useState('Авито')
  const [newSyncApartment, setNewSyncApartment] = useState('')

  // Проверка авторизации
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/admin/calendar')
    }
  }, [authLoading, isAuthenticated, router])

  // Загрузка квартир
  useEffect(() => {
    if (!accessToken) return

    fetch('/api/admin/apartments?limit=100', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success !== false) {
          setApartments(data.apartments || data.items || [])
        }
      })
      .catch(console.error)
  }, [accessToken])

  // Загрузка событий календаря
  const loadEvents = useCallback(async () => {
    if (!accessToken) return
    
    setLoading(true)
    try {
      const startDate = startOfMonth(currentMonth).toISOString()
      const endDate = endOfMonth(addMonths(currentMonth, 1)).toISOString()
      
      const url = new URL('/api/admin/calendar', window.location.origin)
      url.searchParams.set('startDate', startDate)
      url.searchParams.set('endDate', endDate)
      if (selectedApartment) {
        url.searchParams.set('apartmentId', selectedApartment)
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = await res.json()
      
      if (data.success) {
        setEvents(data.data || [])
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }, [accessToken, currentMonth, selectedApartment])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Загрузка синхронизаций
  const loadSyncs = useCallback(async () => {
    if (!accessToken) return

    try {
      const res = await fetch('/api/admin/calendar/sync', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = await res.json()
      
      if (data.success) {
        setSyncs(data.data || [])
      }
    } catch (error) {
      console.error('Error loading syncs:', error)
    }
  }, [accessToken])

  useEffect(() => {
    loadSyncs()
  }, [loadSyncs])

  // Заблокировать даты
  const handleBlockDates = async () => {
    if (!accessToken || !selectedApartment || selectedDates.length === 0) return
    
    setIsBlocking(true)
    try {
      const res = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          apartmentId: selectedApartment,
          dates: selectedDates.map(d => d.toISOString()),
          reason: blockReason || undefined
        })
      })
      
      if (res.ok) {
        setSelectedDates([])
        setBlockReason('')
        loadEvents()
      }
    } catch (error) {
      console.error('Error blocking dates:', error)
    } finally {
      setIsBlocking(false)
    }
  }

  // Разблокировать даты
  const handleUnblockDates = async () => {
    if (!accessToken || !selectedApartment || selectedDates.length === 0) return
    
    try {
      const url = new URL('/api/admin/calendar', window.location.origin)
      url.searchParams.set('apartmentId', selectedApartment)
      url.searchParams.set('dates', selectedDates.map(d => d.toISOString()).join(','))

      const res = await fetch(url.toString(), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      if (res.ok) {
        setSelectedDates([])
        loadEvents()
      }
    } catch (error) {
      console.error('Error unblocking dates:', error)
    }
  }

  // Создать синхронизацию
  const handleCreateSync = async () => {
    if (!accessToken) return
    
    try {
      const res = await fetch('/api/admin/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          type: newSyncType,
          apartmentId: newSyncApartment || undefined,
          importUrl: newSyncType === 'IMPORT' ? newSyncUrl : undefined,
          sourceName: newSyncType === 'IMPORT' ? newSyncSource : undefined
        })
      })
      
      if (res.ok) {
        setShowSyncModal(false)
        setNewSyncUrl('')
        setNewSyncApartment('')
        loadSyncs()
        loadEvents()
      }
    } catch (error) {
      console.error('Error creating sync:', error)
    }
  }

  // Запустить синхронизацию
  const handleRunSync = async (syncId: string) => {
    if (!accessToken) return
    
    try {
      await fetch(`/api/admin/calendar/sync/${syncId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      loadSyncs()
      loadEvents()
    } catch (error) {
      console.error('Error running sync:', error)
    }
  }

  // Удалить синхронизацию
  const handleDeleteSync = async (syncId: string) => {
    if (!accessToken || !confirm('Удалить синхронизацию?')) return
    
    try {
      await fetch(`/api/admin/calendar/sync/${syncId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      loadSyncs()
    } catch (error) {
      console.error('Error deleting sync:', error)
    }
  }

  // Копировать ссылку
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  // Обработка клика по дате
  const handleDateClick = (date: Date) => {
    if (!selectedApartment) return
    
    setSelectedDates(prev => {
      const isSelected = prev.some(d => isSameDay(d, date))
      if (isSelected) {
        return prev.filter(d => !isSameDay(d, date))
      }
      return [...prev, date]
    })
  }

  // Получить события для конкретной даты
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const start = parseISO(event.startDate)
      const end = parseISO(event.endDate)
      return isWithinInterval(date, { start, end }) || 
             isSameDay(date, start) || 
             isSameDay(date, end)
    })
  }

  // Дни текущего месяца
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Добавляем дни из предыдущего месяца для выравнивания
  const startDayOfWeek = (monthStart.getDay() + 6) % 7 // Понедельник = 0
  const prefixDays = Array.from({ length: startDayOfWeek }, (_, i) => {
    const d = new Date(monthStart)
    d.setDate(d.getDate() - (startDayOfWeek - i))
    return d
  })

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Календарь</h1>
          <p className="text-gray-600">Управление датами и синхронизация с Авито</p>
        </div>
        <Button onClick={() => setShowSyncModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить синхронизацию
        </Button>
      </div>

      {/* Синхронизации */}
      {syncs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Синхронизации календаря
          </h2>
          <div className="space-y-3">
            {syncs.map(sync => (
              <div key={sync.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      sync.type === 'EXPORT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {sync.type === 'EXPORT' ? 'Экспорт' : 'Импорт'}
                    </span>
                    {sync.sourceName && (
                      <span className="text-sm text-gray-600">{sync.sourceName}</span>
                    )}
                    {sync.apartment && (
                      <span className="text-sm text-gray-500">({sync.apartment.title})</span>
                    )}
                    {!sync.apartment && (
                      <span className="text-sm text-gray-500">(Все квартиры)</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      sync.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      sync.status === 'ERROR' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {sync.status === 'ACTIVE' ? 'Активна' : 
                       sync.status === 'ERROR' ? 'Ошибка' : 'Пауза'}
                    </span>
                  </div>
                  
                  {sync.exportUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={sync.exportUrl}
                        readOnly
                        className="flex-1 text-xs bg-white border rounded px-2 py-1 font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(sync.exportUrl!)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Копировать"
                      >
                        {copiedUrl === sync.exportUrl ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                  
                  {sync.lastSyncAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Последняя синхронизация: {format(parseISO(sync.lastSyncAt), 'dd.MM.yyyy HH:mm')}
                      {sync.type === 'IMPORT' && ` (${sync.eventsImported} событий)`}
                    </p>
                  )}
                  
                  {sync.lastSyncError && (
                    <p className="text-xs text-red-600 mt-1">{sync.lastSyncError}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {sync.type === 'IMPORT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRunSync(sync.id)}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteSync(sync.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр и управление */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Квартира</label>
            <select
              value={selectedApartment}
              onChange={(e) => {
                setSelectedApartment(e.target.value)
                setSelectedDates([])
              }}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Все квартиры</option>
              {apartments.map(apt => (
                <option key={apt.id} value={apt.id}>{apt.title}</option>
              ))}
            </select>
          </div>
          
          {!selectedApartment && (
            <div className="text-sm text-gray-500 italic">
              Выберите квартиру для блокировки дат
            </div>
          )}
          
          {selectedApartment && selectedDates.length === 0 && (
            <div className="text-sm text-blue-600">
              Кликните по датам в календаре для выбора
            </div>
          )}
          
          {selectedApartment && selectedDates.length > 0 && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Причина блокировки"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-48"
              />
              <Button
                onClick={handleBlockDates}
                disabled={isBlocking}
              >
                {isBlocking ? 'Блокируем...' : `Заблокировать (${selectedDates.length})`}
              </Button>
              <Button
                variant="outline"
                onClick={handleUnblockDates}
              >
                Разблокировать
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedDates([])}
              >
                Сбросить
              </Button>
            </div>
          )}
        </div>

        {/* Календарь */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold">
            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Дни месяца */}
        <div className="grid grid-cols-7 gap-1">
          {prefixDays.map((day, i) => (
            <div
              key={`prefix-${i}`}
              className="min-h-[80px] p-1 bg-gray-50 rounded text-gray-400"
            >
              <span className="text-sm">{format(day, 'd')}</span>
            </div>
          ))}
          
          {days.map(day => {
            const dayEvents = getEventsForDate(day)
            const isSelected = selectedDates.some(d => isSameDay(d, day))
            const isToday = isSameDay(day, new Date())
            
            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={`
                  min-h-[80px] p-1 rounded border cursor-pointer transition-all
                  ${isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-transparent hover:border-gray-300'}
                  ${isToday ? 'bg-blue-50' : 'bg-white'}
                  ${!selectedApartment ? 'cursor-default' : ''}
                `}
              >
                <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                  {format(day, 'd')}
                </span>
                
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="text-xs px-1 py-0.5 rounded truncate"
                      style={{ backgroundColor: event.color + '30', color: event.color }}
                      title={`${event.apartmentTitle}: ${event.guestName || event.type}`}
                    >
                      {event.type === 'booking' && event.guestName}
                      {event.type === 'blocked' && 'Закрыто'}
                      {event.type === 'external' && event.source}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Легенда */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#34D399' }}></div>
            <span>Бронирование (оплачено)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#60A5FA' }}></div>
            <span>Бронирование (подтверждено)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FCD34D' }}></div>
            <span>Ожидает подтверждения</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6B7280' }}></div>
            <span>Закрыто вручную</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
            <span>Занято (Авито)</span>
          </div>
        </div>
      </div>

      {/* Модальное окно добавления синхронизации */}
      <AnimatePresence>
        {showSyncModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSyncModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Добавить синхронизацию</h2>
                <button onClick={() => setShowSyncModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Тип</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewSyncType('EXPORT')}
                      className={`flex-1 py-2 px-4 rounded-lg border ${
                        newSyncType === 'EXPORT' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-gray-200'
                      }`}
                    >
                      Экспорт (iCal)
                    </button>
                    <button
                      onClick={() => setNewSyncType('IMPORT')}
                      className={`flex-1 py-2 px-4 rounded-lg border ${
                        newSyncType === 'IMPORT' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-gray-200'
                      }`}
                    >
                      Импорт (Авито)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Квартира</label>
                  <select
                    value={newSyncApartment}
                    onChange={(e) => setNewSyncApartment(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Все квартиры</option>
                    {apartments.map(apt => (
                      <option key={apt.id} value={apt.id}>{apt.title}</option>
                    ))}
                  </select>
                </div>

                {newSyncType === 'IMPORT' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Источник</label>
                      <select
                        value={newSyncSource}
                        onChange={(e) => setNewSyncSource(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="Авито">Авито</option>
                        <option value="Booking.com">Booking.com</option>
                        <option value="Airbnb">Airbnb</option>
                        <option value="Другой">Другой</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">URL календаря (iCal)</label>
                      <Input
                        placeholder="https://avito.ru/calendar/..."
                        value={newSyncUrl}
                        onChange={(e) => setNewSyncUrl(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Скопируйте ссылку на iCal из настроек Авито/Booking
                      </p>
                    </div>
                  </>
                )}

                {newSyncType === 'EXPORT' && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      После создания вы получите уникальную ссылку на ваш календарь. 
                      Её можно добавить в Авито, Booking.com или другие площадки 
                      для автоматической синхронизации занятых дат.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowSyncModal(false)}>
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleCreateSync}
                    disabled={newSyncType === 'IMPORT' && !newSyncUrl}
                  >
                    Создать
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
