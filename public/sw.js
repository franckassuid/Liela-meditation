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
