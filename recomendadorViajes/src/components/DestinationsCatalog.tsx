import { useState, useMemo, useEffect, useRef } from 'react';
import { City } from '../lib/supabase';
import { MapPin, Filter } from 'lucide-react';

interface DestinationsCatalogProps {
    cities: City[];
    onCitySelect?: (city: City) => void;
}

type FilterType = 'all' | 'culture' | 'adventure' | 'nature' | 'beaches' | 'urban';

const pexelsAPI = "7E2l7DRP5VFrIpkG2SMSHlmjV8xTr7q7VzpAOCFxEyd4FKF5O9JF8xiY";

export function DestinationsCatalog({ cities, onCitySelect }: DestinationsCatalogProps) {
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCities = useMemo(() => {
        let result = cities;

        if (searchQuery) {
            result = result.filter(
                (city) =>
                    city.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    city.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    city.region?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filter !== 'all') {
            result = result.filter((city) => {
                const featureValue = city[`${filter}_norm` as keyof City] as number;
                return featureValue > 0.6;
            });
        }

        return result;
    }, [cities, filter, searchQuery]);

    const filterOptions: { value: FilterType; label: string }[] = [
        { value: 'all', label: 'All Destinations' },
        { value: 'culture', label: 'Cultural' },
        { value: 'adventure', label: 'Adventure' },
        { value: 'nature', label: 'Nature' },
        { value: 'beaches', label: 'Beaches' },
        { value: 'urban', label: 'Urban' },
    ];

    const getBudgetLabel = (level: number | null) => {
        if (!level) return '';
        const labels = ['$', '$$', '$$$', '$$$$', '$$$$$'];
        return labels[level - 1] || '';
    };

    return (
        <div>
            <div className="mb-8 space-y-4">
                <div className="flex items-center gap-2 text-gray-600">
                    <Filter className="w-5 h-5" />
                    <span className="font-medium">Filter Destinations</span>
                </div>

                <input
                    type="text"
                    placeholder="Search by city, country, or region..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex flex-wrap gap-2">
                    {filterOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setFilter(option.value)}
                            className={`px-4 py-2 rounded-full font-medium transition-all ${filter === option.value
                                ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCities.map((city) => (
                    <div
                        key={city.id}
                        onClick={() => onCitySelect?.(city)}
                        className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                    >
                        <div className="h-48 relative overflow-hidden">
                            {/* Imagen de fondo de Unsplash */}
                            <CityImage cityName={city.city} apiKey={pexelsAPI} />


                            {/* Overlay con gradiente oscuro para mejorar legibilidad */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent group-hover:from-black/70 transition-all" />

                            <div className="absolute bottom-4 left-4 text-white z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-5 h-5" />
                                    <h3 className="text-2xl font-bold drop-shadow-lg">{city.city}</h3>
                                </div>
                                <p className="text-sm opacity-90 drop-shadow-md">{city.country}</p>
                            </div>

                            {city.budget_level && (
                                <div className="absolute top-4 right-4 bg-white text-gray-700 px-3 py-1 rounded-full text-sm font-semibold z-10">
                                    {getBudgetLabel(city.budget_level)}
                                </div>
                            )}
                        </div>

                        <div className="p-5">
                            {city.short_description && (
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                    {city.short_description}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: 'culture_norm', label: 'Culture' },
                                    { key: 'adventure_norm', label: 'Adventure' },
                                    { key: 'nature_norm', label: 'Nature' },
                                    { key: 'beaches_norm', label: 'Beaches' },
                                    { key: 'nightlife_norm', label: 'Nightlife' },
                                ]
                                    .filter((feature) => {
                                        const value = city[feature.key as keyof City] as number;
                                        return value > 0.6;
                                    })
                                    .slice(0, 3)
                                    .map((feature) => (
                                        <span
                                            key={feature.key}
                                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium"
                                        >
                                            {feature.label}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredCities.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                    <p className="text-lg">No destinations found matching your criteria.</p>
                    <p className="text-sm mt-2">Try adjusting your filters or search query.</p>
                </div>
            )}
        </div>
    );
}





const CACHE = new Map<string, string>();

interface Props {
    cityName: string;
    apiKey: string;
}

export function CityImage({ cityName, apiKey }: Props) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // 👁️ Detectar si el componente está en el viewport
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.disconnect(); // desconectamos una vez visible
                    }
                });
            },
            { threshold: 0.1 } // visible al menos 10%
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!cityName || !isVisible) return;

        // ⚡ Usa caché si ya existe
        if (CACHE.has(cityName)) {
            setImageUrl(CACHE.get(cityName)!);
            return;
        }

        async function fetchImage() {
            const MAX_RETRIES = 6;
            let retries = 0;
            let success = false;

            // 🔑 Lista de tus API Keys
            const API_KEYS = [
                "TEqLu0a1Rs1wdUSNSA8rD17nfaJW9T7D2kMkRd28hBiGiiR3efTeZAIY",
                "7E2l7DRP5VFrIpkG2SMSHlmjV8xTr7q7VzpAOCFxEyd4FKF5O9JF8xiY",
                "yjBQM2uWiZDzAyiZbqi6hqy7e2nfCZpuwRNmpbjMsQ7qeORkaS6qVaAD",
            ];

            let currentKeyIndex = API_KEYS.indexOf(apiKey);
            if (currentKeyIndex === -1) currentKeyIndex = 0;

            while (!success && retries < MAX_RETRIES) {
                try {
                    console.log(
                        `Intento ${retries + 1}: buscando imagen para ${cityName} con API key #${currentKeyIndex + 1}`
                    );

                    const response = await fetch(
                        `https://api.pexels.com/v1/search?query=${encodeURIComponent(
                            cityName
                        )}&per_page=1`,
                        {
                            headers: {
                                Authorization: API_KEYS[currentKeyIndex],
                            },
                        }
                    );

                    const data = await response.json();

                    if (data.code === "Too Many Requests") {
                        console.warn("⚠️ Too Many Requests — cambiando API key...");
                        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
                        apiKey = API_KEYS[currentKeyIndex];
                        retries++;
                        const wait = 10000 * retries;
                        console.log(`⏳ Esperando ${wait / 1000}s antes de reintentar...`);
                        await new Promise((r) => setTimeout(r, wait));
                        continue;
                    }

                    const url = data.photos?.[0]?.src?.large ?? data.photos?.[0]?.src?.original;
                    if (url) {
                        CACHE.set(cityName, url);
                        setImageUrl(url);
                        success = true;
                        console.log("✅ Imagen cargada correctamente");
                    } else {
                        console.warn("❌ No se encontró imagen para esta ciudad");
                        success = true;
                    }
                } catch (err) {
                    console.error("Error fetching image:", err);
                    retries++;
                    await new Promise((r) => setTimeout(r, 2000 * retries));
                }
            }

            if (!success) console.error("🚫 No se pudo obtener la imagen tras varios intentos.");
        }

        fetchImage();
    }, [cityName, apiKey, isVisible]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm"
        >
            {imageUrl ? (
                <img src={imageUrl} alt={cityName} className="w-full h-full object-cover" loading="lazy" />
            ) : (
                "Loading image..."
            )}
        </div>
    );
}
