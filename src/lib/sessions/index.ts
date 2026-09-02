import sessionsData from "@/generated/sessions.json";
import { Situation, SituationId, situations, getSituation } from "@/config/situations";

export { getSituation };

export interface SessionMetadata {
  title: string;
  category: string;
  language: string;
  durationSeconds: number;
  level?: string | null;
  shortDescription?: string | null;
  technique?: string | null;
  situation?: SituationId;
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
  return sessions.find((s) => s.id === id);
}

/**
 * Returns only the situations that currently have at least one session in the catalog.
 */
export function getAvailableSituations(): Situation[] {
  const availableSituationIds = new Set(
    sessions.map((s) => s.metadata.situation).filter(Boolean)
  );
  return Object.values(situations).filter((sit) => availableSituationIds.has(sit.id));
}

export interface AvailableDuration {
  value: number; // in minutes (5, 10, 20, or 0 for "Je ne sais pas")
  label: string;
}

/**
 * Returns only the durations that correspond to an existing session for the given situation.
 */
export function getAvailableDurations(situationId?: string | null): AvailableDuration[] {
  if (!situationId) return [];

  const sitSessions = sessions.filter((s) => s.metadata.situation === situationId);
  if (sitSessions.length === 0) return [];

  const has5 = sitSessions.some((s) => s.metadata.durationSeconds <= 420);
  const has10 = sitSessions.some((s) => s.metadata.durationSeconds > 420 && s.metadata.durationSeconds <= 900);
  const has20 = sitSessions.some((s) => s.metadata.durationSeconds > 900);

  const list: AvailableDuration[] = [];
  if (has5) list.push({ value: 5, label: "5 minutes" });
  if (has10) list.push({ value: 10, label: "10 minutes" });
  if (has20) list.push({ value: 20, label: "20 minutes" });

  if (list.length > 1) {
    list.push({ value: 0, label: "Je ne sais pas" });
  }

  return list;
}

export function recommendSession(situationId: string, targetDurationMinutes: number): Session | null {
  const matching = sessions.filter((s) => s.metadata.situation === situationId);
  
  if (matching.length === 0) return null;

  const targetSecs = targetDurationMinutes > 0 ? targetDurationMinutes * 60 : 10 * 60; // default 10min if "don't know"
  
  // Sort by closest duration
  matching.sort((a, b) => {
    const diffA = Math.abs(a.metadata.durationSeconds - targetSecs);
    const diffB = Math.abs(b.metadata.durationSeconds - targetSecs);
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
