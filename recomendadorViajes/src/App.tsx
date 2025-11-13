import { useState, useEffect } from 'react';
import { City, UserPreferences } from './lib/supabase';
import { getTopRecommendations } from './lib/recommendations';
import { RecommendationForm } from './components/RecommendationForm';
import { RecommendationCarousel } from './components/RecommendationCarousel';
import { DestinationsCatalog } from './components/DestinationsCatalog';
import { Plane, Compass } from 'lucide-react';
import Papa from 'papaparse';

type View = 'destinations' | 'recommend';

function App() {
  const [view, setView] = useState<View>('destinations');
  const [cities, setCities] = useState<City[]>([]);
  const [recommendations, setRecommendations] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecommending, setIsRecommending] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/Worldwide Travel Cities Dataset (Ratings and Climate).csv');
      const csvText = await response.text();

      const parsed = Papa.parse(csvText, { header: true });
      let data = parsed.data as any[];
      console.log(data)
      // Convertir campos necesarios
      data = data.map((row) => ({
        id: row.id,
        city: row.city,
        country: row.country,
        region: row.region,
        short_description: row.short_description,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        avg_temp_monthly: JSON.parse(row.avg_temp_monthly),
        ideal_durations: JSON.parse(row.ideal_durations),
        budget_level: row.budget_level,
        culture: Number(row.culture),
        adventure: Number(row.adventure),
        nature: Number(row.nature),
        beaches: Number(row.beaches),
        nightlife: Number(row.nightlife),
        cuisine: Number(row.cuisine),
        wellness: Number(row.wellness),
        urban: Number(row.urban),
        seclusion: Number(row.seclusion),
      }));

      setCities(data);
    } catch (error) {
      console.error('Error loading cities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetRecommendations = async (data: any) => {
    setIsRecommending(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch('http://127.0.0.1:8000/recommend/new_user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log('Backend response:', result);
    setRecommendations(result.recommendations);
    setShowCarousel(true);
    setIsRecommending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                <Plane className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">TravelMatch</h1>
                <p className="text-sm text-gray-600">Discover your perfect destination</p>
              </div>
            </div>

            <nav className="flex gap-2">
              <button
                onClick={() => setView('destinations')}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${view === 'destinations'
                  ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <Compass className="w-5 h-5" />
                Explore Destinations
              </button>
              <button
                onClick={() => setView('recommend')}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${view === 'recommend'
                  ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <Plane className="w-5 h-5" />
                Get Recommendations
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading destinations...</p>
            </div>
          </div>
        ) : cities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Plane className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Destinations Yet</h2>
            <p className="text-gray-600 mb-6">
              Start by adding some destinations to the database to see recommendations.
            </p>
          </div>
        ) : (
          <>
            {view === 'destinations' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-4xl font-bold text-gray-800 mb-2">Explore Destinations</h2>
                  <p className="text-gray-600 text-lg">
                    Browse through our collection of {cities.length} amazing destinations
                  </p>
                </div>
                <DestinationsCatalog cities={cities} />
              </div>
            )}

            {view === 'recommend' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-4xl font-bold text-gray-800 mb-2">Get Personalized Recommendations</h2>
                  <p className="text-gray-600 text-lg">
                    Tell us what you're looking for and we'll find the perfect destinations for you
                  </p>
                </div>
                <RecommendationForm
                  onSubmit={handleGetRecommendations}
                  isLoading={isRecommending}
                />
              </div>
            )}
          </>
        )}
      </main>

      {showCarousel && recommendations.length > 0 && (
        <RecommendationCarousel
          cities={recommendations}
          onClose={() => setShowCarousel(false)}
        />
      )}
    </div>
  );
}

export default App;
