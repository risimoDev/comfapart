/**
 * Test setup file
 * Настройка тестового окружения
 */

import { afterEach, vi } from 'vitest'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Override with test-specific values if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/comfort_apartments_test'
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only'
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret'

// Не используем fake timers глобально, т.к. они ломают Prisma.$disconnect()
// Для unit-тестов, которым нужны fake timers, используйте vi.useFakeTimers() локально

afterEach(() => {
  vi.clearAllMocks()
})
