import { SESSIONS_CATALOG, CatalogSession } from "@/config/sessionsCatalog";
import { storage, SessionHistoryItem } from "@/lib/storage";
import { TIME_WINDOWS, REC_WEIGHTS, PENALTIES, HARD_RULES } from "@/config/recommendation";
import { getSituation } from "@/config/situations";

export interface RecommendationResult {
  session: CatalogSession;
  reason: string;
}

function getTimeWindow(hourDecimal: number) {
  for (const [key, window] of Object.entries(TIME_WINDOWS)) {
    if (window.start < window.end) {
      if (hourDecimal >= window.start && hourDecimal < window.end) return key;
    } else {
      // Overnight window (e.g., 21.5 to 5)
      if (hourDecimal >= window.start || hourDecimal < window.end) return key;
    }
  }
  return "midday";
}

function getSituationsForTime(hourDecimal: number): string[] {
  const windowKey = getTimeWindow(hourDecimal);
  return TIME_WINDOWS[windowKey as keyof typeof TIME_WINDOWS].situations;
}

function getNeighboringSituations(hourDecimal: number): string[] {
  const currentWindowKey = getTimeWindow(hourDecimal);
  const keys = Object.keys(TIME_WINDOWS);
  const currentIndex = keys.indexOf(currentWindowKey);
  const prevIndex = currentIndex === 0 ? keys.length - 1 : currentIndex - 1;
  const nextIndex = currentIndex === keys.length - 1 ? 0 : currentIndex + 1;
  
  const prevSits = TIME_WINDOWS[keys[prevIndex] as keyof typeof TIME_WINDOWS].situations;
  const nextSits = TIME_WINDOWS[keys[nextIndex] as keyof typeof TIME_WINDOWS].situations;
  return Array.from(new Set([...prevSits, ...nextSits]));
}

let cachedRecommendation: RecommendationResult | null = null;
let lastCalculationTime = 0;
const CACHE_DURATION_MS = 30 * 60 * 1000;

export function isSameSession(session: CatalogSession, targetId?: string | null): boolean {
  if (!targetId) return false;
  if (session.id === targetId) return true;
  if (session.realSessionId && session.realSessionId === targetId) return true;

  const targetCatalog = SESSIONS_CATALOG.find((s) => s.id === targetId || s.realSessionId === targetId);
  if (targetCatalog) {
    if (targetCatalog.id === session.id) return true;
    if (targetCatalog.realSessionId && session.realSessionId && targetCatalog.realSessionId === session.realSessionId) {
      return true;
    }
  }

  return false;
}

export async function getRepriseSession(): Promise<SessionHistoryItem | null> {
  const inProgress = await storage.getInProgressSession();
  if (!inProgress || inProgress.completed) return null;
  
  // Check if it's less than 24h old
  const startedAt = new Date(inProgress.startedAt).getTime();
  if (Date.now() - startedAt > 24 * 60 * 60 * 1000) return null;

  return inProgress;
}

export interface RecommendationOptions {
  isOffline?: boolean;
  excludeSessionId?: string;
  forceRecalculate?: boolean;
}

