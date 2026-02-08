'use client'

import { useState } from 'react'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send,
  CheckCircle,
  MessageSquare
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import toast from 'react-hot-toast'

export default function ContactsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Имитация отправки формы
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIsSubmitted(true)
      toast.success('Сообщение отправлено!')
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (error) {
      toast.error('Ошибка отправки. Попробуйте позже.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Адрес',
      content: 'г. Пермь, ул. Ленина, 50, офис 301',
      link: 'https://yandex.ru/maps/-/CCUBY8wO~B'
    },
    {
      icon: Phone,
      title: 'Телефон',
      content: '+7 (342) 123-45-67',
      link: 'tel:+73421234567'
    },
    {
      icon: Mail,
      title: 'Email',
      content: 'info@comfort-apartments.ru',
      link: 'mailto:info@comfort-apartments.ru'
    },
    {
      icon: Clock,
      title: 'Режим работы',
      content: 'Пн-Вс: 9:00 - 21:00',
      link: null
    }
  ]

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Свяжитесь с нами
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Мы всегда готовы ответить на ваши вопросы и помочь с выбором апартаментов
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Контактная информация */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-2xl font-bold mb-6">Контактная информация</h2>
            
            {contactInfo.map((item, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-500 text-sm mb-1">
                      {item.title}
                    </h3>
                    {item.link ? (
                      <a 
                        href={item.link}
                        className="text-lg hover:text-primary transition-colors"
                        target={item.link.startsWith('http') ? '_blank' : undefined}
                        rel={item.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {item.content}
                      </a>
                    ) : (
                      <p className="text-lg">{item.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Социальные сети */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-500 text-sm mb-4">Мы в соцсетях</h3>
              <div className="flex gap-3">
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
                  title="VK"
                >
                  <span className="text-sm font-bold">VK</span>
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-lg bg-blue-400 flex items-center justify-center text-white hover:bg-blue-500 transition-colors"
                  title="Telegram"
                >
                  <span className="text-sm font-bold">TG</span>
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors"
                  title="WhatsApp"
                >
                  <span className="text-sm font-bold">WA</span>
                </a>
              </div>
            </div>
          </div>

          {/* Форма обратной связи */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Напишите нам</h2>
                  <p className="text-gray-500">Мы ответим в течение 24 часов</p>
                </div>
              </div>

              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Спасибо за обращение!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Мы получили ваше сообщение и свяжемся с вами в ближайшее время.
                  </p>
                  <Button 
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                  >
                    Отправить ещё сообщение
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Ваше имя <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Иван Иванов"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="ivan@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Телефон
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Тема <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      >
                        <option value="">Выберите тему</option>
                        <option value="booking">Вопрос по бронированию</option>
                        <option value="partnership">Сотрудничество</option>
                        <option value="complaint">Жалоба</option>
                        <option value="suggestion">Предложение</option>
                        <option value="other">Другое</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Сообщение <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Опишите ваш вопрос..."
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Отправка...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Отправить сообщение
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-gray-500">
                      Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Карта */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Мы на карте</h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="aspect-[21/9] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-gray-500">г. Пермь, ул. Ленина, 50</p>
                <a 
                  href="https://yandex.ru/maps/-/CCUBY8wO~B"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline mt-2 inline-block"
                >
                  Открыть в Яндекс.Картах
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
