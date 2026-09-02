"use client";

import React, { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { recommendSession } from "@/lib/sessions";
import { getSituation } from "@/config/situations";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { LockIcon } from "@/components/ui/Icons";
import { ProModal } from "@/components/ui/ProModal";

function RecommendationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const situationId = searchParams.get("situation");
  const durationStr = searchParams.get("duration");
  const [showProModal, setShowProModal] = useState(false);
  
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

  const durationMins = session.durationMinutes;

  return (
    <div className="p-marge pb-4 flex flex-col flex-1">
      <div className="flex justify-between items-center mb-3 text-gris-3 text-[11px] pt-2">
        <button 
          onClick={() => router.back()} 
          className="text-gris-2 hover:text-encre transition-colors text-[13px] flex items-center gap-1"
        >
          ← Retour
        </button>
        <span className="text-[12px] font-medium text-gris-2">{situation.shortLabel}</span>
      </div>

      <div 
        className="rounded-md h-[120px] flex flex-col justify-between p-4 mb-3 shadow-p1"
        style={{ backgroundColor: situation.color }}
      >
        <div className="flex justify-between items-start">
          {!session.isAvailable && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20 text-[#FDF9F0] backdrop-blur-xs">
              <LockIcon size={12} />
              <span>Version Pro</span>
            </span>
          )}
        </div>
        <span className="font-poppins font-light text-[20px] leading-[1.15] text-[#FDF9F0]">
          {session.title}
        </span>
      </div>

      <p className="text-encre text-[14px] leading-[1.5] mb-3 max-w-[60ch]">
        {session.description || "Prenez un moment pour vous, guidé par la voix et les ambiances sonores."}
      </p>

      <div className="flex gap-2 mb-4">
        <Tag>{durationMins} min</Tag>
        <Tag variant="default">Guidée</Tag>
        {!session.isAvailable && (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-sm bg-sable text-gris-2">
            <LockIcon size={12} />
            <span>Pro</span>
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 mb-1">
        {session.isAvailable ? (
          <Button fullWidth onClick={() => router.push(`/player?id=${session.realSessionId || session.id}`)}>
            Commencer la séance
          </Button>
        ) : (
          <Button fullWidth onClick={() => setShowProModal(true)}>
            Débloquer avec Liela Pro
          </Button>
        )}
        <button 
          className="text-[12px] text-gris-2 hover:text-encre text-center py-1.5 active:scale-[0.97] transition-transform"
          onClick={() => router.push("/explore")}
        >
          {session.isAvailable ? "Proposer autre chose" : "Explorer les séances gratuites"}
        </button>
      </div>

      <ProModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        sessionTitle={session.title}
      />
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
