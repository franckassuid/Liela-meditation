"use client";

import React, { useState, useEffect } from "react";
import {
  storage,
  AppSettings,
  DEFAULT_SETTINGS,
  DownloadRecord,
  Favori,
  ALL_DAYS,
  DayOfWeek,
  formatReminderDays,
} from "@/lib/storage";
import { usePwa } from "@/components/pwa";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestReminderNotification,
  scheduleTestNotificationInSeconds,
  syncScheduledReminder,
  formatNextReminderDescription,
  NotificationPermissionState,
} from "@/lib/notifications";
import { NotificationPermissionModal } from "@/components/notifications/NotificationPermissionModal";
import {
  SettingsDownloads,
  SettingsHelp,
  SettingsPrivacy
} from "./components/SettingsSubScreens";


import { AccountScreen } from "./components/AccountScreen";
import { useFirebaseUser } from "@/components/firebase/FirebaseProvider";
import { getSyncStatus } from "@/lib/firebase/sync";
import { useStorageRevision } from "@/hooks/useStorageRevision";

type ScreenType = "main" | "compte" | "telechargements" | "aide" | "confidentialite";

export default function SettingsPage() {
  const { user } = useFirebaseUser();
  const storageRevision = useStorageRevision();
  const {
    isStandalone,
    isAppInstalled,
    promptInstall,
    openPwaApp,
  } = usePwa();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("main");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [favorites, setFavorites] = useState<Favori[]>([]);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [showFullPrivacy, setShowFullPrivacy] = useState(false);
  const [showDaysSheet, setShowDaysSheet] = useState(false);
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [nextReminderDesc, setNextReminderDesc] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>("default");

  // Load data on mount
  useEffect(() => {
    let active = true;
    let permissionStatus: PermissionStatus | undefined;
    const load = async () => {
      const s = await storage.getSettings();
      const d = await storage.getDownloads();
      const f = await storage.getFavorites();
      if (active) {
        setSettings(s);
        setDownloads(d);
        setFavorites(f);
      }
    };
    load();

    // Initialisation et écoute de la permission de notifications
    if (typeof window !== "undefined") {
      const perm = getNotificationPermission();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotificationPermission(perm);

      if ("permissions" in navigator && navigator.permissions?.query) {
        navigator.permissions
          .query({ name: "notifications" as PermissionName })
          .then((status) => {
            if (!active) return;
            permissionStatus = status;
            status.onchange = () => {
              setNotificationPermission(status.state as NotificationPermissionState);
            };
          })
          .catch(() => {});
      }
    }

    return () => {
      active = false;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [storageRevision]);

  // Mise à jour périodique du texte descriptif du prochain rappel
  useEffect(() => {
    if (!settings.dailyReminderEnabled || !settings.dailyReminderTime) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNextReminderDesc("");
      return;
    }

    const updateDesc = () => {
      const desc = formatNextReminderDescription(
        settings.dailyReminderTime,
        settings.dailyReminderCustomDays
      );
      setNextReminderDesc(desc);
    };

    updateDesc();
    const interval = setInterval(updateDesc, 5000);
    return () => clearInterval(interval);
  }, [settings.dailyReminderEnabled, settings.dailyReminderTime, settings.dailyReminderCustomDays]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await storage.setSettings({ [key]: value });

    if (
      key === "dailyReminderEnabled" ||
      key === "dailyReminderTime" ||
      key === "dailyReminderCustomDays"
    ) {
      await syncScheduledReminder(next);
    }
  };

  const handleRequestPermission = async () => {
    const requested = await requestNotificationPermission();
    setNotificationPermission(requested);

    if (requested === "granted") {
      await updateSetting("dailyReminderEnabled", true);
      const desc = formatNextReminderDescription(settings.dailyReminderTime, settings.dailyReminderCustomDays);
      showToast(desc ? `Notifications autorisées · Rappel activé (${desc})` : "Notifications autorisées ✓");
      await sendTestReminderNotification(settings.dailyReminderTime);
    } else if (requested === "denied") {
      showToast("Notifications bloquées dans votre navigateur.");
      setShowNotificationModal(true);
    } else {
      showToast("Autorisation non accordée.");
    }
  };

  const handleToggleDailyReminder = async () => {
    // Si l'application n'est pas ouverte en standalone
    if (!isStandalone) {
      if (isAppInstalled) {
        openPwaApp("/settings");
      } else {
        await promptInstall();
      }
      return;
    }

    // Si les notifications ne sont pas accordées
    if (notificationPermission !== "granted") {
      await handleRequestPermission();
      return;
    }

    // Si on désactive
    if (settings.dailyReminderEnabled) {
      await updateSetting("dailyReminderEnabled", false);
      showToast("Rappel quotidien désactivé");
      return;
    }

    // Si on active
    await updateSetting("dailyReminderEnabled", true);
    const desc = formatNextReminderDescription(settings.dailyReminderTime, settings.dailyReminderCustomDays);
    showToast(desc ? `Rappel activé (${desc})` : "Rappels quotidiens activés ✓");
  };

  const handleTestNotification = async () => {
    const perm = getNotificationPermission();
    if (perm !== "granted") {
      setShowNotificationModal(true);
      return;
    }
    const ok = await sendTestReminderNotification(settings.dailyReminderTime);
    if (ok) {
      showToast("Notification de test envoyée !");
    } else {
      showToast("Impossible d'envoyer la notification.");
      setShowNotificationModal(true);
    }
  };

  const handleTestCountdown = async () => {
    const perm = getNotificationPermission();
    if (perm !== "granted") {
      setShowNotificationModal(true);
      return;
    }

    if (testCountdown !== null) return;

    const ok = await scheduleTestNotificationInSeconds(10);
    if (!ok) {
      showToast("Impossible de programmer le test.");
      return;
    }

    setTestCountdown(10);
    showToast("Test lancé dans 10s ! Vous pouvez verrouiller votre téléphone.");

    const interval = setInterval(() => {
      setTestCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleToggleDay = async (dayKey: DayOfWeek) => {
    const currentDays = settings.dailyReminderCustomDays || ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
    let updatedDays: DayOfWeek[];
    if (currentDays.includes(dayKey)) {
      updatedDays = currentDays.filter((d) => d !== dayKey);
    } else {
      updatedDays = [...currentDays, dayKey];
    }
    const formatted = formatReminderDays(updatedDays);
    const nextSettings = {
      ...settings,
      dailyReminderCustomDays: updatedDays,
      dailyReminderDays: formatted,
    };
    setSettings(nextSettings);
    await storage.setSettings({
      dailyReminderCustomDays: updatedDays,
      dailyReminderDays: formatted,
    });
    await syncScheduledReminder(nextSettings);
  };

  const handleSetPresetDays = async (type: "all" | "weekdays" | "weekend") => {
    let updatedDays: DayOfWeek[];
    if (type === "all") {
      updatedDays = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
    } else if (type === "weekdays") {
      updatedDays = ["lun", "mar", "mer", "jeu", "ven"];
    } else {
      updatedDays = ["sam", "dim"];
    }
    const formatted = formatReminderDays(updatedDays);
    const nextSettings = {
      ...settings,
      dailyReminderCustomDays: updatedDays,
      dailyReminderDays: formatted,
    };
    setSettings(nextSettings);
    await storage.setSettings({
      dailyReminderCustomDays: updatedDays,
      dailyReminderDays: formatted,
    });
    await syncScheduledReminder(nextSettings);
  };

  const totalDownloadedBytes = downloads.reduce(
    (acc, cur) => acc + (cur.sizeBytes || (cur.sizeMo ? cur.sizeMo * 1024 * 1024 : 0)),
    0
  );
  const totalDownloadedMo = Math.round((totalDownloadedBytes / (1024 * 1024)) * 10) / 10;

  const handleRemoveDownload = async (sessionId: string) => {
    await storage.removeDownloadFiles(sessionId);
    const fresh = await storage.getDownloads();
    setDownloads(fresh);
    showToast("Séance retirée des téléchargements");
  };

  // Export JSON file
  const handleExportData = async () => {
    try {
      const jsonStr = await storage.exportAllData();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `liela-donnees-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportSheet(false);
      showToast("Données exportées");
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'export");
    }
  };

  // Delete all data (local storage cleared, downloads preserved)
  const handleDeleteData = async () => {
    if (user && getSyncStatus().state !== "synced") {
      showToast("Attendez la fin de la synchronisation avant d’effacer les données du compte.");
      return;
    }
    try {
      // FIX B4: check the boolean — clearAllData returns false if any IDB deletion failed
      const ok = await storage.clearAllData();
      if (ok) {
        const freshSettings = await storage.getSettings();
        setSettings(freshSettings);
        setShowDeleteSheet(false);
        showToast("Données effacées de cet appareil ; la suppression des données sera synchronisée");
      } else {
        setShowDeleteSheet(false);
        showToast("⚠️ Suppression partielle — relancez l'application et réessayez");
      }
    } catch (e) {
      console.error(e);
      showToast("⚠️ Erreur lors de la suppression");
    }
  };

  // Clear downloads
  const handleClearDownloads = async () => {
    const ok = await storage.clearDownloads();
    if (ok) {
      setDownloads([]);
      showToast("Téléchargements supprimés");
    } else {
      showToast("⚠️ Erreur lors de la suppression des téléchargements");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-creme text-encre font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-4 right-4 max-w-sm mx-auto bg-encre text-creme rounded-xl p-3 shadow-lg z-50 text-center text-[13px] font-medium animate-in fade-in slide-in-from-top-3">
          {toastMessage}
        </div>
      )}

      {/* =========================================================================
          SCREEN 1: MAIN SETTINGS
      ========================================================================== */}
      {currentScreen === "main" && (
        <div className="p-marge pb-12 flex flex-col flex-1 max-w-[480px] w-full mx-auto">
          {/* Header */}
          <div className="pt-2 pb-2 mb-2">
            <h1 className="font-poppins font-light text-[24px] leading-[1.2]">
              Réglages
            </h1>
          </div>

          <div className="flex flex-col">
            {/* COMPTE */}
            <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-3 mb-[7px] ml-[3px]">
              Compte
            </p>
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
              <div
                onClick={() => setCurrentScreen("compte")}
                className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    {user?.email ? "Mon compte" : "Se connecter"}
                  </b>
                  <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                    {user?.email
                      ? user?.email
                      : "Pour retrouver vos favoris sur un autre appareil"}
                  </i>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
            </div>            {/* LECTURE */}
            <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-[15px] mb-[6px] ml-[3px]">
              Lecture
            </p>
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
              {/* Reprendre où je me suis arrêté */}
              <div
                onClick={() => updateSetting("resumePlayback", !settings.resumePlayback)}
                className="flex items-center gap-[9px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    Reprendre où je me suis arrêté
                  </b>
                </div>
                <div
                  className={`w-[38px] h-[22px] rounded-full shrink-0 relative transition-colors cursor-pointer ${
                    settings.resumePlayback ? "bg-[#5F6A52]" : "bg-[#F0E5D6]"
                  }`}
                >
                  <i
                    className={`absolute top-[2.5px] w-[17px] h-[17px] rounded-full bg-white shadow-[0_1px_2px_rgba(67,53,40,0.2)] transition-all duration-150 ${
                      settings.resumePlayback ? "left-[18.5px]" : "left-[2.5px]"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* TÉLÉCHARGEMENTS */}
            <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-[15px] mb-[6px] ml-[3px]">
              Téléchargements
            </p>
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
              {/* Gérer les téléchargements */}
              <div
                onClick={() => setCurrentScreen("telechargements")}
                className="flex items-center gap-[9px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    Gérer les téléchargements
                  </b>
                  <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                    {downloads.length} {downloads.length > 1 ? "séances disponibles hors ligne" : "séance disponible hors ligne"}
                  </i>
                </div>
                <span className="text-[12.5px] text-[#7A6E5E]">{totalDownloadedMo} Mo</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* RAPPEL */}
            <div className="flex items-center justify-between mt-[15px] mb-[6px] ml-[3px] mr-[3px]">
              <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em]">
                Rappel
              </p>
              {isStandalone && notificationPermission === "granted" && (
                <span className="text-[10.5px] text-[#5F6A52] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5F6A52]" />
                  Notifications autorisées
                </span>
              )}
            </div>

            {/* MESSAGE INCITATIF 1A : Application installée sur l'appareil mais ouverte dans le navigateur */}
            {!isStandalone && isAppInstalled && (
              <div className="bg-white rounded-[15px] p-[14px_16px] shadow-[0_1px_2px_rgba(67,53,40,0.04)] mb-2.5 border border-[#E5D9C7]/70">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FAF6F0] text-[#5F6A52] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13px] leading-[1.3] text-encre">
                      Ouvrir dans l&apos;application pour les rappels
                    </b>
                    <p className="text-[11px] text-[#7A6E5E] leading-[1.4] mt-1">
                      L&apos;application Liela est installée sur cet appareil. Ouvrez-la pour paramétrer vos rappels avec notifications en arrière-plan.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openPwaApp("/settings")}
                  className="w-full mt-3 py-2.5 px-3 bg-[#5F6A52] text-creme rounded-[10px] text-[12px] font-medium transition-transform active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>Ouvrir dans l&apos;application</span>
                </button>
              </div>
            )}

            {/* MESSAGE INCITATIF 1B : Application NON installée sur l'appareil */}
            {!isStandalone && !isAppInstalled && (
              <div className="bg-white rounded-[15px] p-[14px_16px] shadow-[0_1px_2px_rgba(67,53,40,0.04)] mb-2.5 border border-[#E5D9C7]/70">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F5E4DA] text-terre-p flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13px] leading-[1.3] text-encre">
                      Installer l&apos;application pour activer les rappels
                    </b>
                    <p className="text-[11px] text-[#7A6E5E] leading-[1.4] mt-1">
                      Les rappels quotidiens nécessitent que Liela soit installée sur votre appareil pour fonctionner en arrière-plan.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={promptInstall}
                  className="w-full mt-3 py-2.5 px-3 bg-terre-p text-creme rounded-[10px] text-[12px] font-medium transition-transform active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Installer l&apos;application</span>
                </button>
              </div>
            )}

            {/* MESSAGE INCITATIF 2 : Application installée mais notifications NON autorisées */}
            {isStandalone && notificationPermission !== "granted" && (
              <div className="bg-white rounded-[15px] p-[14px_16px] shadow-[0_1px_2px_rgba(67,53,40,0.04)] mb-2.5 border border-[#E5D9C7]/70">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FAF6F0] text-[#5F6A52] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13px] leading-[1.3] text-encre">
                      {notificationPermission === "denied"
                        ? "Notifications bloquées"
                        : "Autoriser les notifications"}
                    </b>
                    <p className="text-[11px] text-[#7A6E5E] leading-[1.4] mt-1">
                      {notificationPermission === "denied"
                        ? "Les notifications sont actuellement bloquées par votre navigateur. Débloquez-les pour pouvoir activer vos rappels."
                        : "Pour paramétrer vos rappels quotidiens, autorisez Liela à vous envoyer des notifications."}
                    </p>
                  </div>
                </div>
                {notificationPermission === "denied" ? (
                  <button
                    type="button"
                    onClick={() => setShowNotificationModal(true)}
                    className="w-full mt-3 py-2.5 px-3 bg-terre-p text-creme rounded-[10px] text-[12px] font-medium transition-transform active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>Voir comment débloquer</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="w-full mt-3 py-2.5 px-3 bg-[#5F6A52] text-creme rounded-[10px] text-[12px] font-medium transition-transform active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span>Activer les notifications</span>
                  </button>
                )}
              </div>
            )}

            {/* CARTE DES OPTIONS DE RAPPELS (Grisée si non installé ou non autorisé) */}
            <div
              className={`bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)] transition-opacity duration-200 ${
                !isStandalone || notificationPermission !== "granted"
                  ? "opacity-40 cursor-pointer select-none"
                  : ""
              }`}
              onClick={() => {
                if (!isStandalone) {
                  if (isAppInstalled) {
                    openPwaApp("/settings");
                  } else {
                    promptInstall();
                  }
                } else if (notificationPermission !== "granted") {
                  handleRequestPermission();
                }
              }}
            >
              {/* Rappel quotidien switch */}
              <div
                onClick={(e) => {
                  if (!isStandalone) {
                    e.stopPropagation();
                    if (isAppInstalled) {
                      openPwaApp("/settings");
                    } else {
                      promptInstall();
                    }
                  } else if (notificationPermission !== "granted") {
                    e.stopPropagation();
                    handleRequestPermission();
                  } else {
                    handleToggleDailyReminder();
                  }
                }}
                className={`flex items-center gap-[9px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors ${
                  isStandalone && notificationPermission === "granted" && settings.dailyReminderEnabled
                    ? "border-b border-[#F8EFE4]"
                    : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    Rappel quotidien
                  </b>
                  {!isStandalone ? (
                    <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                      {isAppInstalled
                        ? "Ouvrez l'application pour paramétrer ce rappel"
                        : "Nécessite l'application installée"}
                    </i>
                  ) : notificationPermission !== "granted" ? (
                    <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                      Nécessite l&apos;autorisation des notifications
                    </i>
                  ) : !settings.dailyReminderEnabled ? (
                    <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                      Désactivé
                    </i>
                  ) : (
                    <i className="block not-italic text-[10.5px] text-[#5F6A52] mt-[2px] leading-[1.35]">
                      {nextReminderDesc || `Actif à ${settings.dailyReminderTime}`}
                    </i>
                  )}
                </div>
                <div
                  className={`w-[38px] h-[22px] rounded-full shrink-0 relative transition-colors cursor-pointer ${
                    isStandalone && notificationPermission === "granted" && settings.dailyReminderEnabled
                      ? "bg-[#5F6A52]"
                      : "bg-[#F0E5D6]"
                  }`}
                >
                  <i
                    className={`absolute top-[2.5px] w-[17px] h-[17px] rounded-full bg-white shadow-[0_1px_2px_rgba(67,53,40,0.2)] transition-all duration-150 ${
                      isStandalone && notificationPermission === "granted" && settings.dailyReminderEnabled
                        ? "left-[18.5px]"
                        : "left-[2.5px]"
                    }`}
                  />
                </div>
              </div>

              {/* Si activé: Heure, Jours et Tester */}
              {isStandalone && notificationPermission === "granted" && settings.dailyReminderEnabled && (
                <>
                  <div
                    onClick={() => setShowTimeSheet(true)}
                    className="flex items-center gap-[9px] p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                        Heure
                      </b>
                    </div>
                    <span className="text-[12.5px] text-[#7A6E5E]">{settings.dailyReminderTime}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 5 7 7-7 7" />
                    </svg>
                  </div>

                  <div
                    onClick={() => setShowDaysSheet(true)}
                    className="flex items-center gap-[9px] p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                        Jours
                      </b>
                    </div>
                    <span className="text-[12.5px] text-[#7A6E5E]">{settings.dailyReminderDays}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 5 7 7-7 7" />
                    </svg>
                  </div>

                  {/* Boutons de test */}
                  <div className="p-[12px_13px] flex flex-col gap-2.5 bg-[#FAF6F0]/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <b className="block font-normal text-[13px] leading-[1.3] text-encre">
                          Tester les notifications
                        </b>
                        <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                          Vérifiez la réception sur votre appareil
                        </i>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestNotification}
                        className="flex-1 py-2 px-2.5 text-[11.5px] font-medium text-terre-p bg-coquille hover:bg-[#EDE1D1] active:scale-[0.98] border border-filet rounded-[10px] transition-all text-center"
                      >
                        Envoyer maintenant
                      </button>
                      <button
                        type="button"
                        onClick={handleTestCountdown}
                        disabled={testCountdown !== null}
                        className="flex-1 py-2 px-2.5 text-[11.5px] font-medium text-creme bg-[#5F6A52] hover:bg-[#525C46] active:scale-[0.98] disabled:opacity-75 rounded-[10px] transition-all text-center"
                      >
                        {testCountdown !== null ? `Dans ${testCountdown}s...` : "Tester dans 10s"}
                      </button>
                    </div>
                    {testCountdown !== null && (
                      <p className="text-[10.5px] text-[#5F6A52] font-medium text-center animate-pulse pt-0.5">
                        💡 Verrouillez l&apos;écran de votre téléphone pour tester la réception en veille !
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            {isStandalone && notificationPermission === "granted" && settings.dailyReminderEnabled && (
              <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-2 mx-[3px]">
                Un seul rappel par jour, jamais de relance si vous ne l’ouvrez pas.
              </p>
            )}

            {/* MES DONNÉES */}
            <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-4 mb-[7px] ml-[3px]">
              Mes données
            </p>
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
              <div
                onClick={() => setShowExportSheet(true)}
                className="flex items-center gap-[10px] p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    Exporter mes données
                  </b>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
              <div
                onClick={() => setShowDeleteSheet(true)}
                className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-[#A0483C]">
                    Effacer mes données
                  </b>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* APPLICATION LIELA */}
            <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-4 mb-[7px] ml-[3px]">
              Application
            </p>
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
              {isStandalone ? (
                <div className="flex items-center gap-[10px] p-[12px_13px]">
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                      Application installée
                    </b>
                    <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                      Vous profitez de la version native
                    </i>
                  </div>
                  <span className="text-[#5F6A52] text-[14px] font-semibold">✓</span>
                </div>
              ) : isAppInstalled ? (
                <div
                  onClick={() => openPwaApp("/settings")}
                  className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                      Application déjà installée
                    </b>
                    <i className="block not-italic text-[10.5px] text-[#5F6A52] mt-[2px] leading-[1.35]">
                      Touchez pour ouvrir dans l&apos;application
                    </i>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 bg-[#5F6A52] text-creme rounded-[8px] text-[11.5px] font-medium flex items-center gap-1">
                    <span>Ouvrir</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </span>
                </div>
              ) : (
                <div
                  onClick={promptInstall}
                  className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                      Installer l&apos;application
                    </b>
                    <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                      Plein écran, mode hors-ligne & accès direct
                    </i>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* À PROPOS */}
            <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-4 mb-[7px] ml-[3px]">
              À propos
            </p>
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
              <div
                onClick={() => setCurrentScreen("aide")}
                className="flex items-center gap-[10px] p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    Aide et contact
                  </b>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
              <div
                onClick={() => setCurrentScreen("confidentialite")}
                className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    Confidentialité
                  </b>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Pied de page */}
            <div className="flex items-center justify-center gap-[7px] mt-6 mb-2 text-[10.5px] text-[#9A8E7C]">
              <svg viewBox="0 0 100 100" width="15" height="15" style={{ display: "block", flex: "none" }}>
                <path fill="#919780" d="M15.23 6.27C14.97 6.55 14.97 6.55 14.99 34.79C15.01 63.04 15.01 63.04 15.23 64.48C15.98 69.58 17.66 74.06 20.41 78.24C21.04 79.18 22.26 80.83 22.73 81.37C24.46 83.32 24.79 83.65 26.6 85.22C27.61 86.11 30.54 88.15 31.88 88.9C33.2 89.65 34.69 90.34 36.84 91.2C37.55 91.49 39.6 92.11 41.15 92.51C46.7 93.94 53.08 94 59.4 92.69C60.45 92.48 60.85 92.37 62.32 91.91C67.7 90.27 71.9 87.92 75.84 84.35C77.18 83.15 77.53 82.73 77.23 82.73C77.17 82.73 76.82 82.94 76.46 83.19C76.1 83.44 75.64 83.73 75.43 83.84C74.71 84.25 71.49 85.87 70.74 86.22C67.82 87.51 64.74 88.35 61.7 88.66C61.18 88.72 60.51 88.8 60.22 88.85C59.53 88.96 55.9 88.96 55.05 88.85C54.69 88.8 54.07 88.72 53.68 88.67C52.02 88.46 49.22 87.79 47.45 87.18C46.34 86.8 43.93 85.59 42.67 84.79C39.54 82.79 38.22 81.68 36.09 79.3C35.05 78.14 33.3 75.76 32.75 74.76C32.65 74.59 32.46 74.25 32.33 74.02C31.52 72.59 30.63 70.68 30.27 69.62C29.92 68.58 29.44 66.84 29.34 66.3C29.28 66 29.22 65.74 29.2 65.7C29.12 65.57 28.68 62.84 28.57 61.79C28.49 61 28.45 54.83 28.4 38.2C28.36 16.64 28.35 15.66 28.18 15.13C28.09 14.82 27.98 14.41 27.93 14.2C27.5 12.16 26.01 9.86 24.2 8.47C21.94 6.72 19.82 6 16.98 6C15.5 6 15.5 6 15.23 6.27Z" />
                <path fill="#D09B83" stroke="#FDF9F0" strokeWidth="2.4" d="M84.25 49.45C84.19 49.54 82.63 50.58 81.69 51.19C81.04 51.59 80.2 52.02 79.35 52.38C78.94 52.57 78.5 52.75 78.4 52.8C77.4 53.26 75.29 53.91 74.04 54.14C73.64 54.22 73.12 54.32 72.89 54.37C72.5 54.47 71.85 54.55 70.01 54.74C68.83 54.87 65.01 55.1 62.05 55.21C60.61 55.27 59.19 55.36 58.9 55.4C58.61 55.44 58.09 55.52 57.73 55.57C57.08 55.66 56.85 55.72 55.18 56.19C52.86 56.84 50.87 57.7 49.18 58.79C47.6 59.8 45.7 61.54 44.48 63.07C43.11 64.77 41.56 67.71 41.15 69.4C41.02 69.92 40.87 70.52 40.81 70.71C40.61 71.46 40.36 73.22 40.36 73.9C40.36 74.88 40.62 77.06 40.77 77.42C40.85 77.59 40.98 77.73 41.06 77.73C41.15 77.73 42.11 76.82 43.19 75.7C44.29 74.59 45.57 73.36 46.04 72.98C46.97 72.21 49.05 70.8 50.47 69.94C51.64 69.23 53.54 68.34 55.22 67.71C55.63 67.55 56.13 67.37 56.32 67.29C57.51 66.85 58.75 66.5 59.91 66.28C60.29 66.21 60.9 66.09 61.25 66.01C62.2 65.8 62.41 65.82 62.41 66.09C62.41 66.26 62.36 66.31 62.08 66.36C61.33 66.48 57.29 68.24 56.07 68.97C55.86 69.09 55.61 69.23 55.5 69.28C55.28 69.39 53.69 70.45 53.01 70.96C52.76 71.15 52.19 71.56 51.76 71.88C50.15 73.07 48.8 74.44 46.99 76.71C46.05 77.89 45.58 78.58 45.29 79.23C45.18 79.48 45 79.85 44.9 80.07C44.8 80.29 44.71 80.53 44.71 80.62C44.71 81.21 48.23 82.78 51.11 83.46C54.21 84.2 56.9 84.29 60.56 83.79C63.93 83.32 67.7 81.89 70.75 79.91C73.52 78.13 77.01 74.77 78.64 72.34C79.41 71.19 80.21 69.95 80.21 69.9C80.21 69.87 80.37 69.56 80.59 69.23C82.05 66.81 83.79 62.09 84.25 59.33C84.27 59.13 84.36 58.75 84.43 58.5C84.54 58.08 84.72 56.56 84.93 54.05C85.03 52.99 84.95 49.78 84.82 49.53C84.74 49.36 84.33 49.3 84.25 49.45Z" />
              </svg>
              <span>liela · version 1.0.0</span>
            </div>
          </div>
        </div>
      )}

      {currentScreen === "compte" && (
        <AccountScreen onBack={() => setCurrentScreen("main")} />
      )}

      {currentScreen === "telechargements" && (
        <SettingsDownloads
          downloads={downloads}
          favoritesCount={favorites.length}
          hasPendingFavorites={false}
          totalDownloadedMo={totalDownloadedMo}
          handleClearDownloads={handleClearDownloads}
          onRemoveDownload={handleRemoveDownload}
          onBack={() => setCurrentScreen("main")}
        />
      )}

      {currentScreen === "aide" && (
        <SettingsHelp
          expandedFaq={expandedFaq}
          setExpandedFaq={setExpandedFaq}
          onBack={() => setCurrentScreen("main")}
        />
      )}

      {currentScreen === "confidentialite" && (
        <SettingsPrivacy
          setShowExportSheet={setShowExportSheet}
          setShowDeleteSheet={setShowDeleteSheet}
          setShowFullPrivacy={setShowFullPrivacy}
          onBack={() => setCurrentScreen("main")}
        />
      )}

      {/* =========================================================================
          MODAL 2: EXPORTER MES DONNÉES
      ========================================================================== */}
      {showExportSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-[rgba(67,53,40,0.34)] animate-in fade-in"
            onClick={() => setShowExportSheet(false)}
          />
          <div className="relative w-full max-w-[480px] bg-creme rounded-t-[24px] p-[10px_16px_20px] text-center z-51 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <span className="block w-[32px] h-[3px] bg-[#E5D9C7] rounded-full mx-auto mb-[14px]" />
            <span className="inline-flex w-[52px] h-[52px] rounded-full items-center justify-center mb-3 bg-[#EDF0EC]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5F6A52" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19.5h14" />
              </svg>
            </span>
            <p className="font-poppins font-light text-[19px]">Exporter mes données</p>
            <p className="text-[12px] text-[#7A6E5E] leading-[1.5] mt-2 max-w-[320px] mx-auto">
              Un fichier JSON contenant les données actuellement disponibles sur cet appareil. Avec un compte, attendez la fin de la synchronisation avant l’export.
            </p>
            <button
              onClick={handleExportData}
              className="w-full bg-encre text-creme rounded-[12px] p-[13px] text-[13.5px] font-semibold mt-[14px] active:opacity-90 transition-opacity"
            >
              Exporter
            </button>
            <button
              onClick={() => setShowExportSheet(false)}
              className="w-full bg-transparent text-encre shadow-[inset_0_0_0_1px_var(--bord)] rounded-[12px] p-[13px] text-[13.5px] font-semibold mt-2 active:bg-coquille/60 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: EFFACER MES DONNÉES ?
      ========================================================================== */}
      {showDeleteSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-[rgba(67,53,40,0.34)] animate-in fade-in"
            onClick={() => setShowDeleteSheet(false)}
          />
          <div className="relative w-full max-w-[480px] bg-creme rounded-t-[24px] p-[10px_16px_20px] text-center z-51 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <span className="block w-[32px] h-[3px] bg-[#E5D9C7] rounded-full mx-auto mb-[14px]" />
            <span className="inline-flex w-[52px] h-[52px] rounded-full items-center justify-center mb-3 bg-[#F6E6E3]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0483C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4.5 21 19H3Z" />
                <path d="M12 10v4M12 16.4v.1" />
              </svg>
            </span>
            <p className="font-poppins font-light text-[19px]">Effacer mes données&nbsp;?</p>
            <p className="text-[12px] text-[#7A6E5E] leading-[1.5] mt-2 max-w-[320px] mx-auto">
              Vos données applicatives seront effacées de cet appareil et, si vous êtes connecté, leur suppression sera synchronisée avec votre compte. Votre compte de connexion et vos droits d’abonnement seront conservés. Les séances téléchargées resteront disponibles.
            </p>
            <p className="text-[12px] text-[#7A6E5E] leading-[1.5] mt-[6px]">
              Cette action est définitive.
            </p>
            <button
              onClick={handleDeleteData}
              className="w-full bg-[#A0483C] text-white rounded-[12px] p-[13px] text-[13.5px] font-semibold mt-[14px] active:opacity-90 transition-opacity"
            >
              Effacer
            </button>
            <button
              onClick={() => setShowDeleteSheet(false)}
              className="w-full bg-transparent text-encre shadow-[inset_0_0_0_1px_var(--bord)] rounded-[12px] p-[13px] text-[13.5px] font-semibold mt-2 active:bg-coquille/60 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: CONNEXION MODAL (Email or Apple)
      ========================================================================== */}
      {/* =========================================================================
          MODAL 5: POLITIQUE COMPLÈTE
      ========================================================================== */}
      {showFullPrivacy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-[rgba(67,53,40,0.34)] animate-in fade-in"
            onClick={() => setShowFullPrivacy(false)}
          />
          <div className="relative w-full max-w-[480px] max-h-[85vh] overflow-y-auto bg-creme rounded-t-[24px] p-[14px_18px_24px] z-51 shadow-2xl animate-in slide-in-from-bottom duration-200 text-left">
            <span className="block w-[32px] h-[3px] bg-[#E5D9C7] rounded-full mx-auto mb-[14px]" />
            <h3 className="font-poppins font-light text-[18px] mb-3">Politique de confidentialité</h3>
            <div className="text-[12px] text-[#7A6E5E] leading-[1.6] space-y-3">
              <p>
                <b>1. Architecture locale par défaut :</b> En mode invité, vos données restent sur cet appareil. Avec un compte, votre profil, vos préférences, favoris, progression, historique et retours sont synchronisés dans Firebase. Un cache local permet l’utilisation hors ligne.
              </p>
              <p>
                <b>2. Absence de traceurs et d&apos;analyse :</b> Liela n’intègre aucun outil d’analyse comportementale externe (comme Google Analytics ou Meta Pixel), ni aucun SDK de pistage ou régie publicitaire.
              </p>
              <p>
                <b>3. Recommandations embarquées :</b> Les suggestions sont calculées dans l’application à partir de vos choix et écoutes. Ces données de personnalisation sont synchronisées avec votre compte.
              </p>
              <p>
                <b>4. Maîtrise totale de vos données :</b> Vous pouvez exporter les données disponibles sur cet appareil sous format standardisé (JSON) ou demander leur suppression depuis les réglages. Hors ligne, les suppressions sont transmises au retour de la connexion. Les téléchargements audio restent sur cet appareil.
              </p>
            </div>
            <button
              onClick={() => setShowFullPrivacy(false)}
              className="w-full bg-encre text-creme rounded-[12px] p-[12px] text-[13.5px] font-semibold mt-5 active:opacity-90 transition-opacity"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: JOURS DE RAPPEL (Sélection précise des jours)
      ========================================================================== */}
      {showDaysSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-[rgba(67,53,40,0.34)] animate-in fade-in"
            onClick={() => setShowDaysSheet(false)}
          />
          <div className="relative w-full max-w-[480px] bg-creme rounded-t-[24px] p-[10px_16px_24px] text-center z-51 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <span className="block w-[32px] h-[3px] bg-[#E5D9C7] rounded-full mx-auto mb-[14px]" />
            <p className="font-poppins font-light text-[17px]">Jours de rappel</p>

            {/* Raccourcis rapides */}
            <div className="flex justify-center gap-2 mt-3 mb-1">
              <button
                onClick={() => handleSetPresetDays("all")}
                className={`text-[11.5px] font-medium px-3 py-[6px] rounded-full transition-colors ${
                  settings.dailyReminderCustomDays?.length === 7
                    ? "bg-encre text-creme"
                    : "bg-white text-[#7A6E5E] shadow-[0_1px_2px_rgba(67,53,40,0.04)]"
                }`}
              >
                Tous les jours
              </button>
              <button
                onClick={() => handleSetPresetDays("weekdays")}
                className={`text-[11.5px] font-medium px-3 py-[6px] rounded-full transition-colors ${
                  settings.dailyReminderDays === "En semaine"
                    ? "bg-encre text-creme"
                    : "bg-white text-[#7A6E5E] shadow-[0_1px_2px_rgba(67,53,40,0.04)]"
                }`}
              >
                En semaine
              </button>
              <button
                onClick={() => handleSetPresetDays("weekend")}
                className={`text-[11.5px] font-medium px-3 py-[6px] rounded-full transition-colors ${
                  settings.dailyReminderDays === "Le week-end"
                    ? "bg-encre text-creme"
                    : "bg-white text-[#7A6E5E] shadow-[0_1px_2px_rgba(67,53,40,0.04)]"
                }`}
              >
                Le week-end
              </button>
            </div>

            {/* Liste des 7 jours configurables individuellement */}
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)] mt-3 text-left">
              {ALL_DAYS.map((day) => {
                const isSelected = settings.dailyReminderCustomDays?.includes(day.key);
                return (
                  <div
                    key={day.key}
                    onClick={() => handleToggleDay(day.key)}
                    className="flex items-center gap-[10px] p-[12px_13px] border-b border-[#F8EFE4] last:border-b-0 cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                        {day.label}
                      </b>
                    </div>
                    {isSelected && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#5F6A52"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6.5 9.5 17 4 11.5" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowDaysSheet(false)}
              className="w-full bg-encre text-creme rounded-[12px] p-[13px] text-[13.5px] font-semibold mt-4 active:opacity-90 transition-opacity"
            >
              Terminer
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 7: HEURE DU RAPPEL (Choix précis ou raccourcis)
      ========================================================================== */}
      {showTimeSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-[rgba(67,53,40,0.34)] animate-in fade-in"
            onClick={() => setShowTimeSheet(false)}
          />
          <div className="relative w-full max-w-[480px] bg-creme rounded-t-[24px] p-[10px_16px_24px] text-center z-51 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <span className="block w-[32px] h-[3px] bg-[#E5D9C7] rounded-full mx-auto mb-[14px]" />
            <p className="font-poppins font-light text-[17px]">Heure du rappel</p>

            {/* Saisie d'heure personnalisée */}
            <div className="bg-white rounded-[15px] p-4 shadow-[0_1px_2px_rgba(67,53,40,0.04)] mt-3 flex flex-col items-center">
              <label className="text-[11px] text-[#9A8E7C] mb-2 font-medium">Choisir une heure précise</label>
              <input
                type="time"
                value={settings.dailyReminderTime}
                onChange={(e) => updateSetting("dailyReminderTime", e.target.value)}
                className="font-poppins font-light text-[32px] text-encre bg-[#F8EFE4] px-4 py-1 rounded-xl outline-none border border-[#E5D9C7] text-center"
              />
              {settings.dailyReminderTime && (
                <p className="text-[11.5px] text-[#5F6A52] font-medium mt-2.5">
                  Prochain rappel : {formatNextReminderDescription(settings.dailyReminderTime, settings.dailyReminderCustomDays)}
                </p>
              )}
            </div>

            {/* Raccourcis fréquents */}
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)] mt-3 text-left">
              {["08:00", "12:30", "18:00", "20:00", "21:00", "22:00"].map((t) => {
                const isSelected = settings.dailyReminderTime === t;
                return (
                  <div
                    key={t}
                    onClick={() => {
                      updateSetting("dailyReminderTime", t);
                      setShowTimeSheet(false);
                    }}
                    className="flex items-center gap-[10px] p-[12px_13px] border-b border-[#F8EFE4] last:border-b-0 cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                        {t}
                      </b>
                    </div>
                    {isSelected && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#5F6A52"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6.5 9.5 17 4 11.5" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowTimeSheet(false)}
              className="w-full bg-encre text-creme rounded-[12px] p-[13px] text-[13.5px] font-semibold mt-4 active:opacity-90 transition-opacity"
            >
              Terminer
            </button>
          </div>
        </div>
      )}

      {/* MODAL AUTORISATION NOTIFICATIONS */}
      <NotificationPermissionModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onPermissionGranted={async () => {
          await updateSetting("dailyReminderEnabled", true);
          showToast("Rappels quotidiens activés ✓");
          await sendTestReminderNotification(settings.dailyReminderTime);
        }}
      />
    </div>
  );
}
