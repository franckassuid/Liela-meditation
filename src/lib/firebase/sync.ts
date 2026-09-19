import { collection, doc, onSnapshot, runTransaction, setDoc, deleteDoc, type Firestore, type Unsubscribe } from "firebase/firestore";
import { update } from "idb-keyval";
import { rawGet, rawSet, scopedKey, registerSyncSink, withStorageLock, notifyStorageChanged } from "@/lib/storage/local";
import { DEFAULT_SETTINGS } from "@/lib/storage";
import { changesFor, overlayPending, SYNC_COLLECTIONS, SYNC_DOCUMENTS, SYNC_KEYS, toDocuments, type JsonRecord, type PendingWrite } from "./schema";

export type SyncStatus = { state: "guest" | "syncing" | "synced" | "offline" | "error"; pending: number; error?: string };
let status: SyncStatus = { state: "guest", pending: 0 };
const subscribers = new Set<() => void>();
export const subscribeSync = (listener: () => void) => { subscribers.add(listener); return () => { subscribers.delete(listener); }; };
export const getSyncStatus = () => status;
function publish(next: SyncStatus) { status = next; subscribers.forEach((fn) => fn()); }
const outboxKey = (uid: string) => `user:${uid}:firestore-outbox`;
const pendingFor = async (uid: string) => Object.values(await rawGet<Record<string, PendingWrite>>(outboxKey(uid)) || {});
let retryCurrent: (() => void) | undefined;
let currentUid: string | null = null;
export const retrySync = () => retryCurrent?.();

async function enqueue(uid: string, writes: PendingWrite[]) {
  if (!writes.length) return;
  await update<Record<string, PendingWrite>>(outboxKey(uid), (pending) => {
    const next = { ...pending };
    for (const write of writes) next[write.path] = write;
    return next;
  });
  if (uid === currentUid) retryCurrent?.();
}
export function initializeSync() {
  registerSyncSink((uid, key, before, after) => enqueue(uid, changesFor(key, before, after)));
}

/** Import legacy guest data once on this device; existing cloud documents win. */
async function migrateGuest(uid: string) {
  await withStorageLock(async () => {
    const owner = await rawGet<string>("liela_migration_owner");
    if (owner) return;
    const values: Record<string, unknown> = {};
    for (const key of SYNC_KEYS) values[key] = await rawGet(key);
    if (values.liela_settings) values.liela_settings = { ...DEFAULT_SETTINGS, ...(values.liela_settings as JsonRecord) };
    if (values.liela_audio_prefs) values.liela_audio_prefs = { voice: "Algenib", voiceVolume: 1, musicVolume: 0.75, ambienceVolume: 0.5, musicEnabled: true, ambienceEnabled: true, ...(values.liela_audio_prefs as JsonRecord) };
    const profile = values.liela_profile as JsonRecord | undefined;
    values.liela_profile = {
      firstName: "", language: "fr", level: "beginner", createdAt: new Date().toISOString(),
      ...profile, onboardingCompleted: (await rawGet("liela_onboarding")) === true || profile?.onboardingCompleted === true,
    };
    const history = (values.liela_history || []) as JsonRecord[];
    const inProgress = await rawGet<JsonRecord>("liela_in_progress");
    const progress = new Map<string, JsonRecord>();
    for (const item of [...history].reverse()) progress.set(String(item.sessionId), item);
    if (inProgress) progress.set(String(inProgress.sessionId), inProgress);
    values.liela_progress = [...progress.values()];
    const writes = SYNC_KEYS.flatMap((key) => Object.entries(toDocuments(key, values[key])).map(([path, value]) => ({
      key, path, value, revision: crypto.randomUUID(), createOnly: true,
    })));
    // Durable before marking the guest data claimed. Never copy it to another account.
    await enqueue(uid, writes);
    await rawSet("liela_migration_owner", uid);
    for (const key of SYNC_KEYS) {
      if (values[key] !== undefined) await rawSet(scopedKey(key, uid), values[key]);
    }
  });
}

