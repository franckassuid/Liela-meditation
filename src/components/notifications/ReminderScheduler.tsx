"use client";
import { useEffect } from "react";
import { useFirebaseUser } from "@/components/firebase/FirebaseProvider";
import { useStorageRevision } from "@/hooks/useStorageRevision";
import { storage } from "@/lib/storage";
import { syncPushReminder } from "@/lib/push/client";
import { PUSH_ENABLED } from "@/lib/push/config";

/** Register/sync on app activity. Cloudflare owns scheduling while the app is closed. */
export function ReminderScheduler() {
  const { user } = useFirebaseUser();
  const revision = useStorageRevision(["liela_settings"]);
  useEffect(() => {
    if (!user || !PUSH_ENABLED) return;
    let active = true;
    const sync = async () => {
      const settings = await storage.getSettings();
      if (active) await syncPushReminder(settings).catch(() => {}); // Status is shown in Settings.
    };
    const visible = () => { if (document.visibilityState === "visible") void sync(); };
    void sync();
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; window.removeEventListener("online", sync); document.removeEventListener("visibilitychange", visible); };
  }, [user, revision]);
  return null;
}
