"use client";

import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePwa } from "./PwaContext";

export function InstallPwaBanner() {
  const { isBannerVisible, isStandalone, platform, promptInstall, dismissBanner } = usePwa();
  const pathname = usePathname();

  // Ne pas afficher si déjà installé, si masqué, ou dans le lecteur audio
  if (!isBannerVisible || isStandalone || pathname?.startsWith("/player")) {
    return null;
  }

  const isIos = platform === "ios";
  const buttonLabel = isIos ? "Ajouter" : "Installer";

  return (
    <div
      className="fixed bottom-[max(4.8rem,calc(env(safe-area-inset-bottom)+4.2rem))] left-3 right-3 max-w-[420px] mx-auto z-30 animate-in fade-in slide-in-from-bottom-3 duration-300"
      role="banner"
      aria-label="Proposition d'installation de l'application"
    >
      <div className="bg-[#FDF9F0]/95 backdrop-blur-md border border-filet rounded-[18px] p-2.5 pl-3 pr-2 shadow-p2 flex items-center gap-3">
        {/* Icône de l'application */}
        <div className="w-[40px] h-[40px] rounded-[11px] overflow-hidden shrink-0 shadow-sm border border-[rgba(67,53,40,0.08)] bg-coquille flex items-center justify-center">
          <Image
            src="/icon-192.png"
            alt="Liela"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Textes explicatifs */}
        <div className="flex-1 min-w-0 pr-1">
          <p className="font-poppins font-light text-[13.5px] leading-[1.2] text-encre">
            Installez Liela
          </p>
          <p className="text-[11.5px] text-gris-2 leading-[1.25] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            Plein écran & écoute hors-ligne
          </p>
        </div>

        {/* Bouton d'action */}
        <button
          onClick={promptInstall}
          className="shrink-0 bg-terre-p text-creme font-medium text-[12.5px] px-3.5 py-1.5 rounded-[10px] active:scale-95 transition-transform shadow-sm"
        >
          {buttonLabel}
        </button>

        {/* Bouton Fermer */}
        <button
          onClick={dismissBanner}
          className="shrink-0 p-1.5 text-gris-3 hover:text-encre active:scale-90 transition-all"
          aria-label="Ne plus afficher pour le moment"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
