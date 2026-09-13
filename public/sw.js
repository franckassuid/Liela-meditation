const CACHE_NAME = "liela-v4";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // IMPORTANT: Never intercept media/audio or Byte-Range requests in Service Worker!
  // Audio files (.m4a, .mp3, .wav, .opus, etc.) are loaded on demand and require native
  // HTTP 206 Range support for seeking in mobile Safari and Chrome.
  const isAudioOrRangeRequest =
    event.request.headers.get("range") ||
    event.request.destination === "audio" ||
    url.includes("/audio/") ||
    url.includes("/sessions/") ||
    /\.(m4a|mp3|wav|ogg|opus|aac|webm|flac)(\?.*)?$/i.test(url);

  if (isAudioOrRangeRequest) {
    return; // Pass through directly to native browser network
  }

  // Network-first strategy for UI assets to ensure updates are visible immediately
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === "GET") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Gestion du clic sur une notification (ouverture ou focus de l'application)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});

// Gestion des rappels programmés en tâche de fond
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
      // Déclenchement automatique par le Service Worker
      swReminderTimer = setTimeout(async () => {
        try {
          await self.registration.showNotification(
            title || "Liela · Moment de respiration",
            options || {
              body: "Prenez 5 minutes pour vous recentrer et faire une pause.",
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: "liela-daily-reminder",
            }
          );
        } catch (e) {
          console.error("Erreur d'affichage notif SW:", e);
        }
      }, delayMs);
    }
  }

  if (event.data.type === "CANCEL_REMINDER") {
    if (swReminderTimer) {
      clearTimeout(swReminderTimer);
      swReminderTimer = null;
    }
  }
});
