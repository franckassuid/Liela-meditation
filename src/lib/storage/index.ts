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

export type DayOfWeek = "lun" | "mar" | "mer" | "jeu" | "ven" | "sam" | "dim";

export const ALL_DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "lun", label: "Lundi", short: "Lun." },
  { key: "mar", label: "Mardi", short: "Mar." },
  { key: "mer", label: "Mercredi", short: "Mer." },
  { key: "jeu", label: "Jeudi", short: "Jeu." },
  { key: "ven", label: "Vendredi", short: "Ven." },
  { key: "sam", label: "Samedi", short: "Sam." },
  { key: "dim", label: "Dimanche", short: "Dim." },
];

export function formatReminderDays(days: DayOfWeek[]): string {
  if (!days || days.length === 0) return "Aucun jour";
  if (days.length === 7) return "Tous les jours";

  const isWeekdays =
    days.length === 5 &&
    ["lun", "mar", "mer", "jeu", "ven"].every((d) => days.includes(d as DayOfWeek));
  if (isWeekdays) return "En semaine";

  const isWeekend =
    days.length === 2 &&
    ["sam", "dim"].every((d) => days.includes(d as DayOfWeek));
  if (isWeekend) return "Le week-end";

  const order: Record<DayOfWeek, number> = { lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 7 };
  const sorted = [...days].sort((a, b) => order[a] - order[b]);
  return sorted.map((d) => ALL_DAYS.find((item) => item.key === d)?.short || d).join(", ");
}

export interface AppSettings {
  // Lecture
  resumePlayback: boolean;
  fadeInDuration: number; // in seconds: 0, 2, 3, 5
  backgroundVolume: "Désactivé" | "Faible" | "Moyen" | "Fort";
  defaultSleepTimer: "15 min" | "30 min" | "45 min" | "1 heure" | "Jamais";

  // Rappel
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  dailyReminderDays: string;
  dailyReminderCustomDays: DayOfWeek[];

  // Compte
  accountUser?: { email?: string; method?: string } | null;
}

export interface DownloadedSession {
  sessionId: string;
  title: string;
  duration: number; // in seconds
  sizeMo: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  resumePlayback: true,
  fadeInDuration: 3,
  backgroundVolume: "Moyen",
  defaultSleepTimer: "30 min",
  dailyReminderEnabled: false,
  dailyReminderTime: "21:00",
  dailyReminderDays: "Tous les jours",
  dailyReminderCustomDays: ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
  accountUser: null,
};

export const DEFAULT_DOWNLOADS: DownloadedSession[] = [
  { sessionId: "calmer-le-stress-1", title: "Sortir de la boucle", duration: 600, sizeMo: 24 },
  { sessionId: "trouver-le-sommeil-1", title: "Histoire calme", duration: 1500, sizeMo: 55 },
  { sessionId: "calmer-les-pensees-1", title: "Descendre d’un cran", duration: 540, sizeMo: 21 },
  { sessionId: "se-recentrer-1", title: "Respirer 3 minutes", duration: 180, sizeMo: 8 },
  { sessionId: "relacher-les-tensions-1", title: "Se poser", duration: 900, sizeMo: 30 },
  { sessionId: "retrouver-sa-concentration-1", title: "Retour au corps", duration: 300, sizeMo: 10 },
];

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: "liela_onboarding",
  USER_PROFILE: "liela_profile",
  AUDIO_PREFERENCES: "liela_audio_prefs",
  HISTORY: "liela_history",
  IN_PROGRESS: "liela_in_progress",
  FAVORITES: "liela_favorites",
  FAVORITES_REFUSALS: "liela_favorites_refusals",
  RECOMMENDATION_HISTORY: "liela_recommendation_history",
  APP_SETTINGS: "liela_settings",
  DOWNLOADS: "liela_downloads",
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

  getSettings: async (): Promise<AppSettings> => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    const data = await get<AppSettings>(STORAGE_KEYS.APP_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(data || {}) };
  },
  setSettings: async (partial: Partial<AppSettings>): Promise<void> => {
    if (typeof window === "undefined") return;
    const current = await storage.getSettings();
    const updated = { ...current, ...partial };
    await set(STORAGE_KEYS.APP_SETTINGS, updated);

    // Synchronize backgroundVolume with audioPreferences if changed
    if (partial.backgroundVolume !== undefined) {
      if (partial.backgroundVolume === "Désactivé") {
        await storage.setAudioPreferences({ musicEnabled: false, ambienceEnabled: false });
      } else if (partial.backgroundVolume === "Faible") {
        await storage.setAudioPreferences({ musicEnabled: true, ambienceEnabled: true, musicVolume: 0.35, ambienceVolume: 0.25 });
      } else if (partial.backgroundVolume === "Moyen") {
        await storage.setAudioPreferences({ musicEnabled: true, ambienceEnabled: true, musicVolume: 0.75, ambienceVolume: 0.50 });
      } else if (partial.backgroundVolume === "Fort") {
        await storage.setAudioPreferences({ musicEnabled: true, ambienceEnabled: true, musicVolume: 1.0, ambienceVolume: 0.85 });
      }
    }
  },

  getDownloads: async (): Promise<DownloadedSession[]> => {
    if (typeof window === "undefined") return DEFAULT_DOWNLOADS;
    const data = await get<DownloadedSession[]>(STORAGE_KEYS.DOWNLOADS);
    if (data === undefined) {
      await set(STORAGE_KEYS.DOWNLOADS, DEFAULT_DOWNLOADS);
      return DEFAULT_DOWNLOADS;
    }
    return data || [];
  },
  clearDownloads: async (): Promise<void> => {
    if (typeof window === "undefined") return;
    await set(STORAGE_KEYS.DOWNLOADS, []);
  },

  exportAllData: async (): Promise<string> => {
    const profile = await storage.getProfile();
    const history = await storage.getHistory();
    const favorites = await storage.getFavorites();
    const settings = await storage.getSettings();
    const audioPrefs = await storage.getAudioPreferences();
    const exportObject = {
      app: "Liela",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      profile,
      settings,
      audioPreferences: audioPrefs,
      favorites,
      history,
    };
    return JSON.stringify(exportObject, null, 2);
  },

  clearAllData: async (): Promise<void> => {
    if (typeof window === "undefined") return;
    await del(STORAGE_KEYS.HISTORY);
    await del(STORAGE_KEYS.IN_PROGRESS);
    await del(STORAGE_KEYS.FAVORITES);
    await del(STORAGE_KEYS.FAVORITES_REFUSALS);
    await del(STORAGE_KEYS.USER_PROFILE);
    await del(STORAGE_KEYS.AUDIO_PREFERENCES);
    await del(STORAGE_KEYS.RECOMMENDATION_HISTORY);
    await del(STORAGE_KEYS.APP_SETTINGS);
    // Note: Downloads are intentionally kept intact per spec!
  },
};

