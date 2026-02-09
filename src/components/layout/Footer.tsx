import Link from 'next/link'
import { 
  Phone, 
  Mail, 
  MapPin,
  Facebook,
  Instagram,
  Youtube
} from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white">
      {/* Основной контент */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* О компании */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <img 
                src="/logo.svg" 
                alt="Comfort Apartments" 
                className="h-12 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-gray-400 mb-4">
              Сервис по бронированию апартаментов в Перми. 
              Проверенные объекты с удобным бронированием.
            </p>
            <div className="flex gap-4">
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Навигация */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Навигация</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/apartments" className="text-gray-400 hover:text-white transition-colors">
                  Апартаменты
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  О нас
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="text-gray-400 hover:text-white transition-colors">
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          {/* Информация */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Информация</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                  Частые вопросы
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="text-gray-400 hover:text-white transition-colors">
                  Условия использования
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/legal/personal-data" className="text-gray-400 hover:text-white transition-colors">
                  Политика обработки ПД
                </Link>
              </li>
              <li>
                <Link href="/legal/offer" className="text-gray-400 hover:text-white transition-colors">
                  Публичная оферта
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="text-gray-400 hover:text-white transition-colors">
                  Политика cookie
                </Link>
              </li>
              <li>
                <Link href="/legal/operator-info" className="text-gray-400 hover:text-white transition-colors">
                  Об операторе ПД
                </Link>
              </li>
              <li>
                <Link href="/cancellation" className="text-gray-400 hover:text-white transition-colors">
                  Политика отмены
                </Link>
              </li>
              <li>
                <Link href="/for-owners" className="text-gray-400 hover:text-white transition-colors">
                  Для владельцев
                </Link>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Контакты</h4>
            <ul className="space-y-4">
              <li>
                <a 
                  href="tel:+78001234567" 
                  className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  8 (800) 123-45-67
                </a>
              </li>
              <li>
                <a 
                  href="mailto:support@comfort.ru" 
                  className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  support@comfort.ru
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-gray-400">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Пермь, адрес написать</span>
                </div>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-gray-800 rounded-xl">
              <p className="text-sm text-gray-400 mb-2">Поддержка 24/7</p>
              <p className="text-sm text-gray-500">
                Мы всегда на связи и готовы помочь с любым вопросом
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Нижняя часть */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {currentYear} Comfort Apartments. Все права защищены.
            </p>
            <div className="flex items-center gap-4">
              <img src="/payments/visa.svg" alt="Visa" className="h-6 opacity-50" />
              <img src="/payments/mastercard.svg" alt="Mastercard" className="h-6 opacity-50" />
              <img src="/payments/mir.svg" alt="МИР" className="h-6 opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
