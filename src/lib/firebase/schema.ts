import type { SituationId } from "@/config/situations";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export interface UserProfile {
  userId?: string;
  firstName: string;
  createdAt: string;
  language: string;
  level: ExperienceLevel;
  onboardingCompleted: boolean;
  profileSetupCompleted?: boolean;
  primarySituation?: SituationId | null;
  preferredDurationMinutes?: number;
}
export interface SessionFeedback {
  sessionId: string;
  startedAt: string;
  rating: "useful" | "somewhat" | "not-useful";
  createdAt: string;
  before?: number;
  after?: number;
}
export interface PersonalizationEvent {
  id: string;
  type: "situation_selected" | "duration_selected" | "recommendation";
  createdAt: string;
  sessionId?: string;
  situationId?: string;
  durationMinutes?: number;
}
export const MAX_PERSONALIZATION_EVENTS = 200;
export interface Entitlements {
  plan: string;
  status: "active" | "trialing" | "expired" | "cancelled";
  rights: string[];
  expiresAt: string | null;
  provider: "apple" | "google" | "admin";
}

export const SYNC_COLLECTIONS: Record<string, { path: string; id: (item: Record<string, unknown>) => string }> = {
  liela_favorites: { path: "favorites", id: (v) => String(v.sessionId) },
  liela_history: { path: "history", id: (v) => historyId(String(v.sessionId), String(v.startedAt)) },
  liela_progress: { path: "progress", id: (v) => String(v.sessionId) },
  liela_feedback: { path: "feedback", id: (v) => historyId(String(v.sessionId), String(v.startedAt)) },
  liela_events: { path: "events", id: (v) => String(v.id) },
};
export const SYNC_DOCUMENTS: Record<string, string> = {
  liela_profile: "",
  liela_audio_prefs: "preferences/audio",
  liela_settings: "preferences/settings",
};
export const SYNC_KEYS = [...Object.keys(SYNC_DOCUMENTS), ...Object.keys(SYNC_COLLECTIONS)];
export const historyId = (sessionId: string, startedAt: string) => encodeURIComponent(`${sessionId}__${startedAt}`);
export const documentId = (id: string) => encodeURIComponent(id);
export type JsonRecord = Record<string, unknown>;
export interface PendingWrite {
  path: string;
  key: string;
  value: JsonRecord | null;
  revision: string;
  createOnly?: boolean;
}

export function toDocuments(key: string, value: unknown): Record<string, JsonRecord> {
  const group = SYNC_COLLECTIONS[key];
  if (group) {
    return Object.fromEntries((Array.isArray(value) ? value : []).map((item) => [
      `${group.path}/${documentId(group.id(item))}`, item,
    ]));
  }
  if (key in SYNC_DOCUMENTS && value && typeof value === "object") {
    const clean = { ...(value as JsonRecord) };
    delete clean.accountUser;
    delete clean.userId;
    return { [SYNC_DOCUMENTS[key]]: clean };
  }
  return {};
}

export function changesFor(key: string, before: unknown, after: unknown): PendingWrite[] {
  const previous = toDocuments(key, before);
  const next = toDocuments(key, after);
  const isOversizedEventHistoryBeingTrimmed = key === "liela_events"
    && Object.keys(previous).length > MAX_PERSONALIZATION_EVENTS
    && Object.keys(next).length === MAX_PERSONALIZATION_EVENTS;
  return [...new Set([...Object.keys(previous), ...Object.keys(next)])]
    .filter((path) => !isOversizedEventHistoryBeingTrimmed || path in next)
    .filter((path) => JSON.stringify(previous[path]) !== JSON.stringify(next[path]))
    .map((path) => ({ path, key, value: next[path] ?? null, revision: crypto.randomUUID() }));
}

export function overlayPending(key: string, remote: Record<string, JsonRecord>, writes: PendingWrite[]): unknown {
  const result = { ...remote };
  for (const write of writes.filter((w) => w.key === key)) {
    if (write.value === null) delete result[write.path];
    else if (!write.createOnly || !result[write.path]) result[write.path] = write.value;
  }
  if (key in SYNC_DOCUMENTS) return result[SYNC_DOCUMENTS[key]];
  return Object.values(result).sort((a, b) =>
    String(b.startedAt || b.addedAt || b.lastListenedAt || b.createdAt).localeCompare(
      String(a.startedAt || a.addedAt || a.lastListenedAt || a.createdAt)));
}
