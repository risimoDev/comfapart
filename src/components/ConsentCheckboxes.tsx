'use client'

/**
 * Компонент чекбоксов согласия для форм регистрации и бронирования
 * Соответствие требованиям 152-ФЗ
 */

import { useState } from 'react'
import Link from 'next/link'
import { Check, AlertCircle } from 'lucide-react'

interface ConsentCheckboxProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  required?: boolean
  error?: string
  children: React.ReactNode
}

// Базовый чекбокс согласия
export function ConsentCheckbox({ 
  id, 
  checked, 
  onChange, 
  required = false,
  error,
  children 
}: ConsentCheckboxProps) {
  return (
    <div className="relative">
      <label 
        htmlFor={id}
        className={`flex items-start gap-3 cursor-pointer group ${
          error ? 'text-red-600' : ''
        }`}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
            required={required}
          />
          <div 
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              checked 
                ? 'bg-primary-600 border-primary-600' 
                : error
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 group-hover:border-primary-400'
            }`}
          >
            {checked && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
        <span className={`text-sm leading-relaxed ${
          error 
            ? 'text-red-600 dark:text-red-400' 
            : 'text-gray-600 dark:text-gray-400'
        }`}>
          {children}
        </span>
      </label>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// Согласие на обработку персональных данных
interface PersonalDataConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
}

export function PersonalDataConsent({ checked, onChange, error }: PersonalDataConsentProps) {
  return (
    <ConsentCheckbox
      id="personal-data-consent"
      checked={checked}
      onChange={onChange}
      required
      error={error}
    >
      Я даю согласие на{' '}
      <Link 
        href="/legal/personal-data" 
        target="_blank"
        className="text-primary-600 dark:text-primary-400 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        обработку персональных данных
      </Link>
      {' '}в соответствии с{' '}
      <Link 
        href="/legal/privacy"
        target="_blank"
        className="text-primary-600 dark:text-primary-400 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        Политикой конфиденциальности
      </Link>
      {' '}<span className="text-red-500">*</span>
    </ConsentCheckbox>
  )
}

// Принятие пользовательского соглашения
interface TermsConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
}

export function TermsConsent({ checked, onChange, error }: TermsConsentProps) {
  return (
    <ConsentCheckbox
      id="terms-consent"
      checked={checked}
      onChange={onChange}
      required
      error={error}
    >
      Я принимаю{' '}
      <Link 
        href="/legal/terms"
        target="_blank"
        className="text-primary-600 dark:text-primary-400 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        Пользовательское соглашение
      </Link>
      {' '}<span className="text-red-500">*</span>
    </ConsentCheckbox>
  )
}

// Принятие публичной оферты (для бронирования)
interface OfferConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
}

export function OfferConsent({ checked, onChange, error }: OfferConsentProps) {
  return (
    <ConsentCheckbox
      id="offer-consent"
      checked={checked}
      onChange={onChange}
      required
      error={error}
    >
      Я принимаю условия{' '}
      <Link 
        href="/legal/offer"
        target="_blank"
        className="text-primary-600 dark:text-primary-400 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        Публичной оферты
      </Link>
      {' '}<span className="text-red-500">*</span>
    </ConsentCheckbox>
  )
}

// Согласие на маркетинговые рассылки (опционально)
interface MarketingConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function MarketingConsent({ checked, onChange }: MarketingConsentProps) {
  return (
    <ConsentCheckbox
      id="marketing-consent"
      checked={checked}
      onChange={onChange}
    >
      Я согласен получать новости и специальные предложения на email
    </ConsentCheckbox>
  )
}

// Комплексный блок согласий для регистрации
interface RegistrationConsentsProps {
  consents: {
    personalData: boolean
    terms: boolean
    marketing: boolean
  }
  onChange: (consents: { personalData: boolean; terms: boolean; marketing: boolean }) => void
  errors?: {
    personalData?: string
    terms?: string
  }
}

export function RegistrationConsents({ consents, onChange, errors }: RegistrationConsentsProps) {
  return (
    <div className="space-y-4">
      <PersonalDataConsent
        checked={consents.personalData}
        onChange={(checked) => onChange({ ...consents, personalData: checked })}
        error={errors?.personalData}
      />
      <TermsConsent
        checked={consents.terms}
        onChange={(checked) => onChange({ ...consents, terms: checked })}
        error={errors?.terms}
      />
      <MarketingConsent
        checked={consents.marketing}
        onChange={(checked) => onChange({ ...consents, marketing: checked })}
      />
    </div>
  )
}

// Комплексный блок согласий для бронирования
interface BookingConsentsProps {
  consents: {
    personalData: boolean
    offer: boolean
  }
  onChange: (consents: { personalData: boolean; offer: boolean }) => void
  errors?: {
    personalData?: string
    offer?: string
  }
}

export function BookingConsents({ consents, onChange, errors }: BookingConsentsProps) {
  return (
    <div className="space-y-4">
      <PersonalDataConsent
        checked={consents.personalData}
        onChange={(checked) => onChange({ ...consents, personalData: checked })}
        error={errors?.personalData}
      />
      <OfferConsent
        checked={consents.offer}
        onChange={(checked) => onChange({ ...consents, offer: checked })}
        error={errors?.offer}
      />
    </div>
  )
}

// Валидация согласий
export function validateRegistrationConsents(consents: {
  personalData: boolean
  terms: boolean
  marketing: boolean
}): { valid: boolean; errors: { personalData?: string; terms?: string } } {
  const errors: { personalData?: string; terms?: string } = {}

  if (!consents.personalData) {
    errors.personalData = 'Необходимо дать согласие на обработку персональных данных'
  }

  if (!consents.terms) {
    errors.terms = 'Необходимо принять пользовательское соглашение'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateBookingConsents(consents: {
  personalData: boolean
  offer: boolean
}): { valid: boolean; errors: { personalData?: string; offer?: string } } {
  const errors: { personalData?: string; offer?: string } = {}

  if (!consents.personalData) {
    errors.personalData = 'Необходимо дать согласие на обработку персональных данных'
  }

  if (!consents.offer) {
    errors.offer = 'Необходимо принять условия публичной оферты'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
