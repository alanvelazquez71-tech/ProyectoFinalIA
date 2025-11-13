import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { ChevronLeft, ChevronRight, MapPin, Calendar, DollarSign } from 'lucide-react'

interface City {
  id: string
  city: string
  country: string
  region: string
  short_description: string
  latitude: number
  longitude: number
  avg_temp_monthly: string
  ideal_durations: string
  budget_level: number
  culture: number
  adventure: number
  nature: number
  beaches: number
  nightlife: number
  cuisine: number
  wellness: number
  urban: number
  seclusion: number
}

interface CityScore {
  city_id: string
  score: number
}

interface RecommendationCarouselProps {
  cities: CityScore[]
  onClose: () => void
}

export function RecommendationCarousel({ cities, onClose }: RecommendationCarouselProps) {
  const [allCities, setAllCities] = useState<City[]>([])
  const [matchedCities, setMatchedCities] = useState<(City & { imageUrl?: string })[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const API_KEY = "TEqLu0a1Rs1wdUSNSA8rD17nfaJW9T7D2kMkRd28hBiGiiR3efTeZAIY"

  // 🔹 Load CSV
  useEffect(() => {
    fetch('/Worldwide Travel Cities Dataset (Ratings and Climate).csv')
      .then(res => res.text())
      .then(text => {
        const parsed = Papa.parse<City>(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        })
        setAllCities(parsed.data)
      })
      .catch(err => console.error('Error loading CSV:', err))
  }, [])

  // 🔹 Match & fetch city images
  useEffect(() => {
    const loadImages = async () => {
      const filtered = allCities.filter(city =>
        cities.some(c => c.city_id === city.id)
      )

      // For each city, fetch an image from Pexels
      const withImages = await Promise.all(
        filtered.map(async city => {
          try {
            const response = await fetch(
              `https://api.pexels.com/v1/search?query=${encodeURIComponent(city.city)}&per_page=1`,
              {
                headers: { Authorization: API_KEY },
              }
            )

            const data = await response.json()
            console.log(data)
            const photoUrl = data.photos?.[0]?.src?.original

            return { ...city, imageUrl: photoUrl }
          } catch (err) {
            console.error('Error fetching image for', city.city, err)
            return { ...city, imageUrl: null }
          }
        })
      )

      setMatchedCities(withImages)
    }

    if (allCities.length > 0 && cities.length > 0) {
      loadImages()
    }
  }, [allCities, cities])

  if (matchedCities.length === 0) return null

  const currentCity = matchedCities[currentIndex]
  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % matchedCities.length)
  const goToPrevious = () => setCurrentIndex((prev) => (prev - 1 + matchedCities.length) % matchedCities.length)

  const getBudgetLabel = (level: any) => {
    if (!level) return 'N/A'
    const labels = ['Budget', 'Affordable', 'Moderate', 'Upscale', 'Luxury']
    return labels[level - 1] || level
  }

  const temp = JSON.parse(currentCity.avg_temp_monthly)
  const features = [
    { label: 'Culture', value: currentCity.culture },
    { label: 'Adventure', value: currentCity.adventure },
    { label: 'Nature', value: currentCity.nature },
    { label: 'Beaches', value: currentCity.beaches },
    { label: 'Nightlife', value: currentCity.nightlife },
    { label: 'Cuisine', value: currentCity.cuisine },
    { label: 'Wellness', value: currentCity.wellness },
    { label: 'Urban', value: currentCity.urban },
    { label: 'Seclusion', value: currentCity.seclusion },
  ]

  const topFeatures = features
    .filter(f => f.value > 3)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 z-50 flex items-center justify-center p-4 transition-all">

      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* === Header / Image === */}
        <div className="relative h-[500px] bg-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white text-gray-700 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
          >
            ×
          </button>

          {matchedCities.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white text-gray-700 rounded-full w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-gray-700 rounded-full w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {currentCity.imageUrl ? (
            <img
              src={currentCity.imageUrl}
              alt={currentCity.city}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 via-teal-500 to-emerald-500 flex items-center justify-center text-white text-4xl font-bold">
              {currentCity.city}
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center    bg-opacity-40">
            <div className="text-center text-white drop-shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-4">
                <MapPin className="w-8 h-8" />
                <h2 className="text-6xl font-bold">{currentCity.city}</h2>
              </div>
              <p className="text-2xl font-light">{currentCity.country}</p>
              {currentCity.region && (
                <p className="text-lg mt-2 opacity-90">{currentCity.region}</p>
              )}
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {matchedCities.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                  }`}
              />
            ))}
          </div>
        </div>

        {/* === Info Section === */}
        <div className="p-8">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Budget Level</p>
                <p className="font-semibold">{getBudgetLabel(currentCity.budget_level)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ideal Duration</p>
                <p className="font-semibold">
                  {currentCity.ideal_durations
                    ? JSON.parse(currentCity.ideal_durations)[0]
                    : 'Flexible'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🌡️</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg. Temperature</p>
                <p className="font-semibold">{temp["1"].avg}°C</p>
              </div>
            </div>
          </div>

          {currentCity.short_description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">About</h3>
              <p className="text-gray-600 leading-relaxed">{currentCity.short_description}</p>
            </div>
          )}

          {topFeatures.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Top Features</h3>
              <div className="flex gap-3 flex-wrap">
                {topFeatures.map((feature) => (
                  <span
                    key={feature.label}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-full font-medium"
                  >
                    {feature.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {currentIndex + 1} of {matchedCities.length} recommendations
          </div>
        </div>
      </div>
    </div>
  )
}
