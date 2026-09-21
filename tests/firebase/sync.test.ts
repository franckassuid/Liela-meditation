import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, terminate } from "firebase/firestore";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { storage } from "../../src/lib/storage";
import { getStorageUser, rawGet, rawSet, scopedKey, setStorageUser } from "../../src/lib/storage/local";
import { getSyncStatus, initializeSync, retrySync, startUserSync } from "../../src/lib/firebase/sync";

async function eventually(check: () => Promise<boolean>) {
  for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 50)); }
  assert.fail(`Condition not reached. Sync: ${JSON.stringify(getSyncStatus())}`);
}

test("migration, remote updates, offline queue and account isolation", async () => {
  const env = await initializeTestEnvironment({ projectId: "demo-liela", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
  const app = initializeApp({ projectId: "demo-liela", apiKey: "test-key" }, "sync-test");
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let online = true;
  Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { get onLine() { return online; } } });
  let stop: (() => void) | undefined;
  try {
    initializeSync();
    setStorageUser(null);
    await storage.setProfile({ firstName: "Invité", onboardingCompleted: true });
    await storage.addFavorite("guest-session");
    const { user } = await createUserWithEmailAndPassword(auth, `sync-${Date.now()}@example.test`, "example-password");
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `users/${user.uid}`), { userId: user.uid, firstName: "Cloud", createdAt: new Date().toISOString(), language: "fr", level: "advanced", onboardingCompleted: true });
    });
    setStorageUser(user.uid);
    const sync = await startUserSync(db, user.uid);
    stop = sync.stop;
    await sync.ready;
    await eventually(async () => (await getDoc(doc(db, `users/${user.uid}/favorites/guest-session`))).exists());
    await eventually(async () => (await storage.getProfile()).firstName === "Cloud");
    assert.equal(await rawGet("liela_migration_owner"), user.uid);

    await storage.addFavorite("second-session");
    await eventually(async () => (await getDoc(doc(db, `users/${user.uid}/favorites/second-session`))).exists());
    await storage.removeFavorite("second-session");
    await eventually(async () => !(await getDoc(doc(db, `users/${user.uid}/favorites/second-session`))).exists());

    await env.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), `users/${user.uid}/favorites/other-device`), { userId: user.uid, sessionId: "other-device", addedAt: new Date().toISOString() }); });
    await eventually(async () => (await storage.getFavorites()).some((item) => item.sessionId === "other-device"));

    // Reminder changes must replace the complete settings document in Firestore.
    await storage.setSettings({ dailyReminderEnabled: true, dailyReminderTime: "09:30" });
    await eventually(async () => {
      const settings = (await getDoc(doc(db, `users/${user.uid}/preferences/settings`))).data();
      return settings?.dailyReminderEnabled === true && settings?.dailyReminderTime === "09:30";
    });

    online = false;
    await storage.addFavorite("offline-session");
    assert.ok((await rawGet<Record<string, unknown>>(`user:${user.uid}:firestore-outbox`))?.["favorites/offline-session"]);
    stop();
    // Restarting the synchronizer simulates reloading while the device remains offline.
    const resumed = await startUserSync(db, user.uid);
    stop = resumed.stop;
    await resumed.ready;
    assert.ok((await storage.getFavorites()).some((item) => item.sessionId === "offline-session"));
    online = true;
    retrySync();
    await eventually(async () => (await getDoc(doc(db, `users/${user.uid}/favorites/offline-session`))).exists());

    // Every nested async write retains the account that initiated it.
    const history = storage.addHistoryItem({ sessionId: "scope-test", startedAt: new Date().toISOString(), duration: 180, lastPosition: 12, completed: false });
    setStorageUser("different-user");
    await history;
    assert.equal(getStorageUser(), "different-user");
    assert.deepEqual(await storage.getHistory(), []);
    assert.equal((await rawGet<Array<{ sessionId: string }>>(scopedKey("liela_history", user.uid)))?.[0].sessionId, "scope-test");
    await rawSet("user:different-user:liela_profile", { firstName: "Different" });
    stop();
    await signOut(auth);
  } finally {
    stop?.();
    setStorageUser(null);
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    await terminate(db);
    await deleteApp(app);
    await env.cleanup();
  }
});