export async function startUserSync(db: Firestore, uid: string) {
  currentUid = uid;
  let stopped = false;
  let flushing = false;
  const unsubscribes: Unsubscribe[] = [];
  const remoteByKey = new Map<string, Record<string, JsonRecord>>();
  const errors = new Map<string, string>();
  const loadingKeys = new Set(SYNC_KEYS);
  publish({ state: "syncing", pending: 0 });

  async function updateStatus() {
    if (stopped || currentUid !== uid) return;
    const pending = (await pendingFor(uid)).length;
    if (stopped || currentUid !== uid) return;
    publish({ state: errors.size ? "error" : !navigator.onLine ? "offline" : pending || loadingKeys.size ? "syncing" : "synced", pending, error: [...errors.values()][0] });
  }
  async function applyRemote(key: string) {
    await withStorageLock(async () => {
      const remote = remoteByKey.get(key);
      if (stopped || !remote) return;
      const value = overlayPending(key, remote, await pendingFor(uid));
      await rawSet(scopedKey(key, uid), value ?? (key in SYNC_COLLECTIONS ? [] : {}));
      if (!stopped) notifyStorageChanged();
    });
  }
  async function flush() {
    if (stopped || flushing) return;
    await updateStatus();
    if (!navigator.onLine) return;
    flushing = true;
    try {
      let writes = await pendingFor(uid);
      while (!stopped && writes.length) {
        for (const write of writes) {
          if (stopped) return;
          const ref = doc(db, `users/${uid}${write.path ? `/${write.path}` : ""}`);
          const value = write.value ? JSON.parse(JSON.stringify({ ...write.value, userId: uid })) as JsonRecord : null;
          if (write.createOnly && value) {
            await runTransaction(db, async (transaction) => {
              if (!(await transaction.get(ref)).exists()) transaction.set(ref, value);
            });
          } else if (value) await setDoc(ref, value);
          else await deleteDoc(ref);
          await update<Record<string, PendingWrite>>(outboxKey(uid), (pending) => {
            const next = { ...pending };
            if (next[write.path]?.revision === write.revision) delete next[write.path];
            return next;
          });
          await applyRemote(write.key);
        }
        writes = await pendingFor(uid);
      }
      errors.delete("write");
    } catch (error) {
      errors.set("write", error instanceof Error ? error.message : "Synchronisation impossible");
    } finally {
      flushing = false;
      await updateStatus();
      if (!stopped && !errors.has("write") && navigator.onLine && (await pendingFor(uid)).length) queueMicrotask(() => { void flush(); });
    }
  }
  retryCurrent = () => { void flush(); };
  // Stop handles are made available synchronously via this object, even while migration runs.
  const ready = (async () => {
    await migrateGuest(uid);
    if (stopped) return;
    // Ensure new accounts receive a profile even when another account claimed this device's guest data.
    const profile = await rawGet<JsonRecord>(scopedKey("liela_profile", uid));
    if (!profile) await enqueue(uid, [{ key: "liela_profile", path: "", value: {
      firstName: "", createdAt: new Date().toISOString(), language: "fr", level: "beginner", onboardingCompleted: false,
    }, revision: crypto.randomUUID(), createOnly: true }]);
    const firstSnapshots = SYNC_KEYS.map((key) => new Promise<void>((resolve) => {
      const path = SYNC_COLLECTIONS[key]?.path ?? SYNC_DOCUMENTS[key];
      const reference = key in SYNC_COLLECTIONS ? collection(db, `users/${uid}/${path}`) : doc(db, `users/${uid}${path ? `/${path}` : ""}`);
      const receive = (remote: Record<string, JsonRecord>) => {
        if (stopped) return;
        remoteByKey.set(key, remote);
        loadingKeys.delete(key);
        errors.delete(key);
        void applyRemote(key).then(() => { resolve(); void updateStatus(); });
      };
      const fail = (error: Error) => { errors.set(key, error.message); resolve(); void updateStatus(); };
      if (reference.type === "collection") {
        unsubscribes.push(onSnapshot(reference, (snapshot) => {
          // Empty cache snapshots must not erase a persistent offline cache.
          if (snapshot.metadata.fromCache && snapshot.empty) return;
          receive(Object.fromEntries(snapshot.docs.map((item) => [`${path}/${item.id}`, item.data()])));
        }, fail));
      } else {
        unsubscribes.push(onSnapshot(reference, (snapshot) => {
          if (snapshot.metadata.fromCache && !snapshot.exists()) return;
          receive(snapshot.exists() ? { [path]: snapshot.data() } : {});
        }, fail));
      }
    }));
    void flush();
    // Offline clients can use their last user-scoped cache without waiting on the network.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([Promise.all(firstSnapshots), new Promise<void>((resolve) => { timeout = setTimeout(resolve, 5000); })]);
    clearTimeout(timeout);
  })();
  const online = () => { void flush(); };
  const offline = () => { void updateStatus(); };
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  return {
    ready,
    stop: () => {
      stopped = true;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      if (currentUid === uid) { currentUid = null; retryCurrent = undefined; }
    },
  };
}

export function setGuestSyncStatus() { publish({ state: "guest", pending: 0 }); }
