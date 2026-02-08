// Типы для апартаментов
export interface Apartment {
  id: string
  slug: string
  status: ApartmentStatus
  title: string
  description: string
  shortDescription?: string | null
  city: string
  address: string
  district?: string | null
  latitude?: number | null
  longitude?: number | null
  area: number
  rooms: number
  bedrooms: number
  bathrooms: number
  floor?: number | null
  totalFloors?: number | null
  maxGuests: number
  minNights: number
  maxNights: number
  checkInTime: string
  checkOutTime: string
  metaTitle?: string | null
  metaDescription?: string | null
  averageRating?: number | null
  reviewCount: number
  createdAt: Date
  updatedAt: Date
  images?: ApartmentImage[]
  amenities?: ApartmentAmenityWithDetails[]
  rules?: ApartmentRule[]
  pricing?: Pricing | null
  categories?: ApartmentCategoryWithDetails[]
  tags?: ApartmentTagWithDetails[]
}

export interface ApartmentImage {
  id: string
  apartmentId: string
  url: string
  alt?: string | null
  order: number
  isPrimary: boolean
}

export interface ApartmentAmenityWithDetails {
  amenity: Amenity
}

export interface ApartmentCategoryWithDetails {
  category: Category
}

export interface ApartmentTagWithDetails {
  tag: Tag
}

export interface Amenity {
  id: string
  name: string
  nameEn?: string | null
  icon?: string | null
  category: string
}

export interface Category {
  id: string
  name: string
  nameEn?: string | null
  slug: string
  description?: string | null
  icon?: string | null
  order: number
}

export interface Tag {
  id: string
  name: string
  slug: string
}

export interface ApartmentRule {
  id: string
  apartmentId: string
  rule: string
  ruleEn?: string | null
  isAllowed: boolean
}

export type ApartmentStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED'

// Типы для ценообразования
export interface Pricing {
  id: string
  apartmentId: string
  basePrice: number
  currency: string
  cleaningFee: number
  serviceFee: number
  securityDeposit: number
  weeklyDiscount: number
  monthlyDiscount: number
  extraGuestFee: number
  baseGuests: number
}

export interface SeasonalPrice {
  id: string
  apartmentId: string
  name: string
  startDate: Date
  endDate: Date
  priceMultiplier: number
  isActive: boolean
}

export interface WeekdayPrice {
  id: string
  apartmentId: string
  dayOfWeek: number
  priceMultiplier: number
}

// Типы для пользователей
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  avatar?: string | null
  role: UserRole
  status: UserStatus
  emailVerified: boolean
  telegramVerified: boolean
  telegramId?: bigint | null
  telegramUsername?: string | null
  preferredLocale: string
  preferredCurrency: string
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'USER' | 'OWNER' | 'TECH_ADMIN'
export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING'

export interface Session {
  id: string
  userId: string
  token: string
  userAgent?: string | null
  ipAddress?: string | null
  expiresAt: Date
}

// Типы для бронирований
export interface Booking {
  id: string
  bookingNumber: string
  apartmentId: string
  userId: string
  checkIn: Date
  checkOut: Date
  nights: number
  guests: number
  guestDetails?: Record<string, unknown> | null
  status: BookingStatus
  paymentStatus: PaymentStatus
  basePrice: number
  cleaningFee: number
  serviceFee: number
  extraGuestFee: number
  seasonalAdjustment: number
  weekdayAdjustment: number
  discount: number
  promoDiscount: number
  totalPrice: number
  currency: string
  promoCodeId?: string | null
  guestComment?: string | null
  adminComment?: string | null
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  canceledAt?: Date | null
  cancelReason?: string | null
  refundAmount?: number | null
  createdAt: Date
  updatedAt: Date
  apartment?: Apartment
  user?: User
  promoCode?: PromoCode | null
  payments?: Payment[]
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELED' | 'COMPLETED' | 'REFUNDED'
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIAL_REFUND'

// Типы для платежей
export interface Payment {
  id: string
  bookingId: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  externalId?: string | null
  metadata?: Record<string, unknown> | null
  refundedAmount?: number | null
  refundedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'STRIPE' | 'CLOUDPAYMENTS'

// Типы для промокодов
export interface PromoCode {
  id: string
  code: string
  type: PromoCodeType
  value: number
  minNights?: number | null
  minAmount?: number | null
  maxDiscount?: number | null
  startDate?: Date | null
  endDate?: Date | null
  usageLimit?: number | null
  usageCount: number
  perUserLimit?: number | null
  apartmentIds: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type PromoCodeType = 'PERCENTAGE' | 'FIXED'

// Типы для отзывов
export interface Review {
  id: string
  apartmentId: string
  userId: string
  rating: number
  title?: string | null
  comment: string
  cleanlinessRating?: number | null
  locationRating?: number | null
  valueRating?: number | null
  communicationRating?: number | null
  isApproved: boolean
  isPublished: boolean
  ownerReply?: string | null
  ownerReplyDate?: Date | null
  createdAt: Date
  updatedAt: Date
  user?: User
}

// Типы для расчета цены
export interface PriceCalculation {
  nights: number
  basePricePerNight: number
  baseTotal: number
  seasonalAdjustment: number
  weekdayAdjustment: number
  cleaningFee: number
  serviceFee: number
  extraGuestFee: number
  discount: number
  promoDiscount: number
  totalPrice: number
  currency: string
  priceBreakdown: PriceBreakdownItem[]
}

export interface PriceBreakdownItem {
  date: Date
  basePrice: number
  seasonalMultiplier: number
  weekdayMultiplier: number
  finalPrice: number
  seasonName?: string
}

// Типы для API ответов
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

// Типы для фильтров
export interface ApartmentFilters {
  city?: string
  minPrice?: number
  maxPrice?: number
  checkIn?: Date
  checkOut?: Date
  guests?: number
  bedrooms?: number
  amenities?: string[]
  categories?: string[]
  tags?: string[]
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest'
  page?: number
  limit?: number
}

// Типы для статистики
export interface DashboardStats {
  totalApartments: number
  publishedApartments: number
  totalBookings: number
  pendingBookings: number
  totalRevenue: number
  thisMonthRevenue: number
  totalUsers: number
  averageRating: number
}

export interface RevenueStats {
  period: string
  revenue: number
  bookings: number
  averageBookingValue: number
}

// Типы для уведомлений
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown> | null
  isRead: boolean
  readAt?: Date | null
  createdAt: Date
}

export type NotificationType = 
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELED'
  | 'BOOKING_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'REVIEW_REQUEST'
  | 'PROMO_CODE'
  | 'SYSTEM'

// CMS
export interface CmsBlock {
  id: string
  key: string
  title: string
  content: string
  locale: string
}

// Компания
export interface CompanySettings {
  id: string
  name: string
  legalName?: string | null
  description?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  inn?: string | null
  ogrn?: string | null
  bankAccount?: string | null
  bankName?: string | null
  bik?: string | null
  socialLinks?: Record<string, string> | null
  privacyPolicy?: string | null
  termsOfService?: string | null
  cancellationPolicy?: string | null
  defaultServiceFee: number
}
