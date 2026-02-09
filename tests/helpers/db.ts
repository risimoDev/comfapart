/**
 * Test database helper
 * Утилиты для тестовой базы данных
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { v4 as uuid } from 'uuid'

// Используем тестовую базу данных
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
})

export { prisma as testPrisma }

/**
 * ЗАПРЕЩЕНО: Очистка БД отключена для защиты данных.
 * Используйте cleanupTestRecords() для удаления только тестовых записей.
 * @deprecated Не используйте эту функцию!
 */
export async function cleanDatabase() {
  throw new Error('cleanDatabase() запрещена! Используйте cleanupTestRecords() для удаления только тестовых записей.')
}

/**
 * Удаляет только записи, созданные тестами (по ID)
 */
export async function cleanupTestRecords(records: { table: string; id: string }[]) {
  for (const record of records.reverse()) {
    try {
      if (record.table === 'booking') {
        await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: record.id } })
        await prisma.booking.delete({ where: { id: record.id } })
      } else if (record.table === 'promoCode') {
        await prisma.promoCode.delete({ where: { id: record.id } })
      } else if (record.table === 'apartment') {
        await prisma.apartmentImage.deleteMany({ where: { apartmentId: record.id } })
        await prisma.apartmentAmenity.deleteMany({ where: { apartmentId: record.id } })
        await prisma.apartment.delete({ where: { id: record.id } })
      } else if (record.table === 'user') {
        await prisma.session.deleteMany({ where: { userId: record.id } })
        await prisma.user.delete({ where: { id: record.id } })
      }
    } catch (e) {
      // Запись уже удалена или не существует
    }
  }
}

/**
 * Создает тестового пользователя
 */
export async function createTestUser(overrides: Record<string, unknown> = {}) {
  const id = uuid()
  return prisma.user.create({
    data: {
      id,
      email: `test-${id}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      passwordHash: await hash('password123', 10),
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
      ...overrides,
    },
  })
}

/**
 * Создает тестового владельца (OWNER)
 */
export async function createTestOwner(overrides: Record<string, unknown> = {}) {
  return createTestUser({
    role: 'OWNER',
    ...overrides,
  })
}

/**
 * Создает тестового администратора
 */
export async function createTestAdmin(overrides: Record<string, unknown> = {}) {
  return createTestUser({
    role: 'TECH_ADMIN',
    ...overrides,
  })
}

/**
 * Создает тестовый апартамент
 */
export async function createTestApartment(ownerId: string, overrides: Record<string, unknown> = {}) {
  const id = uuid()
  const apartment = await prisma.apartment.create({
    data: {
      id,
      title: `Test Apartment ${id.slice(0, 8)}`,
      slug: `test-apartment-${id}`,
      description: 'A beautiful test apartment for testing purposes',
      shortDescription: 'Test apartment',
      city: 'Москва',
      address: 'Test Street, 123',
      rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      area: 50,
      maxGuests: 4,
      floor: 3,
      totalFloors: 10,
      minNights: 1,
      maxNights: 30,
      checkInTime: '14:00',
      checkOutTime: '12:00',
      status: 'PUBLISHED',
      ownerId,
      ...overrides,
    },
  })

  // Создаем pricing для апартамента
  await prisma.pricing.create({
    data: {
      apartmentId: apartment.id,
      basePrice: 3000,
      cleaningFee: 1500,
      serviceFee: 10,
      securityDeposit: 5000,
      baseGuests: 2,
      extraGuestFee: 500,
      weeklyDiscount: 10,
      monthlyDiscount: 20,
      currency: 'RUB',
    },
  })

  return prisma.apartment.findUnique({
    where: { id: apartment.id },
    include: { pricing: true },
  })
}

/**
 * Создает тестовый промокод
 */
export async function createTestPromoCode(overrides: Record<string, unknown> = {}) {
  const code = `TEST${Date.now()}`
  return prisma.promoCode.create({
    data: {
      code,
      type: 'PERCENTAGE',
      value: 10,
      isActive: true,
      usageCount: 0,
      apartmentIds: [],
      ...overrides,
    },
  })
}

/**
 * Создает тестовое бронирование
 */
export async function createTestBooking(
  apartmentId: string,
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  const id = uuid()
  return prisma.booking.create({
    data: {
      id,
      bookingNumber: `CA-TEST-${id.slice(0, 8).toUpperCase()}`,
      apartmentId,
      userId,
      checkIn: new Date('2026-04-01'),
      checkOut: new Date('2026-04-05'),
      nights: 4,
      guests: 2,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      basePrice: 12000,
      cleaningFee: 1500,
      serviceFee: 1200,
      extraGuestFee: 0,
      totalPrice: 14700,
      currency: 'RUB',
      ...overrides,
    },
  })
}

/**
 * Генерирует JWT токен для тестов
 */
export async function generateTestToken(userId: string, role: string = 'USER') {
  const { SignJWT } = await import('jose')
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret')
  
  return new SignJWT({ userId, role, email: 'test@example.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret)
}
