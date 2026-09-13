import { AppSettings, DayOfWeek } from "./storage";

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
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    const perm = await Notification.requestPermission();
    return perm as NotificationPermissionState;
  } catch (err) {
    console.error("Erreur lors de la demande de notification:", err);
    return Notification.permission as NotificationPermissionState;
  }
}

/**
 * Envoie une notification locale via le Service Worker (ou l'API Notification native).
 */
export async function sendLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const defaultOptions: NotificationOptions = {
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "liela-reminder",
    ...options,
  };

  try {
    // Méthode recommandée sur Android / PWA : via le Service Worker
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
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
  return sendLocalNotification("Liela · Rappel quotidien", {
    body: `Vos rappels sont bien activés pour ${time}. Prenez un instant pour respirer chaque jour.`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "liela-test-reminder",
  });
}

/**
 * Mapping des jours de la semaine vers les clés DayOfWeek
 */
const DAY_MAP: Record<number, DayOfWeek> = {
  0: "dim",
  1: "lun",
  2: "mar",
  3: "mer",
  4: "jeu",
  5: "ven",
  6: "sam",
};

/**
 * Calcule le délai en millisecondes jusqu'au prochain rappel configuré
 */
export function getMillisecondsUntilNextReminder(
  timeStr: string,
  customDays: DayOfWeek[] = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
): { delayMs: number; nextDate: Date } | null {
  if (!timeStr) return null;

  const [targetHours, targetMinutes] = timeStr.split(":").map(Number);
  if (isNaN(targetHours) || isNaN(targetMinutes)) return null;

  const now = new Date();

  // On teste aujourd'hui puis les 7 prochains jours
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now.getTime());
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(targetHours, targetMinutes, 0, 0);

    // Si c'est aujourd'hui et que l'heure est passée depuis plus de 30 secondes, on passe au jour suivant
    if (offset === 0 && candidate.getTime() <= now.getTime() - 30000) {
      continue;
    }

    const dayKey = DAY_MAP[candidate.getDay()];
    if (customDays.includes(dayKey)) {
      const delayMs = Math.max(1000, candidate.getTime() - now.getTime());
      return { delayMs, nextDate: candidate };
    }
  }

  return null;
}

/**
 * Formate un texte lisible pour l'utilisateur sur le prochain rappel
 */
export function formatNextReminderDescription(
  timeStr: string,
  customDays: DayOfWeek[] = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
): string {
  const next = getMillisecondsUntilNextReminder(timeStr, customDays);
  if (!next) return "";

  const now = new Date();
  const isToday = next.nextDate.getDate() === now.getDate() && next.nextDate.getMonth() === now.getMonth();
  const diffMinutes = Math.round(next.delayMs / 60000);

  if (diffMinutes < 1) {
    return "Imminent (dans quelques secondes)";
  }
  if (diffMinutes < 60) {
    return `${isToday ? "Aujourd'hui" : "Demain"} à ${timeStr} (dans ${diffMinutes} min)`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMin = diffMinutes % 60;
  return `${isToday ? "Aujourd'hui" : "Demain"} à ${timeStr} (dans ${diffHours}h${remainingMin > 0 ? remainingMin : ""})`;
}

/**
 * Synchronise la programmation du rappel avec le Service Worker et l'API Notification Triggers
 */
export async function syncScheduledReminder(settings: AppSettings): Promise<void> {
  if (typeof window === "undefined") return;

  // Notifier l'application côté client
  window.dispatchEvent(new CustomEvent("liela:reminder-updated", { detail: settings }));

  if (!settings.dailyReminderEnabled || !settings.dailyReminderTime) {
    // Annuler auprès du Service Worker
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CANCEL_REMINDER" });
    }
    return;
  }

  const days = settings.dailyReminderCustomDays || ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
  const next = getMillisecondsUntilNextReminder(settings.dailyReminderTime, days);
  if (!next) return;

  const notifTitle = "Liela · Moment de respiration";
  const notifOptions: NotificationOptions = {
    body: "Prenez 5 minutes pour vous recentrer et faire une pause.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "liela-daily-reminder",
  };

  // 1. Essai avec Notification Triggers API (Chromium / Android natif pour alarmes hors-ligne)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;

      // Si support de TimestampTrigger dans le navigateur
      if (
        "showTrigger" in Notification.prototype &&
        typeof (window as unknown as { TimestampTrigger?: new (ts: number) => unknown }).TimestampTrigger !== "undefined"
      ) {
        const TimestampTriggerClass = (window as unknown as { TimestampTrigger: new (ts: number) => unknown }).TimestampTrigger;
        (notifOptions as unknown as { showTrigger: unknown }).showTrigger = new TimestampTriggerClass(next.nextDate.getTime());
        await reg.showNotification(notifTitle, notifOptions);
        console.log("Rappel programmé avec TimestampTrigger natif pour:", next.nextDate);
      }

      // 2. Envoi du message au Service Worker actif pour minuterie d'arrière-plan
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SCHEDULE_REMINDER",
          delayMs: next.delayMs,
          targetTimestamp: next.nextDate.getTime(),
          title: notifTitle,
          options: notifOptions,
        });
      }
    } catch (err) {
      console.log("Note sur la planification SW:", err);
    }
  }
}
