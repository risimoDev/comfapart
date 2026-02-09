/**
 * Unit tests for PricingService
 * Тесты сервиса расчета цен
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PricingService } from '@/services/pricing.service'

// Mock prisma
const mockApartment = {
  id: 'apt-1',
  pricing: {
    basePrice: 3000,
    cleaningFee: 1500,
    serviceFee: 10, // percentage
    securityDeposit: 5000,
    baseGuests: 2,
    extraGuestFee: 500,
    weeklyDiscount: 10,
    monthlyDiscount: 20,
    currency: 'RUB',
  },
  seasonalPrices: [],
  weekdayPrices: [],
}

vi.mock('@/lib/prisma', () => ({
  default: {
    apartment: {
      findUnique: vi.fn(),
    },
    promoCode: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/utils', () => ({
  getDaysBetween: vi.fn((checkIn: Date, checkOut: Date) => {
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }),
  getDateRange: vi.fn((checkIn: Date, checkOut: Date) => {
    const dates: Date[] = []
    const current = new Date(checkIn)
    while (current < checkOut) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return dates
  }),
  isDateInRange: vi.fn((date: Date, start: Date, end: Date) => {
    return date >= start && date <= end
  }),
}))

import prisma from '@/lib/prisma'

describe('PricingService', () => {
  let pricingService: PricingService

  beforeEach(() => {
    vi.clearAllMocks()
    pricingService = new PricingService()
  })

  describe('calculatePrice', () => {
    const baseParams = {
      apartmentId: 'apt-1',
      checkIn: new Date('2026-03-01'),
      checkOut: new Date('2026-03-05'), // 4 nights
      guests: 2,
    }

    it('should calculate base price correctly for simple booking', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)

      // Act
      const result = await pricingService.calculatePrice(baseParams)

      // Assert
      expect(result.nights).toBe(4)
      expect(result.basePricePerNight).toBe(3000)
      expect(result.baseTotal).toBe(12000) // 4 * 3000
      expect(result.cleaningFee).toBe(1500)
      expect(result.extraGuestFee).toBe(0) // 2 guests = baseGuests
      expect(result.currency).toBe('RUB')
    })

    it('should throw error when apartment not found', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(null)

      // Act & Assert
      await expect(pricingService.calculatePrice(baseParams))
        .rejects.toThrow('Апартамент или цены не найдены')
    })

    it('should calculate extra guest fee correctly', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)

      // Act - 4 guests, 2 base guests, so 2 extra
      const result = await pricingService.calculatePrice({
        ...baseParams,
        guests: 4,
      })

      // Assert
      // 2 extra guests * 500 RUB * 4 nights = 4000
      expect(result.extraGuestFee).toBe(4000)
    })

    it('should apply weekly discount for 7+ nights', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)

      // Act - 7 nights = weekly discount 10%
      const result = await pricingService.calculatePrice({
        ...baseParams,
        checkIn: new Date('2026-03-01'),
        checkOut: new Date('2026-03-08'), // 7 nights
      })

      // Assert
      // baseTotal = 7 * 3000 = 21000
      // discount = 21000 * 10% = 2100
      expect(result.nights).toBe(7)
      expect(result.discount).toBe(2100)
    })

    it('should apply monthly discount for 30+ nights', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)

      // Act - 30 nights = monthly discount 20%
      const result = await pricingService.calculatePrice({
        ...baseParams,
        checkIn: new Date('2026-03-01'),
        checkOut: new Date('2026-03-31'), // 30 nights
      })

      // Assert
      // baseTotal = 30 * 3000 = 90000
      // discount = 90000 * 20% = 18000
      expect(result.nights).toBe(30)
      expect(result.discount).toBe(18000)
    })

    it('should apply seasonal price multiplier', async () => {
      // Arrange
      const apartmentWithSeason = {
        ...mockApartment,
        seasonalPrices: [
          {
            name: 'Новогодние праздники',
            startDate: new Date('2026-03-01'),
            endDate: new Date('2026-03-10'),
            priceMultiplier: 1.5, // 50% надбавка
            isActive: true,
          },
        ],
      }
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(apartmentWithSeason as any)

      // Act
      const result = await pricingService.calculatePrice(baseParams)

      // Assert
      // Each night: 3000 * 1.5 = 4500
      // 4 nights = 18000
      expect(result.priceBreakdown[0].seasonalMultiplier).toBe(1.5)
      expect(result.priceBreakdown[0].finalPrice).toBe(4500)
    })

    it('should apply weekend price multiplier', async () => {
      // Arrange
      // March 7, 2026 is Saturday (day 6), March 8 is Sunday (day 0)
      const apartmentWithWeekend = {
        ...mockApartment,
        weekdayPrices: [
          { dayOfWeek: 5, priceMultiplier: 1.2 }, // Friday
          { dayOfWeek: 6, priceMultiplier: 1.3 }, // Saturday
          { dayOfWeek: 0, priceMultiplier: 1.2 }, // Sunday
        ],
      }
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(apartmentWithWeekend as any)

      // Act - Fri-Mon booking
      const result = await pricingService.calculatePrice({
        ...baseParams,
        checkIn: new Date('2026-03-06'), // Friday
        checkOut: new Date('2026-03-09'), // Monday
      })

      // Assert
      // Friday: 3000 * 1.2 = 3600
      // Saturday: 3000 * 1.3 = 3900
      // Sunday: 3000 * 1.2 = 3600
      expect(result.nights).toBe(3)
      expect(result.weekdayAdjustment).toBeGreaterThan(0)
    })

    it('should apply promo code discount (percentage)', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)
      
      const mockPromoCode = {
        id: 'promo-1',
        code: 'SAVE15',
        type: 'PERCENTAGE',
        value: 15,
        isActive: true,
        startDate: null,
        endDate: null,
        usageLimit: null,
        usageCount: 0,
        minNights: null,
        minAmount: null,
        maxDiscount: null,
        apartmentIds: [],
      }
      vi.mocked(prisma.promoCode.findUnique).mockResolvedValue(mockPromoCode as any)

      // Act
      const result = await pricingService.calculatePrice({
        ...baseParams,
        promoCode: 'SAVE15',
      })

      // Assert
      // baseTotal = 12000, 15% = 1800
      expect(result.promoDiscount).toBe(1800)
    })

    it('should apply promo code discount (fixed amount)', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)
      
      const mockPromoCode = {
        id: 'promo-2',
        code: 'FLAT1000',
        type: 'FIXED',
        value: 1000,
        isActive: true,
        startDate: null,
        endDate: null,
        usageLimit: null,
        usageCount: 0,
        minNights: null,
        minAmount: null,
        maxDiscount: null,
        apartmentIds: [],
      }
      vi.mocked(prisma.promoCode.findUnique).mockResolvedValue(mockPromoCode as any)

      // Act
      const result = await pricingService.calculatePrice({
        ...baseParams,
        promoCode: 'FLAT1000',
      })

      // Assert
      expect(result.promoDiscount).toBe(1000)
    })

    it('should not apply expired promo code', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)
      
      const mockPromoCode = {
        id: 'promo-3',
        code: 'EXPIRED',
        type: 'PERCENTAGE',
        value: 50,
        isActive: true,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'), // Expired in 2025
        usageLimit: null,
        usageCount: 0,
        minNights: null,
        minAmount: null,
        maxDiscount: null,
        apartmentIds: [],
      }
      vi.mocked(prisma.promoCode.findUnique).mockResolvedValue(mockPromoCode as any)

      // Act
      const result = await pricingService.calculatePrice({
        ...baseParams,
        promoCode: 'EXPIRED',
      })

      // Assert
      expect(result.promoDiscount).toBe(0)
    })

    it('should not apply promo code when usage limit reached', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)
      
      const mockPromoCode = {
        id: 'promo-4',
        code: 'LIMITED',
        type: 'PERCENTAGE',
        value: 20,
        isActive: true,
        startDate: null,
        endDate: null,
        usageLimit: 10,
        usageCount: 10, // Already at limit
        minNights: null,
        minAmount: null,
        maxDiscount: null,
        apartmentIds: [],
      }
      vi.mocked(prisma.promoCode.findUnique).mockResolvedValue(mockPromoCode as any)

      // Act
      const result = await pricingService.calculatePrice({
        ...baseParams,
        promoCode: 'LIMITED',
      })

      // Assert
      expect(result.promoDiscount).toBe(0)
    })

    it('should respect maxDiscount for percentage promo codes', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)
      
      const mockPromoCode = {
        id: 'promo-5',
        code: 'CAPPED',
        type: 'PERCENTAGE',
        value: 50, // 50% would be 6000, but max is 2000
        isActive: true,
        startDate: null,
        endDate: null,
        usageLimit: null,
        usageCount: 0,
        minNights: null,
        minAmount: null,
        maxDiscount: 2000, // Max discount capped at 2000
        apartmentIds: [],
      }
      vi.mocked(prisma.promoCode.findUnique).mockResolvedValue(mockPromoCode as any)

      // Act
      const result = await pricingService.calculatePrice({
        ...baseParams,
        promoCode: 'CAPPED',
      })

      // Assert
      expect(result.promoDiscount).toBe(2000) // Capped at maxDiscount
    })

    it('should calculate service fee correctly', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)

      // Act
      const result = await pricingService.calculatePrice(baseParams)

      // Assert
      // accommodationTotal = 12000 (no discounts)
      // serviceFee = 12000 * 10% = 1200
      expect(result.serviceFee).toBe(1200)
    })

    it('should calculate total price correctly with all components', async () => {
      // Arrange
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(mockApartment as any)

      // Act - 4 guests (2 extra), 4 nights
      const result = await pricingService.calculatePrice({
        ...baseParams,
        guests: 4,
      })

      // Assert
      // baseTotal = 12000
      // extraGuestFee = 2 * 500 * 4 = 4000
      // cleaningFee = 1500
      // serviceFee = 12000 * 10% = 1200
      // totalPrice = 12000 + 4000 + 1500 + 1200 = 18700
      expect(result.totalPrice).toBe(18700)
    })
  })
})
