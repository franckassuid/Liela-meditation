import { get, set, del, keys } from 'idb-keyval';

export interface AudioPreferences {
  voiceVolume: number;
  musicVolume: number;
  ambienceVolume: number;
  musicEnabled: boolean;
  ambienceEnabled: boolean;
}

export interface SessionHistoryItem {
  sessionId: string;
  startedAt: string;
  completedAt?: string;
  lastPosition: number;
  duration: number;
  completed: boolean; // >= 80%
  abandoned?: boolean; // < 90s
}

export interface Favori {
  sessionId: string;
  addedAt: string;
  source?: string;
}

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: "liela_onboarding",
  USER_PROFILE: "liela_profile",
  AUDIO_PREFERENCES: "liela_audio_prefs",
  HISTORY: "liela_history",
  IN_PROGRESS: "liela_in_progress",
  FAVORITES: "liela_favorites",
  FAVORITES_REFUSALS: "liela_favorites_refusals",
  RECOMMENDATION_HISTORY: "liela_recommendation_history",
};

// Demande la persistance permanente du stockage (évite la purge Safari des 7 jours)
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (isPersisted) return true;
      const granted = await navigator.storage.persist();
      return granted;
    } catch (e) {
      console.error("Erreur lors de la demande de persistance", e);
      return false;
    }
  }
  return false;
}

export const storage = {
  getOnboardingCompleted: async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const val = await get(STORAGE_KEYS.ONBOARDING_COMPLETED);
    return val === true;
  },
  setOnboardingCompleted: async (completed: boolean): Promise<void> => {
    if (typeof window === "undefined") return;
    await set(STORAGE_KEYS.ONBOARDING_COMPLETED, completed);
  },

  getProfile: async (): Promise<{ firstName: string }> => {
    if (typeof window === "undefined") return { firstName: "" };
    const data = await get(STORAGE_KEYS.USER_PROFILE);
    return data ? (data as { firstName: string }) : { firstName: "" };
  },
  setProfile: async (profile: { firstName: string }): Promise<void> => {
    if (typeof window === "undefined") return;
    await set(STORAGE_KEYS.USER_PROFILE, profile);
  },

  getAudioPreferences: async (): Promise<AudioPreferences> => {
    const defaults: AudioPreferences = {
      voiceVolume: 1,
      musicVolume: 0.75,
      ambienceVolume: 0.50,
      musicEnabled: true,
      ambienceEnabled: true,
    };
    if (typeof window === "undefined") return defaults;
    
    const parsed = await get<AudioPreferences>(STORAGE_KEYS.AUDIO_PREFERENCES);
    if (!parsed) return defaults;
    
    return {
      ...defaults,
      ...parsed,
      musicVolume: typeof parsed.musicVolume === "number" ? parsed.musicVolume : 0.75,
      ambienceVolume: typeof parsed.ambienceVolume === "number" ? parsed.ambienceVolume : 0.50,
    };
  },
  setAudioPreferences: async (prefs: Partial<AudioPreferences>): Promise<void> => {
    if (typeof window === "undefined") return;
    const current = await storage.getAudioPreferences();
    await set(STORAGE_KEYS.AUDIO_PREFERENCES, { ...current, ...prefs });
  },

  getHistory: async (): Promise<SessionHistoryItem[]> => {
    if (typeof window === "undefined") return [];
    const data = await get<SessionHistoryItem[]>(STORAGE_KEYS.HISTORY);
    return data || [];
  },
  addHistoryItem: async (item: SessionHistoryItem): Promise<void> => {
    if (typeof window === "undefined") return;
    const history = await storage.getHistory();
    const index = history.findIndex(i => i.sessionId === item.sessionId && i.startedAt === item.startedAt);
    if (index >= 0) {
      history[index] = item;
    } else {
      history.unshift(item);
    }
    await set(STORAGE_KEYS.HISTORY, history.slice(0, 50));
  },

  getInProgressSession: async (): Promise<SessionHistoryItem | null> => {
    if (typeof window === "undefined") return null;
    const data = await get<SessionHistoryItem>(STORAGE_KEYS.IN_PROGRESS);
    return data || null;
  },
  setInProgressSession: async (item: SessionHistoryItem | null): Promise<void> => {
    if (typeof window === "undefined") return;
    if (item) {
      await set(STORAGE_KEYS.IN_PROGRESS, item);
    } else {
      await del(STORAGE_KEYS.IN_PROGRESS);
    }
  },

  getFavorites: async (): Promise<Favori[]> => {
    if (typeof window === "undefined") return [];
    const data = await get<Favori[]>(STORAGE_KEYS.FAVORITES);
    return data || [];
  },
  hasFavorite: async (sessionId: string): Promise<boolean> => {
    const favs = await storage.getFavorites();
    return favs.some(f => f.sessionId === sessionId);
  },
  addFavorite: async (sessionId: string, source?: string): Promise<void> => {
    if (typeof window === "undefined") return;
    const favs = await storage.getFavorites();
    if (!favs.some(f => f.sessionId === sessionId)) {
      favs.unshift({ sessionId, addedAt: new Date().toISOString(), source });
      await set(STORAGE_KEYS.FAVORITES, favs);
    }
  },
  removeFavorite: async (sessionId: string): Promise<void> => {
    if (typeof window === "undefined") return;
    const favs = await storage.getFavorites();
    const newFavs = favs.filter(f => f.sessionId !== sessionId);
    await set(STORAGE_KEYS.FAVORITES, newFavs);
  },

  getFavoritesRefusals: async (): Promise<string[]> => {
    if (typeof window === "undefined") return [];
    const data = await get<string[]>(STORAGE_KEYS.FAVORITES_REFUSALS);
    return data || [];
  },
  hasRefusedFavorite: async (sessionId: string): Promise<boolean> => {
    const refusals = await storage.getFavoritesRefusals();
    return refusals.includes(sessionId);
  },
  addFavoriteRefusal: async (sessionId: string): Promise<void> => {
    if (typeof window === "undefined") return;
    const refusals = await storage.getFavoritesRefusals();
    if (!refusals.includes(sessionId)) {
      refusals.push(sessionId);
      await set(STORAGE_KEYS.FAVORITES_REFUSALS, refusals);
    }
  },

  getDailyFavoritePrompts: async (): Promise<number> => {
    if (typeof window === "undefined") return 0;
    const data = await get<{ date: string; count: number }>("liela_daily_fav_prompts");
    if (!data) return 0;
    const today = new Date().toISOString().split("T")[0];
    if (data.date === today) {
      return data.count;
    }
    return 0;
  },
  incrementDailyFavoritePrompts: async (): Promise<void> => {
    if (typeof window === "undefined") return;
    const count = await storage.getDailyFavoritePrompts();
    const today = new Date().toISOString().split("T")[0];
    await set("liela_daily_fav_prompts", { date: today, count: count + 1 });
  },

  getRecommendationHistory: async (): Promise<{ sessionId: string; recommendedAt: string }[]> => {
    if (typeof window === "undefined") return [];
    const data = await get<{ sessionId: string; recommendedAt: string }[]>(STORAGE_KEYS.RECOMMENDATION_HISTORY);
    return data || [];
  },
  addRecommendationHistory: async (sessionId: string): Promise<void> => {
    if (typeof window === "undefined") return;
    const history = await storage.getRecommendationHistory();
    history.unshift({ sessionId, recommendedAt: new Date().toISOString() });
    await set(STORAGE_KEYS.RECOMMENDATION_HISTORY, history.slice(0, 50)); // Keep last 50 recs
  },
};

