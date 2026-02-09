import prisma from '@/lib/prisma'
import { CalendarSyncType, CalendarSyncStatus, BlockedDateSource, Prisma, UserRole } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

// ==================== ТИПЫ ====================

interface CalendarUser {
  id: string
  role: UserRole
}

interface CreateCalendarSyncData {
  userId: string
  apartmentId?: string
  type: CalendarSyncType
  importUrl?: string
  sourceName?: string
  syncInterval?: number
}

interface ICalEvent {
  uid: string
  startDate: Date
  endDate: Date
  summary?: string
  description?: string
  created?: Date
  lastModified?: Date
}

interface CalendarEvent {
  id: string
  apartmentId: string
  apartmentTitle: string
  startDate: Date
  endDate: Date
  type: 'booking' | 'blocked' | 'external'
  status?: string
  source?: string
  guestName?: string
  color: string
}

// ==================== СЕРВИС КАЛЕНДАРЯ ====================

class CalendarService {
  /**
   * Получить все синхронизации пользователя
   */
  async getUserCalendarSyncs(userId: string) {
    return prisma.calendarSync.findMany({
      where: { userId },
      include: {
        apartment: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Создать синхронизацию календаря
   */
  async createCalendarSync(data: CreateCalendarSyncData) {
    // Генерируем уникальный токен для экспорта
    const exportToken = data.type === 'EXPORT' 
      ? crypto.randomBytes(32).toString('hex') 
      : undefined

    return prisma.calendarSync.create({
      data: {
        userId: data.userId,
        apartmentId: data.apartmentId,
        type: data.type,
        exportToken,
        importUrl: data.importUrl,
        sourceName: data.sourceName,
        syncInterval: data.syncInterval || 30,
      },
      include: {
        apartment: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    })
  }

  /**
   * Удалить синхронизацию
   */
  async deleteCalendarSync(id: string, userId: string) {
    // Проверяем принадлежность
    const sync = await prisma.calendarSync.findFirst({
      where: { id, userId },
    })

    if (!sync) {
      throw new Error('Синхронизация не найдена')
    }

    // Удаляем связанные внешние события
    await prisma.externalCalendarEvent.deleteMany({
      where: { calendarSyncId: id },
    })

    return prisma.calendarSync.delete({
      where: { id },
    })
  }

  /**
   * Генерация iCal feed для экспорта
   */
  async generateICalFeed(exportToken: string): Promise<string> {
    const sync = await prisma.calendarSync.findUnique({
      where: { exportToken },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        apartment: {
          select: { id: true, title: true },
        },
      },
    })

    if (!sync || sync.status !== 'ACTIVE') {
      throw new Error('Календарь не найден или деактивирован')
    }

    // Определяем квартиры для экспорта
    const apartmentFilter: Prisma.ApartmentWhereInput = sync.apartmentId
      ? { id: sync.apartmentId }
      : { ownerId: sync.userId }

    // Получаем все квартиры пользователя
    const apartments = await prisma.apartment.findMany({
      where: apartmentFilter,
      select: { id: true, title: true },
    })

    const apartmentIds = apartments.map(a => a.id)

    // Получаем бронирования
    const bookings = await prisma.booking.findMany({
      where: {
        apartmentId: { in: apartmentIds },
        status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
        checkIn: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }, // За последний год
      },
      include: {
        apartment: { select: { title: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    })

    // Получаем заблокированные даты
    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        apartmentId: { in: apartmentIds },
        date: { gte: new Date() },
      },
      include: {
        apartment: { select: { title: true } },
      },
    })

    // Генерируем iCal
    const events: string[] = []

    // События из бронирований
    for (const booking of bookings) {
      events.push(this.formatICalEvent({
        uid: `booking-${booking.id}@comfort-apartments`,
        startDate: booking.checkIn,
        endDate: booking.checkOut,
        summary: `Бронирование: ${booking.apartment.title}`,
        description: `Гость: ${booking.user.firstName} ${booking.user.lastName}\nСтатус: ${booking.status}\nНомер: ${booking.bookingNumber}`,
      }))
    }

    // События из заблокированных дат (группируем последовательные даты)
    const groupedBlocked = this.groupConsecutiveDates(blockedDates)
    for (const group of groupedBlocked) {
      events.push(this.formatICalEvent({
        uid: `blocked-${group.apartmentId}-${group.startDate.getTime()}@comfort-apartments`,
        startDate: group.startDate,
        endDate: new Date(group.endDate.getTime() + 24 * 60 * 60 * 1000), // iCal использует exclusive end date
        summary: `Закрыто: ${group.apartmentTitle}`,
        description: group.reason || 'Даты закрыты',
      }))
    }

    // Обновляем статистику
    await prisma.calendarSync.update({
      where: { id: sync.id },
      data: {
        lastSyncAt: new Date(),
        eventsExported: events.length,
      },
    })

    return this.formatICalendar(events, `Comfort Apartments - ${sync.user.firstName}`)
  }

  /**
   * Импорт календаря из внешнего URL (Авито и др.)
   */
  async importFromExternalCalendar(syncId: string): Promise<number> {
    const sync = await prisma.calendarSync.findUnique({
      where: { id: syncId },
      include: {
        apartment: true,
      },
    })

    if (!sync || sync.type !== 'IMPORT' || !sync.importUrl) {
      throw new Error('Неверная конфигурация синхронизации')
    }

    try {
      // Загружаем iCal файл
      const response = await fetch(sync.importUrl, {
        headers: {
          'User-Agent': 'Comfort-Apartments-Calendar-Sync/1.0',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const icalData = await response.text()
      const events = this.parseICal(icalData)

      // Если указана конкретная квартира - используем её
      // Иначе используем первую квартиру владельца
      let apartmentId = sync.apartmentId

      if (!apartmentId) {
        const firstApartment = await prisma.apartment.findFirst({
          where: { ownerId: sync.userId },
          select: { id: true },
        })
        if (!firstApartment) {
          throw new Error('У вас нет квартир для синхронизации')
        }
        apartmentId = firstApartment.id
      }

      // Удаляем старые события этой синхронизации
      await prisma.externalCalendarEvent.deleteMany({
        where: { calendarSyncId: syncId },
      })

      // Удаляем заблокированные даты от этого источника
      const sourceMap: { [key: string]: BlockedDateSource } = {
        'Авито': 'AVITO',
        'Avito': 'AVITO',
        'Booking.com': 'BOOKING_COM',
        'Airbnb': 'AIRBNB',
      }
      const blockSource = sourceMap[sync.sourceName || ''] || 'OTHER'

      await prisma.blockedDate.deleteMany({
        where: {
          apartmentId,
          source: blockSource,
        },
      })

      // Создаём новые события и блокируем даты
      let importedCount = 0

      for (const event of events) {
        // Сохраняем внешнее событие
        await prisma.externalCalendarEvent.create({
          data: {
            calendarSyncId: syncId,
            apartmentId,
            externalUid: event.uid,
            startDate: event.startDate,
            endDate: event.endDate,
            summary: event.summary,
            description: event.description,
            sourceName: sync.sourceName || 'External',
            sourceUrl: sync.importUrl,
          },
        })

        // Создаём заблокированные даты
        const dates = this.getDateRange(event.startDate, event.endDate)
        for (const date of dates) {
          await prisma.blockedDate.upsert({
            where: {
              apartmentId_date: {
                apartmentId,
                date,
              },
            },
            update: {
              reason: event.summary || `Занято (${sync.sourceName})`,
              source: blockSource,
              externalRef: event.uid,
            },
            create: {
              apartmentId,
              date,
              reason: event.summary || `Занято (${sync.sourceName})`,
              source: blockSource,
              externalRef: event.uid,
            },
          })
        }

        importedCount++
      }

      // Обновляем статистику синхронизации
      await prisma.calendarSync.update({
        where: { id: syncId },
        data: {
          lastSyncAt: new Date(),
          lastSyncError: null,
          eventsImported: importedCount,
          status: 'ACTIVE',
        },
      })

      return importedCount
    } catch (error) {
      // Записываем ошибку
      await prisma.calendarSync.update({
        where: { id: syncId },
        data: {
          lastSyncAt: new Date(),
          lastSyncError: error instanceof Error ? error.message : 'Неизвестная ошибка',
          status: 'ERROR',
        },
      })

      throw error
    }
  }

  /**
   * Синхронизировать все активные импорты
   */
  async syncAllActiveImports(): Promise<{ synced: number; errors: number }> {
    const activeSyncs = await prisma.calendarSync.findMany({
      where: {
        type: 'IMPORT',
        status: { in: ['ACTIVE', 'ERROR'] },
      },
    })

    let synced = 0
    let errors = 0

    for (const sync of activeSyncs) {
      // Проверяем интервал
      if (sync.lastSyncAt) {
        const minsSinceLastSync = (Date.now() - sync.lastSyncAt.getTime()) / (1000 * 60)
        if (minsSinceLastSync < sync.syncInterval) {
          continue
        }
      }

      try {
        await this.importFromExternalCalendar(sync.id)
        synced++
      } catch {
        errors++
      }
    }

    return { synced, errors }
  }

  /**
   * Получить события календаря для отображения
   */
  async getCalendarEvents(
    userId: string, 
    apartmentId?: string,
    startDate?: Date,
    endDate?: Date,
    userRole?: UserRole
  ): Promise<CalendarEvent[]> {
    const start = startDate || new Date()
    const end = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // +90 дней

    // TECH_ADMIN видит все квартиры, OWNER - только свои
    const isTechAdmin = userRole === 'TECH_ADMIN'
    
    // Определяем фильтр квартир
    const apartmentFilter: Prisma.ApartmentWhereInput = apartmentId
      ? isTechAdmin 
        ? { id: apartmentId }
        : { id: apartmentId, ownerId: userId }
      : isTechAdmin 
        ? {}
        : { ownerId: userId }

    const apartments = await prisma.apartment.findMany({
      where: apartmentFilter,
      select: { id: true, title: true },
    })

    const apartmentIds = apartments.map(a => a.id)
    const apartmentMap = new Map(apartments.map(a => [a.id, a.title]))

    const events: CalendarEvent[] = []

    // Бронирования
    const bookings = await prisma.booking.findMany({
      where: {
        apartmentId: { in: apartmentIds },
        OR: [
          { checkIn: { gte: start, lte: end } },
          { checkOut: { gte: start, lte: end } },
          { checkIn: { lte: start }, checkOut: { gte: end } },
        ],
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    })

    for (const booking of bookings) {
      events.push({
        id: `booking-${booking.id}`,
        apartmentId: booking.apartmentId,
        apartmentTitle: apartmentMap.get(booking.apartmentId) || '',
        startDate: booking.checkIn,
        endDate: booking.checkOut,
        type: 'booking',
        status: booking.status,
        guestName: `${booking.user.firstName} ${booking.user.lastName}`,
        color: this.getBookingColor(booking.status),
      })
    }

    // Заблокированные даты
    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        apartmentId: { in: apartmentIds },
        date: { gte: start, lte: end },
      },
    })

    // Группируем последовательные даты
    const groupedBlocked = this.groupConsecutiveDates(
      blockedDates.map(d => ({
        ...d,
        apartment: { title: apartmentMap.get(d.apartmentId) || '' },
      }))
    )

    for (const group of groupedBlocked) {
      events.push({
        id: `blocked-${group.apartmentId}-${group.startDate.getTime()}`,
        apartmentId: group.apartmentId,
        apartmentTitle: group.apartmentTitle,
        startDate: group.startDate,
        endDate: group.endDate,
        type: group.source === 'MANUAL' || group.source === 'BOOKING' ? 'blocked' : 'external',
        source: group.source,
        color: this.getBlockedColor(group.source),
      })
    }

    return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }

  /**
   * Заблокировать даты вручную
   */
  async blockDates(
    userId: string,
    apartmentId: string,
    dates: Date[],
    reason?: string,
    userRole?: UserRole
  ): Promise<number> {
    // TECH_ADMIN может блокировать даты любой квартиры
    const isTechAdmin = userRole === 'TECH_ADMIN'
    
    // Проверяем принадлежность квартиры
    const apartment = await prisma.apartment.findFirst({
      where: isTechAdmin 
        ? { id: apartmentId }
        : { id: apartmentId, ownerId: userId },
    })

    if (!apartment) {
      throw new Error('Квартира не найдена или не принадлежит вам')
    }

    let blocked = 0

    for (const date of dates) {
      try {
        await prisma.blockedDate.upsert({
          where: {
            apartmentId_date: { apartmentId, date },
          },
          update: {
            reason,
            source: 'MANUAL',
          },
          create: {
            apartmentId,
            date,
            reason,
            source: 'MANUAL',
          },
        })
        blocked++
      } catch {
        // Пропускаем ошибки (например, если дата уже занята бронированием)
      }
    }

    return blocked
  }

  /**
   * Разблокировать даты
   */
  async unblockDates(
    userId: string,
    apartmentId: string,
    dates: Date[],
    userRole?: UserRole
  ): Promise<number> {
    // TECH_ADMIN может разблокировать даты любой квартиры
    const isTechAdmin = userRole === 'TECH_ADMIN'
    
    // Проверяем принадлежность квартиры
    const apartment = await prisma.apartment.findFirst({
      where: isTechAdmin 
        ? { id: apartmentId }
        : { id: apartmentId, ownerId: userId },
    })

    if (!apartment) {
      throw new Error('Квартира не найдена или не принадлежит вам')
    }

    const result = await prisma.blockedDate.deleteMany({
      where: {
        apartmentId,
        date: { in: dates },
        source: 'MANUAL', // Можно удалять только ручные блокировки
      },
    })

    return result.count
  }

  // ==================== ПРИВАТНЫЕ МЕТОДЫ ====================

  private formatICalendar(events: string[], calendarName: string): string {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Comfort Apartments//Calendar//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calendarName}`,
      'X-WR-TIMEZONE:Europe/Moscow',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n')
  }

  private formatICalEvent(event: ICalEvent): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const formatDateOnly = (date: Date) => {
      return date.toISOString().split('T')[0].replace(/-/g, '')
    }

    return [
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTART;VALUE=DATE:${formatDateOnly(event.startDate)}`,
      `DTEND;VALUE=DATE:${formatDateOnly(event.endDate)}`,
      `SUMMARY:${this.escapeICalText(event.summary || '')}`,
      `DESCRIPTION:${this.escapeICalText(event.description || '')}`,
      `DTSTAMP:${formatDate(new Date())}`,
      'END:VEVENT',
    ].join('\r\n')
  }

  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  private parseICal(icalData: string): ICalEvent[] {
    const events: ICalEvent[] = []
    const lines = icalData.replace(/\r\n /g, '').split(/\r?\n/)

    let currentEvent: Partial<ICalEvent> | null = null

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {}
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.uid && currentEvent.startDate && currentEvent.endDate) {
          events.push(currentEvent as ICalEvent)
        }
        currentEvent = null
      } else if (currentEvent) {
        const [key, ...valueParts] = line.split(':')
        const value = valueParts.join(':')

        if (key === 'UID') {
          currentEvent.uid = value
        } else if (key.startsWith('DTSTART')) {
          currentEvent.startDate = this.parseICalDate(value)
        } else if (key.startsWith('DTEND')) {
          currentEvent.endDate = this.parseICalDate(value)
        } else if (key === 'SUMMARY') {
          currentEvent.summary = this.unescapeICalText(value)
        } else if (key === 'DESCRIPTION') {
          currentEvent.description = this.unescapeICalText(value)
        }
      }
    }

    return events
  }

  private parseICalDate(dateStr: string): Date {
    // Формат: 20260115 или 20260115T140000Z
    const cleaned = dateStr.replace(/[TZ]/g, '')
    const year = parseInt(cleaned.slice(0, 4))
    const month = parseInt(cleaned.slice(4, 6)) - 1
    const day = parseInt(cleaned.slice(6, 8))

    if (cleaned.length > 8) {
      const hour = parseInt(cleaned.slice(8, 10))
      const minute = parseInt(cleaned.slice(10, 12))
      return new Date(Date.UTC(year, month, day, hour, minute))
    }

    return new Date(year, month, day)
  }

  private unescapeICalText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
  }

  private getDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = []
    const current = new Date(start)
    
    // iCal end date is exclusive
    while (current < end) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  private groupConsecutiveDates(
    blockedDates: Array<{
      apartmentId: string
      date: Date
      reason?: string | null
      source: string
      apartment: { title: string }
    }>
  ): Array<{
    apartmentId: string
    apartmentTitle: string
    startDate: Date
    endDate: Date
    reason?: string | null
    source: string
  }> {
    if (blockedDates.length === 0) return []

    // Группируем по квартире
    const byApartment = new Map<string, typeof blockedDates>()
    for (const bd of blockedDates) {
      if (!byApartment.has(bd.apartmentId)) {
        byApartment.set(bd.apartmentId, [])
      }
      byApartment.get(bd.apartmentId)!.push(bd)
    }

    const groups: ReturnType<typeof this.groupConsecutiveDates> = []

    byApartment.forEach((dates, apartmentId) => {
      // Сортируем по дате
      dates.sort((a, b) => a.date.getTime() - b.date.getTime())

      let groupStart = dates[0]
      let groupEnd = dates[0]

      for (let i = 1; i <= dates.length; i++) {
        const current = dates[i]
        const prev = dates[i - 1]

        // Проверяем последовательность (разница <= 1 день)
        const isConsecutive = current && 
          (current.date.getTime() - prev.date.getTime() <= 24 * 60 * 60 * 1000 + 1000) &&
          current.source === prev.source

        if (!isConsecutive) {
          // Завершаем группу
          groups.push({
            apartmentId,
            apartmentTitle: groupStart.apartment.title,
            startDate: groupStart.date,
            endDate: groupEnd.date,
            reason: groupStart.reason,
            source: groupStart.source,
          })

          if (current) {
            groupStart = current
            groupEnd = current
          }
        } else {
          groupEnd = current
        }
      }
    })

    return groups
  }

  private getBookingColor(status: string): string {
    const colors: { [key: string]: string } = {
      PENDING: '#FCD34D', // Желтый
      CONFIRMED: '#60A5FA', // Синий
      PAID: '#34D399', // Зеленый
      COMPLETED: '#9CA3AF', // Серый
      CANCELED: '#EF4444', // Красный
      REFUNDED: '#F472B6', // Розовый
    }
    return colors[status] || '#9CA3AF'
  }

  private getBlockedColor(source: string): string {
    const colors: { [key: string]: string } = {
      MANUAL: '#6B7280', // Серый
      BOOKING: '#34D399', // Зеленый
      AVITO: '#3B82F6', // Синий
      BOOKING_COM: '#8B5CF6', // Фиолетовый
      AIRBNB: '#EC4899', // Розовый
      OTHER: '#F59E0B', // Оранжевый
    }
    return colors[source] || '#6B7280'
  }
}

export const calendarService = new CalendarService()
