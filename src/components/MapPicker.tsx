'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, Loader2 } from 'lucide-react'

interface MapPickerProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number, address?: string) => void
  className?: string
}

// Координаты центра Перми
const PERM_CENTER = { lat: 58.0105, lng: 56.2502 }

export default function MapPicker({ 
  latitude, 
  longitude, 
  onLocationChange,
  className = ''
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)

  // Загружаем Leaflet динамически
  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return

      // Проверяем есть ли уже Leaflet
      if ((window as any).L) {
        initMap()
        return
      }

      // Загружаем CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      // Загружаем JS
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        initMap()
      }
      document.head.appendChild(script)
    }

    loadLeaflet()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  const initMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return

    const L = (window as any).L
    if (!L) return

    const initialLat = latitude || PERM_CENTER.lat
    const initialLng = longitude || PERM_CENTER.lng

    // Создаём карту
    const map = L.map(mapRef.current).setView([initialLat, initialLng], 13)

    // Добавляем слой OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map)

    // Создаём кастомную иконку маркера
    const customIcon = L.divIcon({
      html: `<div style="
        width: 40px; 
        height: 40px; 
        background: #3b82f6; 
        border-radius: 50% 50% 50% 0; 
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 20px;">📍</div>
      </div>`,
      className: 'custom-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    })

    // Добавляем маркер если есть координаты
    if (latitude && longitude) {
      markerRef.current = L.marker([latitude, longitude], { icon: customIcon, draggable: true })
        .addTo(map)
        .on('dragend', handleMarkerDrag)
    }

    // Обработка клика по карте
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng
      
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { icon: customIcon, draggable: true })
          .addTo(map)
          .on('dragend', handleMarkerDrag)
      }
      
      onLocationChange(lat, lng)
      reverseGeocode(lat, lng)
    })

    mapInstanceRef.current = map
    setMapLoaded(true)
  }

  const handleMarkerDrag = (e: any) => {
    const { lat, lng } = e.target.getLatLng()
    onLocationChange(lat, lng)
    reverseGeocode(lat, lng)
  }

  // Обратное геокодирование (координаты -> адрес)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`
      )
      const data = await response.json()
      if (data.display_name) {
        // Оставляем только часть адреса без страны и области
        const parts = data.display_name.split(', ')
        const address = parts.slice(0, 3).join(', ')
        onLocationChange(lat, lng, address)
      }
    } catch (error) {
      console.error('Ошибка геокодирования:', error)
    }
  }

  // Поиск адреса
  const searchAddress = async () => {
    if (!searchQuery.trim()) return
    
    setSearching(true)
    try {
      // Добавляем "Пермь" к запросу для ограничения поиска
      const query = searchQuery.includes('Пермь') ? searchQuery : `${searchQuery}, Пермь, Россия`
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ru`
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Ошибка поиска:', error)
    } finally {
      setSearching(false)
    }
  }

  // Выбор результата поиска
  const selectResult = (result: any) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16)
      
      const L = (window as any).L
      const customIcon = L.divIcon({
        html: `<div style="
          width: 40px; 
          height: 40px; 
          background: #3b82f6; 
          border-radius: 50% 50% 50% 0; 
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        "></div>`,
        className: 'custom-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      })
      
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { icon: customIcon, draggable: true })
          .addTo(mapInstanceRef.current)
          .on('dragend', handleMarkerDrag)
      }
    }
    
    onLocationChange(lat, lng, result.display_name)
    setSearchResults([])
    setSearchQuery('')
  }

  // Обновляем позицию маркера при изменении props
  useEffect(() => {
    if (mapInstanceRef.current && latitude && longitude) {
      const L = (window as any).L
      if (!L) return

      mapInstanceRef.current.setView([latitude, longitude], 15)
      
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude])
      }
    }
  }, [latitude, longitude])

  return (
    <div className={`relative ${className}`}>
      {/* Поиск */}
      <div className="absolute top-3 left-3 right-3 z-[1000]">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
            placeholder="Поиск адреса в Перми..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 animate-spin" />
          )}
        </div>
        
        {/* Результаты поиска */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => selectResult(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-3"
              >
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Карта */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Подсказка */}
      {!latitude && !longitude && mapLoaded && (
        <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-gray-600 text-center">
          Кликните на карту для выбора расположения или воспользуйтесь поиском
        </div>
      )}
      
      {/* Координаты */}
      {latitude && longitude && (
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-gray-600">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      )}
    </div>
  )
}
