import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { 
  MapPin, 
  Star, 
  Users, 
  Bed, 
  Bath, 
  Square,
  Wifi,
  Car,
  Wind,
  Tv,
  Coffee,
  Utensils,
  Waves,
  Shield,
  Check,
  X,
  ChevronLeft,
  Share2,
  Heart,
  Calendar,
  MessageCircle
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { ImageGallery, AmenityIcon } from '@/components/apartments'
import { BookingWidget } from '@/components/booking'
import { Button, ApartmentDetailsSkeleton } from '@/components/ui'
import type { Metadata } from 'next'

interface ApartmentPageProps {
  params: { slug: string }
}

async function getApartment(slug: string) {
  const apartment = await prisma.apartment.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { order: 'asc' } },
      pricing: true,
      categories: { include: { category: true } },
      amenities: { include: { amenity: true } },
      tags: { include: { tag: true } },
      rules: true,
      reviews: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  })

  if (!apartment || apartment.status !== 'PUBLISHED') {
    return null
  }

  return apartment
}

async function getSimilarApartments(apartmentId: string, city: string) {
  return prisma.apartment.findMany({
    where: {
      status: 'PUBLISHED',
      city,
      id: { not: apartmentId }
    },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      pricing: true,
      reviews: { select: { rating: true } }
    },
    take: 4
  })
}

