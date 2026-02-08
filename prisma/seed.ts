import { PrismaClient, UserRole, ApartmentStatus, BookingStatus, PaymentStatus, PromoCodeType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...')

  // Создаем технического администратора
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@comfort-apartments.ru' },
    update: {},
    create: {
      email: 'admin@comfort-apartments.ru',
      passwordHash: adminPassword,
      firstName: 'Админ',
      lastName: 'Системы',
      phone: '+7 (999) 123-45-67',
      role: UserRole.TECH_ADMIN,
      emailVerified: true,
    },
  })
  console.log('✅ Создан тех. администратор:', admin.email)

  // Создаем владельца апартаментов
  const managerPassword = await bcrypt.hash('owner123', 12)
  const manager = await prisma.user.upsert({
    where: { email: 'owner@comfort-apartments.ru' },
    update: {},
    create: {
      email: 'owner@comfort-apartments.ru',
      passwordHash: managerPassword,
      firstName: 'Иван',
      lastName: 'Владелецев',
      phone: '+7 (999) 234-56-78',
      role: UserRole.OWNER,
      emailVerified: true,
    },
  })
  console.log('✅ Создан владелец:', manager.email)

  // Создаем тестового пользователя
  const userPassword = await bcrypt.hash('user123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userPassword,
      firstName: 'Петр',
      lastName: 'Петров',
      phone: '+7 (999) 345-67-89',
      role: UserRole.USER,
      emailVerified: true,
    },
  })
  console.log('✅ Создан пользователь:', user.email)

  // Создаем удобства - расширенный список
  const amenitiesData = [
    // Общие удобства
    { name: 'Wi-Fi', nameEn: 'Wi-Fi', icon: 'wifi', category: 'general' },
    { name: 'Парковка', nameEn: 'Parking', icon: 'parking', category: 'general' },
    { name: 'Кондиционер', nameEn: 'Air conditioning', icon: 'ac', category: 'general' },
    { name: 'Отопление', nameEn: 'Heating', icon: 'heating', category: 'general' },
    { name: 'Телевизор', nameEn: 'TV', icon: 'tv', category: 'general' },
    { name: 'Лифт', nameEn: 'Elevator', icon: 'elevator', category: 'general' },
    { name: 'Вентилятор', nameEn: 'Fan', icon: 'fan', category: 'general' },
    
    // Кухня
    { name: 'Кухня', nameEn: 'Kitchen', icon: 'kitchen', category: 'kitchen' },
    { name: 'Холодильник', nameEn: 'Refrigerator', icon: 'refrigerator', category: 'kitchen' },
    { name: 'Микроволновка', nameEn: 'Microwave', icon: 'microwave', category: 'kitchen' },
    { name: 'Кофемашина', nameEn: 'Coffee machine', icon: 'coffee', category: 'kitchen' },
    { name: 'Плита', nameEn: 'Stove', icon: 'cooking-pot', category: 'kitchen' },
    { name: 'Посудомоечная машина', nameEn: 'Dishwasher', icon: 'utensils', category: 'kitchen' },
    { name: 'Чайник', nameEn: 'Kettle', icon: 'coffee', category: 'kitchen' },
    { name: 'Тостер', nameEn: 'Toaster', icon: 'sandwich', category: 'kitchen' },
    { name: 'Посуда', nameEn: 'Dishes', icon: 'glass-water', category: 'kitchen' },
    { name: 'Духовка', nameEn: 'Oven', icon: 'cooking-pot', category: 'kitchen' },
    
    // Ванная
    { name: 'Ванна', nameEn: 'Bathtub', icon: 'bath', category: 'bathroom' },
    { name: 'Душ', nameEn: 'Shower', icon: 'shower', category: 'bathroom' },
    { name: 'Горячая вода', nameEn: 'Hot water', icon: 'hot-water', category: 'bathroom' },
    { name: 'Фен', nameEn: 'Hair dryer', icon: 'hair-dryer', category: 'bathroom' },
    { name: 'Стиральная машина', nameEn: 'Washing machine', icon: 'washing-machine', category: 'bathroom' },
    { name: 'Сушильная машина', nameEn: 'Dryer', icon: 'dryer', category: 'bathroom' },
    { name: 'Полотенца', nameEn: 'Towels', icon: 'spray', category: 'bathroom' },
    { name: 'Туалетные принадлежности', nameEn: 'Toiletries', icon: 'spray', category: 'bathroom' },
    { name: 'Биде', nameEn: 'Bidet', icon: 'shower', category: 'bathroom' },
    
    // Спальня
    { name: 'Двуспальная кровать', nameEn: 'Double bed', icon: 'bed-double', category: 'bedroom' },
    { name: 'Односпальная кровать', nameEn: 'Single bed', icon: 'bed-single', category: 'bedroom' },
    { name: 'Диван-кровать', nameEn: 'Sofa bed', icon: 'sofa', category: 'bedroom' },
    { name: 'Постельное белье', nameEn: 'Bed linen', icon: 'bed', category: 'bedroom' },
    { name: 'Подушки', nameEn: 'Pillows', icon: 'bed', category: 'bedroom' },
    { name: 'Одеяла', nameEn: 'Blankets', icon: 'bed', category: 'bedroom' },
    { name: 'Шкаф', nameEn: 'Wardrobe', icon: 'armchair', category: 'bedroom' },
    { name: 'Детская кроватка', nameEn: 'Baby crib', icon: 'bed-single', category: 'bedroom' },
    
    // Развлечения
    { name: 'Игровая приставка', nameEn: 'Game console', icon: 'gamepad', category: 'entertainment' },
    { name: 'Аудиосистема', nameEn: 'Sound system', icon: 'speaker', category: 'entertainment' },
    { name: 'Книги', nameEn: 'Books', icon: 'book-open', category: 'entertainment' },
    { name: 'Настольные игры', nameEn: 'Board games', icon: 'gamepad', category: 'entertainment' },
    { name: 'Smart TV', nameEn: 'Smart TV', icon: 'monitor-smartphone', category: 'entertainment' },
    { name: 'Netflix', nameEn: 'Netflix', icon: 'tv', category: 'entertainment' },
    
    // На улице
    { name: 'Балкон', nameEn: 'Balcony', icon: 'balcony', category: 'outdoor' },
    { name: 'Терраса', nameEn: 'Terrace', icon: 'terrace', category: 'outdoor' },
    { name: 'Сад', nameEn: 'Garden', icon: 'garden', category: 'outdoor' },
    { name: 'Бассейн', nameEn: 'Pool', icon: 'pool', category: 'outdoor' },
    { name: 'Тренажерный зал', nameEn: 'Gym', icon: 'gym', category: 'outdoor' },
    { name: 'Велосипеды', nameEn: 'Bikes', icon: 'bike', category: 'outdoor' },
    { name: 'Мангал/Барбекю', nameEn: 'BBQ', icon: 'bbq', category: 'outdoor' },
    { name: 'Вид на горы', nameEn: 'Mountain view', icon: 'mountain', category: 'outdoor' },
    { name: 'Вид на город', nameEn: 'City view', icon: 'balcony', category: 'outdoor' },
    
    // Безопасность
    { name: 'Видеонаблюдение', nameEn: 'Video surveillance', icon: 'camera', category: 'safety' },
    { name: 'Домофон', nameEn: 'Intercom', icon: 'lock', category: 'safety' },
    { name: 'Сейф', nameEn: 'Safe', icon: 'safe', category: 'safety' },
    { name: 'Охрана', nameEn: 'Security', icon: 'security', category: 'safety' },
    { name: 'Сигнализация', nameEn: 'Alarm', icon: 'security', category: 'safety' },
    { name: 'Огнетушитель', nameEn: 'Fire extinguisher', icon: 'security', category: 'safety' },
    { name: 'Аптечка', nameEn: 'First aid kit', icon: 'security', category: 'safety' },
    
    // Услуги и работа
    { name: 'Рабочее место', nameEn: 'Workspace', icon: 'laptop', category: 'services' },
    { name: 'Быстрый интернет', nameEn: 'High-speed internet', icon: 'router', category: 'services' },
    { name: 'Принтер', nameEn: 'Printer', icon: 'printer', category: 'services' },
    { name: 'Уборка', nameEn: 'Cleaning', icon: 'cleaning', category: 'services' },
    { name: 'Консьерж', nameEn: 'Concierge', icon: 'concierge', category: 'services' },
    { name: 'Круглосуточная стойка', nameEn: '24h reception', icon: '24h', category: 'services' },
    { name: 'Утюг', nameEn: 'Iron', icon: 'shirt', category: 'services' },
    { name: 'Гладильная доска', nameEn: 'Ironing board', icon: 'shirt', category: 'services' },
  ]

  for (const amenity of amenitiesData) {
    await prisma.amenity.upsert({
      where: { name: amenity.name },
      update: {},
      create: amenity,
    })
  }
  console.log('✅ Создано удобств:', amenitiesData.length)

  // Создаем категории
  const categoriesData = [
    { name: 'Студия', nameEn: 'Studio', slug: 'studio', icon: 'home', order: 1 },
    { name: '1-комнатная', nameEn: '1 Bedroom', slug: '1-bedroom', icon: 'bed-single', order: 2 },
    { name: '2-комнатная', nameEn: '2 Bedrooms', slug: '2-bedroom', icon: 'bed-double', order: 3 },
    { name: '3-комнатная', nameEn: '3 Bedrooms', slug: '3-bedroom', icon: 'hotel', order: 4 },
    { name: 'Пентхаус', nameEn: 'Penthouse', slug: 'penthouse', icon: 'building', order: 5 },
    { name: 'У моря', nameEn: 'Near Sea', slug: 'near-sea', icon: 'waves', order: 6 },
    { name: 'В центре', nameEn: 'City Center', slug: 'city-center', icon: 'map-pin', order: 7 },
  ]

  for (const category of categoriesData) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    })
  }
  console.log('✅ Создано категорий:', categoriesData.length)

  // Создаем теги
  const tagsData = [
    { name: 'Новое', slug: 'new' },
    { name: 'Популярное', slug: 'popular' },
    { name: 'С видом', slug: 'with-view' },
    { name: 'Премиум', slug: 'premium' },
    { name: 'Эконом', slug: 'economy' },
    { name: 'Для семьи', slug: 'family-friendly' },
    { name: 'Бизнес', slug: 'business' },
  ]

  for (const tag of tagsData) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    })
  }
  console.log('✅ Создано тегов:', tagsData.length)

  // Получаем все удобства и категории для связей
  const allAmenities = await prisma.amenity.findMany()
  const allCategories = await prisma.category.findMany()
  const allTags = await prisma.tag.findMany()

  // Создаем апартаменты
  const apartmentsData = [
    {
      slug: 'luxury-apartment-perm-center',
      title: 'Люкс апартаменты в центре Перми',
      description: `Роскошные апартаменты с панорамным видом на Каму. 
      
      Просторная гостиная с французскими окнами от пола до потолка открывает потрясающий вид на реку. Современный дизайн интерьера сочетается с комфортом и уютом.
      
      В апартаментах есть все необходимое для комфортного отдыха: полностью оборудованная кухня, удобная спальня с king-size кроватью, просторный балкон.
      
      Расположение идеально для тех, кто хочет быть в центре городской жизни: рядом множество ресторанов, кафе и магазинов.`,
      shortDescription: 'Панорамный вид на Каму, современный дизайн, центр города',
      city: 'Пермь',
      address: 'ул. Ленина, 50',
      district: 'Ленинский',
      latitude: 58.0105,
      longitude: 56.2502,
      area: 75,
      rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      floor: 12,
      totalFloors: 16,
      maxGuests: 4,
      minNights: 2,
      status: ApartmentStatus.PUBLISHED,
      basePrice: 12000,
      images: [
        '/apartments/apt-1.svg',
      ],
      amenities: ['Wi-Fi', 'Кондиционер', 'Телевизор', 'Кухня', 'Балкон', 'Парковка', 'Лифт'],
      categories: ['2-bedroom', 'city-center'],
      tags: ['popular', 'with-view', 'premium'],
    },
    {
      slug: 'cozy-studio-perm',
      title: 'Уютная студия в центре Перми',
      description: `Стильная студия в самом сердце города, идеальная для бизнес-поездок и туристов.
      
      Апартаменты расположены в современном здании, полностью оснащенном всем необходимым для комфортного проживания. Высокие потолки, большие окна и современная мебель создают атмосферу уюта.
      
      Рядом эспланада, множество кафе, ресторанов и достопримечательностей.
      
      В студии есть скоростной Wi-Fi, Smart TV, полностью оборудованная кухня, комфортная кровать с ортопедическим матрасом.`,
      shortDescription: 'Центр Перми, рядом эспланада, стильный интерьер',
      city: 'Пермь',
      address: 'ул. Комсомольский проспект, 28',
      district: 'Ленинский',
      latitude: 58.0092,
      longitude: 56.2290,
      area: 35,
      rooms: 1,
      bedrooms: 0,
      bathrooms: 1,
      floor: 5,
      totalFloors: 7,
      maxGuests: 2,
      minNights: 1,
      status: ApartmentStatus.PUBLISHED,
      basePrice: 7500,
      images: [
        '/apartments/apt-2.svg',
      ],
      amenities: ['Wi-Fi', 'Кондиционер', 'Телевизор', 'Кухня', 'Рабочее место', 'Лифт', 'Фен'],
      categories: ['studio', 'city-center'],
      tags: ['business', 'popular'],
    },
    {
      slug: 'family-apartment-perm',
      title: 'Семейные апартаменты на Сибирской',
      description: `Просторные апартаменты для семейного отдыха в Перми.
      
      Три отдельные спальни позволят комфортно разместиться большой семье или компании друзей. Гостиная с мягкой зоной и обеденным столом — отличное место для совместных вечеров.
      
      Полностью оборудованная кухня с посудомоечной машиной, стиральная машина, два санузла — все для комфортного длительного проживания.
      
      Удобное расположение рядом с парком Горького, торговыми центрами и ресторанами.`,
      shortDescription: '3 спальни, рядом парк, для семей до 6 человек',
      city: 'Пермь',
      address: 'ул. Сибирская, 100',
      district: 'Индустриальный',
      latitude: 58.0033,
      longitude: 56.3100,
      area: 120,
      rooms: 4,
      bedrooms: 3,
      bathrooms: 2,
      floor: 3,
      totalFloors: 5,
      maxGuests: 6,
      minNights: 2,
      status: ApartmentStatus.PUBLISHED,
      basePrice: 15000,
      images: [
        '/apartments/apt-3.svg',
      ],
      amenities: ['Wi-Fi', 'Кондиционер', 'Отопление', 'Телевизор', 'Стиральная машина', 'Посудомоечная машина', 'Холодильник', 'Кухня', 'Детская кроватка'],
      categories: ['3-bedroom', 'city-center'],
      tags: ['family-friendly', 'premium'],
    },
    {
      slug: 'budget-studio-perm',
      title: 'Бюджетная студия в Перми',
      description: `Отличный вариант для экономного путешественника!
      
      Чистая и уютная студия со всем необходимым для краткосрочного проживания. Новый ремонт, современная мебель, хорошая шумоизоляция.
      
      Удобное расположение в спальном районе, хорошая транспортная доступность. До центра 20 минут на транспорте.
      
      Идеально для одиночных путешественников и пар, которые ценят комфорт по разумной цене.`,
      shortDescription: 'Доступная цена, новый ремонт, тихий район',
      city: 'Пермь',
      address: 'ул. Пушкина, 45',
      district: 'Мотовилихинский',
      latitude: 57.9800,
      longitude: 56.2500,
      area: 28,
      rooms: 1,
      bedrooms: 0,
      bathrooms: 1,
      floor: 8,
      totalFloors: 12,
      maxGuests: 2,
      minNights: 1,
      status: ApartmentStatus.PUBLISHED,
      basePrice: 3500,
      images: [
        '/apartments/apt-4.svg',
      ],
      amenities: ['Wi-Fi', 'Кондиционер', 'Телевизор', 'Холодильник', 'Микроволновка', 'Лифт'],
      categories: ['studio'],
      tags: ['economy', 'new'],
    },
    {
      slug: 'penthouse-perm-kama',
      title: 'Пентхаус с видом на Каму',
      description: `Эксклюзивный пентхаус с террасой и видом на Каму!
      
      Двухуровневые апартаменты премиум-класса в элитном жилом комплексе на набережной Камы. Первый уровень: просторная гостиная с панорамными окнами, кухня-столовая, гостевой санузел. Второй уровень: две спальни с собственными ванными комнатами.
      
      Терраса 50 м² с зоной отдыха и потрясающим видом на реку Каму и город.
      
      Охраняемая территория, подземный паркинг, консьерж-сервис.`,
      shortDescription: 'Пентхаус с террасой, вид на Каму',
      city: 'Пермь',
      address: 'ул. Монастырская, 1',
      district: 'Ленинский',
      latitude: 58.0131,
      longitude: 56.2600,
      area: 180,
      rooms: 4,
      bedrooms: 2,
      bathrooms: 3,
      floor: 20,
      totalFloors: 20,
      maxGuests: 6,
      minNights: 3,
      status: ApartmentStatus.PUBLISHED,
      basePrice: 35000,
      images: [
        '/apartments/apt-5.svg',
      ],
      amenities: ['Wi-Fi', 'Кондиционер', 'Телевизор', 'Кухня', 'Балкон', 'Парковка', 'Лифт', 'Посудомоечная машина', 'Стиральная машина', 'Сейф'],
      categories: ['penthouse', 'city-center'],
      tags: ['premium', 'with-view', 'popular'],
    },
  ]

  for (const aptData of apartmentsData) {
    const apartment = await prisma.apartment.upsert({
      where: { slug: aptData.slug },
      update: {},
      create: {
        slug: aptData.slug,
        title: aptData.title,
        description: aptData.description,
        shortDescription: aptData.shortDescription,
        city: aptData.city,
        address: aptData.address,
        district: aptData.district,
        latitude: aptData.latitude,
        longitude: aptData.longitude,
        area: aptData.area,
        rooms: aptData.rooms,
        bedrooms: aptData.bedrooms,
        bathrooms: aptData.bathrooms,
        floor: aptData.floor,
        totalFloors: aptData.totalFloors,
        maxGuests: aptData.maxGuests,
        minNights: aptData.minNights,
        status: aptData.status,
      },
    })

    // Создаем ценообразование
    await prisma.pricing.upsert({
      where: { apartmentId: apartment.id },
      update: {},
      create: {
        apartmentId: apartment.id,
        basePrice: aptData.basePrice,
        cleaningFee: aptData.basePrice * 0.1,
        serviceFee: 10,
        weeklyDiscount: 10,
        monthlyDiscount: 20,
        extraGuestFee: aptData.basePrice * 0.15,
        baseGuests: 2,
      },
    })

    // Создаем изображения
    for (let i = 0; i < aptData.images.length; i++) {
      await prisma.apartmentImage.create({
        data: {
          apartmentId: apartment.id,
          url: aptData.images[i],
          order: i,
          isPrimary: i === 0,
        },
      })
    }

    // Связываем удобства
    for (const amenityName of aptData.amenities) {
      const amenity = allAmenities.find(a => a.name === amenityName)
      if (amenity) {
        await prisma.apartmentAmenity.upsert({
          where: { apartmentId_amenityId: { apartmentId: apartment.id, amenityId: amenity.id } },
          update: {},
          create: { apartmentId: apartment.id, amenityId: amenity.id },
        })
      }
    }

    // Связываем категории
    for (const categorySlug of aptData.categories) {
      const category = allCategories.find(c => c.slug === categorySlug)
      if (category) {
        await prisma.apartmentCategory.upsert({
          where: { apartmentId_categoryId: { apartmentId: apartment.id, categoryId: category.id } },
          update: {},
          create: { apartmentId: apartment.id, categoryId: category.id },
        })
      }
    }

    // Связываем теги
    for (const tagSlug of aptData.tags) {
      const tag = allTags.find(t => t.slug === tagSlug)
      if (tag) {
        await prisma.apartmentTag.upsert({
          where: { apartmentId_tagId: { apartmentId: apartment.id, tagId: tag.id } },
          update: {},
          create: { apartmentId: apartment.id, tagId: tag.id },
        })
      }
    }

    // Создаем правила
    const rules = [
      { rule: 'Курение запрещено', ruleEn: 'No smoking', isAllowed: false },
      { rule: 'Животные не допускаются', ruleEn: 'No pets', isAllowed: false },
      { rule: 'Вечеринки запрещены', ruleEn: 'No parties', isAllowed: false },
      { rule: 'Тихий час с 23:00 до 07:00', ruleEn: 'Quiet hours 11PM-7AM', isAllowed: true },
    ]

    for (const rule of rules) {
      await prisma.apartmentRule.create({
        data: {
          apartmentId: apartment.id,
          ...rule,
        },
      })
    }

    // Создаем сезонные цены
    const seasonalPrices = [
      { name: 'Новогодние праздники', startDate: new Date('2026-12-25'), endDate: new Date('2027-01-10'), priceMultiplier: 1.5 },
      { name: 'Летний сезон', startDate: new Date('2026-06-01'), endDate: new Date('2026-08-31'), priceMultiplier: 1.3 },
      { name: 'Майские праздники', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-10'), priceMultiplier: 1.25 },
    ]

    for (const sp of seasonalPrices) {
      await prisma.seasonalPrice.create({
        data: {
          apartmentId: apartment.id,
          ...sp,
        },
      })
    }

    // Цены по дням недели (выходные дороже)
    await prisma.weekdayPrice.createMany({
      data: [
        { apartmentId: apartment.id, dayOfWeek: 5, priceMultiplier: 1.15 }, // Пятница
        { apartmentId: apartment.id, dayOfWeek: 6, priceMultiplier: 1.2 },  // Суббота
      ],
      skipDuplicates: true,
    })

    console.log('✅ Создан апартамент:', apartment.title)
  }

  // Создаем промокоды
  const promoCodes = [
    { code: 'WELCOME10', type: PromoCodeType.PERCENTAGE, value: 10, minNights: 2 },
    { code: 'SUMMER2026', type: PromoCodeType.PERCENTAGE, value: 15, minNights: 5, startDate: new Date('2026-06-01'), endDate: new Date('2026-08-31') },
    { code: 'FIRST1000', type: PromoCodeType.FIXED, value: 1000, minAmount: 5000 },
    { code: 'LONGSTAY20', type: PromoCodeType.PERCENTAGE, value: 20, minNights: 14, maxDiscount: 10000 },
  ]

  for (const promo of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: {},
      create: promo,
    })
  }
  console.log('✅ Создано промокодов:', promoCodes.length)

  // Создаем настройки компании
  await prisma.companySettings.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      name: 'Comfort Apartments',
      legalName: 'ООО "Комфорт Апартаменты"',
      description: 'Сервис краткосрочной аренды апартаментов премиум-класса',
      email: 'info@comfort-apartments.ru',
      phone: '+7 (800) 123-45-67',
      address: 'г. Москва, ул. Примерная, д. 1',
      inn: '7701234567',
      ogrn: '1177746123456',
      defaultServiceFee: 10,
      privacyPolicy: 'Политика конфиденциальности...',
      termsOfService: 'Условия использования сервиса...',
      cancellationPolicy: `Политика отмены бронирования:
- Бесплатная отмена за 7 дней до заезда
- 50% возврат при отмене за 3-7 дней
- Без возврата при отмене менее чем за 3 дня`,
    },
  })
  console.log('✅ Созданы настройки компании')

  // Создаем CMS блоки
  const cmsBlocks = [
    { key: 'hero_title', title: 'Заголовок главной', content: 'Найдите идеальные апартаменты для вашего отдыха', locale: 'ru' },
    { key: 'hero_subtitle', title: 'Подзаголовок главной', content: 'Премиальные апартаменты в лучших городах России', locale: 'ru' },
    { key: 'about_title', title: 'О нас заголовок', content: 'Комфорт и качество — наш приоритет', locale: 'ru' },
    { key: 'about_text', title: 'О нас текст', content: 'Мы предлагаем тщательно отобранные апартаменты с высоким уровнем сервиса и комфорта.', locale: 'ru' },
    { key: 'hero_title', title: 'Hero Title', content: 'Find perfect apartments for your vacation', locale: 'en' },
    { key: 'hero_subtitle', title: 'Hero Subtitle', content: 'Premium apartments in the best cities of Russia', locale: 'en' },
  ]

  for (const block of cmsBlocks) {
    await prisma.cmsBlock.upsert({
      where: { key_locale: { key: block.key, locale: block.locale } },
      update: {},
      create: block,
    })
  }
  console.log('✅ Созданы CMS блоки')

  console.log('\n🎉 База данных успешно заполнена!')
  console.log('\nДанные для входа:')
  console.log('Администратор: admin@comfort-apartments.ru / admin123')
  console.log('Менеджер: manager@comfort-apartments.ru / manager123')
  console.log('Пользователь: user@example.com / user123')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
