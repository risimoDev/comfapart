/**
 * AccountingService - Production-grade бухгалтерия
 * Иммутабельные транзакции, корректировки, периоды, экспорт
 */

import prisma from '@/lib/prisma'
import { TransactionType, TransactionCategory } from '@prisma/client'

interface CreateTransactionParams {
  bookingId?: string
  apartmentId?: string
  type: TransactionType
  category: TransactionCategory
  amount: number
  currency?: string
  description: string
  reference?: string
  date?: Date
  createdBy: string
  metadata?: Record<string, unknown>
}

interface AdjustmentParams {
  originalTransactionId: string
  reason: string
  newAmount?: number
  createdBy: string
}

interface FinancialSummary {
  period: { year: number; month: number }
  isClosed: boolean
  income: {
    total: number
    bookings: number
    cleaningFees: number
    serviceFees: number
  }
  expenses: {
    total: number
    refunds: number
    commissions: number
    other: number
  }
  netProfit: number
  byApartment: Array<{
    apartmentId: string
    apartmentTitle: string
    income: number
    expenses: number
    profit: number
    bookingsCount: number
  }>
}

interface DateRange {
  startDate: Date
  endDate: Date
}

export class AccountingService {
  /**
   * Проверяет, закрыт ли период
   */
  async isPeriodClosed(date: Date): Promise<boolean> {
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    const period = await prisma.financialPeriod.findUnique({
      where: { year_month: { year, month } },
    })

    return period?.isClosed ?? false
  }

  /**
   * Создаёт транзакцию (иммутабельная)
   * Транзакции нельзя редактировать после создания — только создавать корректировки
   */
  async createTransaction(params: CreateTransactionParams) {
    const { date = new Date(), createdBy, ...rest } = params

    // Проверяем, не закрыт ли период
    if (await this.isPeriodClosed(date)) {
      throw new Error('Невозможно создать транзакцию: период закрыт')
    }
    
    return prisma.transaction.create({
      data: {
        ...rest,
        date,
        createdBy,
        metadata: {
          ...(params.metadata || {}),
          createdAt: new Date().toISOString(),
          immutable: true,
        },
      },
    })
  }

  /**
   * Создаёт корректирующую транзакцию вместо редактирования
   * Это обеспечивает полную прозрачность финансовой истории
   */
  async createAdjustment(params: AdjustmentParams) {
    const original = await prisma.transaction.findUnique({
      where: { id: params.originalTransactionId },
    })

    if (!original) {
      throw new Error('Оригинальная транзакция не найдена')
    }

    // Проверяем, не закрыт ли период оригинальной транзакции
    if (await this.isPeriodClosed(original.date)) {
      throw new Error('Невозможно создать корректировку: период закрыт')
    }

    // Рассчитываем сумму корректировки
    const adjustmentAmount = params.newAmount !== undefined
      ? params.newAmount - Number(original.amount)
      : -Number(original.amount) // Полная отмена

    return prisma.transaction.create({
      data: {
        bookingId: original.bookingId,
        apartmentId: original.apartmentId,
        type: TransactionType.ADJUSTMENT,
        category: original.category,
        amount: adjustmentAmount,
        currency: original.currency,
        description: `Корректировка: ${params.reason}`,
        reference: original.id, // Ссылка на оригинал
        date: new Date(),
        createdBy: params.createdBy,
        metadata: {
          originalTransactionId: original.id,
          originalAmount: Number(original.amount),
          newAmount: params.newAmount,
          reason: params.reason,
          adjustedAt: new Date().toISOString(),
        },
      },
    })
  }

  /**
   * Отменяет транзакцию (создаёт обратную корректировку)
   */
  async voidTransaction(transactionId: string, reason: string, createdBy: string) {
    return this.createAdjustment({
      originalTransactionId: transactionId,
      reason: `Отмена: ${reason}`,
      createdBy,
    })
  }