// Компонент отзывов
function ReviewsSection({ reviews, avgRating }: { reviews: any[]; avgRating: number }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Пока нет отзывов</p>
        <p className="text-sm">Станьте первым, кто оставит отзыв!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Общий рейтинг */}
      <div className="flex items-center gap-4 mb-8">
        <div className="text-5xl font-bold">{avgRating.toFixed(1)}</div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.round(avgRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500">
            {reviews.length} {reviews.length === 1 ? 'отзыв' : reviews.length < 5 ? 'отзыва' : 'отзывов'}
          </p>
        </div>
      </div>

      {/* Список отзывов */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-6 last:border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                {review.user.avatar ? (
                  <img
                    src={review.user.avatar}
                    alt={review.user.firstName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-semibold text-gray-500">
                    {review.user.firstName?.[0] || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">
                      {review.user.firstName} {review.user.lastName?.[0]}.
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{review.rating}</span>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{review.text}</p>
                
                {/* Ответ менеджера */}
                {review.reply && (
                  <div className="mt-4 pl-4 border-l-2 border-primary/30 bg-primary/5 p-3 rounded-r-lg">
                    <p className="text-sm font-medium text-primary mb-1">Ответ владельца</p>
                    <p className="text-sm text-gray-600">{review.reply}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Показать все */}
      {reviews.length >= 10 && (
        <Button variant="outline" className="w-full">
          Показать все отзывы
        </Button>
      )}
    </div>
  )
}

export default async function ApartmentPage({ params }: ApartmentPageProps) {
  const apartment = await getApartment(params.slug)

  if (!apartment) {
    notFound()
  }

  const [similarApartments] = await Promise.all([
    getSimilarApartments(apartment.id, apartment.city)
  ])

  const avgRating = apartment.reviews.length > 0
    ? apartment.reviews.reduce((sum, r) => sum + r.rating, 0) / apartment.reviews.length
    : 0

  // Группировка удобств по категориям
  const amenitiesByCategory = apartment.amenities.reduce((acc, a) => {
    const category = a.amenity.category || 'Прочее'
    if (!acc[category]) acc[category] = []
    acc[category].push(a.amenity)
    return acc
  }, {} as Record<string, typeof apartment.amenities[0]['amenity'][]>)

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Навигация */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/apartments"
              className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Назад к списку
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Поделиться
              </Button>
              <Button variant="ghost" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Галерея */}
      <div className="container mx-auto px-4 py-6">
        <ImageGallery 
          images={apartment.images}
          title={apartment.title}
        />
      </div>

      {/* Основной контент */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Левая колонка */}
          <div className="lg:col-span-2 space-y-8">
            {/* Заголовок */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              {/* Теги */}
              {apartment.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {apartment.tags.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-3xl font-display font-bold mb-4">
                {apartment.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{apartment.city}, {apartment.address}</span>
                </div>
                {avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{avgRating.toFixed(1)}</span>
                    <span>({apartment.reviews.length} отзывов)</span>
                  </div>
                )}
              </div>

              {/* Характеристики */}
              <div className="flex flex-wrap gap-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span>До {apartment.maxGuests} гостей</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-5 h-5 text-gray-400" />
                  <span>{apartment.rooms} {apartment.rooms === 1 ? 'комната' : apartment.rooms < 5 ? 'комнаты' : 'комнат'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-5 h-5 text-gray-400" />
                  <span>{apartment.bathrooms} {apartment.bathrooms === 1 ? 'ванная' : 'ванных'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Square className="w-5 h-5 text-gray-400" />
                  <span>{apartment.area} м²</span>
                </div>
              </div>
            </div>

            {/* Описание */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">Об апартаментах</h2>
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: apartment.description }}
              />
            </div>

            {/* Удобства */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-6">Удобства</h2>
              <div className="space-y-6">
                {Object.entries(amenitiesByCategory).map(([category, amenities]) => (
                  <div key={category}>
                    <h3 className="font-medium text-gray-500 mb-3">{category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {amenities.map((amenity) => (
                        <div key={amenity.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <AmenityIcon 
                              icon={amenity.icon} 
                              name={amenity.name} 
                              className="w-5 h-5 text-primary"
                            />
                          </div>
                          <span>{amenity.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Правила */}
            {apartment.rules && apartment.rules.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6">Правила проживания</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Время */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Заезд / Выезд</h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        с {apartment.checkInTime || '14:00'} / до {apartment.checkOutTime || '12:00'}
                      </p>
                    </div>
                  </div>

                  {/* Список правил */}
                  <div className="space-y-3">
                    {apartment.rules.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-3">
                        {rule.isAllowed ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                        <span>{rule.rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Отзывы */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-6">
                Отзывы ({apartment.reviews.length})
              </h2>
              <ReviewsSection reviews={apartment.reviews} avgRating={avgRating} />
            </div>

            {/* Расположение */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-6">Расположение</h2>
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                {/* Здесь будет карта */}
                <p className="text-gray-500">
                  Карта: {apartment.city}, {apartment.address}
                </p>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {apartment.city}, {apartment.address}
              </p>
            </div>
          </div>

          {/* Правая колонка - виджет бронирования */}
          <div className="lg:col-span-1">
            <BookingWidget
              apartment={{
                id: apartment.id,
                slug: apartment.slug,
                basePrice: Number(apartment.pricing?.basePrice || 0),
                maxGuests: apartment.maxGuests,
                cleaningFee: Number(apartment.pricing?.cleaningFee || 0)
              }}
            />
          </div>
        </div>

        {/* Похожие объекты */}
        {similarApartments.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-display font-bold mb-6">
              Похожие апартаменты в {apartment.city}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarApartments.map((similar) => {
                const similarRating = similar.reviews.length > 0
                  ? similar.reviews.reduce((sum, r) => sum + r.rating, 0) / similar.reviews.length
                  : 0

                return (
                  <Link
                    key={similar.id}
                    href={`/apartments/${similar.slug}`}
                    className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-video relative">
                      <img
                        src={similar.images[0]?.url || '/placeholder.jpg'}
                        alt={similar.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">
                        {similar.title}
                      </h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold">
                          {formatPrice(Number(similar.pricing?.basePrice || 0))}
                          <span className="font-normal text-gray-500"> / ночь</span>
                        </span>
                        {similarRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span>{similarRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export async function generateMetadata({ params }: ApartmentPageProps): Promise<Metadata> {
  const apartment = await getApartment(params.slug)

  if (!apartment) {
    return {
      title: 'Апартаменты не найдены'
    }
  }

  return {
    title: `${apartment.title} | Comfort Apartments`,
    description: apartment.shortDescription || apartment.metaDescription,
    openGraph: {
      title: apartment.title,
      description: apartment.shortDescription ?? undefined,
      images: apartment.images[0]?.url ? [apartment.images[0].url] : []
    }
  }
}
