"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type PwaPlatform = "ios" | "android" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaContextType {
  isStandalone: boolean;
  isAppInstalled: boolean;
  platform: PwaPlatform;
  isSafari: boolean;
  canNativePrompt: boolean;
  isBannerVisible: boolean;
  isModalOpen: boolean;
  promptInstall: () => Promise<void>;
  openPwaApp: (path?: string) => void;
  openModal: () => void;
  closeModal: () => void;
  dismissBanner: () => void;
}

const PwaContext = createContext<PwaContextType | null>(null);

const SNOOZE_KEY = "liela_pwa_dismissed_until";
const SNOOZE_DAYS = 7;
const INSTALLED_STORAGE_KEY = "liela_pwa_installed";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
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

    // 2. Détection Standalone (Déjà lancé comme PWA native)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidApp = document.referrer.includes("android-app://");
      return isStandaloneMedia || isIosStandalone || isAndroidApp;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    // Vérification si déjà installée sur l'appareil (via localStorage)
    const storedInstalled = localStorage.getItem(INSTALLED_STORAGE_KEY) === "true";
    if (standalone || storedInstalled) {
      setIsAppInstalled(true);
      if (standalone) {
        try {
          localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
        } catch (_) {}
      }
    }

    // Vérification native Chromium getInstalledRelatedApps (Android Chrome 80+)
    if ("getInstalledRelatedApps" in navigator) {
      (navigator as unknown as { getInstalledRelatedApps?: () => Promise<unknown[]> })
        .getInstalledRelatedApps?.()
        .then((apps) => {
          if (Array.isArray(apps) && apps.length > 0) {
            setIsAppInstalled(true);
            try {
              localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
            } catch (_) {}
            setIsBannerVisible(false);
          } else if (Array.isArray(apps) && apps.length === 0 && !standalone) {
            // L'OS confirme qu'aucune app PWA liée n'est installée
            setIsAppInstalled(false);
            try {
              localStorage.removeItem(INSTALLED_STORAGE_KEY);
            } catch (_) {}
          }
        })
        .catch(() => {});
    }

    const mql = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsAppInstalled(true);
        setIsBannerVisible(false);
        try {
          localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
        } catch (_) {}
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
      setIsAppInstalled(true);
      setIsBannerVisible(false);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
      } catch (_) {}
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 5. Affichage progressif du bandeau (uniquement si NON installé)
    if (!standalone && !storedInstalled) {
      const dismissedUntil = localStorage.getItem(SNOOZE_KEY);
      const isSnoozed = dismissedUntil && Number(dismissedUntil) > Date.now();

      if (!isSnoozed) {
        // Apparition douce après 2.5 secondes
        const timer = setTimeout(() => {
          if (localStorage.getItem(INSTALLED_STORAGE_KEY) !== "true") {
            setIsBannerVisible(true);
          }
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

  // Déclenchement de l'installation en 1 clic sur Android / Chromium
  const promptInstall = useCallback(async () => {
    // Si une modal explicative était ouverte, la fermer pour laisser place au prompt natif
    setIsModalOpen(false);

    let promptToUse = deferredPrompt;

    // Si sur Android et que le prompt natif est en train d'arriver, attendre brièvement (max 400ms)
    if (!promptToUse && platform === "android") {
      await new Promise<void>((resolve) => {
        let resolved = false;
        const onPrompt = (e: Event) => {
          if (!resolved) {
            resolved = true;
            e.preventDefault();
            promptToUse = e as BeforeInstallPromptEvent;
            window.removeEventListener("beforeinstallprompt", onPrompt);
            resolve();
          }
        };
        window.addEventListener("beforeinstallprompt", onPrompt);
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener("beforeinstallprompt", onPrompt);
            resolve();
          }
        }, 400);
      });
    }

    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const choice = await promptToUse.userChoice;
        if (choice.outcome === "accepted") {
          setIsStandalone(true);
          setIsAppInstalled(true);
          setIsBannerVisible(false);
          setDeferredPrompt(null);
          try {
            localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
          } catch (_) {}
        }
      } catch (err) {
        console.error("Install prompt error:", err);
        setIsModalOpen(true);
      }
    } else {
      // Sur iOS ou si le prompt natif n'est pas disponible, ouvrir le guide illustré
      setIsModalOpen(true);
    }
  }, [deferredPrompt, platform]);

  // Ouverture directe de l'application PWA installée depuis le navigateur
  const openPwaApp = useCallback((path: string = "/settings") => {
    if (typeof window === "undefined") return;
    const targetUrl = window.location.origin + path;
    const isAndroid = /android/i.test(navigator.userAgent);

    if (isAndroid) {
      const hostAndPath = window.location.host + path;
      const intentUrl = `intent://${hostAndPath}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;

      // Déclenche l'intent Android (ouvre le WebAPK)
      window.location.href = intentUrl;

      // Fallback après délai si l'intent n'a pas été intercepté
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 1200);
      return;
    }

    window.location.href = targetUrl;
  }, []);

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
        isAppInstalled,
        platform,
        isSafari,
        canNativePrompt: !!deferredPrompt,
        isBannerVisible,
        isModalOpen,
        promptInstall,
        openPwaApp,
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
