"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type PwaPlatform = "ios" | "android" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaContextType {
  isStandalone: boolean;
  platform: PwaPlatform;
  isSafari: boolean;
  canNativePrompt: boolean;
  isBannerVisible: boolean;
  isModalOpen: boolean;
  promptInstall: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  dismissBanner: () => void;
}

const PwaContext = createContext<PwaContextType | null>(null);

const SNOOZE_KEY = "liela_pwa_dismissed_until";
const SNOOZE_DAYS = 7;

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<PwaPlatform>("desktop");
  const [isSafari, setIsSafari] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Détection environnement et enregistrement Service Worker
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Enregistrement Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.log("SW register notice:", err));
    }

    // 2. Détection Standalone (Déjà installé)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidApp = document.referrer.includes("android-app://");
      return isStandaloneMedia || isIosStandalone || isAndroidApp;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    const mql = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsBannerVisible(false);
      }
    };
    mql.addEventListener("change", handleMediaChange);

    // 3. Détection OS & Navigateur
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);

    let detectedPlatform: PwaPlatform = "desktop";
    if (isIosDevice) {
      detectedPlatform = "ios";
      // Safari sur iOS (exclut Chrome CriOS, Firefox FxiOS, etc.)
      const isIosSafari =
        /safari/.test(ua) && !/crios|fxios|edgios|opios|opera/.test(ua);
      setIsSafari(isIosSafari);
    } else if (isAndroidDevice) {
      detectedPlatform = "android";
    }
    setPlatform(detectedPlatform);

    // 4. Écoute du prompt natif (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsBannerVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 5. Affichage progressif du bandeau (si non installé et non masqué)
    if (!standalone) {
      const dismissedUntil = localStorage.getItem(SNOOZE_KEY);
      const isSnoozed = dismissedUntil && Number(dismissedUntil) > Date.now();

      if (!isSnoozed) {
        // Apparition douce après 2.5 secondes
        const timer = setTimeout(() => {
          setIsBannerVisible(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      mql.removeEventListener("change", handleMediaChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Déclenchement de l'installation
  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsStandalone(true);
          setIsBannerVisible(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error("Install prompt error:", err);
        setIsModalOpen(true);
      }
    } else {
      // Sur iOS ou si le prompt natif n'est pas prêt, ouvrir le guide illustré
      setIsModalOpen(true);
    }
  }, [deferredPrompt]);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const dismissBanner = useCallback(() => {
    setIsBannerVisible(false);
    if (typeof window !== "undefined") {
      const snoozeDuration = SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + snoozeDuration));
    }
  }, []);

  return (
    <PwaContext.Provider
      value={{
        isStandalone,
        platform,
        isSafari,
        canNativePrompt: !!deferredPrompt,
        isBannerVisible,
        isModalOpen,
        promptInstall,
        openModal,
        closeModal,
        dismissBanner,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error("usePwa must be used within a PwaProvider");
  }
  return context;
}
