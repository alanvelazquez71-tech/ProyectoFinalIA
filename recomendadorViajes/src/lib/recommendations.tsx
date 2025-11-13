import { City, UserPreferences } from './supabase';

export function calculateCityScore(city: City, preferences: UserPreferences): number {
  const featureWeights = {
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

  const budgetDiff = Math.abs((city.budget_level_num_norm || 0) - preferences.preferred_budget / 5);
  const budgetScore = 1 - budgetDiff;

  const tempDiff = city.temp_avg_norm
    ? Math.abs(city.temp_avg_norm - preferences.preferred_avg_temp / 100)
    : 0.5;
  const tempScore = 1 - tempDiff;

  let featureScore = 0;
  let totalWeight = 0;

  Object.entries(featureWeights).forEach(([feature, weight]) => {
    const cityFeatureValue = city[`${feature}_norm` as keyof City] as number || 0;
    featureScore += cityFeatureValue * weight;
    totalWeight += weight;
  });

  if (totalWeight > 0) {
    featureScore = featureScore / totalWeight;
  }

  const finalScore = (featureScore * 0.6) + (budgetScore * 0.2) + (tempScore * 0.2);

  return finalScore;
}

export function getTopRecommendations(
  cities: City[],
  preferences: UserPreferences,
  topN: number = 10
): City[] {
  const scoredCities = cities.map(city => ({
    city,
    score: calculateCityScore(city, preferences)
  }));

  scoredCities.sort((a, b) => b.score - a.score);

  return scoredCities.slice(0, topN).map(item => item.city);
}
