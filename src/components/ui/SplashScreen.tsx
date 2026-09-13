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

        {/* Indicateur de chargement : Grand galet zen & halo orbital lumineux */}
        <div className="mt-10 flex flex-col items-center justify-center">
          <div className="relative w-[76px] h-[76px] flex items-center justify-center">
            {/* 1. Halo orbital rotatif avec dégradé lumineux */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full animate-spin [animation-duration:2.2s] [animation-timing-function:linear]"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="orbitalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D09B83" stopOpacity="0" />
                  <stop offset="50%" stopColor="#D09B83" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#A26248" stopOpacity="1" />
                </linearGradient>
              </defs>
              {/* Piste circulaire discrète */}
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="#E5D9C7"
                strokeWidth="2.5"
                strokeOpacity="0.6"
              />
              {/* Arc orbital lumineux actif */}
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="url(#orbitalGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="75 205"
              />
              {/* Perle de tête lumineuse */}
              <circle
                cx="50"
                cy="6"
                r="3.5"
                fill="#A26248"
                className="drop-shadow-[0_0_5px_rgba(162,98,72,0.7)]"
              />
            </svg>

            {/* 2. Grand Galet de méditation central avec texture polie et respiration douce */}
            <div className="relative w-12 h-12 flex items-center justify-center animate-pebble-breathe">
              <svg
                viewBox="0 0 100 100"
                className="w-12 h-12 drop-shadow-[0_6px_16px_rgba(67,53,40,0.22)]"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="pebbleBodyGrad" x1="15%" y1="10%" x2="85%" y2="90%">
                    <stop offset="0%" stopColor="#D09B83" />
                    <stop offset="45%" stopColor="#BA7B63" />
                    <stop offset="100%" stopColor="#A26248" />
                  </linearGradient>
                  <linearGradient id="pebbleShineGrad" x1="0%" y1="0%" x2="70%" y2="70%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Galet naturel lissé */}
                <path
                  fill="url(#pebbleBodyGrad)"
                  d="M50 12 C78 12, 90 28, 86 52 C82 76, 70 88, 48 88 C26 88, 12 74, 12 50 C12 26, 24 12, 50 12 Z"
                />
                {/* Reflet poli supérieur */}
                <path
                  fill="url(#pebbleShineGrad)"
                  d="M48 20 C68 20, 78 30, 76 46 C74 58, 66 68, 50 68 C34 68, 22 56, 22 42 C22 28, 30 20, 48 20 Z"
                />
              </svg>
            </div>
          </div>

          {/* Indication textuelle claire du chargement */}
          <span className="font-poppins font-light text-[12.5px] text-[#7A6E5E] tracking-wider mt-3.5 opacity-90">
            Préparation de votre espace...
          </span>
        </div>
      </div>
    </div>
  );
}

