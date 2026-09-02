"use client";

import React, { useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { recommendSession } from "@/lib/sessions";
import { getSituation } from "@/config/situations";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";

function RecommendationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const situationId = searchParams.get("situation");
  const durationStr = searchParams.get("duration");
  
  const session = useMemo(() => {
    if (situationId && durationStr !== null) {
      return recommendSession(situationId, parseInt(durationStr, 10));
    }
    return null;
  }, [situationId, durationStr]);

  const situation = getSituation(situationId);

  if (!session || !situation) {
    return (
      <div className="p-marge pb-8 flex flex-col flex-1 justify-center items-center text-center">
        <h2 className="font-poppins font-light text-[22px] mb-4">Aucune séance trouvée</h2>
        <p className="text-gris-2 text-[15px] mb-8">
          De nouvelles séances arrivent bientôt pour cette situation.
        </p>
        <Button onClick={() => router.push("/")} variant="secondary">Retour à l&apos;accueil</Button>
      </div>
    );
  }

  const durationMins = Math.round(session.metadata.durationSeconds / 60);

  return (
    <div className="p-marge pb-8 flex flex-col flex-1">
      <div className="flex justify-between items-center mb-6 text-gris-3 text-[11px] pt-2">
        <button 
          onClick={() => router.back()} 
          className="text-gris-2 hover:text-encre transition-colors text-[13px] flex items-center gap-1"
        >
          ← Retour
        </button>
        <span className="text-[12px] font-medium text-gris-2">{situation.shortLabel}</span>
      </div>

      <div 
        className="rounded-md h-[140px] flex items-end p-5 mb-4 shadow-p1"
        style={{ backgroundColor: situation.color }}
      >
        <span className="font-poppins font-light text-[22px] leading-[1.15] text-[#FDF9F0]">
          {session.metadata.title}
        </span>
      </div>

      <p className="text-encre text-[15px] leading-[1.6] mb-4 max-w-[60ch]">
        {session.metadata.shortDescription || "Prenez un moment pour vous, guidé par la voix et les ambiances sonores."}
      </p>

      <div className="flex gap-2 mb-8">
        <Tag>{durationMins} min</Tag>
        {session.audio.voice && (
          <Tag variant="default">Guidée</Tag>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2.5 mb-2">
        <Button fullWidth onClick={() => router.push(`/player?id=${session.id}`)}>
          Commencer la séance
        </Button>
        <button 
          className="text-[12px] text-gris-2 hover:text-encre text-center mt-1 p-2 active:scale-[0.97] transition-transform"
          onClick={() => router.push("/explore")}
        >
          Proposer autre chose
        </button>
      </div>
    </div>
  );
}

export default function RecommendationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-creme" />}>
      <RecommendationContent />
    </Suspense>
  );
}
