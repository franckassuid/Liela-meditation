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
    tag: "liela-daily-reminder",
    // @ts-expect-error - vibrate is supported by Notification API
    vibrate: [200, 100, 200],
    renotify: true,
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
    // @ts-expect-error - vibrate
    vibrate: [200, 100, 200],
    renotify: true,
  });
}

/**
 * Programme un test de notification dans X secondes (permet de tester l'écran verrouillé).
 */
export async function scheduleTestNotificationInSeconds(seconds: number = 10): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  const delayMs = seconds * 1000;
  const notifTitle = "Liela · Rappel d'essai";
  const notifOptions: NotificationOptions = {
    body: `Bravo ! Ce rappel programmé fonctionne parfaitement sur votre appareil.`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "liela-test-countdown",
    // @ts-expect-error - vibrate
    vibrate: [200, 100, 200],
    renotify: true,
  };

  // 1. Envoi au Service Worker pour qu'il le gère en arrière-plan
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg.active) {
        reg.active.postMessage({
          type: "SCHEDULE_REMINDER",
          delayMs,
          title: notifTitle,
          options: notifOptions,
        });
      }
    } catch (e) {
      console.log("Erreur SW test countdown:", e);
    }
  }

  // 2. Timer de secours côté fenêtre (au cas où le SW n'est pas encore prêt)
  setTimeout(async () => {
    await sendLocalNotification(notifTitle, notifOptions);
  }, delayMs);

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
  if (!timeStr) return null;

  const [targetHours, targetMinutes] = timeStr.split(":").map(Number);
  if (isNaN(targetHours) || isNaN(targetMinutes)) return null;

  const now = new Date();

  // On teste aujourd'hui puis les 7 prochains jours
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now.getTime());
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(targetHours, targetMinutes, 0, 0);

    const diffMs = candidate.getTime() - now.getTime();

    // Si c'est aujourd'hui :
    if (offset === 0) {
      // Cas A : L'heure est dans le futur aujourd'hui
      if (diffMs > 0) {
        const dayKey = DAY_MAP[candidate.getDay()];
        if (customDays.includes(dayKey)) {
          return { delayMs: diffMs, nextDate: candidate };
        }
      }

      // Cas B : L'heure est passée depuis moins de 90 secondes (ex: test de la minute en cours)
      // On vérifie si ce créneau précis n'a pas déjà été envoyé aujourd'hui
      if (diffMs <= 0 && Math.abs(diffMs) <= 90 * 1000) {
        const slotKey = `${candidate.getFullYear()}-${candidate.getMonth() + 1}-${candidate.getDate()}_${timeStr}`;
        const lastSentSlot = typeof window !== "undefined" ? localStorage.getItem("liela_last_sent_reminder_slot") : null;
        const dayKey = DAY_MAP[candidate.getDay()];

        if (customDays.includes(dayKey) && lastSentSlot !== slotKey) {
          // Déclencher dans 1.5s pour laisser le temps à l'UI de réagir
          return { delayMs: 1500, nextDate: candidate, isImmediateCatchup: true };
        }
      }

      // Sinon, pour aujourd'hui c'est dépassé, on passe aux jours suivants
      continue;
    }

    // Pour les jours suivants (offset > 0)
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

  if (next.isImmediateCatchup) {
    return "Imminent (dans quelques secondes)";
  }

  const now = new Date();
  const isToday = next.nextDate.getDate() === now.getDate() && next.nextDate.getMonth() === now.getMonth();
  const diffSeconds = Math.round(next.delayMs / 1000);

  if (diffSeconds < 60) {
    return `Dans ${diffSeconds}s (${isToday ? "aujourd'hui" : "demain"} à ${timeStr})`;
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${isToday ? "Aujourd'hui" : "Demain"} à ${timeStr} (dans ${diffMinutes} min)`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMin = diffMinutes % 60;
  return `${isToday ? "Aujourd'hui" : "Demain"} à ${timeStr} (dans ${diffHours}h${remainingMin > 0 ? remainingMin : ""})`;
}

/**
 * Synchronise la programmation du rappel avec le Service Worker et l'API Notification Triggers
 * ATTENTION : Ne JAMAIS appeler cette fonction depuis l'intérieur du scheduler pour éviter les boucles.
 */
export async function syncScheduledReminder(settings: AppSettings): Promise<void> {
  if (typeof window === "undefined") return;

  // Notifier l'application côté client pour que ReminderScheduler prenne immédiatement en compte le changement
  window.dispatchEvent(new CustomEvent("liela:reminder-updated", { detail: settings }));

  if (!settings.dailyReminderEnabled || !settings.dailyReminderTime) {
    // Annuler auprès du Service Worker
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg.active) {
          reg.active.postMessage({ type: "CANCEL_REMINDER" });
        }
      } catch (e) {
        console.log("Erreur annulation SW:", e);
      }
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
    // @ts-expect-error - vibrate
    vibrate: [200, 100, 200],
    renotify: true,
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

      // 2. Envoi du message au Service Worker actif (reg.active) pour minuterie d'arrière-plan
      if (reg.active) {
        reg.active.postMessage({
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
