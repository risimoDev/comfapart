'use client'

/**
 * Cookie Banner - баннер согласия на использование cookies
 * Соответствие требованиям 152-ФЗ
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Cookie, X, Settings, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface CookiePreferences {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

const COOKIE_CONSENT_KEY = 'cookie_consent'
const VISITOR_ID_KEY = 'visitor_id'

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  // Получаем или создаем visitorId
  const getVisitorId = useCallback((): string => {
    if (typeof window === 'undefined') return ''
    
    let visitorId = localStorage.getItem(VISITOR_ID_KEY)
    if (!visitorId) {
      visitorId = uuidv4()
      localStorage.setItem(VISITOR_ID_KEY, visitorId)
    }
    return visitorId
  }, [])

  // Проверяем наличие согласия при загрузке
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Показываем баннер с небольшой задержкой
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    } else {
      try {
        const saved = JSON.parse(consent)
        setPreferences(saved)
      } catch {
        setIsVisible(true)
      }
    }
  }, [])

  // Сохранение согласия
  const saveConsent = async (prefs: CookiePreferences) => {
    setIsSaving(true)
    
    try {
      const visitorId = getVisitorId()
      
      // Сохраняем локально
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs))
      
      // Отправляем на сервер
      await fetch('/api/legal/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          analytics: prefs.analytics,
          marketing: prefs.marketing,
        }),
      })

      // Применяем настройки
      applyPreferences(prefs)
      
      setIsVisible(false)
    } catch (error) {
      console.error('Error saving cookie consent:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Применение настроек (включение/отключение скриптов)
  const applyPreferences = (prefs: CookiePreferences) => {
    // Analytics
    if (prefs.analytics) {
      // Включаем Google Analytics / Яндекс.Метрику
      enableAnalytics()
    } else {
      // Отключаем
      disableAnalytics()
    }

    // Marketing
    if (prefs.marketing) {
      // Включаем маркетинговые cookies
      enableMarketing()
    } else {
      disableMarketing()
    }
  }

  const enableAnalytics = () => {
    // Здесь код для включения GA/Метрики
    // window.gtag?.('consent', 'update', { analytics_storage: 'granted' })
    console.log('Analytics enabled')
  }

  const disableAnalytics = () => {
    // Отключение аналитики
    // window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
    console.log('Analytics disabled')
  }

  const enableMarketing = () => {
    // Включение маркетинговых cookies
    console.log('Marketing enabled')
  }

  const disableMarketing = () => {
    // Отключение маркетинговых cookies
    console.log('Marketing disabled')
  }

  // Принять все
  const acceptAll = () => {
    const allAccepted = { essential: true, analytics: true, marketing: true }
    setPreferences(allAccepted)
    saveConsent(allAccepted)
  }

  // Принять только необходимые
  const acceptEssential = () => {
    const essentialOnly = { essential: true, analytics: false, marketing: false }
    setPreferences(essentialOnly)
    saveConsent(essentialOnly)
  }

  // Сохранить настройки
  const saveSettings = () => {
    saveConsent(preferences)
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
      >
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Main Banner */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <Cookie className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  🍪 Мы используем cookies
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Мы используем файлы cookies для улучшения работы сайта и анализа трафика. 
                  Нажимая «Принять все», вы соглашаетесь с использованием всех категорий cookies. 
                  Вы можете изменить настройки в любое время.{' '}
                  <Link href="/legal/cookies" className="text-primary-600 dark:text-primary-400 hover:underline">
                    Подробнее
                  </Link>
                </p>

                {/* Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={acceptAll}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? 'Сохранение...' : 'Принять все'}
                  </button>
                  
                  <button
                    onClick={acceptEssential}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    Только необходимые
                  </button>
                  
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Настроить
                    {showSettings ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsVisible(false)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {/* Essential */}
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex-shrink-0 pt-1">
                      <div className="w-5 h-5 bg-primary-600 rounded flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Строго необходимые
                        </span>
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs rounded">
                          Всегда активны
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Эти файлы cookies необходимы для работы сайта. Без них невозможна авторизация, 
                        сохранение корзины и обеспечение безопасности. Их нельзя отключить.
                      </p>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex-shrink-0 pt-1">
                      <button
                        onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          preferences.analytics 
                            ? 'bg-primary-600' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                            preferences.analytics ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white block mb-1">
                        Аналитические
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Помогают нам понять, как посетители используют сайт. Данные собираются анонимно 
                        и используются для улучшения сервиса. Включают Google Analytics и Яндекс.Метрику.
                      </p>
                    </div>
                  </div>

                  {/* Marketing */}
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex-shrink-0 pt-1">
                      <button
                        onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          preferences.marketing 
                            ? 'bg-primary-600' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                            preferences.marketing ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white block mb-1">
                        Маркетинговые
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Используются для показа персонализированной рекламы на основе ваших интересов. 
                        Могут использоваться рекламными сетями для отслеживания посещений.
                      </p>
                    </div>
                  </div>

                  {/* Save Settings Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={saveSettings}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Компонент для открытия настроек из футера
export function CookieSettingsButton() {
  const openSettings = () => {
    // Удаляем согласие чтобы показать баннер
    localStorage.removeItem(COOKIE_CONSENT_KEY)
    window.location.reload()
  }

  return (
    <button
      onClick={openSettings}
      className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
    >
      Настройки cookies
    </button>
  )
}
