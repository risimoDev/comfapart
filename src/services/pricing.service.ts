/**
 * Сервис расчета цен
 * Отвечает за динамическое ценообразование с учетом сезонов, дней недели, скидок
 */

import prisma from '@/lib/prisma'
import type { PriceCalculation, PriceBreakdownItem } from '@/types'
import { getDaysBetween, getDateRange, isDateInRange } from '@/lib/utils'

interface CalculatePriceParams {
  apartmentId: string
  checkIn: Date
  checkOut: Date
  guests: number
  promoCode?: string
}

interface SeasonalPriceData {
  name: string
  startDate: Date
  endDate: Date
  priceMultiplier: number
  isActive: boolean
}

interface WeekdayPriceData {
  dayOfWeek: number
  priceMultiplier: number
}

export class PricingService {
  /**
   * Рассчитывает полную стоимость бронирования
   */
  async calculatePrice(params: CalculatePriceParams): Promise<PriceCalculation> {
    const { apartmentId, checkIn, checkOut, guests, promoCode } = params
    
    // Получаем апартамент с ценами
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        pricing: true,
        seasonalPrices: { where: { isActive: true } },
        weekdayPrices: true,
      },
    })

    if (!apartment || !apartment.pricing) {
      throw new Error('Апартамент или цены не найдены')
    }

    const pricing = apartment.pricing
    const nights = getDaysBetween(checkIn, checkOut)
    const dates = getDateRange(checkIn, checkOut)

    // Рассчитываем стоимость за каждую ночь
    const priceBreakdown = this.calculateDailyPrices(
      dates,
      pricing.basePrice,
      apartment.seasonalPrices as SeasonalPriceData[],
      apartment.weekdayPrices as WeekdayPriceData[]
    )

    // Базовая стоимость проживания
    const baseTotal = priceBreakdown.reduce((sum, day) => sum + day.basePrice, 0)
    
    // Сезонная надбавка
    const seasonalAdjustment = priceBreakdown.reduce(
      (sum, day) => sum + (day.finalPrice - day.basePrice * day.weekdayMultiplier),
      0
    )

    // Надбавка за дни недели
    const weekdayAdjustment = priceBreakdown.reduce(
      (sum, day) => sum + (day.basePrice * day.weekdayMultiplier - day.basePrice),
      0
    )

    // Итоговая стоимость проживания
    const accommodationTotal = priceBreakdown.reduce((sum, day) => sum + day.finalPrice, 0)

    // Уборка
    const cleaningFee = pricing.cleaningFee

    // Дополнительные гости
    const extraGuests = Math.max(0, guests - pricing.baseGuests)
    const extraGuestFee = extraGuests * pricing.extraGuestFee * nights

    // Скидки за длительное проживание
    let discount = 0
    if (nights >= 30 && pricing.monthlyDiscount > 0) {
      discount = accommodationTotal * (pricing.monthlyDiscount / 100)
    } else if (nights >= 7 && pricing.weeklyDiscount > 0) {
      discount = accommodationTotal * (pricing.weeklyDiscount / 100)
    }

    // Промокод
    let promoDiscount = 0
    if (promoCode) {
      promoDiscount = await this.calculatePromoDiscount(
        promoCode,
        apartmentId,
        accommodationTotal,
        nights
      )
    }

    // Сервисный сбор (от стоимости проживания)
    const serviceFee = (accommodationTotal - discount) * (pricing.serviceFee / 100)

    // Итоговая стоимость
    const totalPrice = accommodationTotal + cleaningFee + extraGuestFee + serviceFee - discount - promoDiscount

    return {
      nights,
      basePricePerNight: pricing.basePrice,
      baseTotal,
      seasonalAdjustment,
      weekdayAdjustment,
      cleaningFee,
      serviceFee: Math.round(serviceFee),
      extraGuestFee,
      discount: Math.round(discount),
      promoDiscount: Math.round(promoDiscount),
      totalPrice: Math.round(totalPrice),
      currency: pricing.currency,
      priceBreakdown,
    }
  }

  /**
   * Рассчитывает цену за каждый день с учетом сезонов и дней недели
   */
  private calculateDailyPrices(
    dates: Date[],
    basePrice: number,
    seasonalPrices: SeasonalPriceData[],
    weekdayPrices: WeekdayPriceData[]
  ): PriceBreakdownItem[] {
    return dates.map(date => {
      let seasonalMultiplier = 1
      let seasonName: string | undefined

      // Проверяем сезонные надбавки
      for (const season of seasonalPrices) {
        if (isDateInRange(date, season.startDate, season.endDate)) {
          if (season.priceMultiplier > seasonalMultiplier) {
            seasonalMultiplier = season.priceMultiplier
            seasonName = season.name
          }
        }
      }

      // Проверяем надбавки по дням недели
      const dayOfWeek = date.getDay()
      const weekdayPrice = weekdayPrices.find(wp => wp.dayOfWeek === dayOfWeek)
      const weekdayMultiplier = weekdayPrice?.priceMultiplier || 1

      // Итоговая цена за день (множители не суммируются, а перемножаются)
      const finalPrice = Math.round(basePrice * seasonalMultiplier * weekdayMultiplier)

      return {
        date,
        basePrice,
        seasonalMultiplier,
        weekdayMultiplier,
        finalPrice,
        seasonName,
      }
    })
  }

  /**
   * Рассчитывает скидку по промокоду
   */
  private async calculatePromoDiscount(
    code: string,
    apartmentId: string,
    amount: number,
    nights: number
  ): Promise<number> {
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!promoCode || !promoCode.isActive) {
      return 0
    }

    // Проверяем срок действия
    const now = new Date()
    if (promoCode.startDate && now < promoCode.startDate) return 0
    if (promoCode.endDate && now > promoCode.endDate) return 0

    // Проверяем лимит использований
    if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) return 0

    // Проверяем минимальное количество ночей
    if (promoCode.minNights && nights < promoCode.minNights) return 0

    // Проверяем минимальную сумму
    if (promoCode.minAmount && amount < promoCode.minAmount) return 0

    // Проверяем применимость к апартаменту
    if (promoCode.apartmentIds.length > 0 && !promoCode.apartmentIds.includes(apartmentId)) {
      return 0
    }

    // Рассчитываем скидку
    let discount = 0
    if (promoCode.type === 'PERCENTAGE') {
      discount = amount * (promoCode.value / 100)
      // Применяем максимальную скидку если есть
      if (promoCode.maxDiscount && discount > promoCode.maxDiscount) {
        discount = promoCode.maxDiscount
      }
    } else {
      discount = promoCode.value
    }

    return Math.min(discount, amount) // Скидка не может быть больше суммы
  }

  /**
   * Получает цену за ночь для отображения (базовая или минимальная сезонная)
   */
  async getDisplayPrice(apartmentId: string): Promise<number> {
    const pricing = await prisma.pricing.findUnique({
      where: { apartmentId },
    })
    return pricing?.basePrice || 0
  }

  /**
   * Проверяет и применяет промокод
   */
  async validatePromoCode(
    code: string,
    apartmentId: string,
    amount: number,
    nights: number,
    userId?: string
  ): Promise<{ valid: boolean; message?: string; discount?: number }> {
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!promoCode) {
      return { valid: false, message: 'Промокод не найден' }
    }

    if (!promoCode.isActive) {
      return { valid: false, message: 'Промокод неактивен' }
    }

    const now = new Date()
    if (promoCode.startDate && now < promoCode.startDate) {
      return { valid: false, message: 'Промокод еще не действует' }
    }
    if (promoCode.endDate && now > promoCode.endDate) {
      return { valid: false, message: 'Срок действия промокода истек' }
    }

    if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
      return { valid: false, message: 'Лимит использований исчерпан' }
    }

    if (promoCode.minNights && nights < promoCode.minNights) {
      return { valid: false, message: `Минимальное количество ночей: ${promoCode.minNights}` }
    }

    if (promoCode.minAmount && amount < promoCode.minAmount) {
      return { valid: false, message: `Минимальная сумма заказа: ${promoCode.minAmount}` }
    }

    if (promoCode.apartmentIds.length > 0 && !promoCode.apartmentIds.includes(apartmentId)) {
      return { valid: false, message: 'Промокод не применим к этому апартаменту' }
    }

    // Проверяем лимит на пользователя
    if (userId && promoCode.perUserLimit) {
      const userUsageCount = await prisma.booking.count({
        where: {
          userId,
          promoCodeId: promoCode.id,
          status: { notIn: ['CANCELED', 'REFUNDED'] },
        },
      })
      if (userUsageCount >= promoCode.perUserLimit) {
        return { valid: false, message: 'Вы уже использовали этот промокод максимальное количество раз' }
      }
    }

    const discount = await this.calculatePromoDiscount(code, apartmentId, amount, nights)

    return {
      valid: true,
      discount,
      message: promoCode.type === 'PERCENTAGE' 
        ? `Скидка ${promoCode.value}%`
        : `Скидка ${promoCode.value} руб.`,
    }
  }
}

export const pricingService = new PricingService()
