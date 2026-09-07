"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  storage,
  AppSettings,
  DEFAULT_SETTINGS,
  DownloadedSession,
  Favori,
  ALL_DAYS,
  DayOfWeek,
  formatReminderDays,
} from "@/lib/storage";

type ScreenType = "main" | "compte" | "telechargements" | "aide" | "confidentialite";

export default function SettingsPage() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("main");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [downloads, setDownloads] = useState<DownloadedSession[]>([]);
  const [favorites, setFavorites] = useState<Favori[]>([]);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [showFullPrivacy, setShowFullPrivacy] = useState(false);
  const [showDaysSheet, setShowDaysSheet] = useState(false);
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [accountEmailModal, setAccountEmailModal] = useState<"email" | "apple" | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    let active = true;
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
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await storage.setSettings({ [key]: value });
  };

  const handleToggleDownloadFavorites = async () => {
    const nextVal = !settings.downloadFavorites;
    await updateSetting("downloadFavorites", nextVal);
    if (nextVal) {
      await storage.syncFavoriteDownloads(true);
      const d = await storage.getDownloads();
      setDownloads(d);
      showToast("Téléchargement des favoris activé");
    } else {
      showToast("Téléchargement des favoris désactivé");
    }
  };

  const handleToggleWifiOnly = async () => {
    const nextVal = !settings.downloadWifiOnly;
    await updateSetting("downloadWifiOnly", nextVal);
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
  };

  const totalDownloadedMo = downloads.reduce((acc, cur) => acc + (cur.sizeMo || 0), 0);
  const favoritesCount = favorites.length;
  const downloadedFavoritesCount = downloads.filter((d) => d.isFavorite).length;
  const hasPendingFavorites = settings.downloadFavorites && favoritesCount > downloadedFavoritesCount;

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
    try {
      await storage.clearAllData();
      const freshSettings = await storage.getSettings();
      setSettings(freshSettings);
      setShowDeleteSheet(false);
      showToast("Vos données locales ont été effacées");
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la suppression");
    }
  };

  // Clear downloads
  const handleClearDownloads = async () => {
    await storage.clearDownloads();
    setDownloads([]);
    showToast("Téléchargements supprimés");
  };

  // Save account
  const handleSaveAccount = async () => {
    if (accountEmailModal === "email" && emailInput.trim()) {
      const accountUser = { email: emailInput.trim(), method: "email" };
      await updateSetting("accountUser", accountUser);
      setAccountEmailModal(null);
      setEmailInput("");
      showToast("Compte associé");
    } else if (accountEmailModal === "apple") {
      const accountUser = { email: "utilisateur@icloud.com", method: "apple" };
      await updateSetting("accountUser", accountUser);
      setAccountEmailModal(null);
      showToast("Connecté avec Apple");
    }
  };

  const handleDisconnectAccount = async () => {
    await updateSetting("accountUser", null);
    showToast("Compte déconnecté");
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
                    {settings.accountUser?.email ? "Mon compte" : "Se connecter"}
                  </b>
                  <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                    {settings.accountUser?.email
                      ? settings.accountUser.email
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
              {/* Télécharger mes favoris */}
              <div
                onClick={handleToggleDownloadFavorites}
                className="flex items-center gap-[9px] p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    Télécharger mes favoris
                  </b>
                  {!settings.downloadFavorites && (
                    <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                      Désactivé
                    </i>
                  )}
                </div>
                <div
                  className={`w-[38px] h-[22px] rounded-full shrink-0 relative transition-colors cursor-pointer ${
                    settings.downloadFavorites ? "bg-[#5F6A52]" : "bg-[#F0E5D6]"
                  }`}
                >
                  <i
                    className={`absolute top-[2.5px] w-[17px] h-[17px] rounded-full bg-white shadow-[0_1px_2px_rgba(67,53,40,0.2)] transition-all duration-150 ${
                      settings.downloadFavorites ? "left-[18.5px]" : "left-[2.5px]"
                    }`}
                  />
                </div>
              </div>

              {/* Sous-option indentée : En Wi-Fi uniquement */}
              {settings.downloadFavorites && (
                <div
                  onClick={handleToggleWifiOnly}
                  className="flex items-center gap-[9px] py-[12px] px-[13px] pl-[26px] bg-[#FDFBF7] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                      En Wi-Fi uniquement
                    </b>
                  </div>
                  <div
                    className={`w-[38px] h-[22px] rounded-full shrink-0 relative transition-colors cursor-pointer ${
                      settings.downloadWifiOnly ? "bg-[#5F6A52]" : "bg-[#F0E5D6]"
                    }`}
                  >
                    <i
                      className={`absolute top-[2.5px] w-[17px] h-[17px] rounded-full bg-white shadow-[0_1px_2px_rgba(67,53,40,0.2)] transition-all duration-150 ${
                        settings.downloadWifiOnly ? "left-[18.5px]" : "left-[2.5px]"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Gérer les téléchargements */}
              <div
                onClick={() => setCurrentScreen("telechargements")}
                className="flex items-center gap-[9px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    Gérer les téléchargements
                  </b>
                </div>
                <span className="text-[12.5px] text-[#7A6E5E]">{totalDownloadedMo} Mo</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
            </div>
            {settings.downloadFavorites && (
              <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-[7px] mx-[3px]">
                Une séance retirée des favoris est effacée de l’appareil.
              </p>
            )}

            {/* RAPPEL */}
            <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-[15px] mb-[6px] ml-[3px]">
              Rappel
            </p>
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
              {/* Rappel quotidien switch */}
              <div
                onClick={() => updateSetting("dailyReminderEnabled", !settings.dailyReminderEnabled)}
                className={`flex items-center gap-[9px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors ${
                  settings.dailyReminderEnabled ? "border-b border-[#F8EFE4]" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    Rappel quotidien
                  </b>
                  {!settings.dailyReminderEnabled && (
                    <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                      Désactivé
                    </i>
                  )}
                </div>
                <div
                  className={`w-[38px] h-[22px] rounded-full shrink-0 relative transition-colors cursor-pointer ${
                    settings.dailyReminderEnabled ? "bg-[#5F6A52]" : "bg-[#F0E5D6]"
                  }`}
                >
                  <i
                    className={`absolute top-[2.5px] w-[17px] h-[17px] rounded-full bg-white shadow-[0_1px_2px_rgba(67,53,40,0.2)] transition-all duration-150 ${
                      settings.dailyReminderEnabled ? "left-[18.5px]" : "left-[2.5px]"
                    }`}
                  />
                </div>
              </div>

              {/* Si activé: Heure et Jours */}
              {settings.dailyReminderEnabled && (
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
                    className="flex items-center gap-[9px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
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
                </>
              )}
            </div>
            {settings.dailyReminderEnabled && (
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

      {/* =========================================================================
          SCREEN 2: COMPTE
      ========================================================================== */}
      {currentScreen === "compte" && (
        <div className="p-marge pb-12 flex flex-col flex-1 max-w-[480px] w-full mx-auto animate-in fade-in">
          {/* Top sub */}
          <div className="flex items-center gap-[10px] pt-2 pb-[14px]">
            <button
              onClick={() => setCurrentScreen("main")}
              className="p-1 -ml-1 text-encre active:opacity-60 transition-opacity"
              aria-label="Retour aux réglages"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#433528" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <span className="font-poppins font-light text-[18px]">Compte</span>
          </div>

          <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-1 mx-[3px]">
            Un compte sert à une seule chose : retrouver vos favoris et votre historique sur un autre appareil. Rien n’est analysé, rien n’est partagé.
          </p>

          <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)] mt-[14px]">
            {!settings.accountUser?.email ? (
              <>
                <div
                  onClick={() => setAccountEmailModal("email")}
                  className="flex items-center gap-[10px] p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                >
                  <span className="flex shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A6E5E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                      <path d="m4 7 8 6 8-6" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                      Continuer par e-mail
                    </b>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </div>

                <div
                  onClick={() => setAccountEmailModal("apple")}
                  className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                >
                  <span className="flex shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A6E5E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
                      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                      Continuer avec Apple
                    </b>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-[10px] p-[12px_13px] border-b border-[#F8EFE4]">
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                      Compte connecté
                    </b>
                    <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                      {settings.accountUser.email}
                    </i>
                  </div>
                </div>
                <div
                  onClick={handleDisconnectAccount}
                  className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13.5px] leading-[1.3] text-[#A0483C]">
                      Se déconnecter
                    </b>
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-3 mx-[3px]">
            Vous pouvez continuer à utiliser Liela sans compte. Tout reste alors sur cet appareil.
          </p>
        </div>
      )}

      {/* =========================================================================
          SCREEN 3: TÉLÉCHARGEMENTS
      ========================================================================== */}
      {currentScreen === "telechargements" && (
        <div className="p-marge pb-12 flex flex-col flex-1 max-w-[480px] w-full mx-auto animate-in fade-in">
          {/* Top sub */}
          <div className="flex items-center gap-[10px] pt-2 pb-[14px]">
            <button
              onClick={() => setCurrentScreen("main")}
              className="p-1 -ml-1 text-encre active:opacity-60 transition-opacity"
              aria-label="Retour aux réglages"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#433528" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <span className="font-poppins font-light text-[18px]">Téléchargements</span>
          </div>

          {/* Jauge */}
          <div className="bg-white rounded-[15px] p-[14px] mt-[2px] shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
            <div className="flex items-baseline gap-2">
              <b className="font-poppins font-light text-[22px]">{totalDownloadedMo} Mo</b>
              <span className="text-[10.5px] text-[#9A8E7C]">
                {downloads.length} séance{downloads.length > 1 ? "s" : ""} · {favoritesCount} favori{favoritesCount > 1 ? "s" : ""}
              </span>
            </div>
            <div className="h-1 bg-[#F0E5D6] rounded-full mt-[10px] overflow-hidden">
              <i
                className="block h-full bg-[#5F6A52] rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(2, Math.min(100, Math.round((totalDownloadedMo / 650) * 100)))}%`,
                }}
              />
            </div>
          </div>

          {hasPendingFavorites && (
            <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-[7px] mx-[3px]">
              Un favori est en cours de téléchargement.
            </p>
          )}

          <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-[15px] mb-[6px] ml-[3px]">
            Sur cet appareil
          </p>
          <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
            {downloads.length === 0 ? (
              <div className="p-4 text-center text-[12.5px] text-[#7A6E5E]">
                Aucune séance téléchargée
              </div>
            ) : (
              downloads.map((item, idx) => (
                <div
                  key={`${item.sessionId}-${idx}`}
                  className="flex items-center gap-[9px] p-[12px_13px] border-b border-[#F8EFE4] last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                      {item.title}
                    </b>
                  </div>
                  {item.isFavorite && (
                    <span className="flex shrink-0">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="#A26248"
                        stroke="#A26248"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-label="Téléchargé automatiquement"
                      >
                        <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z" />
                      </svg>
                    </span>
                  )}
                  <span className="text-[12.5px] text-[#7A6E5E] shrink-0">
                    {Math.max(1, Math.round(item.duration / 60))} min
                  </span>
                </div>
              ))
            )}
          </div>

          {downloads.length > 0 && (
            <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)] mt-[10px]">
              <div
                onClick={handleClearDownloads}
                className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-[#A0483C]">
                    Tout supprimer
                  </b>
                </div>
              </div>
            </div>
          )}

          <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-[7px] mx-[3px]">
            Le cœur signale une séance téléchargée automatiquement parce qu’elle est en favori. Les téléchargements ne sont pas effacés par « Effacer mes données ».
          </p>
        </div>
      )}

      {/* =========================================================================
          SCREEN 4: AIDE ET CONTACT
      ========================================================================== */}
      {currentScreen === "aide" && (
        <div className="p-marge pb-12 flex flex-col flex-1 max-w-[480px] w-full mx-auto animate-in fade-in">
          {/* Top sub */}
          <div className="flex items-center gap-[10px] pt-2 pb-[14px]">
            <button
              onClick={() => setCurrentScreen("main")}
              className="p-1 -ml-1 text-encre active:opacity-60 transition-opacity"
              aria-label="Retour aux réglages"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#433528" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <span className="font-poppins font-light text-[18px]">Aide et contact</span>
          </div>

          {/* FAQ */}
          <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-2 mb-[7px] ml-[3px]">
            Questions fréquentes
          </p>
          <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
            {/* Q1 */}
            <div
              onClick={() => setExpandedFaq(expandedFaq === "q1" ? null : "q1")}
              className="p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-[10px]">
                <b className="font-normal text-[13.5px] leading-[1.3] text-encre">
                  L’audio se coupe quand je verrouille
                </b>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C6BBA9"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${expandedFaq === "q1" ? "rotate-90" : ""}`}
                >
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
              {expandedFaq === "q1" && (
                <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-2 pt-2 border-t border-[#F8EFE4]">
                  Sur iOS et Safari, assurez-vous de lancer la séance avec l'écran allumé. Liela maintient la session audio en arrière-plan et gère le verrouillage sans coupure via l'API audio web et les contrôles média du système.
                </p>
              )}
            </div>

            {/* Q2 */}
            <div
              onClick={() => setExpandedFaq(expandedFaq === "q2" ? null : "q2")}
              className="p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-[10px]">
                <b className="font-normal text-[13.5px] leading-[1.3] text-encre">
                  Comment fonctionne le minuteur
                </b>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C6BBA9"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${expandedFaq === "q2" ? "rotate-90" : ""}`}
                >
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
              {expandedFaq === "q2" && (
                <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-2 pt-2 border-t border-[#F8EFE4]">
                  Le minuteur d'arrêt éteint progressivement la voix et le fond sonore pour vous laisser vous endormir paisiblement, sans réveil brutal ni sursaut.
                </p>
              )}
            </div>

            {/* Q3 */}
            <div
              onClick={() => setExpandedFaq(expandedFaq === "q3" ? null : "q3")}
              className="p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-[10px]">
                <b className="font-normal text-[13.5px] leading-[1.3] text-encre">
                  Puis-je écouter hors ligne
                </b>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C6BBA9"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${expandedFaq === "q3" ? "rotate-90" : ""}`}
                >
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
              {expandedFaq === "q3" && (
                <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-2 pt-2 border-t border-[#F8EFE4]">
                  Oui ! Toutes vos séances téléchargées restent disponibles dans le stockage local de votre appareil et se lisent sans aucune connexion Internet.
                </p>
              )}
            </div>
          </div>

          {/* Nous écrire */}
          <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-4 mb-[7px] ml-[3px]">
            Nous écrire
          </p>
          <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
            <a
              href="mailto:bonjour@liela.app?subject=Question%20Liela"
              className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                  Envoyer un message
                </b>
                <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
                  Réponse sous quelques jours
                </i>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </a>
          </div>

          <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-3 mx-[3px]">
            Liela n’est pas un soin médical. Si vous traversez une période difficile, parlez-en à un professionnel de santé.
          </p>
        </div>
      )}

      {/* =========================================================================
          SCREEN 5: CONFIDENTIALITÉ
      ========================================================================== */}
      {currentScreen === "confidentialite" && (
        <div className="p-marge pb-12 flex flex-col flex-1 max-w-[480px] w-full mx-auto animate-in fade-in">
          {/* Top sub */}
          <div className="flex items-center gap-[10px] pt-2 pb-[14px]">
            <button
              onClick={() => setCurrentScreen("main")}
              className="p-1 -ml-1 text-encre active:opacity-60 transition-opacity"
              aria-label="Retour aux réglages"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#433528" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <span className="font-poppins font-light text-[18px]">Confidentialité</span>
          </div>

          {/* Carte conf */}
          <div className="bg-white rounded-[15px] p-4 shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
            <p className="font-poppins font-light text-[14.5px]">Ce que Liela sait de vous</p>
            <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-[5px]">
              Vos favoris, votre historique d’écoute et vos réglages sont enregistrés sur cet appareil, et nulle part ailleurs.
            </p>

            <p className="font-poppins font-light text-[14.5px] mt-[14px]">Ce qui ne sort jamais</p>
            <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-[5px]">
              Aucune donnée d’usage n’est envoyée à un serveur. Les recommandations sont calculées sur votre téléphone. Il n’y a ni traceur, ni mesure d’audience, ni publicité.
            </p>

            <p className="font-poppins font-light text-[14.5px] mt-[14px]">Ce que vous pouvez faire</p>
            <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-[5px]">
              Exporter vos données à tout moment, ou les effacer entièrement depuis les réglages.
            </p>
          </div>

          <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)] mt-[10px]">
            <div
              onClick={() => setShowFullPrivacy(true)}
              className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                  Politique complète
                </b>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
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
              Un fichier contenant vos favoris, votre historique et vos réglages. Lisible, et réimportable si vous changez d’appareil.
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
              Vos favoris, votre historique et vos réglages seront supprimés de cet appareil. Les séances téléchargées resteront disponibles.
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
      {accountEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[rgba(67,53,40,0.34)] animate-in fade-in"
            onClick={() => setAccountEmailModal(null)}
          />
          <div className="relative w-full max-w-sm bg-creme rounded-[20px] p-5 z-51 shadow-2xl text-left border border-filet">
            <h3 className="font-poppins font-light text-[18px] mb-2">
              {accountEmailModal === "email" ? "Connexion par e-mail" : "Connexion avec Apple"}
            </h3>
            <p className="text-[12px] text-[#7A6E5E] leading-[1.5] mb-4">
              {accountEmailModal === "email"
                ? "Entrez votre adresse e-mail pour synchroniser vos données locales."
                : "Confirmez votre identifiant Apple pour synchroniser vos données locales."}
            </p>
            {accountEmailModal === "email" && (
              <input
                type="email"
                placeholder="votre@email.fr"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-white border border-filet rounded-xl px-3 py-2 text-[13.5px] text-encre mb-4 outline-none focus:border-encre"
                autoFocus
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setAccountEmailModal(null)}
                className="flex-1 py-[10px] text-[13px] font-semibold rounded-xl border border-filet text-gris-2 active:bg-coquille"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveAccount}
                className="flex-1 py-[10px] text-[13px] font-semibold rounded-xl bg-encre text-creme active:opacity-90"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

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
                <b>1. Architecture locale par défaut :</b> Liela a été conçue pour fonctionner de manière autonome sur votre appareil. Vos séances écoutées, favoris, réglages et historique sont stockés dans la base de données locale (IndexedDB) de votre navigateur ou appareil.
              </p>
              <p>
                <b>2. Absence de traceurs et d'analyse :</b> Liela n’intègre aucun outil d’analyse comportementale externe (comme Google Analytics ou Meta Pixel), ni aucun SDK de pistage ou régie publicitaire.
              </p>
              <p>
                <b>3. Recommandations embarquées :</b> Toutes les suggestions de séances reposent sur des calculs réalisés localement sur votre téléphone selon vos réponses aux check-ins et vos écoutes passées.
              </p>
              <p>
                <b>4. Maîtrise totale de vos données :</b> Vous pouvez exporter l’intégralité de vos données sous format standardisé (JSON) ou les détruire définitivement à tout instant depuis les réglages.
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
    </div>
  );
}
