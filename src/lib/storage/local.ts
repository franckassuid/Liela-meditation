import { get, set, del, update } from "idb-keyval";

let userId: string | null = null;
let sink: ((uid: string, key: string, before: unknown, after: unknown) => Promise<void>) | undefined;
const memory = new Map<string, unknown>();
const deviceKeys = new Set(["liela_downloads"]);
let serial = Promise.resolve();
export function withStorageLock<T>(work: () => Promise<T>): Promise<T> {
  const pending = serial.then(work, work);
  serial = pending.then(() => {}, () => {});
  return pending;
}
export const getStorageUser = () => userId;
export function setStorageUser(uid: string | null) { userId = uid; }
export function registerSyncSink(next: typeof sink) { sink = next; }
export const scopedKey = (key: string, uid: string | null = userId) =>
  uid && !deviceKeys.has(key) ? `user:${uid}:${key}` : key;

export async function rawGet<T>(key: string): Promise<T | undefined> {
  try { return await get<T>(key) ?? memory.get(key) as T | undefined; }
  catch { return memory.get(key) as T | undefined; }
}
export async function rawSet(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  await set(key, value);
}
export async function safeGet<T>(key: string, uid: string | null = userId): Promise<T | undefined> {
  if (typeof window === "undefined") return undefined;
  return rawGet<T>(scopedKey(key, uid));
}
async function write(key: string, updater: (value: unknown) => unknown, remove = false, uid: string | null = userId): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const target = scopedKey(key, uid);
  return withStorageLock(async () => {
    const before = await rawGet(target);
    let next: unknown;
    try {
      if (remove) { await del(target); memory.delete(target); }
      else {
        await update(target, (value) => {
          next = updater(structuredClone(value ?? before));
          return next;
        });
        memory.set(target, next);
      }
      if (uid) await sink?.(uid, key, before, next);
      return true;
    } catch (error) {
      if (!remove && next === undefined) next = updater(structuredClone(before));
      if (remove) memory.delete(target); else memory.set(target, next);
      console.warn("Sauvegarde locale incomplète", error);
      return false;
    }
  });
}
export const safeSet = <T>(key: string, value: T, uid: string | null = userId) => write(key, () => value, false, uid);
export const safeUpdate = <T>(key: string, updater: (value: T | undefined) => T, uid: string | null = userId) =>
  write(key, (value) => updater(value as T | undefined), false, uid);
export const safeDel = (key: string, uid: string | null = userId) => write(key, () => undefined, true, uid);

export function notifyStorageChanged(key?: string) {
  window.dispatchEvent(new CustomEvent<string | undefined>("liela:storage-changed", { detail: key }));
}
