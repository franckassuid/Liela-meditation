"use client";

import React from "react";
import Image from "next/image";
import { usePwa } from "./PwaContext";
import {
  ShareIcon,
  PlusSquareIcon,
  AppleIcon,
  AndroidIcon,
  MoreVerticalIcon,
  SmartphoneIcon,
  DownloadIcon,
} from "@/components/ui/Icons";

export function InstallPwaModal() {
  const { isModalOpen, closeModal, platform, isSafari, canNativePrompt, promptInstall } = usePwa();

  if (!isModalOpen) return null;

  const isIos = platform === "ios";
  const isAndroid = platform === "android";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <div
        className="w-full max-w-md bg-creme text-encre rounded-t-[26px] sm:rounded-[26px] p-6 pb-8 shadow-p2 animate-in slide-in-from-bottom duration-250 flex flex-col max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre du haut : Badge plateforme & bouton fermer */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coquille border border-filet text-encre text-[12px] font-medium tracking-wide">
            {isIos ? (
              <>
                <AppleIcon size={14} className="text-encre" />
                <span>iPhone & iPad</span>
              </>
            ) : isAndroid ? (
              <>
                <AndroidIcon size={14} className="text-[#5F6A52]" />
                <span>Android</span>
              </>
            ) : (
              <>
                <SmartphoneIcon size={14} className="text-encre" />
                <span>Application mobile</span>
              </>
            )}
          </div>
          <button
            onClick={closeModal}
            className="p-1 text-gris-2 hover:text-encre text-[20px] leading-none cursor-pointer active:scale-90 transition-transform"
            aria-label="Fermer le guide d'installation"
          >
            ✕
          </button>
        </div>

        {/* Titre & sous-titre */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-[48px] h-[48px] rounded-[13px] overflow-hidden shrink-0 shadow-sm border border-[rgba(67,53,40,0.08)] bg-coquille">
            <Image
              src="/icon-192.png"
              alt="Liela"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 id="install-modal-title" className="font-poppins font-light text-[21px] leading-[1.2] text-encre">
              Installer Liela
            </h3>
            <p className="text-[12.5px] text-gris-2 leading-[1.4] mt-1">
              Pour un confort total en plein écran, sans la barre d'adresse et avec écoute hors-ligne.
            </p>
          </div>
        </div>

        {/* Parcours pour iPhone / iOS */}
        {isIos && (
          <div className="flex flex-col gap-3.5 mb-6">
            {!isSafari && (
              <div className="bg-[#F8EFE4] border border-[#D8CAB4] rounded-[14px] p-3 text-[12px] text-encre flex items-start gap-2.5">
                <span className="text-[15px] shrink-0">💡</span>
                <p className="leading-[1.4]">
                  Sur iPhone, l'ajout à l'écran d'accueil se fait depuis <strong>Safari</strong>. Ouvrez ce lien dans Safari si vous êtes dans un autre navigateur.
                </p>
              </div>
            )}

            {/* Étape 1 */}
            <div className="flex items-center gap-3.5 p-3 rounded-[16px] bg-white border border-filet/70 shadow-[0_1px_2px_rgba(67,53,40,0.03)]">
              <div className="w-[40px] h-[40px] rounded-full bg-coquille border border-filet flex items-center justify-center shrink-0 text-terre-p">
                <ShareIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <b className="block font-medium text-[13.5px] text-encre">
                  1. Touchez Partager
                </b>
                <p className="text-[11.5px] text-gris-2 leading-[1.35] mt-0.5">
                  En bas de votre écran dans Safari, appuyez sur l'icône de partage (le carré avec la flèche vers le haut).
                </p>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="flex items-center gap-3.5 p-3 rounded-[16px] bg-white border border-filet/70 shadow-[0_1px_2px_rgba(67,53,40,0.03)]">
              <div className="w-[40px] h-[40px] rounded-full bg-coquille border border-filet flex items-center justify-center shrink-0 text-terre-p">
                <PlusSquareIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <b className="block font-medium text-[13.5px] text-encre">
                  2. « Sur l'écran d'accueil »
                </b>
                <p className="text-[11.5px] text-gris-2 leading-[1.35] mt-0.5">
                  Faites défiler le menu d'actions vers le bas et sélectionnez cette option.
                </p>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="flex items-center gap-3.5 p-3 rounded-[16px] bg-white border border-filet/70 shadow-[0_1px_2px_rgba(67,53,40,0.03)]">
              <div className="w-[40px] h-[40px] rounded-full bg-coquille border border-filet flex items-center justify-center shrink-0 text-sauge-p font-semibold text-[15px]">
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <b className="block font-medium text-[13.5px] text-encre">
                  3. Touchez « Ajouter »
                </b>
                <p className="text-[11.5px] text-gris-2 leading-[1.35] mt-0.5">
                  En haut à droite de l'écran. L'icône Liela apparaît sur votre écran d'accueil comme une vraie application !
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Parcours pour Android */}
        {isAndroid && (
          <div className="flex flex-col gap-3.5 mb-6">
            {canNativePrompt ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={promptInstall}
                  className="w-full bg-terre-p text-creme font-medium text-[14.5px] py-3.5 px-4 rounded-[14px] shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <DownloadIcon size={18} />
                  <span>Installer maintenant</span>
                </button>
                <p className="text-center text-[11px] text-gris-3">
                  Une boîte de dialogue native Android va s'ouvrir pour confirmer.
                </p>
              </div>
            ) : (
              <>
                {/* Étape 1 Android */}
                <div className="flex items-center gap-3.5 p-3 rounded-[16px] bg-white border border-filet/70 shadow-[0_1px_2px_rgba(67,53,40,0.03)]">
                  <div className="w-[40px] h-[40px] rounded-full bg-coquille border border-filet flex items-center justify-center shrink-0 text-terre-p">
                    <MoreVerticalIcon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <b className="block font-medium text-[13.5px] text-encre">
                      1. Ouvrez le menu
                    </b>
                    <p className="text-[11.5px] text-gris-2 leading-[1.35] mt-0.5">
                      Touchez les 3 points verticaux ⋮ en haut à droite de votre navigateur Chrome.
                    </p>
                  </div>
                </div>

                {/* Étape 2 Android */}
                <div className="flex items-center gap-3.5 p-3 rounded-[16px] bg-white border border-filet/70 shadow-[0_1px_2px_rgba(67,53,40,0.03)]">
                  <div className="w-[40px] h-[40px] rounded-full bg-coquille border border-filet flex items-center justify-center shrink-0 text-terre-p">
                    <SmartphoneIcon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <b className="block font-medium text-[13.5px] text-encre">
                      2. « Installer l'application »
                    </b>
                    <p className="text-[11.5px] text-gris-2 leading-[1.35] mt-0.5">
                      (Ou « Ajouter à l'écran d'accueil » selon votre version d'Android).
                    </p>
                  </div>
                </div>

                {/* Étape 3 Android */}
                <div className="flex items-center gap-3.5 p-3 rounded-[16px] bg-white border border-filet/70 shadow-[0_1px_2px_rgba(67,53,40,0.03)]">
                  <div className="w-[40px] h-[40px] rounded-full bg-coquille border border-filet flex items-center justify-center shrink-0 text-sauge-p font-semibold text-[15px]">
                    ✓
                  </div>
                  <div className="flex-1 min-w-0">
                    <b className="block font-medium text-[13.5px] text-encre">
                      3. Confirmez
                    </b>
                    <p className="text-[11.5px] text-gris-2 leading-[1.35] mt-0.5">
                      Validez en appuyant sur « Installer ». L'icône est ajoutée à vos applications.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Parcours Ordinateur / Autre */}
        {!isIos && !isAndroid && (
          <div className="flex flex-col gap-3.5 mb-6">
            {canNativePrompt ? (
              <button
                onClick={promptInstall}
                className="w-full bg-terre-p text-creme font-medium text-[14.5px] py-3.5 px-4 rounded-[14px] shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <DownloadIcon size={18} />
                <span>Installer sur cet appareil</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-[16px] bg-white border border-filet/70 text-[12.5px] text-gris-2 leading-[1.5]">
                Pour installer Liela sur votre téléphone, ouvrez <strong>liela.app</strong> directement depuis le navigateur de votre <strong>iPhone (Safari)</strong> ou de votre <strong>Android (Chrome)</strong>.
              </div>
            )}
          </div>
        )}

        {/* Points forts */}
        <div className="grid grid-cols-3 gap-2 py-3 mb-4 border-t border-filet text-center">
          <div className="flex flex-col items-center">
            <span className="text-[15px] mb-1">🎧</span>
            <span className="text-[11px] font-medium text-encre">Plein écran</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[15px] mb-1">📴</span>
            <span className="text-[11px] font-medium text-encre">Hors-ligne</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[15px] mb-1">⚡</span>
            <span className="text-[11px] font-medium text-encre">Accès direct</span>
          </div>
        </div>

        {/* Bouton fermeture */}
        <button
          onClick={closeModal}
          className="w-full bg-sable hover:bg-[#E8DCCB] text-encre font-medium text-[14px] py-3 rounded-[13px] transition-colors active:scale-[0.99]"
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
}
