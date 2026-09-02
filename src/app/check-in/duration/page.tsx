"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DurationSelector } from "@/components/ui/DurationSelector";
import { getAvailableDurations } from "@/lib/sessions";

function DurationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const situation = searchParams.get("situation");
  
  const durations = getAvailableDurations(situation);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(() => {
    const list = getAvailableDurations(situation);
    return list.length === 1 ? list[0].value : null;
  });

  const handleNext = () => {
    if (selectedDuration !== null && situation) {
      router.push(`/recommendation?situation=${situation}&duration=${selectedDuration}`);
    }
  };

  return (
    <div className="p-marge pb-4 flex flex-col flex-1">
      <div className="flex justify-between items-center mb-4 text-gris-3 text-[11px] pt-2">
        <button 
          onClick={() => router.back()} 
          className="text-gris-2 hover:text-encre transition-colors text-[13px] flex items-center gap-1"
        >
          ← Retour
        </button>
        <span>2 / 2</span>
      </div>
      
      <h1 className="font-poppins font-light text-[22px] leading-[1.2] mb-4">
        Combien de temps avez-vous ?
      </h1>
      
      <div className="flex flex-col gap-2.5 mb-5">
        {durations.map((d) => (
          <DurationSelector
            key={d.value}
            label={d.label}
            selected={selectedDuration === d.value}
            onClick={() => setSelectedDuration(d.value)}
          />
        ))}
      </div>

      <Button
        className="mt-auto mb-1"
        fullWidth
        disabled={selectedDuration === null}
        onClick={handleNext}
      >
        Voir ma séance
      </Button>
    </div>
  );
}

export default function DurationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-creme" />}>
      <DurationContent />
    </Suspense>
  );
}
