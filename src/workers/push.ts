/// <reference lib="webworker" />
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { firebaseConfig } from "../lib/firebase/config";

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = "liela-push-state-v1";
const ownerUrl = new URL("/__push_owner", sw.location.origin).href;
let serial = Promise.resolve();
async function setOwner(uid: string | null) {
  const cache = await caches.open(CACHE);
  await cache.put(ownerUrl, new Response(uid || ""));
}
async function display(data: Record<string, string> | undefined) {
  if (!data?.userId || !data.slot) return;
  const cache = await caches.open(CACHE);
  if (await (await cache.match(ownerUrl))?.text() !== data.userId) return;
  const lastUrl = new URL("/__push_last", sw.location.origin).href;
  const identity = `${data.userId}:${data.slot}`;
  if (await (await cache.match(lastUrl))?.text() === identity) return;
  await cache.put(lastUrl, new Response(identity));
  await sw.registration.showNotification("Liela · Moment de respiration", {
    body: "Prenez quelques minutes pour vous recentrer et faire une pause.",
    icon: "/notification-icon.png", badge: "/badge-monochrome.png",
    tag: "liela-daily-reminder", data: { url: "/?from=reminder" },
    actions: [{ action: "start-session", title: "Commencer ma séance" }],
  } as NotificationOptions & { actions: { action: string; title: string }[] });
}
sw.addEventListener("message", (event) => {
  if (event.data?.type === "PUSH_OWNER") {
    serial = serial.catch(() => {}).then(() => setOwner(typeof event.data.uid === "string" ? event.data.uid : null));
    event.waitUntil(serial.then(() => event.ports[0]?.postMessage({ ok: true })));
  }
  if (event.data?.type === "DISPLAY_PUSH") {
    serial = serial.catch(() => {}).then(() => display(event.data.data));
    event.waitUntil(serial);
  }
});
const messaging = getMessaging(initializeApp(firebaseConfig));
onBackgroundMessage(messaging, payload => {
  serial = serial.catch(() => {}).then(() => display(payload.data));
  return serial;
});
