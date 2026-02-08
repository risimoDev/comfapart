'use client'

import {
  Wifi,
  Car,
  Wind,
  Tv,
  Utensils,
  WashingMachine,
  Microwave,
  Coffee,
  Refrigerator,
  Bath,
  Droplets,
  Shirt,
  Flame,
  Building,
  Trees,
  Dumbbell,
  Waves,
  ParkingCircle,
  Shield,
  Video,
  Lock,
  Cigarette,
  Dog,
  Baby,
  Users,
  Bed,
  Sofa,
  Armchair,
  Laptop,
  Phone,
  Heater,
  Fan,
  Snowflake,
  Sun,
  Clock,
  Key,
  Sparkles,
  ShowerHead,
  BedDouble,
  BedSingle,
  Lamp,
  AirVent,
  CookingPot,
  UtensilsCrossed,
  GlassWater,
  Wine,
  Sandwich,
  IceCream,
  Gamepad2,
  Music,
  Speaker,
  BookOpen,
  Printer,
  Router,
  MonitorSmartphone,
  TabletSmartphone,
  Bike,
  MapPin,
  Mountain,
  Umbrella,
  Home,
  Check,
  type LucideIcon,
} from 'lucide-react'

// Маппинг иконок по ключам
const iconMap: Record<string, LucideIcon> = {
  // Общие удобства
  wifi: Wifi,
  parking: Car,
  'parking-circle': ParkingCircle,
  ac: Wind,
  'air-vent': AirVent,
  tv: Tv,
  heating: Heater,
  fan: Fan,
  snowflake: Snowflake,
  elevator: Building,
  
  // Кухня
  kitchen: Utensils,
  utensils: UtensilsCrossed,
  microwave: Microwave,
  coffee: Coffee,
  refrigerator: Refrigerator,
  'cooking-pot': CookingPot,
  'glass-water': GlassWater,
  wine: Wine,
  sandwich: Sandwich,
  'ice-cream': IceCream,
  
  // Ванная
  bath: Bath,
  shower: ShowerHead,
  'hot-water': Droplets,
  'hair-dryer': Wind,
  'washing-machine': WashingMachine,
  dryer: Shirt,
  
  // Спальня
  bed: Bed,
  'bed-double': BedDouble,
  'bed-single': BedSingle,
  sofa: Sofa,
  armchair: Armchair,
  lamp: Lamp,
  
  // Развлечения
  gamepad: Gamepad2,
  music: Music,
  speaker: Speaker,
  'book-open': BookOpen,
  laptop: Laptop,
  phone: Phone,
  'monitor-smartphone': MonitorSmartphone,
  'tablet-smartphone': TabletSmartphone,
  
  // На улице
  balcony: Sun,
  terrace: Umbrella,
  garden: Trees,
  pool: Waves,
  gym: Dumbbell,
  bike: Bike,
  bbq: Flame,
  mountain: Mountain,
  
  // Безопасность
  security: Shield,
  camera: Video,
  lock: Lock,
  safe: Key,
  
  // Услуги
  cleaning: Sparkles,
  concierge: Users,
  '24h': Clock,
  printer: Printer,
  router: Router,
  
  // Правила
  'no-smoking': Cigarette,
  pets: Dog,
  children: Baby,
  party: Users,
  
  // По умолчанию
  home: Home,
  default: Sparkles,
}

// Категории иконок для группировки
export const AMENITY_CATEGORIES = {
  general: {
    name: 'Общие',
    items: ['wifi', 'parking', 'ac', 'heating', 'tv', 'elevator', 'fan']
  },
  kitchen: {
    name: 'Кухня',
    items: ['kitchen', 'microwave', 'coffee', 'refrigerator', 'cooking-pot', 'utensils']
  },
  bathroom: {
    name: 'Ванная',
    items: ['bath', 'shower', 'hot-water', 'hair-dryer', 'washing-machine', 'dryer']
  },
  bedroom: {
    name: 'Спальня',
    items: ['bed', 'bed-double', 'sofa', 'armchair', 'lamp']
  },
  entertainment: {
    name: 'Развлечения',
    items: ['gamepad', 'music', 'speaker', 'book-open', 'laptop']
  },
  outdoor: {
    name: 'На улице',
    items: ['balcony', 'terrace', 'garden', 'pool', 'gym', 'bike', 'bbq']
  },
  safety: {
    name: 'Безопасность',
    items: ['security', 'camera', 'lock', 'safe']
  },
  services: {
    name: 'Услуги',
    items: ['cleaning', 'concierge', '24h']
  }
}

interface AmenityIconProps {
  icon?: string | null
  name?: string
  className?: string
  size?: number
}

export function AmenityIcon({ icon, name, className = '', size = 20 }: AmenityIconProps) {
  // Пытаемся найти иконку по ключу или по имени
  const iconKey = icon?.toLowerCase() || name?.toLowerCase().replace(/\s+/g, '-') || 'default'
  
  // Ищем иконку по точному совпадению или части названия
  let IconComponent = iconMap[iconKey]
  
  if (!IconComponent) {
    // Пробуем найти по частичному совпадению
    const matchKey = Object.keys(iconMap).find(key => 
      iconKey.includes(key) || key.includes(iconKey)
    )
    IconComponent = matchKey ? iconMap[matchKey] : iconMap.default
  }
  
  return <IconComponent className={className} size={size} />
}

// Список всех доступных иконок для админки
export const AVAILABLE_ICONS = Object.keys(iconMap)

export default AmenityIcon
