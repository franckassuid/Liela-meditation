"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

import { STORAGE_KEYS } from "@/lib/storage";
const DISPLAY_DURATION_MS = 2000;
const FADE_DURATION_MS = 500;

export function SplashScreen() {
  const [mounted, setMounted] = useState(true);
  const [hasStartedTransition, setHasStartedTransition] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si déjà affiché durant la session en cours, masquer immédiatement
    const hasShown = sessionStorage.getItem(STORAGE_KEYS.SPLASH_SHOWN);
    if (hasShown) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(false);
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEYS.SPLASH_SHOWN, "true");
    } catch {}

    // Déclenche la transition douce : apparition soyeuse du slogan et du galet autour du logo
    const transitionTimer = setTimeout(() => {
      setHasStartedTransition(true);
    }, 60);

    // Affiche l'écran pendant 2 secondes avant le fondu de sortie vers l'accueil
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const unmountTimer = setTimeout(() => {
        setMounted(false);
      }, FADE_DURATION_MS);
      return () => clearTimeout(unmountTimer);
    }, DISPLAY_DURATION_MS);

    return () => {
      clearTimeout(transitionTimer);
      clearTimeout(timer);
    };
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
      <div className="flex flex-col items-center text-center max-w-sm w-full relative">
        {/* Logo Liela : ancré au centre, naturel et serein */}
        <div className="w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] flex items-center justify-center">
          <Image
            src="/icon-192.png"
            alt="Liela"
            width={88}
            height={88}
            className="w-full h-full object-contain"
            priority
          />
        </div>

        {/* Slogan : fondu velouté et émergence naturelle */}
        <div
          className={`flex flex-col items-center text-center transition-all duration-700 ease-out ${
            hasStartedTransition
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
          style={{
            transitionDelay: hasStartedTransition ? "120ms" : "0ms",
          }}
        >
          <p className="font-poppins font-light text-[15px] sm:text-[16px] text-[#7A6E5E] text-center mt-4 max-w-[280px] leading-snug">
            La méditation qu&apos;il vous faut, maintenant.
          </p>
        </div>
      </div>
    </div>
  );
}

