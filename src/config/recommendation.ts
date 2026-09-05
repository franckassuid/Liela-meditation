export const ENABLE_RECOMMENDATION = true; // Lot 4 Feature Flag

export const REC_WEIGHTS = {
  timeAffinity: 0.40,
  situationAffinity: 0.25,
  favoriteBonus: 0.20,
  durationAffinity: 0.15,
};

export const TIME_WINDOWS = {
  morning: { start: 5, end: 10, situations: ["se-recentrer", "retrouver-sa-concentration"] },
  midday: { start: 10, end: 14, situations: ["retrouver-sa-concentration", "calmer-le-stress"] },
  afternoon: { start: 14, end: 18, situations: ["calmer-le-stress", "relacher-les-tensions"] },
  evening: { start: 18, end: 21.5, situations: ["relacher-les-tensions", "se-recentrer"] },
  night: { start: 21.5, end: 5, situations: ["trouver-le-sommeil", "calmer-les-pensees"] },
};

export const PENALTIES = {
  playedRecentlyNotFav: -1.00, // < 48h et non favorite
  playedRecentlyFav: -0.50, // < 48h et favorite
  recommendedRecentlyNotPlayed: -0.80, // recommandée < 72h et non lancée
  abandonedMultiple: -1.00, // abandonnée ≥ 2 fois
  favoriteRecommendedRecently: -0.60, // favorite recommandée < 3 jours
};

export const HARD_RULES = {
  noSleepBetween7And18: true,
  noFocusBetween22And5: true,
  maxNightDuration2130: 15 * 60,
  maxNightDuration2330: 10 * 60,
};
