import { safeGet as localGet, safeSet as localSet, safeUpdate as localUpdate, safeDel as localDel, getStorageUser } from "./local";
import type { UserProfile, SessionFeedback, PersonalizationEvent } from "@/lib/firebase/schema";
import { removeSessionFiles, verifySessionInCache, SESSIONS_CACHE_NAME } from '@/lib/download/SessionDownloader';

export interface AudioPreferences {
  voice?: string;
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
  listenedSeconds?: number;
  lastListenedAt?: string;
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
  /** Legacy field retained for Firestore compatibility; playback always resumes. */
  resumePlayback: boolean;
  downloadFavorites: boolean;
  downloadWifiOnly: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  dailyReminderDays: string;
  dailyReminderCustomDays: DayOfWeek[];
  accountUser?: { email?: string; method?: string } | null;
  fadeInDuration?: number;
  backgroundVolume?: "Désactivé" | "Faible" | "Moyen" | "Fort";
  defaultSleepTimer?: "15 min" | "30 min" | "45 min" | "1 heure" | "Jamais";
}

/**
 * Metadata for a fully downloaded session.
 * sizeBytes: actual bytes in Cache Storage (not estimated).
 * cachedUrls: exact URLs stored in liela-sessions-v1 (needed for deletion).
 * status: "available" | "error" (only set to available after verification).
 */
export interface DownloadRecord {
  sessionId: string;
  title: string;
  duration: number;        // seconds
  sizeBytes: number;       // real bytes from Cache Storage
  status: "available" | "error";
  downloadedAt: string;    // ISO
  manifestVersion: number;
  cachedUrls: string[];    // exact URLs stored in liela-sessions-v1
  /** @deprecated use sizeBytes — kept for backward compat display */
  sizeMo?: number;
  isFavorite?: boolean;    // kept for backward compat with old records
}

/** @deprecated use DownloadRecord */
export type DownloadedSession = DownloadRecord;

export const DEFAULT_SETTINGS: AppSettings = {
  resumePlayback: true,
  downloadFavorites: false,
  downloadWifiOnly: true,
  dailyReminderEnabled: false,
  dailyReminderTime: "21:00",
  dailyReminderDays: "Tous les jours",
  dailyReminderCustomDays: ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
  accountUser: null,
  fadeInDuration: 3,
  backgroundVolume: "Moyen",
  defaultSleepTimer: "30 min",
};

// DEFAULT_DOWNLOADS removed — no longer seeded on empty storage.
// Downloads represent real cached audio files only.

export const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: "liela_onboarding",
  USER_PROFILE: "liela_profile",
  AUDIO_PREFERENCES: "liela_audio_prefs",
  HISTORY: "liela_history",
  PROGRESS: "liela_progress",
  FEEDBACK: "liela_feedback",
  EVENTS: "liela_events",
  IN_PROGRESS: "liela_in_progress",
  FAVORITES: "liela_favorites",
  FAVORITES_REFUSALS: "liela_favorites_refusals",
  RECOMMENDATION_HISTORY: "liela_recommendation_history",
  APP_SETTINGS: "liela_settings",
  DOWNLOADS: "liela_downloads",
  DAILY_FAV_PROMPTS: "liela_daily_fav_prompts",
  // Sync keys for local/sessionStorage
  SPLASH_SHOWN: "liela_splash_shown",
  PWA_INSTALLED: "liela_pwa_installed",
  PWA_DISMISSED: "liela_pwa_dismissed",
};

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (isPersisted) return true;
      return await navigator.storage.persist();
    } catch (e) {
      console.error("Erreur lors de la demande de persistance", e);
      return false;
    }
  }
  return false;
}

