/**
 * Liela Service Worker
 *
 * Two separate caches:
 *  - liela-shell-v12  : UI assets, scripts, styles, Next.js pages
 *  - liela-sessions-v1: downloaded session audio (never cleared by shell updates)
 *
 * Fetch strategy:
 *  - Session files (/sessions/**) → Cache first (sessions cache) with Range support
 *                                   → Network fallback if not cached
 *  - Everything else              → Network first → Shell cache fallback
 *
 * Range request handling:
 *  When a session file is in the cache and the request has a Range header,
 *  we slice the ArrayBuffer and return a proper 206 Partial Content response.
 *  This is required for audio seeking in Safari / iOS WebKit.
 */

const SHELL_CACHE = "liela-shell-v12";
const SESSIONS_CACHE = "liela-sessions-v1";

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", () => {
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          // Only touch Liela-owned caches (prefix "liela-")
          if (!key.startsWith("liela-")) return;
          // Never delete the sessions cache
          if (key === SESSIONS_CACHE || key === "liela-push-state-v1") return;
          // Delete any old shell cache version
          if (key !== SHELL_CACHE) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept same-origin GET requests
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  // Remote CDN audio is cached by the downloader under its absolute URL.
  if (url.origin !== self.location.origin) {
    event.respondWith(handleSessionRequest(request, url));
    return;
  }

  const isSessionFile = url.pathname.startsWith("/sessions/");

  if (isSessionFile) {
    event.respondWith(handleSessionRequest(request, url));
  } else {
    event.respondWith(handleShellRequest(request));
  }
});

// ── Session file handler ──────────────────────────────────────────────────────

async function handleSessionRequest(request, url) {
  // Look up the file in the sessions cache (match by pathname, ignore Range headers)
  let cache;
  try {
    cache = await caches.open(SESSIONS_CACHE);
  } catch {
    return fetch(request);
  }

  const cached = await cache.match(url.pathname.startsWith("/") ? request.url : url.href);

  if (cached) {
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      return buildRangeResponse(cached, rangeHeader);
    }
    return cached;
  }

  // Not downloaded — pass to network (native Range support for online playback)
  try {
    return await fetch(request);
  } catch {
    return new Response("Session not available offline and network unreachable", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// ── Shell request handler ─────────────────────────────────────────────────────

async function handleShellRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline — page not cached", { status: 503 });
  }
}

// ── Range response builder ────────────────────────────────────────────────────

async function buildRangeResponse(cachedResponse, rangeHeader) {
  let arrayBuffer;
  try {
    arrayBuffer = await cachedResponse.arrayBuffer();
  } catch {
    // If cloning/reading fails, return the original response (no range support)
    return cachedResponse;
  }

  const total = arrayBuffer.byteLength;

  // Parse "bytes=start-end" or "bytes=start-"
  const rangeMatch = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
  if (!rangeMatch) {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }

  const start = parseInt(rangeMatch[1], 10);
  const end = rangeMatch[2] !== "" ? Math.min(parseInt(rangeMatch[2], 10), total - 1) : total - 1;

  if (start > end || start >= total) {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }

  const sliced = arrayBuffer.slice(start, end + 1);
  const contentType = cachedResponse.headers.get("content-type") || "audio/mp4";

  return new Response(sliced, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": String(sliced.byteLength),
      "Accept-Ranges": "bytes",
    },
  });
}

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "later" || event.action === "snooze") return;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
      // A unique URL forces the home screen to recalculate its suggestion for
      // the exact moment at which the reminder was opened.
      const targetUrl = new URL(`/?from=reminder&t=${Date.now()}`, self.location.origin).href;
      for (const client of clientList) {
        if ("navigate" in client) {
          try {
            await client.navigate(targetUrl);
            return client.focus();
          } catch {
            // The existing window may not be navigable yet; open a new one below.
          }
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// Firebase is bundled locally; our notificationclick handler is registered first.
importScripts("/push-worker.js");
