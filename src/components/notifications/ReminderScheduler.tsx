"use client";

import { useEffect, useRef } from "react";
import { storage } from "@/lib/storage";
import {
  getNotificationPermission,
  getMillisecondsUntilNextReminder,
  sendLocalNotification,
  syncScheduledReminder,
} from "@/lib/notifications";

const LAST_SENT_SLOT_KEY = "liela_last_sent_reminder_slot";

export function ReminderScheduler() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupScheduler = async () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (typeof window === "undefined") return;

      const perm = getNotificationPermission();
      if (perm !== "granted") return;

      const settings = await storage.getSettings();
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

      // Synchroniser avec le Service Worker pour l'arrière-plan
      syncScheduledReminder(settings);

      // Si le rappel était prévu il y a moins de 15 minutes et n'a pas encore été notifié
      const now = new Date();
      const slotKey = `${next.nextDate.getFullYear()}-${next.nextDate.getMonth()}-${next.nextDate.getDate()}_${settings.dailyReminderTime}`;
      const lastSentSlot = localStorage.getItem(LAST_SENT_SLOT_KEY);

      // Si le délai est très court (ex: test de rappel pour la minute en cours)
      const delay = Math.max(100, next.delayMs);
      const safeDelay = Math.min(delay, 12 * 60 * 60 * 1000);

      timerRef.current = setTimeout(async () => {
        if (!isMounted) return;

        const currentNow = new Date();
        const diffFromTarget = Math.abs(currentNow.getTime() - next.nextDate.getTime());

        // Si on est à moins de 3 minutes de l'heure cible et que ce créneau n'a pas été envoyé
        if (diffFromTarget <= 3 * 60 * 1000) {
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

        // Replanifier pour le jour suivant
        if (isMounted) {
          setupScheduler();
        }
      }, safeDelay);
    };

    setupScheduler();

    // Re-synchroniser immédiatement dès que les réglages changent
    const handleReminderUpdated = () => {
      setupScheduler();
    };
    window.addEventListener("liela:reminder-updated", handleReminderUpdated);

    // Re-synchroniser quand l'application revient au premier plan
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setupScheduler();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener("liela:reminder-updated", handleReminderUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
