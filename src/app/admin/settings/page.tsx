'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Cog6ToothIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  CalendarIcon,
  BellIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'

interface SystemSetting {
  key: string
  value: unknown
  description: string | null
}

interface CompanySettings {
  id: string
  name: string
  legalName?: string
  inn?: string
  ogrn?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  workingHours?: string
  cancellationPolicy?: string
  bookingTerms?: string
}

interface GroupedSettings {
  general?: SystemSetting[]
  booking?: SystemSetting[]
  finance?: SystemSetting[]
  notification?: SystemSetting[]
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'booking' | 'finance' | 'notifications'>('company')
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [systemSettings, setSystemSettings] = useState<GroupedSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setCompanySettings(data.company)
        setSystemSettings(data.system || {})
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyChange = (field: string, value: string) => {
    if (companySettings) {
      setCompanySettings({ ...companySettings, [field]: value })
    }
  }

  const handleSystemSettingChange = (key: string, value: unknown) => {
    const category = key.split('.')[0] as keyof GroupedSettings
    const updated = { ...systemSettings }
    
    if (updated[category]) {
      updated[category] = updated[category]!.map(s => 
        s.key === key ? { ...s, value } : s
      )
    }
    
    setSystemSettings(updated)
  }

  const saveCompanySettings = async () => {
    if (!companySettings) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      const { id, ...data } = companySettings
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'company', ...data }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки компании сохранены' })
      } else {
        setMessage({ type: 'error', text: 'Ошибка сохранения' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка сохранения' })
    } finally {
      setSaving(false)
    }
  }

  const saveSystemSettings = async (category: string) => {
    setSaving(true)
    setMessage(null)
    
    const settings = (systemSettings as Record<string, SystemSetting[]>)[category]?.map(s => ({
      key: s.key,
      value: s.value,
    })) || []

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'system', settings }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки сохранены' })
      } else {
        setMessage({ type: 'error', text: 'Ошибка сохранения' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка сохранения' })
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/settings?type=export')
      if (response.ok) {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `settings_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'import', importData }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки импортированы' })
        fetchSettings()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка импорта файла' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'company', label: 'Компания', icon: BuildingOfficeIcon },
    { id: 'booking', label: 'Бронирование', icon: CalendarIcon },
    { id: 'finance', label: 'Финансы', icon: BanknotesIcon },
    { id: 'notifications', label: 'Уведомления', icon: BellIcon },
  ]

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
          <p className="text-gray-500 mt-1">Управление параметрами системы</p>
        </div>

        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer">
            <ArrowUpTrayIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium">Импорт</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <ArrowDownTrayIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium">Экспорт</span>
          </button>
        </div>
      </div>

      {/* Сообщение */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Табы */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
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

        <div className="p-6">
          {/* Настройки компании */}
          {activeTab === 'company' && companySettings && (
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название компании
                  </label>
                  <input
                    type="text"
                    value={companySettings.name || ''}
                    onChange={(e) => handleCompanyChange('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Юридическое название
                  </label>
                  <input
                    type="text"
                    value={companySettings.legalName || ''}
                    onChange={(e) => handleCompanyChange('legalName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ИНН</label>
                  <input
                    type="text"
                    value={companySettings.inn || ''}
                    onChange={(e) => handleCompanyChange('inn', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ОГРН</label>
                  <input
                    type="text"
                    value={companySettings.ogrn || ''}
                    onChange={(e) => handleCompanyChange('ogrn', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                  <input
                    type="text"
                    value={companySettings.address || ''}
                    onChange={(e) => handleCompanyChange('address', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                  <input
                    type="text"
                    value={companySettings.phone || ''}
                    onChange={(e) => handleCompanyChange('phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={companySettings.email || ''}
                    onChange={(e) => handleCompanyChange('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сайт</label>
                  <input
                    type="text"
                    value={companySettings.website || ''}
                    onChange={(e) => handleCompanyChange('website', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Время работы
                  </label>
                  <input
                    type="text"
                    value={companySettings.workingHours || ''}
                    onChange={(e) => handleCompanyChange('workingHours', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Политика отмены
                </label>
                <textarea
                  value={companySettings.cancellationPolicy || ''}
                  onChange={(e) => handleCompanyChange('cancellationPolicy', e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <button
                onClick={saveCompanySettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckIcon className="h-5 w-5" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          )}

          {/* Настройки бронирования */}
          {activeTab === 'booking' && (
            <SettingsSection
              settings={systemSettings.booking || []}
              onChange={handleSystemSettingChange}
              onSave={() => saveSystemSettings('booking')}
              saving={saving}
            />
          )}

          {/* Финансовые настройки */}
          {activeTab === 'finance' && (
            <SettingsSection
              settings={systemSettings.finance || []}
              onChange={handleSystemSettingChange}
              onSave={() => saveSystemSettings('finance')}
              saving={saving}
            />
          )}

          {/* Настройки уведомлений */}
          {activeTab === 'notifications' && (
            <SettingsSection
              settings={systemSettings.notification || []}
              onChange={handleSystemSettingChange}
              onSave={() => saveSystemSettings('notification')}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Компонент секции настроек
function SettingsSection({
  settings,
  onChange,
  onSave,
  saving,
}: {
  settings: SystemSetting[]
  onChange: (key: string, value: unknown) => void
  onSave: () => void
  saving: boolean
}) {
  if (settings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Нет настроек в этой категории
      </div>
    )
  }

  const renderInput = (setting: SystemSetting) => {
    const value = setting.value

    // Булево значение
    if (typeof value === 'boolean') {
      return (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(setting.key, e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      )
    }

    // Числовое значение
    if (typeof value === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(setting.key, Number(e.target.value))}
          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      )
    }

    // Строковое значение
    return (
      <input
        type="text"
        value={String(value || '')}
        onChange={(e) => onChange(setting.key, e.target.value)}
        className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {settings.map((setting) => (
          <div
            key={setting.key}
            className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {setting.description || setting.key}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{setting.key}</p>
            </div>
            {renderInput(setting)}
          </div>
        ))}
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <CheckIcon className="h-5 w-5" />
        {saving ? 'Сохранение...' : 'Сохранить изменения'}
      </button>
    </div>
  )
}
