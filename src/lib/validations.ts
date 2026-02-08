import { z } from 'zod'

// ==================== Password validation ====================

const passwordSchema = z.string()
  .min(8, 'Пароль должен быть минимум 8 символов')
  .regex(/[a-z]/, 'Пароль должен содержать строчную букву')
  .regex(/[A-Z]/, 'Пароль должен содержать заглавную букву')
  .regex(/\d/, 'Пароль должен содержать цифру')

// ==================== User schemas ====================

export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: passwordSchema,
  firstName: z.string().min(2, 'Имя должно быть минимум 2 символа'),
  lastName: z.string().min(2, 'Фамилия должна быть минимум 2 символа'),
  phone: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
  preferredLocale: z.enum(['ru', 'en']).optional(),
  preferredCurrency: z.enum(['RUB', 'USD', 'EUR']).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: passwordSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Токен обязателен'),
  password: passwordSchema,
})

// ==================== Apartment schemas ====================
export const createApartmentSchema = z.object({
  title: z.string().min(5, 'Название должно быть минимум 5 символов'),
  description: z.string().min(50, 'Описание должно быть минимум 50 символов'),
  shortDescription: z.string().optional(),
  city: z.string().min(2, 'Укажите город'),
  address: z.string().min(5, 'Укажите адрес'),
  district: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  area: z.number().positive('Площадь должна быть положительной'),
  rooms: z.number().int().positive(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(1),
  floor: z.number().int().optional().nullable(),
  totalFloors: z.number().int().optional().nullable(),
  maxGuests: z.number().int().min(1).default(2),
  minNights: z.number().int().min(1).default(1),
  maxNights: z.number().int().min(1).default(30),
  checkInTime: z.string().default('14:00'),
  checkOutTime: z.string().default('12:00'),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  status: z.enum(['PUBLISHED', 'DRAFT', 'HIDDEN', 'ARCHIVED']).optional(),
  // Связанные данные
  amenityIds: z.array(z.string()).optional(),
  rules: z.array(z.object({
    rule: z.string(),
    isAllowed: z.boolean()
  })).optional(),
  images: z.array(z.object({
    url: z.string(),
    alt: z.string(),
    isPrimary: z.boolean()
  })).optional(),
  // Pricing
  basePrice: z.number().positive().optional(),
  cleaningFee: z.number().min(0).optional(),
  serviceFee: z.number().min(0).optional(),
  securityDeposit: z.number().min(0).optional(),
  weeklyDiscount: z.number().min(0).max(100).optional(),
  monthlyDiscount: z.number().min(0).max(100).optional(),
})

export const updateApartmentSchema = createApartmentSchema.partial().extend({
  status: z.enum(['PUBLISHED', 'DRAFT', 'HIDDEN', 'ARCHIVED']).optional(),
})

// Ценообразование
export const pricingSchema = z.object({
  basePrice: z.number().positive('Цена должна быть положительной'),
  currency: z.string().default('RUB'),
  cleaningFee: z.number().min(0).default(0),
  serviceFee: z.number().min(0).max(100).default(0),
  securityDeposit: z.number().min(0).default(0),
  weeklyDiscount: z.number().min(0).max(100).default(0),
  monthlyDiscount: z.number().min(0).max(100).default(0),
  extraGuestFee: z.number().min(0).default(0),
  baseGuests: z.number().int().min(1).default(2),
})

export const seasonalPriceSchema = z.object({
  name: z.string().min(2),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  priceMultiplier: z.number().positive(),
  isActive: z.boolean().default(true),
})

// Бронирование
export const createBookingSchema = z.object({
  apartmentId: z.string().uuid(),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guests: z.number().int().min(1),
  guestDetails: z.any().optional(),
  promoCode: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  guestComment: z.string().optional(),
}).refine(
  (data) => data.checkOut > data.checkIn,
  { message: 'Дата выезда должна быть позже даты заезда', path: ['checkOut'] }
)

export const updateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PAID', 'CANCELED', 'COMPLETED', 'REFUNDED']),
  adminComment: z.string().optional(),
  cancelReason: z.string().optional(),
})

// Отзыв
export const createReviewSchema = z.object({
  apartmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().min(10, 'Отзыв должен быть минимум 10 символов'),
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  locationRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
})

// Промокод
export const createPromoCodeSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  minNights: z.number().int().min(1).optional(),
  minAmount: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  apartmentIds: z.array(z.string().uuid()).optional(),
})

// Фильтры
export const apartmentFilterSchema = z.object({
  city: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
  guests: z.number().int().optional(),
  bedrooms: z.number().int().optional(),
  amenities: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'rating', 'newest']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(12),
})

// Типы
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateApartmentInput = z.infer<typeof createApartmentSchema>
export type UpdateApartmentInput = z.infer<typeof updateApartmentSchema>
export type PricingInput = z.infer<typeof pricingSchema>
export type SeasonalPriceInput = z.infer<typeof seasonalPriceSchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>
export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>
export type ApartmentFilterInput = z.infer<typeof apartmentFilterSchema>