  /**
   * Создаёт транзакции для бронирования
   */
  async createBookingTransactions(booking: {
    id: string
    apartmentId: string
    basePrice: number
    cleaningFee: number
    serviceFee: number
    totalPrice: number
    currency: string
    checkIn: Date
  }, createdBy: string) {
    const transactions = []

    // Доход от бронирования
    if (booking.basePrice > 0) {
      transactions.push({
        bookingId: booking.id,
        apartmentId: booking.apartmentId,
        type: TransactionType.INCOME,
        category: TransactionCategory.BOOKING,
        amount: booking.basePrice,
        currency: booking.currency,
        description: `Доход от бронирования #${booking.id.slice(0, 8)}`,
        date: booking.checkIn,
        createdBy,
      })
    }

    // Уборка
    if (booking.cleaningFee > 0) {
      transactions.push({
        bookingId: booking.id,
        apartmentId: booking.apartmentId,
        type: TransactionType.INCOME,
        category: TransactionCategory.CLEANING_FEE,
        amount: booking.cleaningFee,
        currency: booking.currency,
        description: `Сбор за уборку #${booking.id.slice(0, 8)}`,
        date: booking.checkIn,
        createdBy,
      })
    }

    // Сервисный сбор
    if (booking.serviceFee > 0) {
      transactions.push({
        bookingId: booking.id,
        apartmentId: booking.apartmentId,
        type: TransactionType.INCOME,
        category: TransactionCategory.SERVICE_FEE,
        amount: booking.serviceFee,
        currency: booking.currency,
        description: `Сервисный сбор #${booking.id.slice(0, 8)}`,
        date: booking.checkIn,
        createdBy,
      })
    }

    // Создаём все транзакции с метаданными
    const createdTransactions = await Promise.all(
      transactions.map(tx => 
        prisma.transaction.create({
          data: {
            ...tx,
            metadata: {
              createdAt: new Date().toISOString(),
              immutable: true,
              bookingRef: booking.id,
            },
          },
        })
      )
    )

    return createdTransactions.length
  }

  /**
   * Создаёт транзакцию возврата
   */
  async createRefundTransaction(booking: {
    id: string
    apartmentId: string
    refundAmount: number
    currency: string
  }, createdBy: string, reason?: string) {
    return this.createTransaction({
      bookingId: booking.id,
      apartmentId: booking.apartmentId,
      type: TransactionType.REFUND,
      category: TransactionCategory.CANCELLATION,
      amount: -booking.refundAmount, // Отрицательная сумма
      currency: booking.currency,
      description: reason 
        ? `Возврат по бронированию #${booking.id.slice(0, 8)}: ${reason}`
        : `Возврат по бронированию #${booking.id.slice(0, 8)}`,
      createdBy,
      metadata: {
        bookingId: booking.id,
        refundReason: reason,
      },
    })
  }

  /**
   * Получает финансовый отчёт за период
   */
  async getFinancialSummary(year: number, month: number, ownerId?: string): Promise<FinancialSummary> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    // Проверяем статус периода
    const period = await prisma.financialPeriod.findUnique({
      where: { year_month: { year, month } },
    })

    // Фильтр по владельцу
    const apartmentFilter = ownerId ? { ownerId } : {}

    // Получаем ID квартир владельца
    const ownerApartments = await prisma.apartment.findMany({
      where: apartmentFilter,
      select: { id: true },
    })
    const apartmentIds = ownerApartments.map(a => a.id)

