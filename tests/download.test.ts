import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { abortDownload, downloadSession, isDownloadInProgress, verifySessionInCache } from "../src/lib/download/SessionDownloader";

const sessionId = "test-session";
const root = `/sessions/${sessionId}`;
const entries = new Map<string, Response>();
const originalFetch = globalThis.fetch;
const originalCaches = Object.getOwnPropertyDescriptor(globalThis, "caches");
let failUrl: string | undefined;
let failPut = false;

beforeEach(() => {
  entries.clear();
  failUrl = undefined;
  failPut = false;
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: {
      open: async () => ({
        match: async (url: string) => entries.get(url)?.clone(),
        put: async (url: string, response: Response) => {
          if (failPut && url.endsWith("voice.m4a")) throw new DOMException("Full", "QuotaExceededError");
          entries.set(url, response.clone());
        },
        delete: async (url: string) => entries.delete(url),
      }),
    },
  });
  globalThis.fetch = async (input, init) => {
    init?.signal?.throwIfAborted();
    const url = String(input);
    if (init?.method === "HEAD") return new Response(null, { headers: { "content-length": "4" } });
    if (url === failUrl) return new Response("Unavailable", { status: 503 });
    if (url.endsWith("session.json")) return Response.json({ version: 2, audio: { voice: "audio/voice.m4a" } });
    return new Response("data");
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalCaches) Object.defineProperty(globalThis, "caches", originalCaches);
  else Reflect.deleteProperty(globalThis, "caches");
});

test("downloads all assets and reports their actual size", async () => {
  const result = await downloadSession(sessionId, () => {});
  assert.equal(result.manifestVersion, 2);
  assert.equal(result.cachedUrls.length, 3);
  assert.equal(await verifySessionInCache(result.cachedUrls), true);
  const sizes = await Promise.all([...entries.values()].map(async (r) => (await r.clone().arrayBuffer()).byteLength));
  assert.equal(result.sizeBytes, sizes.reduce((sum, size) => sum + size, 0));
  assert.equal(isDownloadInProgress(sessionId), false);
});

test("removes partial files after a network failure and allows retry", async () => {
  failUrl = `${root}/audio/voice.m4a`;
  await assert.rejects(downloadSession(sessionId, () => {}), /HTTP 503/);
  assert.equal(entries.size, 0);
  assert.equal(isDownloadInProgress(sessionId), false);
  failUrl = undefined;
  await downloadSession(sessionId, () => {});
  assert.equal(entries.size, 3);
});

test("holds the session lock through cancellation and removes partial files", async () => {
  let retry: Promise<unknown> | undefined;
  const pending = downloadSession(sessionId, (progress) => {
    if (progress.filesDone === 1 && !retry) {
      abortDownload(sessionId);
      assert.equal(isDownloadInProgress(sessionId), true);
      retry = assert.rejects(downloadSession(sessionId, () => {}), /already in progress/);
    }
  });
  await assert.rejects(pending, { name: "AbortError" });
  await retry;
  assert.equal(entries.size, 0);
  assert.equal(isDownloadInProgress(sessionId), false);
});

test("cancellation during the final file cannot report success", async () => {
  await assert.rejects(downloadSession(sessionId, (progress) => {
    if (progress.filesDone === progress.filesTotal) abortDownload(sessionId);
  }), { name: "AbortError" });
  assert.equal(entries.size, 0);
});

test("cancellation while reading a response removes earlier files", async () => {
  let previousBytes = 0;
  await assert.rejects(downloadSession(sessionId, (progress) => {
    if (progress.filesDone === 2 && progress.bytesLoaded > previousBytes) abortDownload(sessionId);
    previousBytes = progress.bytesLoaded;
  }), { name: "AbortError" });
  assert.equal(entries.size, 0);
});

test("quota errors preserve previously cached files", async () => {
  entries.set(`${root}/audio/rms.json`, new Response("existing"));
  entries.set("/sessions/another/audio/voice.m4a", new Response("other session"));
  failPut = true;
  await assert.rejects(downloadSession(sessionId, () => {}), { name: "QuotaExceededError" });
  assert.deepEqual([...entries.keys()].sort(), [`${root}/audio/rms.json`, "/sessions/another/audio/voice.m4a"].sort());
  assert.equal(isDownloadInProgress(sessionId), false);
});
