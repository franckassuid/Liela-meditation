"use client";

import React, { useState, useEffect } from "react";
import { LielaEmblem } from "./Icons";

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

    // Affiche le logo, le slogan et le galet qui tourne pendant 3 secondes
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
      <div className="flex flex-col items-center text-center">
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

        {/* Galet qui tourne pour indiquer le chargement */}
        <div className="mt-8 flex flex-col items-center justify-center">
          <div className="w-10 h-10 flex items-center justify-center animate-pebble-spin">
            <svg
              viewBox="0 0 100 100"
              width="36"
              height="36"
              className="drop-shadow-sm"
              aria-hidden="true"
            >
              {/* Forme organique de galet zen */}
              <path
                fill="#A26248"
                d="M50 16 C76 16, 88 32, 84 52 C80 72, 68 84, 48 84 C28 84, 16 70, 16 50 C16 30, 26 16, 50 16 Z"
                opacity="0.9"
              />
              {/* Reflet organique intérieur */}
              <path
                fill="#FDF9F0"
                d="M48 26 C64 26, 74 36, 72 50 C70 64, 60 74, 46 74 C34 74, 26 64, 26 50 C26 36, 34 26, 48 26 Z"
                opacity="0.26"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