export async function getRecommendedSession(
  currentDate: Date = new Date(),
  optionsOrForce: boolean | RecommendationOptions = false
): Promise<RecommendationResult | null> {
  const options: RecommendationOptions =
    typeof optionsOrForce === "boolean" ? { forceRecalculate: optionsOrForce } : optionsOrForce;
  const now = Date.now();

  // Always check inProgress session so a session in progress is never recommended
  const inProgress = await getRepriseSession();
  const excludeId = options.excludeSessionId || inProgress?.sessionId;

  // Invalidate cache if it matches the excluded session
  if (cachedRecommendation && excludeId && isSameSession(cachedRecommendation.session, excludeId)) {
    cachedRecommendation = null;
  }

  if (
    !options.forceRecalculate &&
    cachedRecommendation &&
    now - lastCalculationTime < CACHE_DURATION_MS &&
    (!excludeId || !isSameSession(cachedRecommendation.session, excludeId))
  ) {
    return cachedRecommendation;
  }

  const history = await storage.getHistory();
  const completedHistory = history.filter((h) => h.completed);
  const hour = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const timeDecimal = hour + minutes / 60;
  const timeStr = `${hour} h ${minutes < 10 ? "0" + minutes : minutes}`;
  const isLateNight = timeDecimal >= 21.5 || timeDecimal < 5;
  const timeReason = isLateNight
    ? `Il est ${timeStr}, restons sur dix minutes.`
    : `Il est ${timeStr}, une courte séance suffira.`;

  const currentSituations = getSituationsForTime(timeDecimal);
  const neighboringSituations = getNeighboringSituations(timeDecimal);

  // Cold Start : < 3 completed sessions
  if (completedHistory.length < 3) {
    const initiations = SESSIONS_CATALOG.filter(
      (s) =>
        s.isAvailable &&
        s.estPorteEntree &&
        currentSituations.includes(s.situationId) &&
        (!excludeId || !isSameSession(s, excludeId))
    );
    let target =
      initiations.length > 0
        ? initiations
        : SESSIONS_CATALOG.filter(
            (s) =>
              s.isAvailable &&
              s.estPorteEntree &&
              (!excludeId || !isSameSession(s, excludeId))
          );

    if (target.length === 0) {
      target = SESSIONS_CATALOG.filter(
        (s) => s.isAvailable && (!excludeId || !isSameSession(s, excludeId))
      );
    }

    if (target.length > 0) {
      // Hash based on day to keep it stable for the day
      const daySeed = Math.floor(now / (24 * 60 * 60 * 1000));
      const sessionIndex = daySeed % target.length;
      const recSession = target[sessionIndex];
      const rec = {
        session: recSession,
        reason: options.isOffline ? "Téléchargée, elle se lit sans connexion." : timeReason,
      };

      cachedRecommendation = rec;
      lastCalculationTime = now;
      await storage.addRecommendationHistory(rec.session.id);
      return rec;
    }
  }

  // Normal Recommendation Engine (Warm Start)
  const favorites = await storage.getFavorites();
  const recHistory = await storage.getRecommendationHistory();
  
  // Stats for "affiniteSituation"
  const last10 = completedHistory.slice(0, 10);
  const situationCounts: Record<string, number> = {};
  last10.forEach(h => {
    const s = SESSIONS_CATALOG.find(cat => cat.id === h.sessionId);
    if (s) {
      situationCounts[s.situationId] = (situationCounts[s.situationId] || 0) + 1;
    }
  });

  // Stats for "adequationDuree"
  const last5 = completedHistory.slice(0, 5);
  let medianDuration = 8 * 60; // 8 minutes default
  if (last5.length > 0) {
    const durations = last5.map(h => h.duration).sort((a, b) => a - b);
    medianDuration = durations[Math.floor(durations.length / 2)];
  }

  let candidates = SESSIONS_CATALOG.map(session => {
    if (!session.isAvailable) return null;
    if (excludeId && isSameSession(session, excludeId)) {
      return null;
    }

    // Hard Rules
    if (HARD_RULES.noSleepBetween7And18 && session.situationId === "trouver-le-sommeil") {
      if (timeDecimal >= 7 && timeDecimal < 18) return null;
    }
    if (HARD_RULES.noFocusBetween22And5 && session.situationId === "retrouver-sa-concentration") {
      if (timeDecimal >= 22 || timeDecimal < 5) return null;
    }
    if (HARD_RULES.maxNightDuration2130 > 0 && timeDecimal >= 21.5 && timeDecimal < 23.5) {
      if (session.durationSeconds > HARD_RULES.maxNightDuration2130) return null;
    }
    if (HARD_RULES.maxNightDuration2330 > 0 && (timeDecimal >= 23.5 || timeDecimal < 5)) {
      if (session.durationSeconds > HARD_RULES.maxNightDuration2330) return null;
    }

    // Scores
    let score = 0;
    
    // Affinité Horaire
    let hScore = 0;
    if (currentSituations.includes(session.situationId)) {
      hScore = 1;
    } else if (neighboringSituations.includes(session.situationId)) {
      hScore = 0.5;
    }
    score += REC_WEIGHTS.timeAffinity * hScore;

    // Affinité Situation
    const sitShare = last10.length > 0 ? (situationCounts[session.situationId] || 0) / last10.length : 0;
    score += REC_WEIGHTS.situationAffinity * sitShare;

    // Bonus Favori
    const isFav = favorites.some(f => f.sessionId === session.id);
    const favBonus = isFav ? 1 : 0;
    score += REC_WEIGHTS.favoriteBonus * favBonus;

    // Adéquation Durée
    const durRatio = session.durationSeconds / medianDuration;
    const durScore = (durRatio >= 0.7 && durRatio <= 1.3) ? 1 : 0; // +/- 30%
    score += REC_WEIGHTS.durationAffinity * durScore;

    // Pénalités
    const lastPlayed = history.find(h => h.sessionId === session.id);
    const timeSincePlayed = lastPlayed ? (now - new Date(lastPlayed.startedAt).getTime()) : Infinity;
    const playedIn48h = timeSincePlayed < 48 * 60 * 60 * 1000;
    
    let appliedPenalties = 0;

    if (playedIn48h && !isFav) appliedPenalties += PENALTIES.playedRecentlyNotFav;
    if (playedIn48h && isFav) appliedPenalties += PENALTIES.playedRecentlyFav;

    const abandons = history.filter(h => h.sessionId === session.id && h.abandoned).length;
    if (abandons >= 2) appliedPenalties += PENALTIES.abandonedMultiple;

    const lastRec = recHistory.find(r => r.sessionId === session.id);
    if (lastRec) {
      const timeSinceRec = now - new Date(lastRec.recommendedAt).getTime();
      const recIn72h = timeSinceRec < 72 * 60 * 60 * 1000;
      // If it was played SINCE it was recommended, it's not "non lancée"
      const playedSinceRec = lastPlayed && new Date(lastPlayed.startedAt).getTime() > new Date(lastRec.recommendedAt).getTime();
      
      if (recIn72h && !playedSinceRec && !isFav) appliedPenalties += PENALTIES.recommendedRecentlyNotPlayed;
      if (isFav && timeSinceRec < 3 * 24 * 60 * 60 * 1000) appliedPenalties += PENALTIES.favoriteRecommendedRecently;
    }

    score += appliedPenalties;

    // Determine principal reason
    let ruleName = "heure";
    let maxWeight = REC_WEIGHTS.timeAffinity * hScore;

    if (REC_WEIGHTS.situationAffinity * sitShare > maxWeight) {
      maxWeight = REC_WEIGHTS.situationAffinity * sitShare;
      ruleName = "situation";
    }
    if (REC_WEIGHTS.favoriteBonus * favBonus > maxWeight) {
      maxWeight = REC_WEIGHTS.favoriteBonus * favBonus;
      ruleName = "favori";
    }

    return { session, score, ruleName, appliedPenalties };
  }).filter(c => c !== null);

  // Fallback if empty (all filtered by hard rules)
  if (candidates.length === 0) {
    const fallback =
      SESSIONS_CATALOG.find(
        (s) =>
          s.isAvailable &&
          s.estPorteEntree &&
          currentSituations.includes(s.situationId) &&
          (!excludeId || !isSameSession(s, excludeId))
      ) ||
      SESSIONS_CATALOG.find(
        (s) => s.isAvailable && (!excludeId || !isSameSession(s, excludeId))
      );

    if (fallback) {
      const rec = {
        session: fallback,
        reason: options.isOffline ? "Téléchargée, elle se lit sans connexion." : timeReason,
      };
      cachedRecommendation = rec;
      lastCalculationTime = now;
      await storage.addRecommendationHistory(fallback.id);
      return cachedRecommendation;
    }
  }

  // Sort by score
  candidates.sort((a, b) => b!.score - a!.score);

  // If the best score is very negative, it means everything is penalized. We just take the top one that is not excluded.
  const bestCandidate = candidates.find((c) => !excludeId || !isSameSession(c!.session, excludeId));

  if (bestCandidate) {
    let reason = timeReason;

    if (options.isOffline) {
      reason = "Téléchargée, elle se lit sans connexion.";
    } else if (bestCandidate.ruleName === "favori") {
      const favInSituation = favorites.find((f) => {
        const s = SESSIONS_CATALOG.find((cat) => cat.id === f.sessionId);
        return s && s.situationId === bestCandidate.session.situationId;
      });
      const favSession = favInSituation
        ? SESSIONS_CATALOG.find((cat) => cat.id === favInSituation.sessionId)
        : null;
      const refTitle = favSession?.title || bestCandidate.session.title;
      reason = `Parce que vous avez aimé « ${refTitle} ».`;
    } else if (bestCandidate.ruleName === "situation") {
      const sit = getSituation(bestCandidate.session.situationId);
      reason = `Vous revenez souvent à ${sit?.shortLabel || "cette situation"}.`;
    }

    cachedRecommendation = { session: bestCandidate.session, reason };
    lastCalculationTime = now;
    await storage.addRecommendationHistory(bestCandidate.session.id);
    return cachedRecommendation;
  }

  return null;
}
