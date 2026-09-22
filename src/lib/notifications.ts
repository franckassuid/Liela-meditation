import { AppSettings, DayOfWeek } from "./storage";
import { getStorageUser } from "./storage/local";
import { nextReminderAt } from "./push/schedule";

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Récupère l'état d'autorisation actuel des notifications.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Demande la permission d'afficher des notifications au système (Android / iOS / Navigateur).
 * Déclenche immédiatement la popin native du navigateur/système.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    const perm = await Notification.requestPermission();
    return perm as NotificationPermissionState;
  } catch {
    // Repli pour les navigateurs plus anciens attendant un callback
    return new Promise((resolve) => {
      try {
        Notification.requestPermission((p) => {
          resolve(p as NotificationPermissionState);
        });
      } catch {
        resolve(Notification.permission as NotificationPermissionState);
      }
    });
  }
}

export type EnhancedNotificationOptions = NotificationOptions & {
  image?: string;
  vibrate?: number[];
  renotify?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
};

/**
 * Envoie une notification locale via le Service Worker (ou l'API Notification native).
 */
export async function sendLocalNotification(
  title: string,
  options?: EnhancedNotificationOptions
): Promise<boolean> {
  const owner = getStorageUser();
  if (!owner) return false;
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const defaultOptions: EnhancedNotificationOptions = {
    icon: "/notification-icon.png",
    badge: "/badge-monochrome.png",
    tag: "liela-daily-reminder",
    vibrate: [120, 80, 120],
    renotify: true,
    actions: [
      { action: "start-session", title: "Commencer ma séance" },
    ],
    ...options,
  };

  try {
    // Méthode recommandée sur Android / PWA : via le Service Worker
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (getStorageUser() !== owner) return false;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, defaultOptions);
        return true;
      }
    }

    // Repli sur l'API Notification standard
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.error("Erreur d'envoi de la notification:", err);
    return false;
  }
}

/**
 * Envoie une notification de confirmation ou de test pour valider que le système fonctionne sur l'appareil.
 */
export async function sendTestReminderNotification(time: string = "21:00"): Promise<boolean> {
  return sendLocalNotification("Liela · Moment de respiration", {
    body: `Test d’affichage sur cet appareil. Heure choisie : ${time}.`,
    icon: "/notification-icon.png",
    badge: "/badge-monochrome.png",
    tag: "liela-test-reminder",
    vibrate: [120, 80, 120],
    renotify: true,
    actions: [
      { action: "start-session", title: "Commencer ma séance" },
    ],
  });
}

/**
 * Programme un test de notification dans X secondes (permet de tester l'écran verrouillé).
 */
export async function scheduleTestNotificationInSeconds(seconds: number = 10): Promise<boolean> {
  const owner = getStorageUser();
  if (!owner || getNotificationPermission() !== "granted") return false;
  setTimeout(() => { if (getStorageUser() === owner) void sendTestReminderNotification(); }, seconds * 1000);
  return true;
}

/**
 * Mapping des jours de la semaine vers les clés DayOfWeek
 */
export const DAY_MAP: Record<number, DayOfWeek> = {
  0: "dim",
  1: "lun",
  2: "mar",
  3: "mer",
  4: "jeu",
  5: "ven",
  6: "sam",
};

export interface ReminderCalculation {
  delayMs: number;
  nextDate: Date;
  isImmediateCatchup?: boolean;
}

/**
 * Calcule le délai en millisecondes jusqu'au prochain rappel configuré.
 * Si l'heure cible correspond à la minute en cours (ex: l'utilisateur teste à 10:35:15 avec 10:35),
 * le rappel est déclenché quasi-immédiatement (délai de 1 à 2 secondes).
 */
export function getMillisecondsUntilNextReminder(
  timeStr: string,
  customDays: DayOfWeek[] = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
): ReminderCalculation | null {
  const now = new Date();
  const nextDate = nextReminderAt({ time: timeStr, days: customDays, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }, now);
  return nextDate ? { nextDate, delayMs: nextDate.getTime() - now.getTime() } : null;
}

/**
 * Formate un texte lisible pour l'utilisateur sur le prochain rappel
 */
export function formatNextReminderDescription(
  timeStr: string,
  customDays: DayOfWeek[] = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
): string {
  const next = getMillisecondsUntilNextReminder(timeStr, customDays);
  if (!next) return "Aucun jour sélectionné";
  return next.nextDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + ` à ${timeStr}`;
}

/** Cancel legacy local schedules without touching a user's server schedule. */
export async function cancelLocalReminder(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  registration.active?.postMessage({ type: "CANCEL_REMINDER" });
  const notifications = await registration.getNotifications({ includeTriggered: true } as GetNotificationOptions).catch(() => []);
  notifications.filter(notification => notification.tag.startsWith("liela-")).forEach(notification => notification.close());
}

export async function syncScheduledReminder(settings: AppSettings): Promise<void> {
  if (typeof window === "undefined") return;
  await cancelLocalReminder();
  if (!getStorageUser()) return;
  const { syncPushReminder } = await import("./push/client");
  await syncPushReminder(settings, true);
}
