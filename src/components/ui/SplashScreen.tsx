"use client";

import React, { useState, useEffect } from "react";
import { LielaEmblem } from "./Icons";
import { BreathingVisualizer } from "./BreathingVisualizer";

const SPLASH_STORAGE_KEY = "liela_splash_shown";
const DISPLAY_DURATION_MS = 3000;
const FADE_DURATION_MS = 500;

export function SplashScreen() {
  const [mounted, setMounted] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si déjà affiché durant la session en cours, masquer immédiatement
    const hasShown = sessionStorage.getItem(SPLASH_STORAGE_KEY);
    if (hasShown) {
      setMounted(false);
      return;
    }

    try {
      sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
    } catch (_) {}

    // Affiche le logo, le slogan et le galet de l'accueil pendant 3 secondes
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const unmountTimer = setTimeout(() => {
        setMounted(false);
      }, FADE_DURATION_MS);
      return () => clearTimeout(unmountTimer);
    }, DISPLAY_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div
      id="liela-splash-screen"
      className={`fixed inset-0 z-[99999] bg-[#FDF9F0] flex flex-col items-center justify-center p-6 select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center text-center max-w-sm w-full">
        {/* Logo Liela */}
        <div className="w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] flex items-center justify-center drop-shadow-sm">
          <LielaEmblem width={88} height={88} />
        </div>

        {/* Typographie de marque */}
        <h1 className="font-poppins font-light text-[32px] sm:text-[36px] tracking-[-0.02em] text-[#433528] mt-2.5 leading-none">
          liela
        </h1>

        {/* Slogan */}
        <p className="font-poppins font-light text-[15px] sm:text-[16px] text-[#7A6E5E] text-center mt-2.5 max-w-[280px] leading-snug">
          La méditation qu&apos;il vous faut, maintenant.
        </p>

        {/* Galet authentique identique à l'écran d'accueil avec rotation douce pour le chargement */}
        <div className="relative w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] my-6 flex items-center justify-center">
          <div className="w-full h-full relative flex items-center justify-center animate-[spin_8s_linear_infinite]">
            <BreathingVisualizer color="#A26248" />
          </div>
        </div>
      </div>
    </div>
  );
}

