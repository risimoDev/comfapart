import { 
  Building2, 
  Users, 
  Award, 
  Shield, 
  Heart,
  Clock,
  Star,
  CheckCircle,
  Target,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  const stats = [
    { value: '500+', label: 'Довольных гостей' },
    { value: '50+', label: 'Объектов' },
    { value: '5', label: 'Лет на рынке' },
    { value: '4.8', label: 'Средний рейтинг' }
  ]

  const values = [
    {
      icon: Shield,
      title: 'Безопасность',
      description: 'Все объекты проходят тщательную проверку. Каждое бронирование защищено.'
    },
    {
      icon: Heart,
      title: 'Забота о гостях',
      description: 'Мы делаем всё, чтобы ваше пребывание было комфортным и приятным.'
    },
    {
      icon: Award,
      title: 'Качество',
      description: 'Только лучшие апартаменты с современным ремонтом и полным оснащением.'
    },
    {
      icon: Clock,
      title: 'Поддержка 24/7',
      description: 'Наша команда всегда на связи и готова помочь в любой ситуации.'
    }
  ]

  const team = [
    {
      name: 'Анна Петрова',
      role: 'Директор',
      image: null
    },
    {
      name: 'Михаил Сидоров',
      role: 'Менеджер по работе с клиентами',
      image: null
    },
    {
      name: 'Елена Козлова',
      role: 'Специалист по бронированию',
      image: null
    }
  ]

  const advantages = [
    'Прямое бронирование без посредников и скрытых комиссий',
    'Фотографии и описания полностью соответствуют реальности',
    'Мгновенное подтверждение бронирования',
    'Гибкая система скидок для постоянных клиентов',
    'Помощь с трансфером и дополнительными услугами',
    'Возможность раннего заезда и позднего выезда'
  ]

  return (
    <main className="min-h-screen">
      {/* Hero секция */}
      <section className="bg-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            О компании Comfort Apartments
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Мы помогаем найти идеальное жильё для отдыха или командировки в Перми. 
            Наша миссия — сделать ваше пребывание максимально комфортным.
          </p>
        </div>
      </section>

      {/* Статистика */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Наша история */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-display font-bold">Наша история</h2>
            </div>
            
            <div className="prose dark:prose-invert max-w-none text-lg">
              <p>
                Компания <strong>Comfort Apartments</strong> была основана в 2021 году с целью 
                предоставить гостям Перми качественное и доступное жильё. Мы начинали с нескольких 
                апартаментов в центре города, а сегодня наш каталог насчитывает более 50 объектов 
                в различных районах.
              </p>
              <p>
                За годы работы мы накопили богатый опыт и выработали высокие стандарты качества. 
                Каждые апартаменты в нашем каталоге проходят тщательную проверку — мы лично 
                инспектируем объекты и следим за их состоянием.
              </p>
              <p>
                Наша цель — не просто предоставить жильё, а создать для наших гостей атмосферу 
                уюта и заботы. Мы верим, что качественный отдых начинается с комфортного дома.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Наши ценности */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">Наши ценности</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Эти принципы лежат в основе всего, что мы делаем
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-display font-bold">Почему выбирают нас</h2>
              </div>
              
              <ul className="space-y-4">
                {advantages.map((advantage, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{advantage}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8">
              <div className="text-center">
                <Star className="w-16 h-16 text-primary mx-auto mb-4" />
                <div className="text-5xl font-bold text-primary mb-2">4.8</div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Средний рейтинг наших объектов</p>
                <p className="text-sm text-gray-500">На основе 500+ отзывов гостей</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Команда */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-display font-bold">Наша команда</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Профессионалы, которые заботятся о вашем комфорте
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm"
              >
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-400">
                    {member.name.charAt(0)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                <p className="text-gray-500">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Готовы найти идеальные апартаменты?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Посмотрите наш каталог или свяжитесь с нами — мы поможем подобрать лучший вариант
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/apartments"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Target className="w-5 h-5" />
              Смотреть апартаменты
            </Link>
            <Link
              href="/contacts"
              className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              Связаться с нами
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

export const metadata = {
  title: 'О компании',
  description: 'Comfort Apartments — сервис аренды апартаментов в Перми. Узнайте о нашей компании, команде и ценностях.'
}
