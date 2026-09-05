import sessionsData from "@/generated/sessions.json";
import { Situation, SituationId, situations, getSituation } from "@/config/situations";
import { SESSIONS_CATALOG, CatalogSession, getCatalogSessionById, getCategoryInfo, DISCOVERY_COLLECTION } from "@/config/sessionsCatalog";

export { getSituation, SESSIONS_CATALOG, getCatalogSessionById, getCategoryInfo, DISCOVERY_COLLECTION };
export type { CatalogSession };

export interface SessionMetadata {
  title: string;
  category: string;
  language: string;
  durationSeconds: number;
  level?: string | null;
  shortDescription?: string | null;
  technique?: string | null;
  situation?: SituationId;
  estPorteEntree?: boolean;
  ordre?: number;
}

export interface SessionAudioTrack {
  id?: string;
  file: string;
  defaultVolume?: number;
}

export interface SessionAudio {
  voice: string;
  music?: SessionAudioTrack | null;
  ambience?: SessionAudioTrack | null;
  cues?: { file: string; defaultVolume?: number } | null;
  final?: string;
}

export interface SessionAudioFormat {
  codec?: string;
  container?: string;
  sampleRate?: number;
  bitrates?: {
    voice?: number;
    music?: number;
    ambience?: number;
    cues?: number;
    final?: number;
    [key: string]: number | undefined;
  };
}

export interface Session {
  version?: number;
  id: string;
  metadata: SessionMetadata;
  audio: SessionAudio;
  mix?: {
    voiceDefaultVolume?: number;
    musicDefaultVolume?: number;
    ambienceDefaultVolume?: number;
    cuesDefaultVolume?: number;
  };
  audioFormat?: SessionAudioFormat;
  cues?: Array<{ asset: string; timeSeconds: number }>;
}

export const sessions = (sessionsData as unknown) as Session[];

export function getSessionById(id: string): Session | undefined {
  // First check real audio sessions
  const real = sessions.find((s) => s.id === id);
  if (real) return real;

  // Check catalog for realSessionId link
  const catalog = getCatalogSessionById(id);
  if (catalog?.realSessionId) {
    return sessions.find((s) => s.id === catalog.realSessionId);
  }
  return undefined;
}

/**
 * Returns all situations in the standard order.
 */
export function getAvailableSituations(): Situation[] {
  return Object.values(situations);
}

export interface AvailableDuration {
  value: number; // in minutes (3, 5, 10, 20, or 0 for "Je ne sais pas")
  label: string;
}

/**
 * Returns durations available across the catalogue: 3, 5, 10, 20 min + Je ne sais pas.
 */
export function getAvailableDurations(situationId?: string | null): AvailableDuration[] {
  return [
    { value: 3, label: "3 minutes" },
    { value: 5, label: "5 minutes" },
    { value: 10, label: "10 minutes" },
    { value: 20, label: "20 minutes" },
    { value: 0, label: "Je ne sais pas" },
  ];
}

export function recommendSession(situationId: string, targetDurationMinutes: number): CatalogSession | null {
  const matching = SESSIONS_CATALOG.filter((s) => s.situationId === situationId);
  if (matching.length === 0) return null;

  if (targetDurationMinutes === 0) {
    // User doesn't know: prioritize an available session if any exists
    const available = matching.find((s) => s.isAvailable);
    if (available) return available;
    // Default to 5 min or 10 min
    return matching.find((s) => s.durationMinutes === 5) || matching[0];
  }

  // Find exact duration match first
  const exact = matching.find((s) => s.durationMinutes === targetDurationMinutes);
  if (exact) return exact;

  // Otherwise closest duration
  matching.sort((a, b) => {
    const diffA = Math.abs(a.durationMinutes - targetDurationMinutes);
    const diffB = Math.abs(b.durationMinutes - targetDurationMinutes);
    return diffA - diffB;
  });

  return matching[0];
}

export function resolveSessionAsset(sessionId: string, relativePath: string): string {
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.slice(1);
  }
  return `/sessions/${sessionId}/${relativePath}`;
}
