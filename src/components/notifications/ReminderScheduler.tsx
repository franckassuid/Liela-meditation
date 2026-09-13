"use client";

import { useEffect, useRef } from "react";
import { storage } from "@/lib/storage";
import {
  getNotificationPermission,
  getMillisecondsUntilNextReminder,
  sendLocalNotification,
} from "@/lib/notifications";

const LAST_NOTIFICATION_KEY = "liela_last_reminder_date";

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

      // Note: setTimeout sur navigateur est plafonné à 2^31 - 1 (~24.8 jours)
      // Si le délai est supérieur à 12h, on re-synchronise plus tard
      const safeDelay = Math.min(next.delayMs, 12 * 60 * 60 * 1000);

      timerRef.current = setTimeout(async () => {
        if (!isMounted) return;

        // Si le délai réel est atteint (à 2 minutes près)
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const lastNotifDate = localStorage.getItem(LAST_NOTIFICATION_KEY);

        if (next.delayMs <= 60000 && lastNotifDate !== todayStr) {
          localStorage.setItem(LAST_NOTIFICATION_KEY, todayStr);
          await sendLocalNotification("Liela · Moment de respiration", {
            body: "Prenez 5 minutes pour vous recentrer et faire une pause.",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: "liela-daily-reminder",
          });
        }

        // Replanifier pour la suite
        setupScheduler();
      }, safeDelay);
    };

    setupScheduler();

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
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
