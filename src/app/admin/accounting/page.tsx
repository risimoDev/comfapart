'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  PlusIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  TagIcon,
  ReceiptPercentIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'

interface FinancialSummary {
  period: { year: number; month: number }
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
    maintenance: number
    utilities: number
    advertising: number
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

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'ADJUSTMENT'
  category: string
  amount: number
  currency: string
  description: string
  date: string
  reference?: string
  apartmentId?: string
  apartment?: { title: string }
  createdAt: string
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

const TRANSACTION_CATEGORIES = {
  income: [
    { value: 'BOOKING', label: 'Бронирование', icon: '🏠' },
    { value: 'CLEANING_FEE', label: 'Уборка', icon: '🧹' },
    { value: 'SERVICE_FEE', label: 'Сервисный сбор', icon: '⭐' },
    { value: 'EXTRA_GUEST', label: 'Доп. гости', icon: '👥' },
    { value: 'LATE_CHECKOUT', label: 'Поздний выезд', icon: '🕐' },
    { value: 'OTHER_INCOME', label: 'Прочий доход', icon: '💰' },
  ],
  expense: [
    { value: 'MAINTENANCE', label: 'Обслуживание', icon: '🔧' },
    { value: 'UTILITIES', label: 'Коммунальные', icon: '💡' },
    { value: 'CLEANING', label: 'Уборка', icon: '🧽' },
    { value: 'SUPPLIES', label: 'Расходники', icon: '📦' },
    { value: 'ADVERTISING', label: 'Реклама', icon: '📢' },
    { value: 'INSURANCE', label: 'Страховка', icon: '🛡️' },
    { value: 'TAXES', label: 'Налоги', icon: '📋' },
    { value: 'COMMISSION', label: 'Комиссия', icon: '💳' },
    { value: 'REPAIR', label: 'Ремонт', icon: '🔨' },
    { value: 'OTHER_EXPENSE', label: 'Прочие расходы', icon: '📝' },
  ],
}

// Цвета для категорий расходов
const CATEGORY_COLORS: Record<string, { color: string; icon: string }> = {
  MAINTENANCE: { color: 'bg-blue-500', icon: '🔧' },
  UTILITIES: { color: 'bg-yellow-500', icon: '💡' },
  CLEANING: { color: 'bg-green-500', icon: '🧽' },
  SUPPLIES: { color: 'bg-orange-500', icon: '📦' },
  ADVERTISING: { color: 'bg-purple-500', icon: '📢' },
  INSURANCE: { color: 'bg-cyan-500', icon: '🛡️' },
  TAXES: { color: 'bg-red-500', icon: '📋' },
  COMMISSION: { color: 'bg-indigo-500', icon: '💳' },
  REPAIR: { color: 'bg-amber-500', icon: '🔨' },
  OTHER_EXPENSE: { color: 'bg-gray-500', icon: '📝' },
}

export default function AccountingPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [apartments, setApartments] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'categories' | 'reports'>('overview')
  
  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE' | 'REFUND'>('all')
  const [filterCategory, setFilterCategory] = useState('')
  
