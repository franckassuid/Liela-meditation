/**
 * Liela Service Worker
 *
 * Two separate caches:
 *  - liela-shell-v10  : UI assets, scripts, styles, Next.js pages
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

const SHELL_CACHE = "liela-shell-v10";
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
          if (key === SESSIONS_CACHE) return;
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
  if (url.origin !== self.location.origin) return;

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
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});

// ── Scheduled reminders ───────────────────────────────────────────────────────

let swReminderTimer = null;

self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SCHEDULE_REMINDER") {
    if (swReminderTimer) {
      clearTimeout(swReminderTimer);
      swReminderTimer = null;
    }

    const { delayMs, title, options } = event.data;
    if (typeof delayMs === "number" && delayMs > 0) {
      const showNotifPromise = new Promise((resolve) => {
        swReminderTimer = setTimeout(async () => {
          try {
            await self.registration.showNotification(
              title || "Liela · Moment de respiration",
              {
                body: "Prenez 5 minutes pour vous recentrer et faire une pause.",
                icon: "/notification-icon.png",
                badge: "/badge-monochrome.png",
                tag: "liela-daily-reminder",
                vibrate: [120, 80, 120],
                renotify: true,
                actions: [
                  { action: "start-session", title: "Commencer ma séance" },
                  { action: "snooze", title: "Reporter" },
                ],
                ...options,
              }
            );
          } catch (e) {
            console.error("Erreur d'affichage notif SW:", e);
          } finally {
            resolve();
          }
        }, delayMs);
      });

      if (delayMs <= 60000 && event.waitUntil) {
        event.waitUntil(showNotifPromise);
      }
    }
  }

  if (event.data.type === "CANCEL_REMINDER") {
    if (swReminderTimer) {
      clearTimeout(swReminderTimer);
      swReminderTimer = null;
    }
  }
});
