import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { storage } from "../src/lib/storage";
import { setStorageUser } from "../src/lib/storage/local";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: new EventTarget(),
});

after(() => {
  setStorageUser(null);
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

test("a recommendation refresh does not duplicate its history or personalization event", async () => {
  setStorageUser(`recommendation-test-${crypto.randomUUID()}`);

  assert.equal(await storage.addRecommendationHistory("session-a"), true);
  assert.equal(await storage.addRecommendationHistory("session-a"), true);

  assert.equal((await storage.getRecommendationHistory()).length, 1);
  assert.equal((await storage.getEvents()).filter((event) => event.type === "recommendation").length, 1);
});
