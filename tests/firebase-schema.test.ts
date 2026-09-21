import assert from "node:assert/strict";
import { test } from "node:test";
import { changesFor, overlayPending, toDocuments } from "../src/lib/firebase/schema";
import { ListeningTracker } from "../src/lib/audio/ListeningTracker";

test("favorite deletion affects only its document", () => {
  const before = [{ sessionId: "a", addedAt: "today" }, { sessionId: "b", addedAt: "today" }];
  const writes = changesFor("liela_favorites", before, before.slice(1));
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, "favorites/a");
  assert.equal(writes[0].value, null);
});

test("repeated history updates keep one document per listening event", () => {
  const entry = { sessionId: "a", startedAt: "2026-09-18T12:00:00Z", lastPosition: 10 };
  const first = toDocuments("liela_history", [entry]);
  const second = toDocuments("liela_history", [{ ...entry, lastPosition: 30 }]);
  assert.deepEqual(Object.keys(first), Object.keys(second));
});

test("queued changes survive remote snapshots and guest import preserves existing cloud data", () => {
  const cloud = { "favorites/a": { sessionId: "a", addedAt: "cloud" } };
  const pending = changesFor("liela_favorites", [], [{ sessionId: "a", addedAt: "guest" }]);
  assert.deepEqual(overlayPending("liela_favorites", cloud, pending), [{ sessionId: "a", addedAt: "guest" }]);
  assert.deepEqual(overlayPending("liela_favorites", cloud, pending.map((item) => ({ ...item, createOnly: true }))), [{ sessionId: "a", addedAt: "cloud" }]);
});

test("device downloads and open-session state never produce cloud writes", () => {
  assert.deepEqual(changesFor("liela_downloads", [], [{ sessionId: "a", cachedUrls: ["file"] }]), []);
  assert.deepEqual(changesFor("liela_in_progress", null, { sessionId: "a" }), []);
  assert.deepEqual(toDocuments("liela_settings", { resumePlayback: true, accountUser: { email: "fake" } }), { "preferences/settings": { resumePlayback: true } });
});

test("trimming an oversized personalization history does not enqueue a deletion storm", () => {
  const events = Array.from({ length: 250 }, (_, index) => ({
    id: `event-${index}`,
    type: "recommendation",
    createdAt: new Date(2026, 8, 21, 12, 0, index).toISOString(),
  }));
  const next = [{ id: "event-new", type: "recommendation", createdAt: new Date().toISOString() }, ...events].slice(0, 200);
  const writes = changesFor("liela_events", events, next);

  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, "events/event-new");
  assert.notEqual(writes[0].value, null);
});

test("listened duration excludes seeks and pauses while counting replayed passages", () => {
  const tracker = new ListeningTracker();
  tracker.start(0, 0);
  tracker.update(10, 10000);
  tracker.update(25, 10100); // seek
  tracker.stop(30, 15100);
  tracker.start(30, 60000); // pause
  tracker.update(35, 65000);
  tracker.update(20, 65100); // rewind
  tracker.update(25, 70100);
  assert.equal(tracker.seconds, 25);
});
