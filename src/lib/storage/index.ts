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
  completed: boolean;
}

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: "liela_onboarding",
  USER_PROFILE: "liela_profile",
  AUDIO_PREFERENCES: "liela_audio_prefs",
  HISTORY: "liela_history",
  IN_PROGRESS: "liela_in_progress",
};

export const storage = {
  getOnboardingCompleted: (): boolean => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === "true";
  },
  setOnboardingCompleted: (completed: boolean) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed ? "true" : "false");
  },

  getProfile: (): { firstName: string } => {
    if (typeof window === "undefined") return { firstName: "" };
    const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : { firstName: "" };
  },
  setProfile: (profile: { firstName: string }) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  },

  getAudioPreferences: (): AudioPreferences => {
    const defaults: AudioPreferences = {
      voiceVolume: 1,
      musicVolume: 0.75,
      ambienceVolume: 0.50,
      musicEnabled: true,
      ambienceEnabled: true,
    };
    if (typeof window === "undefined") return defaults;
    
    const data = localStorage.getItem(STORAGE_KEYS.AUDIO_PREFERENCES);
    if (!data) return defaults;
    
    try {
      const parsed = JSON.parse(data);
      return {
        ...defaults,
        ...parsed,
        musicVolume: typeof parsed.musicVolume === "number" ? parsed.musicVolume : 0.75,
        ambienceVolume: typeof parsed.ambienceVolume === "number" ? parsed.ambienceVolume : 0.50,
      };
    } catch {
      return defaults;
    }
  },
  setAudioPreferences: (prefs: Partial<AudioPreferences>) => {
    if (typeof window === "undefined") return;
    const current = storage.getAudioPreferences();
    localStorage.setItem(STORAGE_KEYS.AUDIO_PREFERENCES, JSON.stringify({ ...current, ...prefs }));
  },

  getHistory: (): SessionHistoryItem[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },
  addHistoryItem: (item: SessionHistoryItem) => {
    if (typeof window === "undefined") return;
    const history = storage.getHistory();
    // Update if exists, otherwise unshift
    const index = history.findIndex(i => i.sessionId === item.sessionId && i.startedAt === item.startedAt);
    if (index >= 0) {
      history[index] = item;
    } else {
      history.unshift(item);
    }
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 50))); // Keep last 50
  },

  getInProgressSession: (): SessionHistoryItem | null => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(STORAGE_KEYS.IN_PROGRESS);
    return data ? JSON.parse(data) : null;
  },
  setInProgressSession: (item: SessionHistoryItem | null) => {
    if (typeof window === "undefined") return;
    if (item) {
      localStorage.setItem(STORAGE_KEYS.IN_PROGRESS, JSON.stringify(item));
    } else {
      localStorage.removeItem(STORAGE_KEYS.IN_PROGRESS);
    }
  },
};
