"use client";

import React, { useState, useEffect } from "react";
import { LielaEmblem } from "./Icons";

const SPLASH_STORAGE_KEY = "liela_splash_shown";
const DISPLAY_DURATION_MS = 2000;
const FADE_DURATION_MS = 450;

export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Détection si l'application vient d'être complètement ouverte (cold start)
    const hasShown = sessionStorage.getItem(SPLASH_STORAGE_KEY);
    if (!hasShown) {
      setMounted(true);
      try {
        sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
      } catch (_) {}

      // Affiche l'écran pendant 2 secondes avant de lancer le fondu de sortie
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        const unmountTimer = setTimeout(() => {
          setMounted(false);
        }, FADE_DURATION_MS);
        return () => clearTimeout(unmountTimer);
      }, DISPLAY_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#FDF9F0] flex flex-col items-center justify-center p-6 select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Logo Liela */}
        <div className="w-[96px] h-[96px] flex items-center justify-center drop-shadow-sm mb-1">
          <LielaEmblem width={96} height={96} />
        </div>

        {/* Typographie de marque */}
        <h1 className="font-poppins font-light text-[34px] tracking-[-0.02em] text-[#433528] mt-3 leading-none">
          liela
        </h1>

        {/* Slogan */}
        <p className="font-poppins font-light text-[15.5px] text-[#7A6E5E] text-center mt-3 max-w-[280px] leading-snug">
          La méditation qu&apos;il vous faut, maintenant.
        </p>
      </div>
    </div>
  );
}
