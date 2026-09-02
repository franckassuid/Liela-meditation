"use client";

import React from "react";
import { LockIcon } from "./Icons";
import { Button } from "./Button";

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionTitle?: string;
}

export function ProModal({ isOpen, onClose, sessionTitle }: ProModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-creme text-encre rounded-t-lg sm:rounded-lg p-6 pb-8 shadow-p2 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sable text-encre text-[12px] font-semibold tracking-wide">
            <LockIcon size={14} className="text-encre" />
            <span>Liela Pro</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gris-2 hover:text-encre text-[20px] leading-none cursor-pointer"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <h3 className="font-poppins font-light text-[22px] leading-[1.25] mb-2 text-encre">
          Disponible dans la version Pro
        </h3>

        {sessionTitle && (
          <p className="font-medium text-[15px] text-gris-2 mb-3">
            « {sessionTitle} »
          </p>
        )}

        <p className="text-gris-2 text-[14px] leading-relaxed mb-6">
          Cette séance fera partie de la collection <strong>Liela Pro</strong>. Vous pouvez dès à présent profiter gratuitement des séances déjà disponibles dans votre application.
        </p>

        <Button fullWidth onClick={onClose}>
          Compris
        </Button>
      </div>
    </div>
  );
}