  // Form
  const [txForm, setTxForm] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE' | 'REFUND' | 'ADJUSTMENT',
    category: 'BOOKING',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    apartmentId: '',
    reference: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    fetchApartments()
  }, [])

  const fetchApartments = async () => {
    try {
      const response = await fetch('/api/admin/apartments?limit=100')
      if (response.ok) {
        const data = await response.json()
        setApartments(data.apartments || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки апартаментов:', error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [summaryRes, transactionsRes] = await Promise.all([
        fetch(`/api/admin/accounting?action=summary&year=${selectedYear}&month=${selectedMonth}`),
        fetch(`/api/admin/accounting?action=transactions&year=${selectedYear}&month=${selectedMonth}&limit=100`),
      ])

      if (summaryRes.ok) setSummary(await summaryRes.json())
      if (transactionsRes.ok) {
        const data = await transactionsRes.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const response = await fetch(
        `/api/admin/accounting?action=export&format=${format}&year=${selectedYear}&month=${selectedMonth}`
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `accounting_${selectedYear}-${selectedMonth}.${format === 'excel' ? 'xlsx' : 'csv'}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error)
    }
  }

  const openCreateTransaction = () => {
    setEditingTransaction(null)
    setTxForm({
      type: 'INCOME',
      category: 'BOOKING',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      apartmentId: '',
      reference: '',
    })
    setShowTransactionModal(true)
  }

  const openEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx)
    setTxForm({
      type: tx.type,
      category: tx.category,
      amount: Math.abs(tx.amount).toString(),
      description: tx.description,
      date: tx.date.split('T')[0],
      apartmentId: tx.apartmentId || '',
      reference: tx.reference || '',
    })
    setShowTransactionModal(true)
  }

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        action: editingTransaction ? 'updateTransaction' : 'createTransaction',
        id: editingTransaction?.id,
        type: txForm.type,
        category: txForm.category,
        amount: parseFloat(txForm.amount) * (txForm.type === 'EXPENSE' || txForm.type === 'REFUND' ? -1 : 1),
        description: txForm.description,
        date: txForm.date,
        apartmentId: txForm.apartmentId || null,
        reference: txForm.reference || null,
      }

      const response = await fetch('/api/admin/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setShowTransactionModal(false)
        fetchData()
      } else {
        const error = await response.json()
        alert(error.message || 'Ошибка сохранения')
      }
    } catch (error) {
      console.error('Ошибка:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Удалить эту транзакцию?')) return

    try {
      const response = await fetch('/api/admin/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteTransaction', id }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Ошибка удаления:', error)
    }
  }

  const handleClosePeriod = async () => {
    if (!confirm(`Закрыть период ${MONTHS[selectedMonth - 1]} ${selectedYear}? После закрытия изменения будут недоступны.`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'closePeriod',
          year: selectedYear,
          month: selectedMonth,
        }),
      })

      if (response.ok) {
        alert('Период успешно закрыт')
        fetchData()
      }
    } catch (error) {
      console.error('Ошибка закрытия периода:', error)
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.reference?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || tx.type === filterType
    const matchesCategory = !filterCategory || tx.category === filterCategory
    return matchesSearch && matchesType && matchesCategory
  })

  const getCategoryIcon = (type: string, category: string) => {
    const categories = type === 'INCOME' || type === 'ADJUSTMENT' 
      ? TRANSACTION_CATEGORIES.income 
      : TRANSACTION_CATEGORIES.expense
    return categories.find(c => c.value === category)?.icon || '📄'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бухгалтерия</h1>
          <p className="text-gray-500 mt-1">Финансы, транзакции и отчёты</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-sm border-0 focus:ring-0 pr-8"
            >
              {MONTHS.map((month, idx) => (
                <option key={idx} value={idx + 1}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-sm border-0 focus:ring-0 pr-8"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <DocumentArrowDownIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium">Экспорт</span>
          </button>

          <button
            onClick={openCreateTransaction}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Транзакция</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Обзор', icon: ChartBarIcon },
            { id: 'transactions', label: 'Транзакции', icon: BanknotesIcon },
            { id: 'categories', label: 'Категории расходов', icon: TagIcon },
            { id: 'reports', label: 'Отчёты', icon: BuildingOfficeIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && summary && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Доходы</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(summary.income.total)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Бронирования:</span>
                  <span>{formatCurrency(summary.income.bookings)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Сервисные сборы:</span>
                  <span>{formatCurrency(summary.income.serviceFees + summary.income.cleaningFees)}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Расходы</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(summary.expenses.total)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Возвраты:</span>
                  <span>{formatCurrency(summary.expenses.refunds)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Обслуживание:</span>
                  <span>{formatCurrency(summary.expenses.maintenance || 0)}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Чистая прибыль</p>
                  <p className={`text-2xl font-bold mt-1 ${summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.netProfit)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BanknotesIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Рентабельность</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {summary.income.total > 0 
                      ? ((summary.netProfit / summary.income.total) * 100).toFixed(1) 
                      : 0}%
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <ReceiptPercentIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                От общего дохода
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Быстрые действия
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Управление периодом {MONTHS[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={fetchData}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  <span className="font-medium">Обновить</span>
                </button>
                <button
                  onClick={handleClosePeriod}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="font-medium">Закрыть период</span>
                </button>
              </div>
            </div>
          </div>

          {/* Income/Expense Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Структура доходов</h3>
              <div className="space-y-4">
                {[
                  { label: 'Бронирования', value: summary.income.bookings, color: 'bg-green-500' },
                  { label: 'Уборка', value: summary.income.cleaningFees, color: 'bg-blue-500' },
                  { label: 'Сервисный сбор', value: summary.income.serviceFees, color: 'bg-purple-500' },
                ].map((item) => {
                  const percent = summary.income.total > 0 ? (item.value / summary.income.total) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Структура расходов</h3>
              <div className="space-y-4">
                {[
                  { label: 'Возвраты', value: summary.expenses.refunds, color: 'bg-red-500' },
                  { label: 'Комиссии', value: summary.expenses.commissions, color: 'bg-orange-500' },
                  { label: 'Обслуживание', value: summary.expenses.maintenance || 0, color: 'bg-blue-500' },
                  { label: 'Коммунальные', value: summary.expenses.utilities || 0, color: 'bg-yellow-500' },
                  { label: 'Реклама', value: summary.expenses.advertising || 0, color: 'bg-purple-500' },
                  { label: 'Прочее', value: summary.expenses.other, color: 'bg-gray-500' },
                ].filter(item => item.value > 0).map((item) => {
                  const percent = summary.expenses.total > 0 ? (item.value / summary.expenses.total) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по описанию..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="all">Все типы</option>
                <option value="INCOME">Доходы</option>
                <option value="EXPENSE">Расходы</option>
                <option value="REFUND">Возвраты</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">Все категории</option>
                <optgroup label="Доходы">
                  {TRANSACTION_CATEGORIES.income.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Расходы">
                  {TRANSACTION_CATEGORIES.expense.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Дата</th>
                  <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Категория</th>
                  <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Описание</th>
                  <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Апартамент</th>
                  <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">Сумма</th>
                  <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      <BanknotesIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Нет транзакций</p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(tx.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(tx.type, tx.category)}</span>
                          <div>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              tx.type === 'INCOME' ? 'bg-green-100 text-green-700' :
                              tx.type === 'EXPENSE' ? 'bg-red-100 text-red-700' :
                              tx.type === 'REFUND' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {tx.type === 'INCOME' ? 'Доход' :
                               tx.type === 'EXPENSE' ? 'Расход' :
                               tx.type === 'REFUND' ? 'Возврат' : 'Корректировка'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{tx.description}</p>
                        {tx.reference && (
                          <p className="text-xs text-gray-500">Ref: {tx.reference}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {tx.apartment?.title || '—'}
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium text-right ${
                        tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditTransaction(tx)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Расходы по категориям</h2>
          </div>

          {(() => {
            // Подсчитываем расходы по категориям из реальных транзакций
            const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE')
            const categoryTotals = expenseTransactions.reduce((acc, tx) => {
              const cat = tx.category || 'OTHER_EXPENSE'
              acc[cat] = (acc[cat] || 0) + Math.abs(tx.amount)
              return acc
            }, {} as Record<string, number>)

            const totalExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0)
            const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

            if (categories.length === 0) {
              return (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  <TagIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>Нет расходов за выбранный период</p>
                </div>
              )
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(([category, spent]) => {
                  const config = CATEGORY_COLORS[category] || { color: 'bg-gray-500', icon: '📝' }
                  const categoryLabel = TRANSACTION_CATEGORIES.expense.find(c => c.value === category)?.label || category
                  const percent = totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0
                  
                  return (
                    <div key={category} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-xl`}>
                            {config.icon}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{categoryLabel}</h3>
                            <p className="text-xs text-gray-500">{percent.toFixed(1)}% от всех расходов</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Потрачено</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(spent)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            className={`h-full rounded-full ${config.color}`}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {activeTab === 'reports' && summary && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Отчёт по апартаментам</h3>
            <p className="text-sm text-gray-500">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Апартамент</th>
                <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">Бронирований</th>
                <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">Доход</th>
                <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">Расходы</th>
                <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">Прибыль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary.byApartment.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Нет данных за выбранный период
                  </td>
                </tr>
              ) : (
                summary.byApartment.map((apt) => (
                  <tr key={apt.apartmentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {apt.apartmentTitle}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right">
                      {apt.bookingsCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium text-right">
                      {formatCurrency(apt.income)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 font-medium text-right">
                      {formatCurrency(apt.expenses)}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${
                      apt.profit >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(apt.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">Итого</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                  {summary.byApartment.reduce((sum, a) => sum + a.bookingsCount, 0)}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                  {formatCurrency(summary.income.total)}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">
                  {formatCurrency(summary.expenses.total)}
                </td>
                <td className={`px-6 py-4 text-sm font-bold text-right ${
                  summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {formatCurrency(summary.netProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Transaction Modal */}
      <AnimatePresence>
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTransaction ? 'Редактировать транзакцию' : 'Новая транзакция'}
                </h2>
              </div>

              <form onSubmit={handleSubmitTransaction} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
                  <select
                    value={txForm.type}
                    onChange={(e) => setTxForm({ 
                      ...txForm, 
                      type: e.target.value as typeof txForm.type,
                      category: e.target.value === 'INCOME' ? 'BOOKING' : 'MAINTENANCE'
                    })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="INCOME">Доход</option>
                    <option value="EXPENSE">Расход</option>
                    <option value="REFUND">Возврат</option>
                    <option value="ADJUSTMENT">Корректировка</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    {(txForm.type === 'INCOME' || txForm.type === 'ADJUSTMENT' 
                      ? TRANSACTION_CATEGORIES.income 
                      : TRANSACTION_CATEGORIES.expense
                    ).map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                  <input
                    type="text"
                    value={txForm.description}
                    onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                    placeholder="Описание транзакции"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                  <input
                    type="date"
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Апартамент</label>
                  <select
                    value={txForm.apartmentId}
                    onChange={(e) => setTxForm({ ...txForm, apartmentId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">— Не указан —</option>
                    {apartments.map(apt => (
                      <option key={apt.id} value={apt.id}>{apt.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Референс</label>
                  <input
                    type="text"
                    value={txForm.reference}
                    onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })}
                    placeholder="Номер бронирования, счёта и т.д."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : editingTransaction ? 'Сохранить' : 'Добавить'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
