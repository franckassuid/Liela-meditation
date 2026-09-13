"use client";

import { useEffect, useRef } from "react";
import { storage, AppSettings } from "@/lib/storage";
import {
  getNotificationPermission,
  getMillisecondsUntilNextReminder,
  sendLocalNotification,
  DAY_MAP,
} from "@/lib/notifications";

const LAST_SENT_SLOT_KEY = "liela_last_sent_reminder_slot";

export function ReminderScheduler() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Vérifie si un rappel était prévu il y a peu de temps (ex: pendant que l'écran était éteint ou au réveil)
    const checkAndTriggerDueReminder = async (providedSettings?: AppSettings) => {
      const perm = getNotificationPermission();
      if (perm !== "granted") return;

      const settings = providedSettings || (await storage.getSettings());
      if (!settings.dailyReminderEnabled || !settings.dailyReminderTime) return;

      const [targetHours, targetMinutes] = settings.dailyReminderTime.split(":").map(Number);
      if (isNaN(targetHours) || isNaN(targetMinutes)) return;

      const now = new Date();
      const dayKey = DAY_MAP[now.getDay()];
      const days = settings.dailyReminderCustomDays || [
        "lun",
        "mar",
        "mer",
        "jeu",
        "ven",
        "sam",
        "dim",
      ];
      if (!days.includes(dayKey)) return;

      const targetToday = new Date(now.getTime());
      targetToday.setHours(targetHours, targetMinutes, 0, 0);

      const diffMs = now.getTime() - targetToday.getTime();
      const slotKey = `${targetToday.getFullYear()}-${targetToday.getMonth() + 1}-${targetToday.getDate()}_${settings.dailyReminderTime}`;
      const lastSentSlot = localStorage.getItem(LAST_SENT_SLOT_KEY);

      // Si l'heure est passée depuis moins de 45 minutes et n'a pas encore été notifiée pour ce créneau
      if (diffMs >= 0 && diffMs <= 45 * 60 * 1000) {
        if (lastSentSlot !== slotKey) {
          localStorage.setItem(LAST_SENT_SLOT_KEY, slotKey);
          await sendLocalNotification("Liela · Moment de respiration", {
            body: "Prenez 5 minutes pour vous recentrer et faire une pause.",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: "liela-daily-reminder",
          });
        }
      }
    };

    const setupScheduler = async (providedSettings?: AppSettings) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (typeof window === "undefined") return;

      const perm = getNotificationPermission();
      if (perm !== "granted") return;

      const settings = providedSettings || (await storage.getSettings());
      if (!settings.dailyReminderEnabled || !settings.dailyReminderTime) {
        return;
      }

      const days = settings.dailyReminderCustomDays || [
        "lun",
        "mar",
        "mer",
        "jeu",
        "ven",
        "sam",
        "dim",
      ];

      const next = getMillisecondsUntilNextReminder(settings.dailyReminderTime, days);
      if (!next) return;

      const slotKey = `${next.nextDate.getFullYear()}-${next.nextDate.getMonth() + 1}-${next.nextDate.getDate()}_${settings.dailyReminderTime}`;

      // Délai en millisecondes
      const delay = Math.max(500, next.delayMs);
      const safeDelay = Math.min(delay, 12 * 60 * 60 * 1000);

      timerRef.current = setTimeout(async () => {
        if (!isMounted) return;

        const currentNow = new Date();
        const diffFromTarget = Math.abs(currentNow.getTime() - next.nextDate.getTime());

        // Si on est à moins de 5 minutes de l'heure cible
        if (diffFromTarget <= 5 * 60 * 1000) {
          const currentSlot = localStorage.getItem(LAST_SENT_SLOT_KEY);
          if (currentSlot !== slotKey) {
            localStorage.setItem(LAST_SENT_SLOT_KEY, slotKey);
            await sendLocalNotification("Liela · Moment de respiration", {
              body: "Prenez 5 minutes pour vous recentrer et faire une pause.",
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: "liela-daily-reminder",
            });
          }
        }

        // Replanifier pour le créneau suivant
        if (isMounted) {
          setupScheduler();
        }
      }, safeDelay);
    };

    // 1. Démarrage initial et vérification de rattrapage
    checkAndTriggerDueReminder().then(() => {
      if (isMounted) setupScheduler();
    });

    // 2. Écoute des mises à jour des réglages depuis Settings
    const handleReminderUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as AppSettings | undefined;
      checkAndTriggerDueReminder(detail);
      setupScheduler(detail);
    };
    window.addEventListener("liela:reminder-updated", handleReminderUpdated);

    // 3. Quand l'écran est déverrouillé ou l'application revient au premier plan
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndTriggerDueReminder();
        setupScheduler();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Vérification périodique de sécurité toutes les 30 secondes
    const intervalId = setInterval(() => {
      if (isMounted) {
        checkAndTriggerDueReminder();
      }
    }, 30000);

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      clearInterval(intervalId);
      window.removeEventListener("liela:reminder-updated", handleReminderUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
