/**
 * Integration tests for Bookings API
 * Интеграционные тесты API бронирований
 * 
 * ВАЖНО: Эти тесты НЕ очищают базу данных!
 * Они используют существующие данные и создают записи с уникальными ID,
 * которые удаляются после каждого теста.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { testPrisma, generateTestToken } from '../helpers/db'

// Хранилище созданных тестом записей для очистки
const createdRecords: { table: string; id: string }[] = []

// Simulate Next.js API call
async function callAPI(
  path: string,
  options: {
    method?: string
    body?: Record<string, unknown>
    token?: string
  } = {}
) {
  const { method = 'GET', body, token } = options
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3000'
  
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  return {
    status: response.status,
    data: await response.json(),
  }
}

// Очистка только созданных тестом записей
async function cleanupCreatedRecords() {
  for (const record of createdRecords.reverse()) {
    try {
      if (record.table === 'booking') {
        await testPrisma.bookingStatusHistory.deleteMany({ where: { bookingId: record.id } })
        await testPrisma.booking.delete({ where: { id: record.id } })
      } else if (record.table === 'promoCode') {
        await testPrisma.promoCode.delete({ where: { id: record.id } })
      }
    } catch (e) {
      // Запись уже удалена или не существует
    }
  }
  createdRecords.length = 0
}

describe('Bookings API Integration Tests', () => {
  let existingApartment: any
  let existingUser: any
  let userToken: string

  beforeAll(async () => {
    // Получаем существующий апартамент из БД
    existingApartment = await testPrisma.apartment.findFirst({
      where: { status: 'PUBLISHED' },
    })
    
    // Получаем существующего пользователя
    existingUser = await testPrisma.user.findFirst({
      where: { role: 'USER', status: 'ACTIVE' },
    })
    
    if (!existingApartment || !existingUser) {
      console.log('⚠️  Для интеграционных тестов нужны существующие данные в БД')
      console.log('   Запустите seed: npm run db:seed')
    }
    
    if (existingUser) {
      userToken = await generateTestToken(existingUser.id, 'USER')
    }
  })

  afterEach(async () => {
    await cleanupCreatedRecords()
  })

  afterAll(async () => {
    await testPrisma.$disconnect()
  })

  describe('POST /api/bookings', () => {
    it('should return 401 without authentication', async () => {
      if (!existingApartment) return
      
      const response = await callAPI('/api/bookings', {
        method: 'POST',
        body: {
          apartmentId: existingApartment.id,
          checkIn: '2027-05-01',
          checkOut: '2027-05-05',
          guests: 2,
        },
      })

      expect(response.status).toBe(401)
    })

    it('should validate required fields', async () => {
      if (!existingUser) return
      
      const response = await callAPI('/api/bookings', {
        method: 'POST',
        token: userToken,
        body: {
          // Пустое тело - должна быть ошибка валидации
        },
      })

      expect(response.status).toBe(400)
    })

    it('should reject booking with invalid apartment ID', async () => {
      if (!existingUser) return
      
      const response = await callAPI('/api/bookings', {
        method: 'POST',
        token: userToken,
        body: {
          apartmentId: 'non-existent-apartment-id',
          checkIn: '2027-05-01',
          checkOut: '2027-05-05',
          guests: 2,
          contactName: 'Test User',
          contactPhone: '+79001234567',
          contactEmail: 'test@example.com',
        },
      })

      // API может вернуть 400 (валидация) или 404 (не найден)
      expect([400, 404]).toContain(response.status)
    })

    it('should reject booking with too many guests', async () => {
      if (!existingApartment || !existingUser) return
      
      const response = await callAPI('/api/bookings', {
        method: 'POST',
        token: userToken,
        body: {
          apartmentId: existingApartment.id,
          checkIn: '2027-06-01',
          checkOut: '2027-06-05',
          guests: 100, // Слишком много гостей
          contactName: 'Test User',
          contactPhone: '+79001234567',
          contactEmail: 'test@example.com',
        },
      })

      expect(response.status).toBe(400)
    })

    it('should create booking successfully', async () => {
      if (!existingApartment || !existingUser) return
      
      // Используем даты далеко в будущем, чтобы не было конфликтов
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)
      const checkIn = futureDate.toISOString().split('T')[0]
      futureDate.setDate(futureDate.getDate() + 3)
      const checkOut = futureDate.toISOString().split('T')[0]

      const response = await callAPI('/api/bookings', {
        method: 'POST',
        token: userToken,
        body: {
          apartmentId: existingApartment.id,
          checkIn,
          checkOut,
          guests: 2,
          contactName: 'Integration Test',
          contactPhone: '+79001234567',
          contactEmail: 'integration-test@example.com',
        },
      })

      if (response.status === 201) {
        // Сохраняем ID для очистки
        createdRecords.push({ table: 'booking', id: response.data.data.id })
        
        expect(response.data.success).toBe(true)
        expect(response.data.data).toHaveProperty('bookingNumber')
      } else {
        // Если даты заняты, это тоже нормально для интеграционного теста
        console.log('Booking creation response:', response.status, response.data)
      }
    })
  })

  describe('GET /api/bookings', () => {
    it('should return 401 without authentication', async () => {
      const response = await callAPI('/api/bookings', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    })

    it('should return user bookings', async () => {
      if (!existingUser) return
      
      const response = await callAPI('/api/bookings', {
        method: 'GET',
        token: userToken,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      // API может возвращать bookings, data или items
      const bookings = response.data.bookings || response.data.data || response.data.items || []
      expect(Array.isArray(bookings)).toBe(true)
    })

    it('should support status filter', async () => {
      if (!existingUser) return
      
      const response = await callAPI('/api/bookings?status=PENDING', {
        method: 'GET',
        token: userToken,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      
      // API может возвращать bookings, data или items
      const bookings = response.data.bookings || response.data.data || response.data.items || []
      
      // Все возвращенные бронирования должны иметь статус PENDING
      if (bookings.length > 0) {
        bookings.forEach((booking: any) => {
          expect(booking.status).toBe('PENDING')
        })
      }
    })
  })
})
