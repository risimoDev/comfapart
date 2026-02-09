/**
 * Unit tests for BookingService
 * Тесты сервиса бронирований
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingService } from '@/services/booking.service'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    apartment: {
      findUnique: vi.fn(),
    },
    promoCode: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    bookingStatusHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      booking: {
        create: vi.fn().mockResolvedValue({
          id: 'booking-1',
          bookingNumber: 'CA-20260209-0001',
          apartmentId: 'apt-1',
          userId: 'user-1',
          status: 'PENDING',
        }),
      },
      promoCode: {
        update: vi.fn(),
      },
      bookingStatusHistory: {
        create: vi.fn(),
      },
    })),
  },
}))

// Mock availability service
vi.mock('@/services/availability.service', () => ({
  availabilityService: {
    checkAvailability: vi.fn(),
  },
}))

// Mock pricing service
vi.mock('@/services/pricing.service', () => ({
  pricingService: {
    calculatePrice: vi.fn(),
  },
}))

// Mock utils
vi.mock('@/lib/utils', () => ({
  generateBookingNumber: vi.fn(() => 'CA-20260209-0001'),
  getDaysBetween: vi.fn((checkIn, checkOut) => {
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }),
}))

import prisma from '@/lib/prisma'
import { availabilityService } from '@/services/availability.service'
import { pricingService } from '@/services/pricing.service'

describe('BookingService', () => {
  let bookingService: BookingService

  beforeEach(() => {
    vi.clearAllMocks()
    bookingService = new BookingService()
  })

  describe('createBooking', () => {
    const baseBookingParams = {
      apartmentId: 'apt-1',
      userId: 'user-1',
      checkIn: new Date('2026-03-01'),
      checkOut: new Date('2026-03-05'),
      guests: 2,
    }

    it('should throw error when dates are not available', async () => {
      // Arrange
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        available: false,
        reason: 'Выбранные даты заняты',
      })

      // Act & Assert
      await expect(bookingService.createBooking(baseBookingParams))
        .rejects.toThrow('Выбранные даты заняты')
    })

    it('should throw error when guest count exceeds maximum', async () => {
      // Arrange
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        available: true,
      })
      
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue({
        id: 'apt-1',
        maxGuests: 2,
      } as any)

      // Act & Assert
      await expect(bookingService.createBooking({
        ...baseBookingParams,
        guests: 5,
      })).rejects.toThrow('Максимальное количество гостей: 2')
    })

    it('should throw error when apartment not found', async () => {
      // Arrange
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        available: true,
      })
      
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue(null)

      // Act & Assert
      await expect(bookingService.createBooking(baseBookingParams))
        .rejects.toThrow('Апартамент не найден')
    })

    it('should successfully create booking when all validations pass', async () => {
      // Arrange
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        available: true,
      })
      
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue({
        id: 'apt-1',
        maxGuests: 4,
      } as any)

      vi.mocked(pricingService.calculatePrice).mockResolvedValue({
        nights: 4,
        basePricePerNight: 3000,
        baseTotal: 12000,
        seasonalAdjustment: 0,
        weekdayAdjustment: 600,
        cleaningFee: 1500,
        serviceFee: 1200,
        extraGuestFee: 0,
        discount: 0,
        promoDiscount: 0,
        totalPrice: 15300,
        currency: 'RUB',
        priceBreakdown: [],
      })

      vi.mocked(prisma.promoCode.findUnique).mockResolvedValue(null)

      // Act
      const booking = await bookingService.createBooking(baseBookingParams)

      // Assert
      expect(booking).toBeDefined()
      expect(booking.bookingNumber).toBe('CA-20260209-0001')
      expect(availabilityService.checkAvailability).toHaveBeenCalledWith(
        'apt-1',
        baseBookingParams.checkIn,
        baseBookingParams.checkOut
      )
    })

    it('should apply promo code when provided', async () => {
      // Arrange
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        available: true,
      })
      
      vi.mocked(prisma.apartment.findUnique).mockResolvedValue({
        id: 'apt-1',
        maxGuests: 4,
      } as any)

      const mockPromoCode = {
        id: 'promo-1',
        code: 'WELCOME10',
        type: 'PERCENTAGE',
        value: 10,
        isActive: true,
      }

      vi.mocked(prisma.promoCode.findUnique).mockResolvedValue(mockPromoCode as any)

      vi.mocked(pricingService.calculatePrice).mockResolvedValue({
        nights: 4,
        basePricePerNight: 3000,
        baseTotal: 12000,
        seasonalAdjustment: 0,
        weekdayAdjustment: 0,
        cleaningFee: 1500,
        serviceFee: 1200,
        extraGuestFee: 0,
        discount: 0,
        promoDiscount: 1200, // 10% discount
        totalPrice: 13500,
        currency: 'RUB',
        priceBreakdown: [],
      })

      // Act
      const booking = await bookingService.createBooking({
        ...baseBookingParams,
        promoCode: 'WELCOME10',
      })

      // Assert
      expect(booking).toBeDefined()
      expect(pricingService.calculatePrice).toHaveBeenCalledWith(
        expect.objectContaining({
          promoCode: 'WELCOME10',
        })
      )
    })

    it('should handle conflicting date ranges correctly', async () => {
      // Arrange
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        available: false,
        reason: 'Выбранные даты заняты',
        conflictingDates: [
          new Date('2026-03-02'),
          new Date('2026-03-03'),
        ],
      })

      // Act & Assert
      await expect(bookingService.createBooking(baseBookingParams))
        .rejects.toThrow('Выбранные даты заняты')

      expect(availabilityService.checkAvailability).toHaveBeenCalledTimes(1)
    })
  })
})
