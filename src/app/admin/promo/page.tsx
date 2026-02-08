'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TicketIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  CalendarDaysIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

interface PromoCode {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  minNights: number | null
  minAmount: number | null
  maxDiscount: number | null
  startDate: string | null
  endDate: string | null
  usageLimit: number | null
  usageCount: number
  perUserLimit: number | null
  apartmentIds: string[]
  isActive: boolean
  createdAt: string
}

interface Apartment {
  id: string
  title: string
}

interface PromoStats {
  totalCodes: number
  activeCodes: number
  totalUsage: number
  totalDiscount: number
}

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [stats, setStats] = useState<PromoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: 10,
    minNights: '',
    minAmount: '',
    maxDiscount: '',
    startDate: '',
    endDate: '',
    usageLimit: '',
    perUserLimit: '',
    apartmentIds: [] as string[],
    isActive: true,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [promoRes, apartmentsRes] = await Promise.all([
        fetch('/api/admin/promo'),
        fetch('/api/admin/apartments?limit=100'),
      ])

      if (promoRes.ok) {
        const data = await promoRes.json()
        setPromoCodes(data.promoCodes || [])
        setStats(data.stats || null)
      }

      if (apartmentsRes.ok) {
        const data = await apartmentsRes.json()
        setApartments(data.apartments || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setForm({ ...form, code })
  }

  const openCreateModal = () => {
    setEditingPromo(null)
    setForm({
      code: '',
      type: 'PERCENTAGE',
      value: 10,
      minNights: '',
      minAmount: '',
      maxDiscount: '',
      startDate: '',
      endDate: '',
      usageLimit: '',
      perUserLimit: '',
      apartmentIds: [],
      isActive: true,
    })
    setShowModal(true)
  }

  const openEditModal = (promo: PromoCode) => {
    setEditingPromo(promo)
    setForm({
      code: promo.code,
      type: promo.type,
      value: promo.value,
      minNights: promo.minNights?.toString() || '',
      minAmount: promo.minAmount?.toString() || '',
      maxDiscount: promo.maxDiscount?.toString() || '',
      startDate: promo.startDate ? promo.startDate.split('T')[0] : '',
      endDate: promo.endDate ? promo.endDate.split('T')[0] : '',
      usageLimit: promo.usageLimit?.toString() || '',
      perUserLimit: promo.perUserLimit?.toString() || '',
      apartmentIds: promo.apartmentIds,
      isActive: promo.isActive,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: form.value,
        minNights: form.minNights ? parseInt(form.minNights) : null,
        minAmount: form.minAmount ? parseFloat(form.minAmount) : null,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        perUserLimit: form.perUserLimit ? parseInt(form.perUserLimit) : null,
        apartmentIds: form.apartmentIds,
        isActive: form.isActive,
      }

      const response = await fetch('/api/admin/promo', {
        method: editingPromo ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPromo ? { id: editingPromo.id, ...payload } : payload),
      })

      if (response.ok) {
        setShowModal(false)
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

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить промокод?')) return

    try {
      const response = await fetch(`/api/admin/promo?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Ошибка удаления:', error)
    }
  }

  const toggleActive = async (promo: PromoCode) => {
    try {
      const response = await fetch('/api/admin/promo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promo.id, isActive: !promo.isActive }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Ошибка:', error)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    // Можно добавить toast уведомление
  }

  const filteredPromoCodes = promoCodes.filter(promo => {
    const matchesSearch = promo.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterActive === 'all' ||
      (filterActive === 'active' && promo.isActive) ||
      (filterActive === 'inactive' && !promo.isActive)
    return matchesSearch && matchesFilter
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('ru-RU')
  }

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Промокоды</h1>
          <p className="text-gray-500 mt-1">Управление скидками и акциями</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="font-medium">Создать промокод</span>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TicketIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Всего кодов</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalCodes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Активных</p>
                <p className="text-xl font-bold text-gray-900">{stats.activeCodes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UsersIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Использований</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalUsage}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Сумма скидок</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.totalDiscount.toLocaleString()} ₽
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                placeholder="Поиск по коду..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterActive(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterActive === filter
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'Все' : filter === 'active' ? 'Активные' : 'Неактивные'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Код</th>
              <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Скидка</th>
              <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Срок действия</th>
              <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Использования</th>
              <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Статус</th>
              <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPromoCodes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  <TicketIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Нет промокодов</p>
                </td>
              </tr>
            ) : (
              filteredPromoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono font-bold">
                        {promo.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(promo.code)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Копировать"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">
                      {promo.type === 'PERCENTAGE' ? `${promo.value}%` : `${promo.value.toLocaleString()} ₽`}
                    </span>
                    {promo.maxDiscount && (
                      <span className="text-xs text-gray-500 block">
                        макс. {promo.maxDiscount.toLocaleString()} ₽
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {promo.startDate || promo.endDate ? (
                      <div>
                        {formatDate(promo.startDate)} — {formatDate(promo.endDate)}
                      </div>
                    ) : (
                      <span className="text-gray-400">Бессрочно</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="h-4 w-4 text-gray-400" />
                      <span>
                        {promo.usageCount}
                        {promo.usageLimit && ` / ${promo.usageLimit}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(promo)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        promo.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {promo.isActive ? (
                        <>
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          Активен
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-3.5 w-3.5" />
                          Неактивен
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(promo)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPromo ? 'Редактировать промокод' : 'Создать промокод'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Код */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Код промокода
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="SUMMER2024"
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 font-mono uppercase"
                      required
                      disabled={!!editingPromo}
                    />
                    {!editingPromo && (
                      <button
                        type="button"
                        onClick={generateCode}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Сгенерировать
                      </button>
                    )}
                  </div>
                </div>

                {/* Тип и значение */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип скидки
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="PERCENTAGE">Процент</option>
                      <option value="FIXED">Фиксированная сумма</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {form.type === 'PERCENTAGE' ? 'Процент скидки' : 'Сумма скидки'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={form.type === 'PERCENTAGE' ? 100 : 100000}
                        value={form.value}
                        onChange={(e) => setForm({ ...form, value: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {form.type === 'PERCENTAGE' ? '%' : '₽'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ограничения */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Мин. ночей
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.minNights}
                      onChange={(e) => setForm({ ...form, minNights: e.target.value })}
                      placeholder="—"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Мин. сумма заказа
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.minAmount}
                      onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                      placeholder="—"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                {form.type === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Максимальная скидка (₽)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.maxDiscount}
                      onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                      placeholder="Без ограничений"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                )}

                {/* Срок действия */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Начало действия
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Окончание действия
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                {/* Лимиты использования */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Лимит использований
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.usageLimit}
                      onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                      placeholder="Без ограничений"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      На пользователя
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.perUserLimit}
                      onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
                      placeholder="Без ограничений"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                {/* Апартаменты */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Применимо к апартаментам
                  </label>
                  <select
                    multiple
                    value={form.apartmentIds}
                    onChange={(e) => setForm({
                      ...form,
                      apartmentIds: Array.from(e.target.selectedOptions, opt => opt.value)
                    })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 h-32"
                  >
                    {apartments.map(apt => (
                      <option key={apt.id} value={apt.id}>{apt.title}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {form.apartmentIds.length === 0 ? 'Ко всем апартаментам' : `Выбрано: ${form.apartmentIds.length}`}
                  </p>
                </div>

                {/* Активен */}
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">Активен</span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : editingPromo ? 'Сохранить' : 'Создать'}
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
