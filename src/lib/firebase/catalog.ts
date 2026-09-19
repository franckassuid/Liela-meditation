import { collection, doc, onSnapshot, query, where, type Firestore } from "firebase/firestore";
import { replaceCatalog, type CatalogSession } from "@/config/sessionsCatalog";
import { replaceSessions, type Session } from "@/lib/sessions";
import { rawGet, rawSet } from "@/lib/storage/local";
import { invalidateRecommendationCache } from "@/lib/recommendation";

export interface PublishedSession extends Session {
  published: boolean;
  order: number;
  artwork?: string;
}
let revision = 0;
const listeners = new Set<() => void>();
export const subscribeCatalog = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getCatalogRevision = () => revision;

export function isPublishedSession(value: unknown): value is PublishedSession {
  if (!value || typeof value !== "object") return false;
  const session = value as PublishedSession;
  return session.published === true && typeof session.id === "string" && /^[a-zA-Z0-9_-]+$/.test(session.id)
    && typeof session.metadata?.title === "string" && typeof session.metadata?.durationSeconds === "number"
    && Number.isFinite(session.metadata.durationSeconds) && session.metadata.durationSeconds > 0
    && typeof session.audio?.voice === "string" && session.audio.voice.length > 0;
}
function apply(sessions: PublishedSession[]) {
  const ordered = [...sessions].sort((a, b) => (a.order || 0) - (b.order || 0));
  replaceSessions(ordered);
  replaceCatalog(ordered.map((session): CatalogSession => ({
    id: session.id, realSessionId: session.id, title: session.metadata.title,
    description: session.metadata.shortDescription || undefined,
    situationId: session.metadata.situation || "discovery",
    durationSeconds: session.metadata.durationSeconds,
    durationMinutes: Math.round(session.metadata.durationSeconds / 60),
    isAvailable: true, estPorteEntree: session.metadata.estPorteEntree || false,
    level: session.metadata.level || "beginner", technique: session.metadata.technique || undefined,
    artwork: session.artwork, order: session.order,
  })));
  invalidateRecommendationCache();
  revision++;
  listeners.forEach((fn) => fn());
}

export function startCatalogSync(db: Firestore) {
  let stopped = false;
  let stopSessions: (() => void) | undefined;
  let resolveReady: () => void;
  const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
  const timeout = setTimeout(() => resolveReady(), 4000);
  // The marker switches from the bundled catalogue to Firestore only after a complete import.
  const stopConfig = onSnapshot(doc(db, "catalog/config"), (config) => {
    if (config.metadata.fromCache && !config.exists()) return;
    if (stopped || !config.data()?.enabled || stopSessions) { resolveReady(); return; }
    stopSessions = onSnapshot(query(collection(db, "sessions"), where("published", "==", true)), (snapshot) => {
      if (stopped || snapshot.metadata.fromCache) return;
      const sessions = snapshot.docs.map((item) => item.data()).filter(isPublishedSession);
      apply(sessions);
      void rawSet("liela_catalog_cache", sessions).catch(console.warn);
      clearTimeout(timeout);
      resolveReady();
    }, (error) => { console.warn("Catalogue cloud indisponible", error.code); resolveReady(); });
  }, () => resolveReady());
  void rawGet<PublishedSession[]>("liela_catalog_cache").then((cached) => {
    if (!stopped && cached && revision === 0) apply(cached.filter(isPublishedSession));
  });
  return { ready, stop: () => { stopped = true; clearTimeout(timeout); stopConfig(); stopSessions?.(); } };
}
