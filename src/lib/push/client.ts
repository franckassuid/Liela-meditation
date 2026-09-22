import { doc, writeBatch, deleteDoc, deleteField, serverTimestamp, Timestamp } from "firebase/firestore";
import { getFirebase } from "../firebase/client";
import { PUSH_ENABLED, PUSH_VAPID_KEY } from "./config";
import { nextReminderAt } from "./schedule";
import type { AppSettings } from "../storage";
import { getStorageUser, rawGet, rawSet } from "../storage/local";

let queue = Promise.resolve();
let epoch = 0;
let foregroundStarted = false;
let ownedDevice: { uid: string; fid: string; registeredAt: number } | undefined;
let retryAfter = 0;
let status = "";
const listeners = new Set<() => void>();
export const getPushStatus = () => status;
export const subscribePushStatus = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function setStatus(value: string) { status = value; listeners.forEach(listener => listener()); }
const marker = (uid: string) => `user:${uid}:push-registration`;
type Marker = { signature: string; fid: string; refreshedAt: number };
const current = (uid: string) => getStorageUser() === uid && getFirebase().auth.currentUser?.uid === uid;
export async function setPushOwner(uid: string | null) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active) return;
  if (uid && !current(uid)) return;
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error("Rechargez Liela pour mettre à jour les notifications.")); }, 5000);
    channel.port1.onmessage = () => { clearTimeout(timer); channel.port1.close(); resolve(); };
    registration.active!.postMessage({ type: "PUSH_OWNER", uid }, [channel.port2]);
  });
}
/** Called on every auth transition. An old account's queued settings must never affect a new one. */
export async function resetPushOwner() {
  epoch++;
  ownedDevice = undefined;
  retryAfter = 0;
  setStatus("");
  await setPushOwner(null);
}
async function messagingService() {
  const api = await import("firebase/messaging");
  if (!await api.isSupported()) throw new Error("Les notifications push ne sont pas disponibles sur ce navigateur.");
  const messaging = api.getMessaging(getFirebase().app);
  if (!foregroundStarted) {
    api.onMessage(messaging, async payload => {
      if (payload.data?.userId !== getFirebase().auth.currentUser?.uid) return;
      const registration = await navigator.serviceWorker.getRegistration();
      registration?.active?.postMessage({ type: "DISPLAY_PUSH", data: payload.data });
    });
    foregroundStarted = true;
  }
  return { api, messaging };
}
async function registerDevice(uid: string) {
  await setPushOwner(uid);
  if (ownedDevice?.uid === uid && Date.now() - ownedDevice.registeredAt < 86400_000) return ownedDevice.fid;
  const { api, messaging } = await messagingService();
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active) throw new Error("Rechargez Liela avant d’activer les rappels.");
  let fid = "";
  const unsubscribe = api.onRegistered(messaging, value => { fid = value; });
  try { await api.register(messaging, { vapidKey: PUSH_VAPID_KEY, serviceWorkerRegistration: registration }); }
  finally { unsubscribe(); }
  if (!current(uid)) throw new Error("Votre compte a changé. Réessayez.");
  if (!fid) throw new Error("L’enregistrement des notifications a échoué. Réessayez.");
  ownedDevice = { uid, fid, registeredAt: Date.now() };
  return fid;
}
async function sync(uid: string, settings: AppSettings, force: boolean, generation: number) {
  if (!current(uid) || generation !== epoch) return;
  if (!navigator.onLine) throw new Error("Reconnectez-vous pour synchroniser vos rappels.");
  const db = getFirebase().db;
  const schedule = { time: settings.dailyReminderTime, days: settings.dailyReminderCustomDays, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  const enabled = settings.dailyReminderEnabled && schedule.days.length > 0;
  const signature = JSON.stringify({ enabled, ...schedule });
  const previous = await rawGet<Marker>(marker(uid));
  if (!force && !enabled && !previous?.fid) { await setPushOwner(null); return; }
  if (enabled && !("Notification" in window && Notification.permission === "granted")) {
    await setPushOwner(null);
    throw new Error("Autorisez les notifications sur cet appareil pour recevoir vos rappels.");
  }
  const fid = enabled ? await registerDevice(uid) : previous?.fid || "";
  const now = Date.now();
  const refresh = enabled && (previous?.fid !== fid || now - previous.refreshedAt >= 86400_000);
  const scheduleChanged = force || previous?.signature !== signature || refresh;
  if (!current(uid) || generation !== epoch) return;
  const batch = writeBatch(db);
  if (enabled && refresh) {
    if (previous?.fid && previous.fid !== fid) batch.delete(doc(db, "users", uid, "pushDevices", previous.fid));
    batch.set(doc(db, "users", uid, "pushDevices", fid), { userId: uid, fid, updatedAt: serverTimestamp() });
  }
  if (scheduleChanged) {
    const nextAt = enabled ? nextReminderAt(schedule, new Date()) : null;
    if (enabled && !nextAt) throw new Error("Choisissez une heure et au moins un jour de rappel valides.");
    // Preserve the server's lastAttemptDate even when disabling then re-enabling.
    batch.set(doc(db, "reminderSchedules", uid), { userId: uid, ...schedule, nextAt: nextAt ? Timestamp.fromDate(nextAt) : deleteField(), updatedAt: serverTimestamp() }, { merge: true });
    if (force) {
      // Explicit edits update the visible Firebase preferences and the server schedule atomically.
      const preferences = Object.fromEntries(Object.entries(settings).filter(([key, value]) => key !== "accountUser" && value !== undefined));
      batch.set(doc(db, "users", uid, "preferences", "settings"), { ...preferences, userId: uid });
    }
  }
  if (!enabled && fid) batch.delete(doc(db, "users", uid, "pushDevices", fid));
  if (scheduleChanged || refresh || (!enabled && fid)) await batch.commit();
  if (!current(uid) || generation !== epoch) return;
  if (!enabled) { await setPushOwner(null); ownedDevice = undefined; }
  await rawSet(marker(uid), { signature, fid: enabled ? fid : "", refreshedAt: refresh ? now : previous?.refreshedAt || now });
  retryAfter = 0;
  setStatus("");
}
export function syncPushReminder(settings: AppSettings, force = false) {
  if (!PUSH_ENABLED) return settings.dailyReminderEnabled && force ? Promise.reject(new Error("Les rappels seront disponibles après l’activation du service.")) : Promise.resolve();
  const uid = getStorageUser();
  if (!uid) return setPushOwner(null);
  if (!force && Date.now() < retryAfter) return Promise.resolve();
  const generation = epoch;
  const snapshot = structuredClone(settings);
  const task = queue.catch(() => {}).then(() => {
    if (!force && Date.now() < retryAfter) return;
    return sync(uid, snapshot, force, generation);
  }).catch(error => {
    if (generation === epoch) {
      retryAfter = Date.now() + ((error as { code?: string }).code === "resource-exhausted" ? 3600_000 : 60_000);
      setStatus(error instanceof Error ? error.message : "Rappels non synchronisés. Réessayez.");
    }
    throw error;
  });
  queue = task;
  return task;
}
/** Detach only this device; other devices retain the user's daily schedule. */
export function detachPushDevice() {
  const uid = getStorageUser();
  epoch++;
  const task = queue.catch(() => {}).then(async () => {
    if (!PUSH_ENABLED) { await setPushOwner(null).catch(() => {}); return; }
    await setPushOwner(null);
    if (!uid || !current(uid)) return;
    const previous = await rawGet<Marker>(marker(uid));
    const fid = ownedDevice?.uid === uid ? ownedDevice.fid : previous?.fid;
    if (fid) {
      if (!navigator.onLine) throw new Error("Reconnectez-vous avant de vous déconnecter pour retirer les rappels de cet appareil.");
      await deleteDoc(doc(getFirebase().db, "users", uid, "pushDevices", fid));
      await rawSet(marker(uid), null);
    }
    ownedDevice = undefined;
  });
  queue = task;
  return task;
}
