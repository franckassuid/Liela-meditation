import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { storage, DEFAULT_SETTINGS, type SessionHistoryItem } from "../src/lib/storage";
import { rawSet, registerSyncSink, scopedKey, setStorageUser } from "../src/lib/storage/local";
import { changesFor, type PendingWrite } from "../src/lib/firebase/schema";
import { sendTestReminderNotification, scheduleTestNotificationInSeconds, syncScheduledReminder } from "../src/lib/notifications";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
after(() => {
  registerSyncSink(undefined);
  setStorageUser(null);
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else Reflect.deleteProperty(globalThis, "navigator");
});
const item = (position: number): SessionHistoryItem => ({
  sessionId: "test-session", startedAt: "2026-09-21T10:00:00.000Z", duration: 600,
  lastPosition: position, listenedSeconds: position, completed: position === 600,
  lastListenedAt: new Date(Date.parse("2026-09-21T10:00:00.000Z") + position * 1000).toISOString(),
});

test("ten minutes of device checkpoints require only 22 cloud writes including completion", async () => {
  setStorageUser(crypto.randomUUID());
  const writes: PendingWrite[] = [];
  registerSyncSink(async (_uid, key, before, after) => { writes.push(...changesFor(key, before, after)); });
  for (let second = 5; second <= 600; second += 5) {
    assert.equal(await storage.savePlaybackCheckpoint(item(second), second % 60 === 0), true);
  }
  await storage.addHistoryItem({ ...item(600), completedAt: "2026-09-21T10:10:00.000Z" });
  await storage.setInProgressSession(null);
  assert.equal(writes.length, 22);
  assert.equal((await storage.getHistory()).length, 1);
  assert.equal((await storage.getSessionProgress("test-session"))?.completed, true);
});

test("newer local position survives a stale cloud snapshot and checkpoints retain their owner", async () => {
  const uid = crypto.randomUUID();
  setStorageUser(uid);
  await storage.savePlaybackCheckpoint(item(60), true);
  await storage.savePlaybackCheckpoint(item(65));
  await rawSet(scopedKey("liela_progress", uid), [item(60)]);
  assert.equal((await storage.getSessionProgress("test-session"))?.lastPosition, 65);
  const save = storage.savePlaybackCheckpoint(item(70), true);
  setStorageUser("another-account");
  await save;
  assert.equal(await storage.getSessionProgress("test-session"), null);
  setStorageUser(uid);
  assert.equal((await storage.getSessionProgress("test-session"))?.lastPosition, 70);
});

test("guests cannot enable reminders and legacy guest schedules are cancelled", async () => {
  setStorageUser(null);
  await rawSet("liela_settings", { ...DEFAULT_SETTINGS, dailyReminderEnabled: true });
  assert.equal((await storage.getSettings()).dailyReminderEnabled, false);
  assert.equal(await storage.setSettings({ dailyReminderEnabled: true }), false);
  assert.equal(await sendTestReminderNotification(), false);
  assert.equal(await scheduleTestNotificationInSeconds(), false);
  const messages: unknown[] = [];
  let closed = false;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
    serviceWorker: { getRegistration: async () => ({
      active: { postMessage: (message: unknown) => messages.push(message) },
      getNotifications: async () => [{ tag: "liela-daily-reminder", close: () => { closed = true; } }],
    }) },
  } });
  await syncScheduledReminder({ ...DEFAULT_SETTINGS, dailyReminderEnabled: true });
  assert.deepEqual(messages, [{ type: "CANCEL_REMINDER" }]);
  assert.equal(closed, true);
  setStorageUser(crypto.randomUUID());
  assert.equal(await storage.setSettings({ dailyReminderEnabled: true, dailyReminderTime: "09:30" }), true);
  assert.equal((await storage.getSettings()).dailyReminderTime, "09:30");
  assert.equal((await storage.getSettings()).dailyReminderEnabled, true);
});
