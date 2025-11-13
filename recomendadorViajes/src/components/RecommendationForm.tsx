import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface RecommendationFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function RecommendationForm({ onSubmit, isLoading }: RecommendationFormProps) {
  const [age, setAge] = useState(30);
  const [budget, setBudget] = useState(3);
  const [temperature, setTemperature] = useState(20);
  const [topN, setTopN] = useState(5);

  const [preferences, setPreferences] = useState({
    culture: 0.5,
    adventure: 0.5,
    nature: 0.5,
    beaches: 0.5,
    nightlife: 0.5,
    cuisine: 0.5,
    wellness: 0.5,
    urban: 0.5,
    seclusion: 0.5,
  });

  const handlePreferenceChange = (key: keyof typeof preferences, value: number) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Formato exacto que espera el backend (/recommend/new_user)
    const backendData = {
      top_n: topN,
      show_scores: true, // Puedes hacerlo configurable si quieres
      // Características demográficas
      age: age,
      preferred_budget: budget,
      preferred_avg_temp: temperature,
      // Características de preferencias (0.0 a 1.0)
      culture: preferences.culture,
      adventure: preferences.adventure,
      nature: preferences.nature,
      beaches: preferences.beaches,
      nightlife: preferences.nightlife,
      cuisine: preferences.cuisine,
      wellness: preferences.wellness,
      urban: preferences.urban,
      seclusion: preferences.seclusion,
    };

    console.log('📤 Sending to backend:', backendData);
    onSubmit(backendData);
  };

  const budgetLabels = ['Luxury', 'Mid-range', 'Budget'];

  const preferenceFields = [
    { key: 'culture' as const, label: 'Culture & History', icon: '🏛️' },
    { key: 'adventure' as const, label: 'Adventure Activities', icon: '🏔️' },
    { key: 'nature' as const, label: 'Nature & Wildlife', icon: '🌲' },
    { key: 'beaches' as const, label: 'Beaches & Coast', icon: '🏖️' },
    { key: 'nightlife' as const, label: 'Nightlife & Entertainment', icon: '🎭' },
    { key: 'cuisine' as const, label: 'Food & Cuisine', icon: '🍽️' },
    { key: 'wellness' as const, label: 'Wellness & Relaxation', icon: '🧘' },
    { key: 'urban' as const, label: 'Urban Experience', icon: '🏙️' },
    { key: 'seclusion' as const, label: 'Privacy & Seclusion', icon: '🏝️' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-8 h-8 text-blue-500" />
        <h2 className="text-3xl font-bold text-gray-800">Find Your Perfect Destination</h2>
      </div>

      <div className="space-y-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Recommendations: <span className="text-blue-600 font-semibold">{topN}</span>
          </label>
          <input
            type="range"
            min="3"
            max="10"
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Age: <span className="text-blue-600 font-semibold">{age}</span>
          </label>
          <input
            type="range"
            min="18"
            max="80"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Budget Level: <span className="text-blue-600 font-semibold">{budgetLabels[budget - 1]}</span>
          </label>
          <input
            type="range"
            min="1"
            max="3"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            {budgetLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Temperature: <span className="text-blue-600 font-semibold">{temperature}°C</span>
          </label>
          <input
            type="range"
            min="0"
            max="40"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Travel Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {preferenceFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="mr-2">{field.icon}</span>
                {field.label}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={preferences[field.key]}
                onChange={(e) => handlePreferenceChange(field.key, Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Not Important</span>
                <span className="font-medium text-blue-600">{preferences[field.key].toFixed(1)}</span>
                <span>Very Important</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-500 to-teal-500 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Finding Destinations...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Get Recommendations
          </>
        )}
      </button>
    </div>
  );
}