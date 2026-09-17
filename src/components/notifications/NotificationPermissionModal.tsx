"use client";

import React from "react";
import { getNotificationPermission } from "@/lib/notifications";

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export function NotificationPermissionModal({
  isOpen,
  onClose,
  onPermissionGranted,
}: NotificationPermissionModalProps) {
  if (!isOpen) return null;

  const handleRecheck = () => {
    const current = getNotificationPermission();
    if (current === "granted") {
      onPermissionGranted?.();
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-modal-title"
    >
      <div
        className="w-full max-w-md bg-creme text-encre rounded-t-[26px] sm:rounded-[26px] p-6 pb-8 shadow-p2 animate-in slide-in-from-bottom duration-250 flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5E4DA] text-terre-p text-[12px] font-semibold tracking-wide">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Autorisation requise</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gris-2 hover:text-encre text-[20px] leading-none cursor-pointer"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Titre & Explication */}
        <h3 id="notif-modal-title" className="font-poppins font-light text-[21px] leading-[1.25] text-encre mb-2">
          Activer les notifications
        </h3>

        <p className="text-gris-2 text-[13px] leading-[1.45] mb-5">
          Pour vous envoyer votre rappel quotidien, Liela a besoin de l&apos;autorisation de votre appareil. Les notifications sont actuellement bloquées.
        </p>

        {/* Instructions détaillées Android */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="p-3.5 rounded-[16px] bg-white border border-filet shadow-[0_1px_2px_rgba(67,53,40,0.03)]">
            <b className="block font-medium text-[13.5px] text-encre mb-1.5">
              📱 Sur Android :
            </b>
            <ol className="text-[12px] text-gris-2 leading-[1.45] space-y-1.5 list-decimal list-inside">
              <li>
                Appuyez sur l&apos;icône de <strong>paramètres du site</strong> (les jauges ou le cadenas à gauche de la barre d&apos;adresse dans Chrome) ou allez dans <strong>Paramètres Android &gt; Applications &gt; Liela (ou Chrome)</strong>.
              </li>
              <li>
                Sélectionnez <strong>Autorisations &gt; Notifications</strong>.
              </li>
              <li>
                Cochez <strong>« Autoriser les notifications »</strong>.
              </li>
            </ol>
          </div>

          <div className="p-3 rounded-[14px] bg-coquille border border-filet text-[11.5px] text-gris-2 leading-[1.4]">
            💡 <em>Liela n’envoie jamais de publicité : un seul rappel bienveillant par jour à l’heure que vous choisissez, sans relance insistante.</em>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleRecheck}
            className="w-full bg-terre-p text-creme font-medium text-[14px] py-3 rounded-[13px] transition-transform active:scale-[0.98] shadow-sm"
          >
            J&apos;ai activé les notifications
          </button>
          <button
            onClick={onClose}
            className="w-full bg-sable hover:bg-[#E8DCCB] text-encre font-medium text-[13.5px] py-2.5 rounded-[13px] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