function createStorage(uid: string | null) {
  const safeGet = <T>(key: string) => localGet<T>(key, uid);
  const safeSet = <T>(key: string, value: T) => localSet(key, value, uid);
  const safeUpdate = <T>(key: string, updater: (value: T | undefined) => T) => localUpdate(key, updater, uid);
  const safeDel = (key: string) => localDel(key, uid);
  const storage = {
  getOnboardingCompleted: async (): Promise<boolean> => {
    const profile = await storage.getProfile();
    return profile.onboardingCompleted || (await safeGet<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED)) === true;
  },
  setOnboardingCompleted: async (completed: boolean): Promise<boolean> => {
    await safeSet(STORAGE_KEYS.ONBOARDING_COMPLETED, completed);
    return storage.setProfile({ onboardingCompleted: completed });
  },
  getProfile: async (): Promise<UserProfile> => {
    const data = await safeGet<Partial<UserProfile>>(STORAGE_KEYS.USER_PROFILE);
    return { firstName: "", createdAt: new Date().toISOString(), language: "fr", level: "beginner", onboardingCompleted: false, ...data };
  },
  setProfile: async (profile: Partial<UserProfile>): Promise<boolean> => {
    const current = await storage.getProfile();
    return safeSet(STORAGE_KEYS.USER_PROFILE, { ...current, ...profile });
  },

  getAudioPreferences: async (): Promise<AudioPreferences> => {
    const defaults: AudioPreferences = {
      voice: "Algenib",
      voiceVolume: 1,
      musicVolume: 0.75,
      ambienceVolume: 0.50,
      musicEnabled: true,
      ambienceEnabled: true,
    };
    const parsed = await safeGet<Partial<AudioPreferences>>(STORAGE_KEYS.AUDIO_PREFERENCES);
    if (!parsed) return defaults;
    
    return {
      ...defaults,
      ...parsed,
      musicVolume: typeof parsed.musicVolume === "number" ? parsed.musicVolume : 0.75,
      ambienceVolume: typeof parsed.ambienceVolume === "number" ? parsed.ambienceVolume : 0.50,
    };
  },
  setAudioPreferences: async (prefs: Partial<AudioPreferences>): Promise<boolean> => {
    return safeUpdate<AudioPreferences>(STORAGE_KEYS.AUDIO_PREFERENCES, (current) => {
      const base = current || {
        voiceVolume: 1, musicVolume: 0.75, ambienceVolume: 0.5, musicEnabled: true, ambienceEnabled: true
      };
      return { ...base, ...prefs };
    });
  },

  getHistory: async (): Promise<SessionHistoryItem[]> => {
    const data = await safeGet<SessionHistoryItem[]>(STORAGE_KEYS.HISTORY);
    return Array.isArray(data) ? data : [];
  },
  addHistoryItem: async (item: SessionHistoryItem): Promise<boolean> => {
    await storage.saveProgress(item);
    return safeUpdate<SessionHistoryItem[]>(STORAGE_KEYS.HISTORY, (history) => {
      const arr = Array.isArray(history) ? history : [];
      const index = arr.findIndex(i => i.sessionId === item.sessionId && i.startedAt === item.startedAt);
      if (index >= 0) {
        arr[index] = item;
      } else {
        arr.unshift(item);
      }
      return arr;
    });
  },

  getInProgressSession: async (): Promise<SessionHistoryItem | null> => {
    const data = await safeGet<SessionHistoryItem>(STORAGE_KEYS.IN_PROGRESS);
    if (data) return data;
    const progress = await storage.getProgress();
    return progress.filter((item) => !item.completed).sort((a, b) => (b.lastListenedAt || b.startedAt).localeCompare(a.lastListenedAt || a.startedAt))[0] || null;
  },
  setInProgressSession: async (item: SessionHistoryItem | null): Promise<boolean> => {
    if (item) {
      await storage.saveProgress(item);
      return safeSet(STORAGE_KEYS.IN_PROGRESS, item);
    } else {
      return safeDel(STORAGE_KEYS.IN_PROGRESS);
    }
  },

  getProgress: async (): Promise<SessionHistoryItem[]> => (await safeGet<SessionHistoryItem[]>(STORAGE_KEYS.PROGRESS)) || [],
  getSessionProgress: async (sessionId: string): Promise<SessionHistoryItem | null> =>
    (await storage.getProgress()).find((item) => item.sessionId === sessionId) || null,
  saveProgress: async (item: SessionHistoryItem): Promise<boolean> => {
    return safeUpdate<SessionHistoryItem[]>(STORAGE_KEYS.PROGRESS, (items) => [
      { ...item, lastListenedAt: item.lastListenedAt || new Date().toISOString() },
      ...(items || []).filter((existing) => existing.sessionId !== item.sessionId),
    ]);
  },
  saveFeedback: async (feedback: SessionFeedback): Promise<boolean> => safeUpdate<SessionFeedback[]>(STORAGE_KEYS.FEEDBACK, (items) => [
    feedback, ...(items || []).filter((item) => item.sessionId !== feedback.sessionId || item.startedAt !== feedback.startedAt),
  ]),
  getFeedback: async (): Promise<SessionFeedback[]> => (await safeGet<SessionFeedback[]>(STORAGE_KEYS.FEEDBACK)) || [],
  recordEvent: async (event: Omit<PersonalizationEvent, "id" | "createdAt">): Promise<boolean> =>
    safeUpdate<PersonalizationEvent[]>(STORAGE_KEYS.EVENTS, (items) => [
      { ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...(items || []),
    ]),
  getEvents: async (): Promise<PersonalizationEvent[]> => (await safeGet<PersonalizationEvent[]>(STORAGE_KEYS.EVENTS)) || [],

  getFavorites: async (): Promise<Favori[]> => {
    const data = await safeGet<Favori[]>(STORAGE_KEYS.FAVORITES);
    return Array.isArray(data) ? data : [];
  },
  hasFavorite: async (sessionId: string): Promise<boolean> => {
    const favs = await storage.getFavorites();
    return favs.some(f => f.sessionId === sessionId);
  },
  addFavorite: async (sessionId: string, source?: string): Promise<boolean> => {
    const updateSuccess = await safeUpdate<Favori[]>(STORAGE_KEYS.FAVORITES, (favs) => {
      const arr = Array.isArray(favs) ? favs : [];
      if (!arr.some(f => f.sessionId === sessionId)) {
        arr.unshift({ sessionId, addedAt: new Date().toISOString(), source });
      }
      return arr;
    });
    return updateSuccess;
  },
  removeFavorite: async (sessionId: string): Promise<boolean> => {
    return safeUpdate<Favori[]>(STORAGE_KEYS.FAVORITES, (favs) => {
      return Array.isArray(favs) ? favs.filter(f => f.sessionId !== sessionId) : [];
    });
  },

  getFavoritesRefusals: async (): Promise<string[]> => {
    const data = await safeGet<string[]>(STORAGE_KEYS.FAVORITES_REFUSALS);
    return Array.isArray(data) ? data : [];
  },
  hasRefusedFavorite: async (sessionId: string): Promise<boolean> => {
    const refusals = await storage.getFavoritesRefusals();
    return refusals.includes(sessionId);
  },
  addFavoriteRefusal: async (sessionId: string): Promise<boolean> => {
    return safeUpdate<string[]>(STORAGE_KEYS.FAVORITES_REFUSALS, (refusals) => {
      const arr = Array.isArray(refusals) ? refusals : [];
      if (!arr.includes(sessionId)) arr.push(sessionId);
      return arr;
    });
  },

  getDailyFavoritePrompts: async (): Promise<number> => {
    const data = await safeGet<{ date: string; count: number }>(STORAGE_KEYS.DAILY_FAV_PROMPTS);
    if (!data || typeof data.count !== "number") return 0;
    const today = new Date().toISOString().split("T")[0];
    return data.date === today ? data.count : 0;
  },
  incrementDailyFavoritePrompts: async (): Promise<boolean> => {
    return safeUpdate<{ date: string; count: number }>(STORAGE_KEYS.DAILY_FAV_PROMPTS, (data) => {
      const today = new Date().toISOString().split("T")[0];
      if (data && data.date === today) {
        return { date: today, count: (data.count || 0) + 1 };
      }
      return { date: today, count: 1 };
    });
  },

  getRecommendationHistory: async (): Promise<{ sessionId: string; recommendedAt: string }[]> => {
    const data = await safeGet<{ sessionId: string; recommendedAt: string }[]>(STORAGE_KEYS.RECOMMENDATION_HISTORY);
    return Array.isArray(data) ? data : [];
  },
  addRecommendationHistory: async (sessionId: string): Promise<boolean> => {
    await storage.recordEvent({ type: "recommendation", sessionId });
    return safeUpdate<{ sessionId: string; recommendedAt: string }[]>(STORAGE_KEYS.RECOMMENDATION_HISTORY, (history) => {
      const arr = Array.isArray(history) ? history : [];
      arr.unshift({ sessionId, recommendedAt: new Date().toISOString() });
      return arr.slice(0, 50);
    });
  },

  getSettings: async (): Promise<AppSettings> => {
    const data = await safeGet<Partial<AppSettings>>(STORAGE_KEYS.APP_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(data || {}) };
  },
  setSettings: async (partial: Partial<AppSettings>): Promise<boolean> => {
    const updated = await safeUpdate<AppSettings>(STORAGE_KEYS.APP_SETTINGS, (current) => {
      return { ...DEFAULT_SETTINGS, ...(current || {}), ...partial };
    });

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
    return updated;
  },

  getDownloads: async (): Promise<DownloadRecord[]> => {
    const data = await safeGet<Partial<DownloadRecord>[]>(STORAGE_KEYS.DOWNLOADS);
    if (!Array.isArray(data)) return [];
    // Guard: migrate old DownloadedSession records that lack new fields
    return data.map(d => ({
      sessionId: d.sessionId ?? "",
      title: d.title ?? "",
      duration: d.duration ?? 0,
      cachedUrls: d.cachedUrls ?? [],
      status: d.status ?? "error",
      downloadedAt: d.downloadedAt ?? new Date(0).toISOString(),
      manifestVersion: d.manifestVersion ?? 1,
      sizeBytes: d.sizeBytes ?? ((d.sizeMo ?? 0) * 1024 * 1024),
      sizeMo: d.sizeMo,
      isFavorite: d.isFavorite,
    }));
  },
  addDownload: async (record: DownloadRecord): Promise<boolean> => {
    return safeUpdate<DownloadRecord[]>(STORAGE_KEYS.DOWNLOADS, (downloads) => {
      const arr = Array.isArray(downloads) ? downloads : [];
      const idx = arr.findIndex(d => d.sessionId === record.sessionId);
      if (idx >= 0) {
        arr[idx] = record; // replace (re-download updates the record)
      } else {
        arr.unshift(record);
      }
      return arr;
    });
  },
  removeDownload: async (sessionId: string): Promise<boolean> => {
    return safeUpdate<DownloadRecord[]>(STORAGE_KEYS.DOWNLOADS, (downloads) => {
      return Array.isArray(downloads) ? downloads.filter(d => d.sessionId !== sessionId) : [];
    });
  },
  removeDownloadFiles: async (sessionId: string): Promise<boolean> => {
    const record = await storage.getDownloadRecord(sessionId);
    if (record?.cachedUrls && record.cachedUrls.length > 0) {
      await removeSessionFiles(record.cachedUrls);
    }
    return storage.removeDownload(sessionId);
  },
  getDownloadRecord: async (sessionId: string): Promise<DownloadRecord | null> => {
    const downloads = await storage.getDownloads();
    return downloads.find(d => d.sessionId === sessionId) ?? null;
  },
  setDownloadStatus: async (sessionId: string, status: "available" | "error"): Promise<boolean> => {
    return safeUpdate<DownloadRecord[]>(STORAGE_KEYS.DOWNLOADS, (downloads) => {
      const arr = Array.isArray(downloads) ? downloads : [];
      const idx = arr.findIndex(d => d.sessionId === sessionId);
      if (idx >= 0) arr[idx] = { ...arr[idx], status };
      return arr;
    });
  },
  isSessionDownloaded: async (sessionId: string): Promise<boolean> => {
    const record = await storage.getDownloadRecord(sessionId);
    return record?.status === "available" && (record.cachedUrls?.length ?? 0) > 0;
  },
  verifyDownload: async (sessionId: string): Promise<boolean> => {
    const record = await storage.getDownloadRecord(sessionId);
    if (!record || !record.cachedUrls || record.cachedUrls.length === 0) {
      return false;
    }
    const valid = await verifySessionInCache(record.cachedUrls);
    if (!valid && record.status === "available") {
      await storage.setDownloadStatus(sessionId, "error");
    }
    return valid;
  },
  clearDownloads: async (): Promise<boolean> => {
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        await caches.delete(SESSIONS_CACHE_NAME);
      } catch {}
    }
    return safeSet(STORAGE_KEYS.DOWNLOADS, []);
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
      listeningCounts: Object.fromEntries(history.map((item) => [item.sessionId, history.filter((entry) => entry.sessionId === item.sessionId).length])),
      progress: await storage.getProgress(),
      feedback: await storage.getFeedback(),
      personalization: await storage.getEvents(),
    };
    return JSON.stringify(exportObject, null, 2);
  },

  clearAllData: async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    let allOk = true;
    const keysToRemove = [
      STORAGE_KEYS.HISTORY,
      STORAGE_KEYS.PROGRESS,
      STORAGE_KEYS.FEEDBACK,
      STORAGE_KEYS.EVENTS,
      STORAGE_KEYS.IN_PROGRESS,
      STORAGE_KEYS.FAVORITES,
      STORAGE_KEYS.FAVORITES_REFUSALS,
      STORAGE_KEYS.USER_PROFILE,
      STORAGE_KEYS.AUDIO_PREFERENCES,
      STORAGE_KEYS.RECOMMENDATION_HISTORY,
      STORAGE_KEYS.APP_SETTINGS,
      STORAGE_KEYS.ONBOARDING_COMPLETED,
      STORAGE_KEYS.DAILY_FAV_PROMPTS
    ];
    for (const k of keysToRemove) {
      const ok = await safeDel(k);
      allOk = allOk && ok;
    }
    // Also remove from local/sessionStorage
    try {
      localStorage.removeItem(STORAGE_KEYS.PWA_INSTALLED);
      localStorage.removeItem(STORAGE_KEYS.PWA_DISMISSED);
      // FIX B5: Also clear the key used by PwaContext for dismissal
      localStorage.removeItem("liela_pwa_dismissed_until");
      sessionStorage.removeItem(STORAGE_KEYS.SPLASH_SHOWN);
    } catch {}
    
    // Note: Downloads are intentionally kept intact per spec unless the user explicitly removes them.
    return allOk;
  },
};

  return storage;
}

// Each operation captures its owner once, including any awaits and nested calls.
export const storage = new Proxy({} as ReturnType<typeof createStorage>, {
  get(_target, key) { return Reflect.get(createStorage(getStorageUser()), key); },
});
