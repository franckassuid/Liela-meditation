import { getSessionById, resolveSessionAsset } from "@/lib/sessions";

/**
 * SessionDownloader — Real Cache Storage download engine for Liela
 */

export type DownloadStatus = "idle" | "downloading" | "available" | "error" | "cancelled";

export interface DownloadProgress {
  sessionId: string;
  bytesLoaded: number;
  bytesTotal: number;
  filesDone: number;
  filesTotal: number;
}

export const SESSIONS_CACHE_NAME = "liela-sessions-v1";

const activeDownloads = new Map<string, AbortController>();

export function isDownloadInProgress(sessionId: string): boolean {
  return activeDownloads.has(sessionId);
}

export function abortDownload(sessionId: string): void {
  activeDownloads.get(sessionId)?.abort();
  // Keep ownership until cleanup finishes, so a retry cannot race with it.
}

export async function downloadSession(
  sessionId: string,
  onProgress: (progress: DownloadProgress) => void
): Promise<{ cachedUrls: string[]; sizeBytes: number; manifestVersion: number }> {
  if (activeDownloads.has(sessionId)) {
    throw new Error(`Download already in progress for ${sessionId}`);
  }

  const controller = new AbortController();
  activeDownloads.set(sessionId, controller);
  const { signal } = controller;
  let cache: Cache | undefined;
  const createdUrls: string[] = [];

  try {
    // 1. Request persistent storage (best effort)
    if (typeof navigator !== "undefined" && "storage" in navigator && navigator.storage.persist) {
      try { await navigator.storage.persist(); } catch { /* ignore */ }
    }

    // 2. Fetch the session manifest
    const manifestUrl = `/sessions/${sessionId}/session.json`;
    const catalogSession = getSessionById(sessionId);
    const manifest = catalogSession || await (async () => {
      const response = await fetch(manifestUrl, { signal });
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status} for ${sessionId}`);
      return await response.json() as { version?: number; rmsUrl?: string; audio?: {
        voice?: string; voices?: Record<string, string>; music?: { file?: string }; ambience?: { file?: string }; cues?: { file?: string }; final?: string;
      } };
    })();
    const manifestVersion: number = manifest.version ?? 1;

    // 3. Build file list from manifest — only present tracks
    const urlsToCache: string[] = [];
    const resolve = (p: string) =>
      resolveSessionAsset(sessionId, p);

    if (!catalogSession) urlsToCache.push(manifestUrl);
    if (manifest.rmsUrl || !catalogSession?.assetsBaseUrl) urlsToCache.push(manifest.rmsUrl || resolve("audio/rms.json"));

    for (const voice of Object.values(manifest.audio?.voices || {})) urlsToCache.push(resolve(voice));
    if (manifest.audio?.voice) urlsToCache.push(resolve(manifest.audio.voice));
    if (manifest.audio?.music?.file) urlsToCache.push(resolve(manifest.audio.music.file));
    if (manifest.audio?.ambience?.file) urlsToCache.push(resolve(manifest.audio.ambience.file));
    if (manifest.audio?.cues?.file) urlsToCache.push(resolve(manifest.audio.cues.file));
    if (manifest.audio?.final) urlsToCache.push(resolve(manifest.audio.final));

    const files = [...new Set(urlsToCache)];
    const filesTotal = files.length;
    let filesDone = 0;
    let bytesLoaded = 0;
    let bytesTotal = 0;

    // 4. Pre-flight HEAD to compute total size (best effort)
    for (const url of files) {
      if (signal.aborted) break;
      try {
        const headRes = await fetch(url, { method: "HEAD", signal });
        const cl = parseInt(headRes.headers.get("content-length") ?? "0", 10);
        if (!isNaN(cl) && cl > 0) bytesTotal += cl;
      } catch { /* indeterminate */ }
    }

    onProgress({ sessionId, bytesLoaded, bytesTotal, filesDone, filesTotal });

    signal.throwIfAborted();
    cache = await caches.open(SESSIONS_CACHE_NAME);
    const cachedUrls: string[] = [];
    let totalSizeBytes = 0;

    // 5. Download files one by one
    for (const url of files) {
      signal.throwIfAborted();

      // Roll back only new entries; preserve files from an earlier download.
      if (!(await cache.match(url))) createdUrls.push(url);

      const bytesForFile = await fetchAndCache(url, cache, signal, (loaded) => {
        onProgress({
          sessionId,
          bytesLoaded: bytesLoaded + loaded,
          bytesTotal,
          filesDone,
          filesTotal,
        });
      });

      bytesLoaded += bytesForFile;
      totalSizeBytes += bytesForFile;
      filesDone++;
      cachedUrls.push(url);

      onProgress({ sessionId, bytesLoaded, bytesTotal, filesDone, filesTotal });
    }

    // 6. Verify all files in cache
    signal.throwIfAborted();
    const missing = await verifyInCache(cache, cachedUrls);
    if (missing.length > 0) {
      throw new Error(`Verification failed: ${missing.length} file(s) missing`);
    }
    signal.throwIfAborted();

    return { cachedUrls, sizeBytes: totalSizeBytes, manifestVersion };

  } catch (err) {
    if (cache) await cleanupPartial(cache, createdUrls);
    throw err;
  } finally {
    activeDownloads.delete(sessionId);
  }
}

export async function removeSessionFiles(cachedUrls: string[]): Promise<void> {
  if (!("caches" in globalThis)) return;
  try {
    const cache = await caches.open(SESSIONS_CACHE_NAME);
    for (const url of cachedUrls) {
      try { await cache.delete(url); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

export async function verifySessionInCache(cachedUrls: string[]): Promise<boolean> {
  if (!("caches" in globalThis) || cachedUrls.length === 0) return false;
  try {
    const cache = await caches.open(SESSIONS_CACHE_NAME);
    for (const url of cachedUrls) {
      const match = await cache.match(url);
      if (!match) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function fetchAndCache(
  url: string,
  cache: Cache,
  signal: AbortSignal,
  onFileProgress: (loaded: number) => void
): Promise<number> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status} fetching ${url}`), { name: "DownloadError" });
  }

  if (!response.body) throw new Error(`Empty response body fetching ${url}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onFileProgress(loaded);
    }
  } finally {
    reader.releaseLock();
  }
  signal.throwIfAborted();

  const buffer = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const headers = new Headers({
    "content-type": response.headers.get("content-type") ?? "application/octet-stream",
    "content-length": String(loaded),
    "accept-ranges": "bytes",
  });
  await cache.put(url, new Response(buffer.buffer, { status: 200, headers }));

  return loaded;
}

async function verifyInCache(cache: Cache, urls: string[]): Promise<string[]> {
  const missing: string[] = [];
  for (const url of urls) {
    const match = await cache.match(url);
    if (!match) missing.push(url);
  }
  return missing;
}

async function cleanupPartial(cache: Cache, urls: string[]): Promise<void> {
  for (const url of urls) {
    try { await cache.delete(url); } catch { /* ignore */ }
  }
}
