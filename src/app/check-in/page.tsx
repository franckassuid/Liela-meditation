"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getAvailableSituations } from "@/lib/sessions";
import { SituationCard } from "@/components/ui/SituationCard";

export default function CheckInPage() {
  const router = useRouter();
  const availableSituations = getAvailableSituations();

  return (
    <div className="p-marge pb-4 flex flex-col flex-1">
      <div className="flex justify-between items-center mb-4 text-gris-3 text-[11px] pt-2">
        <button 
          onClick={() => router.push("/")} 
          className="text-gris-2 hover:text-encre transition-colors text-[13px] flex items-center gap-1"
        >
          ← Accueil
        </button>
        <span>1 / 2</span>
      </div>
      
      <h1 className="font-poppins font-light text-[22px] leading-[1.2] mb-4">
        Comment vous sentez-vous ?
      </h1>
      
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {availableSituations.map((situation) => (
          <SituationCard
            key={situation.id}
            situation={situation}
            onClick={() => router.push(`/check-in/duration?situation=${situation.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
