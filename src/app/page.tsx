import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { 
  Search, 
  MapPin, 
  Star, 
  Shield, 
  Clock, 
  Heart,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { ApartmentCard, SearchFilters } from '@/components/apartments'
import { ApartmentCardSkeleton } from '@/components/ui'

async function getFeaturedApartments() {
  return prisma.apartment.findMany({
    where: {
      status: 'PUBLISHED'
    },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      pricing: true,
      reviews: { select: { rating: true } },
      tags: { include: { tag: true } }
    },
    take: 6,
    orderBy: { createdAt: 'desc' }
  })
}

async function getCategories() {
  return prisma.category.findMany({
    include: {
      _count: { select: { apartments: true } }
    },
    orderBy: { order: 'asc' },
    take: 8
  })
}

// Компонент Hero
function HeroSection() {
  return (
    <section className="relative min-h-[600px] flex items-center">
      {/* Фоновое изображение */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-900 to-slate-700">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
      </div>

      {/* Контент */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 animate-fade-in">
            Комфортные
            <span className="text-primary"> апартаменты</span>
            <br />в Перми
          </h1>
          <p className="text-xl text-gray-200 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Проверенные объекты для вашего отдыха или командировки. 
            Бронируйте напрямую без комиссии.
          </p>

          {/* Преимущества */}
          <div className="flex flex-wrap gap-6 text-white/80 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Безопасное бронирование</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span>Мгновенное подтверждение</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <span>Только проверенные объекты</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Поиск
function SearchSection() {
  return (
    <section className="relative -mt-16 z-20 container mx-auto px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 animate-slide-up">
        <Suspense fallback={<div className="h-20 animate-pulse bg-gray-100 rounded-xl" />}>
          <SearchFilters />
        </Suspense>
      </div>
    </section>
  )
}

// Популярные города
// Рекомендуемые апартаменты
async function FeaturedApartmentsSection() {
  const apartments = await getFeaturedApartments()

  if (apartments.length === 0) return null

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wider">Рекомендуем</span>
            </div>
            <h2 className="text-3xl font-display font-bold">
              Лучшие предложения
            </h2>
          </div>
          <Link 
            href="/apartments?featured=true"
            className="hidden md:flex items-center gap-2 text-primary hover:underline"
          >
            Смотреть все
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apartments.map((apartment, index) => {
            const avgRating = apartment.reviews.length > 0
              ? apartment.reviews.reduce((sum, r) => sum + r.rating, 0) / apartment.reviews.length
              : 0

            return (
              <div
                key={apartment.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ApartmentCard
                  apartment={{
                    id: apartment.id,
                    slug: apartment.slug,
                    title: apartment.title,
                    shortDescription: apartment.shortDescription,
                    basePrice: apartment.pricing?.basePrice || 0,
                    currency: apartment.pricing?.currency || 'RUB',
                    city: apartment.city,
                    address: apartment.address,
                    rooms: apartment.rooms,
                    maxGuests: apartment.maxGuests,
                    images: apartment.images.map(img => img.url),
                    rating: avgRating,
                    reviewsCount: apartment.reviews.length,
                    tags: apartment.tags.map(t => ({
                      name: t.tag.name
                    }))
                  }}
                />
              </div>
            )
          })}
        </div>

        <div className="md:hidden mt-6 text-center">
          <Link 
            href="/apartments?featured=true"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            Смотреть все предложения
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// Категории
async function CategoriesSection() {
  const categories = await getCategories()

  if (categories.length === 0) return null

  const categoryIcons: Record<string, string> = {
    'apartments': '🏢',
    'houses': '🏠',
    'villas': '🏡',
    'studios': '🛋️',
    'penthouses': '✨',
    'lofts': '🏗️',
    'default': '🏠'
  }

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold mb-4">
            Что вы ищете?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Выберите тип жилья, который подходит именно вам
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/apartments?category=${category.slug}`}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-6 text-center hover:shadow-lg transition-all animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="text-4xl mb-4 block">
                {categoryIcons[category.slug] || categoryIcons.default}
              </span>
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {category.name}
              </h3>
              <p className="text-sm text-gray-500">
                {category._count.apartments} {category._count.apartments === 1 ? 'объект' : 
                  category._count.apartments < 5 ? 'объекта' : 'объектов'}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// Преимущества
function FeaturesSection() {
  const features = [
    {
      icon: Shield,
      title: 'Безопасная оплата',
      description: 'Все платежи защищены. Деньги переводятся владельцу только после вашего заселения.'
    },
    {
      icon: Star,
      title: 'Проверенные объекты',
      description: 'Каждый объект проходит тщательную проверку. Реальные фото и честные описания.'
    },
    {
      icon: Clock,
      title: 'Поддержка 24/7',
      description: 'Наша команда всегда на связи. Поможем с любым вопросом в любое время.'
    },
    {
      icon: Heart,
      title: 'Лучшие цены',
      description: 'Бронируйте напрямую без скрытых комиссий. Специальные предложения для постоянных клиентов.'
    }
  ]

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold mb-4">
            Почему выбирают нас
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Мы делаем всё, чтобы ваш отдых был комфортным и безопасным
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// CTA секция
function CTASection() {
  return (
    <section className="py-16 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
          Готовы найти идеальные апартаменты?
        </h2>
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Присоединяйтесь к тысячам довольных гостей. 
          Начните поиск прямо сейчас!
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/apartments"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Search className="w-5 h-5" />
            Найти апартаменты
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
          >
            Создать аккаунт
          </Link>
        </div>
      </div>
    </section>
  )
}

export default async function HomePage() {
  return (
    <main>
      <HeroSection />
      <SearchSection />
      
      <Suspense fallback={
        <div className="py-16 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ApartmentCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }>
        <FeaturedApartmentsSection />
      </Suspense>

      <Suspense fallback={null}>
        <CategoriesSection />
      </Suspense>

      <FeaturesSection />
      <CTASection />
    </main>
  )
}