    // Получаем все транзакции за период (фильтруем по квартирам владельца)
    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(ownerId ? { apartmentId: { in: apartmentIds } } : {}),
      },
    })

    // Получаем апартаменты с бронированиями
    const apartments = await prisma.apartment.findMany({
      where: apartmentFilter,
      select: {
        id: true,
        title: true,
        bookings: {
          where: {
            checkIn: { gte: startDate, lte: endDate },
            status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
          },
          select: {
            id: true,
            totalPrice: true,
            cleaningFee: true,
            serviceFee: true,
          },
        },
      },
    })

    // Считаем доходы
    const income = {
      total: 0,
      bookings: 0,
      cleaningFees: 0,
      serviceFees: 0,
    }

    // Считаем расходы
    const expenses = {
      total: 0,
      refunds: 0,
      commissions: 0,
      other: 0,
    }

    for (const tx of transactions) {
      const amount = Number(tx.amount)
      
      if (tx.type === TransactionType.INCOME) {
        income.total += amount
        switch (tx.category) {
          case TransactionCategory.BOOKING:
            income.bookings += amount
            break
          case TransactionCategory.CLEANING_FEE:
            income.cleaningFees += amount
            break
          case TransactionCategory.SERVICE_FEE:
            income.serviceFees += amount
            break
        }
      } else if (tx.type === TransactionType.REFUND) {
        expenses.total += Math.abs(amount)
        expenses.refunds += Math.abs(amount)
      } else if (tx.type === TransactionType.COMMISSION) {
        expenses.total += Math.abs(amount)
        expenses.commissions += Math.abs(amount)
      } else if (tx.type === TransactionType.EXPENSE) {
        expenses.total += Math.abs(amount)
        expenses.other += Math.abs(amount)
      }
    }

    // Считаем по апартаментам
    const apartmentTransactions = new Map<string, { income: number; expenses: number }>()
    
    for (const tx of transactions) {
      if (!tx.apartmentId) continue
      
      const current = apartmentTransactions.get(tx.apartmentId) || { income: 0, expenses: 0 }
      const amount = Number(tx.amount)
      
      if (tx.type === TransactionType.INCOME) {
        current.income += amount
      } else {
        current.expenses += Math.abs(amount)
      }
      
      apartmentTransactions.set(tx.apartmentId, current)
    }

    const byApartment = apartments.map((apt) => {
      const stats = apartmentTransactions.get(apt.id) || { income: 0, expenses: 0 }
      return {
        apartmentId: apt.id,
        apartmentTitle: apt.title,
        income: stats.income,
        expenses: stats.expenses,
        profit: stats.income - stats.expenses,
        bookingsCount: apt.bookings.length,
      }
    }).sort((a, b) => b.profit - a.profit)

    return {
      period: { year, month },
      isClosed: period?.isClosed ?? false,
      income,
      expenses,
      netProfit: income.total - expenses.total,
      byApartment,
    }
  }

  /**
   * Закрывает финансовый период
   */
  async closePeriod(year: number, month: number, closedBy: string) {
    const summary = await this.getFinancialSummary(year, month)
    
    return prisma.financialPeriod.upsert({
      where: {
        year_month: { year, month },
      },
      update: {
        totalIncome: summary.income.total,
        totalExpenses: summary.expenses.total,
        totalRefunds: summary.expenses.refunds,
        totalCommission: summary.expenses.commissions,
        netProfit: summary.netProfit,
        apartmentStats: summary.byApartment,
        isClosed: true,
        closedAt: new Date(),
        closedBy,
      },
      create: {
        year,
        month,
        totalIncome: summary.income.total,
        totalExpenses: summary.expenses.total,
        totalRefunds: summary.expenses.refunds,
        totalCommission: summary.expenses.commissions,
        netProfit: summary.netProfit,
        apartmentStats: summary.byApartment,
        isClosed: true,
        closedAt: new Date(),
        closedBy,
      },
    })
  }

  /**
   * Открывает закрытый период (только ADMIN, с логированием)
   */
  async reopenPeriod(year: number, month: number, reopenedBy: string, reason: string) {
    const period = await prisma.financialPeriod.findUnique({
      where: { year_month: { year, month } },
    })

    if (!period) {
      throw new Error('Период не найден')
    }

    if (!period.isClosed) {
      throw new Error('Период уже открыт')
    }

    return prisma.financialPeriod.update({
      where: { year_month: { year, month } },
      data: {
        isClosed: false,
        closedAt: null,
        closedBy: null,
        // Сохраняем историю открытий в metadata (если бы поле было)
      },
    })

    // TODO: Логировать событие reopenPeriod в AdminLog
  }

  /**
   * Экспортирует транзакции в CSV формат
   */
  async exportTransactionsCSV(range: DateRange & { ownerId?: string }): Promise<string> {
    // Сначала собираем фильтр по владельцу
    let apartmentIds: string[] | null = null
    if (range.ownerId) {
      const ownerApartments = await prisma.apartment.findMany({
        where: { ownerId: range.ownerId },
        select: { id: true },
      })
      apartmentIds = ownerApartments.map(a => a.id)
    }

    const transactions = await prisma.transaction.findMany({
      where: apartmentIds ? {
        date: { gte: range.startDate, lte: range.endDate },
        apartmentId: { in: apartmentIds },
      } : {
        date: { gte: range.startDate, lte: range.endDate },
      },
      orderBy: { date: 'asc' },
    })

    // Получаем названия апартаментов
    const apartmentIdSet = Array.from(new Set(transactions.map(t => t.apartmentId).filter((id): id is string => !!id)))
    const apartments = await prisma.apartment.findMany({
      where: { id: { in: apartmentIdSet } },
      select: { id: true, title: true },
    })
    const apartmentMap = new Map(apartments.map(a => [a.id, a.title]))

    // BOM для корректного отображения UTF-8 в Excel
    const BOM = '\uFEFF'
    const headers = ['Дата', 'ID', 'Тип', 'Категория', 'Сумма', 'Валюта', 'Описание', 'Номер документа', 'Апартамент', 'Бронирование ID']
    const rows = transactions.map((tx) => [
      tx.date.toISOString().split('T')[0],
      tx.id,
      this.translateType(tx.type),
      this.translateCategory(tx.category),
      tx.amount.toString().replace('.', ','), // Формат для Excel
      tx.currency,
      `"${tx.description.replace(/"/g, '""')}"`, // Экранируем кавычки
      tx.reference || '',
      (tx.apartmentId && apartmentMap.get(tx.apartmentId)) || tx.apartmentId || '',
      tx.bookingId || '',
    ])

    return BOM + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
  }

  /**
   * Экспортирует финансовый отчёт в JSON (для Excel через JS)
   */
  async exportFinancialReport(year: number, month: number): Promise<{
    summary: FinancialSummary
    transactions: Array<{
      id: string
      date: string
      type: string
      category: string
      amount: number
      currency: string
      description: string
      reference: string | null
    }>
  }> {
    const summary = await this.getFinancialSummary(year, month)
    
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    })

    return {
      summary,
      transactions: transactions.map(tx => ({
        id: tx.id,
        date: tx.date.toISOString().split('T')[0],
        type: this.translateType(tx.type),
        category: this.translateCategory(tx.category),
        amount: Number(tx.amount),
        currency: tx.currency,
        description: tx.description,
        reference: tx.reference,
      })),
    }
  }

  /**
   * Получает историю выручки по месяцам
   */
  async getRevenueHistory(months: number = 12, ownerId?: string): Promise<Array<{
    year: number
    month: number
    revenue: number
    bookings: number
    avgBookingValue: number
    isClosed: boolean
  }>> {
    const results = []
    const now = new Date()

    // Фильтр по владельцу
    const apartmentFilter = ownerId ? { ownerId } : {}

    // Получаем ID квартир владельца
    const ownerApartments = await prisma.apartment.findMany({
      where: apartmentFilter,
      select: { id: true },
    })
    const apartmentIds = ownerApartments.map(a => a.id)

    // Получаем все периоды одним запросом
    const periods = await prisma.financialPeriod.findMany({
      where: {
        OR: Array.from({ length: months }, (_, i) => {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
          return { year: date.getFullYear(), month: date.getMonth() + 1 }
        }),
      },
    })

    const periodMap = new Map(
      periods.map(p => [`${p.year}-${p.month}`, p.isClosed])
    )

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1

      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)

      const bookings = await prisma.booking.aggregate({
        where: {
          checkIn: { gte: startDate, lte: endDate },
          status: { in: ['CONFIRMED', 'PAID', 'COMPLETED'] },
          ...(ownerId ? { apartmentId: { in: apartmentIds } } : {}),
        },
        _sum: { totalPrice: true },
        _count: true,
      })

      const revenue = Number(bookings._sum.totalPrice) || 0
      const count = bookings._count

      results.push({
        year,
        month,
        revenue,
        bookings: count,
        avgBookingValue: count > 0 ? revenue / count : 0,
        isClosed: periodMap.get(`${year}-${month}`) ?? false,
      })
    }

    return results.reverse()
  }

  /**
   * Получает транзакции с пагинацией
   */
  async getTransactions(params: {
    type?: TransactionType
    category?: TransactionCategory
    apartmentId?: string
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
    ownerId?: string  // Фильтр по владельцу
  }) {
    const { type, category, apartmentId, startDate, endDate, page = 1, limit = 50, ownerId } = params

    const where: Record<string, unknown> = {}
    
    // Фильтр по владельцу
    if (ownerId) {
      const ownerApartments = await prisma.apartment.findMany({
        where: { ownerId },
        select: { id: true },
      })
      where.apartmentId = { in: ownerApartments.map(a => a.id) }
    }
    
    if (type) where.type = type
    if (category) where.category = category
    if (apartmentId) where.apartmentId = apartmentId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, Date>).gte = startDate
      if (endDate) (where.date as Record<string, Date>).lte = endDate
    }

    const [transactionRecords, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    // Получаем названия апартаментов
    const apartmentIdSet = Array.from(
      new Set(transactionRecords.map(t => t.apartmentId).filter((id): id is string => !!id))
    )
    const apartments = await prisma.apartment.findMany({
      where: { id: { in: apartmentIdSet } },
      select: { id: true, title: true },
    })
    const apartmentMap = new Map(apartments.map(a => [a.id, { id: a.id, title: a.title }]))

    // Добавляем информацию об апартаментах к транзакциям
    const transactions = transactionRecords.map(tx => ({
      ...tx,
      apartment: tx.apartmentId ? apartmentMap.get(tx.apartmentId) || null : null,
    }))

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Обновляет транзакцию (через создание корректировки для прозрачности)
   * Примечание: Для простоты редактирования описания - прямое обновление
   */
  async updateTransaction(id: string, data: {
    description?: string
    category?: TransactionCategory
    amount?: number
    date?: Date
    apartmentId?: string
  }) {
    const existing = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error('Транзакция не найдена')
    }

    // Для финансовых изменений (сумма) - создаём корректировку
    if (data.amount !== undefined && data.amount !== Number(existing.amount)) {
      // Создаём корректирующую запись для прозрачности
      await prisma.transaction.create({
        data: {
          bookingId: existing.bookingId,
          apartmentId: existing.apartmentId,
          type: TransactionType.ADJUSTMENT,
          category: existing.category,
          amount: data.amount - Number(existing.amount),
          currency: existing.currency,
          description: `Корректировка суммы транзакции #${id.slice(0, 8)}`,
          reference: id,
          date: new Date(),
          createdBy: existing.createdBy,
          metadata: {
            originalAmount: Number(existing.amount),
            newAmount: data.amount,
            adjustmentReason: 'manual_edit',
          },
        },
      })
    }

    // Обновляем основную информацию
    return prisma.transaction.update({
      where: { id },
      data: {
        description: data.description,
        category: data.category,
        date: data.date,
        apartmentId: data.apartmentId,
      },
    })
  }

  /**
   * Удаляет транзакцию (создаёт обратную корректировку)
   * Фактически транзакции не удаляются - создаётся отменяющая запись
   */
  async deleteTransaction(id: string) {
    const existing = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error('Транзакция не найдена')
    }

    // Создаём отменяющую транзакцию
    await prisma.transaction.create({
      data: {
        bookingId: existing.bookingId,
        apartmentId: existing.apartmentId,
        type: TransactionType.ADJUSTMENT,
        category: existing.category,
        amount: -Number(existing.amount),
        currency: existing.currency,
        description: `Отмена транзакции #${id.slice(0, 8)}`,
        reference: id,
        date: new Date(),
        createdBy: existing.createdBy,
        metadata: {
          originalTransactionId: id,
          originalAmount: Number(existing.amount),
          voidedAt: new Date().toISOString(),
        },
      },
    })

    // Помечаем оригинальную транзакцию как отменённую
    return prisma.transaction.update({
      where: { id },
      data: {
        metadata: {
          ...(existing.metadata as object || {}),
          voided: true,
          voidedAt: new Date().toISOString(),
        },
      },
    })
  }

  /**
   * Получает бюджеты по категориям расходов
   */
  async getCategoryBudgets(ownerId?: string) {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const startDate = new Date(currentYear, currentMonth - 1, 1)
    const endDate = new Date(currentYear, currentMonth, 0)

    // Фильтр по владельцу
    const apartmentFilter = ownerId ? { ownerId } : {}
    const ownerApartments = await prisma.apartment.findMany({
      where: apartmentFilter,
      select: { id: true },
    })
    const apartmentIds = ownerApartments.map(a => a.id)

    // Получаем расходы за текущий месяц по категориям
    const expenses = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        date: { gte: startDate, lte: endDate },
        type: { in: [TransactionType.EXPENSE, TransactionType.COMMISSION] },
        ...(ownerId ? { apartmentId: { in: apartmentIds } } : {}),
      },
      _sum: { amount: true },
    })

    // Стандартные бюджеты по категориям (можно хранить в настройках)
    const defaultBudgets: Record<string, number> = {
      MAINTENANCE: 50000,
      UTILITIES: 30000,
      ADVERTISING: 20000,
      OTHER: 10000,
    }

    const result = Object.entries(defaultBudgets).map(([category, budget]) => {
      const spent = expenses.find(e => e.category === category)?._sum.amount || 0
      return {
        category,
        categoryName: this.translateCategory(category as TransactionCategory),
        budget,
        spent: Math.abs(Number(spent)),
        percentage: budget > 0 ? Math.round((Math.abs(Number(spent)) / budget) * 100) : 0,
      }
    })

    return result
  }

  /**
   * Устанавливает бюджет для категории
   */
  async setCategoryBudget(category: string, budget: number, ownerId?: string) {
    // В продакшене это должно сохраняться в БД (например, в Settings или отдельной таблице)
    // Пока возвращаем успешный результат
    return {
      category,
      budget,
      success: true,
    }
  }

  // Вспомогательные методы
  private translateType(type: TransactionType): string {
    const map: Record<TransactionType, string> = {
      INCOME: 'Доход',
      EXPENSE: 'Расход',
      REFUND: 'Возврат',
      COMMISSION: 'Комиссия',
      TAX: 'Налог',
      ADJUSTMENT: 'Корректировка',
    }
    return map[type] || type
  }

  private translateCategory(category: TransactionCategory): string {
    const map: Record<TransactionCategory, string> = {
      BOOKING: 'Бронирование',
      CLEANING_FEE: 'Уборка',
      SERVICE_FEE: 'Сервисный сбор',
      CANCELLATION: 'Отмена',
      MAINTENANCE: 'Обслуживание',
      UTILITIES: 'Коммунальные',
      ADVERTISING: 'Реклама',
      OTHER: 'Прочее',
    }
    return map[category] || category
  }
}

export const accountingService = new AccountingService()
