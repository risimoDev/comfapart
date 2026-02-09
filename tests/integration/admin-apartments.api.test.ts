/**
 * Integration tests for Admin Apartments API
 * Интеграционные тесты API апартаментов (админка)
 * 
 * ВАЖНО: Эти тесты НЕ очищают базу данных!
 * Они используют существующие данные для проверки API.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testPrisma, generateTestToken } from '../helpers/db'

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

describe('Admin Apartments API Integration Tests', () => {
  let ownerUser: any
  let adminUser: any
  let ownerApartment: any
  let ownerToken: string
  let adminToken: string

  beforeAll(async () => {
    // Получаем существующего владельца (OWNER) из БД
    ownerUser = await testPrisma.user.findFirst({
      where: { role: 'OWNER', status: 'ACTIVE' },
    })
    
    // Получаем существующего админа из БД
    adminUser = await testPrisma.user.findFirst({
      where: { role: 'TECH_ADMIN', status: 'ACTIVE' },
    })
    
    // Получаем апартамент, принадлежащий владельцу
    if (ownerUser) {
      ownerApartment = await testPrisma.apartment.findFirst({
        where: { ownerId: ownerUser.id },
      })
      ownerToken = await generateTestToken(ownerUser.id, 'OWNER')
    }
    
    if (adminUser) {
      adminToken = await generateTestToken(adminUser.id, 'TECH_ADMIN')
    }
    
    if (!ownerUser || !adminUser) {
      console.log('⚠️  Для интеграционных тестов нужны OWNER и TECH_ADMIN в БД')
      console.log('   Запустите seed: npm run db:seed')
    }
  })

  afterAll(async () => {
    await testPrisma.$disconnect()
  })

  describe('GET /api/admin/apartments', () => {
    it('should return 401 without authentication', async () => {
      const response = await callAPI('/api/admin/apartments', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    })

    it('should allow OWNER to list apartments', async () => {
      if (!ownerUser) return
      
      const response = await callAPI('/api/admin/apartments', {
        method: 'GET',
        token: ownerToken,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.apartments)).toBe(true)
      
      // OWNER должен видеть только свои апартаменты
      if (response.data.apartments.length > 0) {
        response.data.apartments.forEach((apt: any) => {
          expect(apt.ownerId).toBe(ownerUser.id)
        })
      }
    })

    it('should allow TECH_ADMIN to list all apartments', async () => {
      if (!adminUser) return
      
      const response = await callAPI('/api/admin/apartments', {
        method: 'GET',
        token: adminToken,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.apartments)).toBe(true)
    })

    it('should support status filter', async () => {
      if (!adminUser) return
      
      const response = await callAPI('/api/admin/apartments?status=PUBLISHED', {
        method: 'GET',
        token: adminToken,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      
      // Все апартаменты должны иметь статус PUBLISHED
      if (response.data.apartments.length > 0) {
        response.data.apartments.forEach((apt: any) => {
          expect(apt.status).toBe('PUBLISHED')
        })
      }
    })
  })

  describe('GET /api/admin/apartments/[id]', () => {
    it('should return 401 without authentication', async () => {
      if (!ownerApartment) return
      
      const response = await callAPI(`/api/admin/apartments/${ownerApartment.id}`, {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    })

    it('should allow OWNER to view own apartment', async () => {
      if (!ownerApartment || !ownerUser) return
      
      const response = await callAPI(`/api/admin/apartments/${ownerApartment.id}`, {
        method: 'GET',
        token: ownerToken,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.apartment.id).toBe(ownerApartment.id)
    })

    it('should allow TECH_ADMIN to view any apartment', async () => {
      if (!ownerApartment || !adminUser) return
      
      const response = await callAPI(`/api/admin/apartments/${ownerApartment.id}`, {
        method: 'GET',
        token: adminToken,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })
  })

  describe('PATCH /api/admin/apartments/[id] - IDOR Protection', () => {
    let otherOwner: any
    let otherOwnerApartment: any
    let otherOwnerToken: string

    beforeAll(async () => {
      // Находим другого владельца с апартаментом
      if (ownerUser) {
        otherOwner = await testPrisma.user.findFirst({
          where: { 
            role: 'OWNER', 
            status: 'ACTIVE',
            id: { not: ownerUser.id },
          },
        })
        
        if (otherOwner) {
          otherOwnerApartment = await testPrisma.apartment.findFirst({
            where: { ownerId: otherOwner.id },
          })
          otherOwnerToken = await generateTestToken(otherOwner.id, 'OWNER')
        }
      }
    })

    it('should NOT allow OWNER to access other owners apartment', async () => {
      if (!otherOwnerApartment || !ownerUser) return
      
      // ownerUser пытается получить апартамент otherOwner
      const response = await callAPI(`/api/admin/apartments/${otherOwnerApartment.id}`, {
        method: 'GET',
        token: ownerToken,
      })

      // Должен вернуть 404 (не найден для данного пользователя)
      expect(response.status).toBe(404)
    })

    it('should NOT allow OWNER to update other owners apartment', async () => {
      if (!otherOwnerApartment || !ownerUser) return
      
      const response = await callAPI(`/api/admin/apartments/${otherOwnerApartment.id}`, {
        method: 'PATCH',
        token: ownerToken,
        body: {
          title: 'Hacked Title',
        },
      })

      // Должен вернуть 404 (не найден для данного пользователя)
      expect(response.status).toBe(404)
    })

    it('should allow TECH_ADMIN to access any apartment', async () => {
      if (!otherOwnerApartment || !adminUser) return
      
      const response = await callAPI(`/api/admin/apartments/${otherOwnerApartment.id}`, {
        method: 'GET',
        token: adminToken,
      })

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })
  })

  describe('PATCH /api/admin/apartments/[id] - Read-only tests', () => {
    // Эти тесты только проверяют валидацию, не изменяя данные
    
    it('should return 401 without authentication', async () => {
      if (!ownerApartment) return
      
      const response = await callAPI(`/api/admin/apartments/${ownerApartment.id}`, {
        method: 'PATCH',
        body: { title: 'Test' },
      })

      expect(response.status).toBe(401)
    })

    it('should validate title is not empty', async () => {
      if (!ownerApartment || !ownerUser) return
      
      const response = await callAPI(`/api/admin/apartments/${ownerApartment.id}`, {
        method: 'PATCH',
        token: ownerToken,
        body: {
          title: '', // Пустой title должен вызвать ошибку
        },
      })

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent apartment', async () => {
      if (!ownerUser) return
      
      const response = await callAPI('/api/admin/apartments/non-existent-id', {
        method: 'PATCH',
        token: ownerToken,
        body: { title: 'Test' },
      })

      expect(response.status).toBe(404)
    })
  })
})
