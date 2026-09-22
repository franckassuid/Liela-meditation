import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, where, deleteDoc, serverTimestamp, Timestamp, deleteField } from "firebase/firestore";
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-liela", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
});
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { await env?.cleanup(); });
const profile = { userId: "alice", firstName: "Alice", createdAt: "2026-09-18T12:00:00Z", language: "fr", level: "beginner", onboardingCompleted: true };
const favorite = { userId: "alice", sessionId: "session-1", addedAt: "2026-09-18T12:00:00Z" };
const history = { userId: "alice", sessionId: "session-1", startedAt: "2026-09-18T12:00:00Z", lastPosition: 10, duration: 180, completed: false, listenedSeconds: 8 };

test("owners can save their profile, preferences, favorites, progress and feedback", async () => {
  const db = env.authenticatedContext("alice").firestore();
  const docs = {
    "users/alice": profile,
    "users/alice/preferences/audio": { userId: "alice", voice: "Algenib", voiceVolume: 1, musicVolume: 0.5, ambienceVolume: 0.5, musicEnabled: true, ambienceEnabled: false },
    "users/alice/favorites/session-1": favorite,
    "users/alice/history/listen-1": history,
    "users/alice/progress/session-1": history,
    "users/alice/feedback/listen-1": { userId: "alice", sessionId: "session-1", startedAt: history.startedAt, createdAt: history.startedAt, rating: "useful" },
    "users/alice/events/choice-1": { userId: "alice", id: "choice-1", type: "duration_selected", createdAt: history.startedAt, durationMinutes: 5 },
  };
  for (const [path, value] of Object.entries(docs)) {
    await assertSucceeds(setDoc(doc(db, path), value));
    await assertSucceeds(getDoc(doc(db, path)));
  }
});

test("another user and unauthenticated clients cannot read, list or modify private data", async () => {
  await env.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), "users/alice/favorites/session-1"), favorite); });
  for (const db of [env.authenticatedContext("bob").firestore(), env.unauthenticatedContext().firestore()]) {
    await assertFails(getDoc(doc(db, "users/alice/favorites/session-1")));
    await assertFails(getDocs(collection(db, "users/alice/favorites")));
    await assertFails(setDoc(doc(db, "users/alice"), profile));
    await assertFails(deleteDoc(doc(db, "users/alice/favorites/session-1")));
  }
});

test("profile setup accepts optional answers and rejects unsupported values", async () => {
  const db = env.authenticatedContext("alice").firestore();
  const ref = doc(db, "users/alice");
  await assertSucceeds(setDoc(ref, { ...profile, profileSetupCompleted: true, primarySituation: "trouver-le-sommeil", preferredDurationMinutes: 5 }));
  await assertSucceeds(setDoc(ref, { ...profile, primarySituation: null, preferredDurationMinutes: 0 }));
  await assertSucceeds(setDoc(ref, profile)); // Existing profiles remain valid.
  await assertFails(setDoc(ref, { ...profile, primarySituation: "unknown" }));
  await assertFails(setDoc(ref, { ...profile, preferredDurationMinutes: 900 }));
  await assertFails(setDoc(ref, { ...profile, profileSetupCompleted: "yes" }));
  await assertFails(setDoc(doc(env.authenticatedContext("bob").firestore(), "users/alice"), { ...profile, profileSetupCompleted: true }));
});

test("identity spoofing, invalid progress and injecting premium fields are rejected", async () => {
  const db = env.authenticatedContext("alice").firestore();
  await assertFails(setDoc(doc(db, "users/alice"), { ...profile, userId: "bob" }));
  await assertFails(setDoc(doc(db, "users/alice"), { ...profile, premium: true }));
  await assertFails(setDoc(doc(db, "users/alice/progress/session-1"), { ...history, lastPosition: 999 }));
  await assertFails(setDoc(doc(db, "users/alice/preferences/audio"), { userId: "alice", voiceVolume: 99 }));
  await assertFails(setDoc(doc(db, "users/alice/entitlements/current"), { plan: "premium", status: "active", rights: ["all"] }));
});

test("only published catalogue entries are public and clients cannot edit them", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "sessions/public"), { published: true });
    await setDoc(doc(context.firestore(), "sessions/draft"), { published: false });
    await setDoc(doc(context.firestore(), "users/alice/entitlements/current"), { plan: "premium" });
  });
  const guest = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(guest, "sessions/public")));
  await assertSucceeds(getDocs(query(collection(guest, "sessions"), where("published", "==", true))));
  await assertFails(getDoc(doc(guest, "sessions/draft")));
  await assertFails(getDocs(collection(guest, "sessions")));
  await assertFails(setDoc(doc(env.authenticatedContext("alice").firestore(), "sessions/public"), { published: true }));
  await assertSucceeds(getDoc(doc(env.authenticatedContext("alice").firestore(), "users/alice/entitlements/current")));
  await assertFails(getDoc(doc(env.authenticatedContext("bob").firestore(), "users/alice/entitlements/current")));
});

test("push schedules are private and server delivery fields cannot be forged", async () => {
  const alice = env.authenticatedContext("alice").firestore();
  const ref = doc(alice, "reminderSchedules/alice");
  const schedule = { userId: "alice", time: "09:30", days: ["lun", "mar"], timeZone: "Europe/Paris", nextAt: Timestamp.fromMillis(Date.now() + 60_000), updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(ref, schedule));
  await assertFails(setDoc(ref, { ...schedule, lastAttemptDate: "2026-09-22" }));
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "reminderSchedules/alice"), { lastAttemptDate: "2026-09-22" }, { merge: true });
  });
  await assertSucceeds(setDoc(ref, { ...schedule, time: "10:30" }, { merge: true }));
  await assertFails(setDoc(ref, { lastAttemptDate: deleteField(), updatedAt: serverTimestamp() }, { merge: true }));
  await assertSucceeds(setDoc(ref, { nextAt: deleteField(), updatedAt: serverTimestamp() }, { merge: true }));
  for (const db of [env.authenticatedContext("bob").firestore(), env.unauthenticatedContext().firestore()]) {
    await assertFails(getDoc(doc(db, "reminderSchedules/alice")));
    await assertFails(setDoc(doc(db, "reminderSchedules/alice"), schedule));
    await assertFails(deleteDoc(doc(db, "reminderSchedules/alice")));
  }
  await assertFails(getDocs(collection(alice, "reminderSchedules")));
  await assertFails(setDoc(ref, { ...schedule, time: "25:30" }, { merge: true }));
  await assertFails(setDoc(ref, { ...schedule, days: ["bad"] }, { merge: true }));
  await assertFails(setDoc(ref, { ...schedule, nextAt: Timestamp.fromMillis(0) }, { merge: true }));
});

test("only an owner can register a device and change its timestamp", async () => {
  const fid = "abcdefghijklmnopqrstuv";
  const path = `users/alice/pushDevices/${fid}`;
  const alice = env.authenticatedContext("alice").firestore();
  const payload = { userId: "alice", fid, updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(alice, path), payload));
  await assertFails(setDoc(doc(alice, path), { ...payload, userId: "bob" }));
  await assertFails(setDoc(doc(alice, path), { ...payload, fid: "wrong-id" }));
  await assertFails(setDoc(doc(alice, path), { ...payload, token: "unexpected" }));
  const bob = env.authenticatedContext("bob").firestore();
  await assertFails(setDoc(doc(bob, path), payload));
  await assertFails(getDoc(doc(bob, path)));
  await assertSucceeds(deleteDoc(doc(alice, path)));
});
