"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { storage, SessionHistoryItem } from "@/lib/storage";
import { SessionCard } from "@/components/ui/SessionCard";
import { SituationCard } from "@/components/ui/SituationCard";
import sessionsData from "@/generated/sessions.json";
import { getSituation, getAvailableSituations } from "@/lib/sessions";

export default function HomePage() {
  const router = useRouter();
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => storage.getOnboardingCompleted());
  const [firstName] = useState<string>(() => storage.getProfile().firstName);
  const [recentSessions] = useState<SessionHistoryItem[]>(() => storage.getHistory().slice(0, 2));
  const [inProgress] = useState<SessionHistoryItem | null>(() => storage.getInProgressSession());

  const handleCompleteOnboarding = () => {
    storage.setOnboardingCompleted(true);
    setIsOnboarded(true);
  };

  if (!isOnboarded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-creme p-marge text-center">
        <BrandLogo variant="icon" className="w-[86px] h-[86px] mb-8" />
        <h1 className="font-poppins font-light text-[26px] leading-[1.2] mb-4">
          La méditation qu&apos;il vous faut, maintenant.
        </h1>
        <p className="text-gris-2 text-[15px] mb-8 max-w-[280px]">
          Choisissez ce dont vous avez besoin, indiquez le temps disponible. Liela propose une séance.
        </p>
        <Button className="w-full mt-auto mb-4" onClick={handleCompleteOnboarding}>
          Commencer
        </Button>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    const greeting = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
    return firstName ? `${greeting} ${firstName}` : greeting;
  };

  return (
    <div className="p-marge pb-8 flex flex-col flex-1">
      {/* Header with prominent Logo */}
      <div className="flex justify-between items-center pt-2 mb-6">
        <BrandLogo variant="horizontal" width={110} className="h-8 w-auto" />
      </div>
      
      <h1 className="font-poppins font-light text-[24px] leading-[1.2] mb-1">
        {getGreeting()}
      </h1>
      <p className="text-[13px] text-gris-2 mb-5">De quoi avez-vous besoin maintenant ?</p>

      {/* Situations Grid directly on Home (only situations with existing sessions) */}
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {getAvailableSituations().map((situation) => (
          <SituationCard
            key={situation.id}
            situation={situation}
            onClick={() => router.push(`/check-in/duration?situation=${situation.id}`)}
          />
        ))}
      </div>

      {inProgress && (
        <div className="mb-6">
          <div className="flex justify-between items-end mb-3">
            <h3 className="font-semibold text-[14px]">Reprendre</h3>
          </div>
          {(() => {
            const session = sessionsData.find(s => s.id === inProgress.sessionId);
            if (!session) return null;
            const situation = getSituation(session.metadata.situation);
            const progress = inProgress.lastPosition / session.metadata.durationSeconds;
            return (
              <SessionCard
                title={session.metadata.title}
                duration={session.metadata.durationSeconds}
                situationName={situation?.shortLabel}
                situationColor={situation?.color}
                situationVoile={situation?.voile}
                progress={progress}
                onClick={() => router.push(`/player?id=${session.id}`)}
              />
            );
          })()}
        </div>
      )}

      {recentSessions.length > 0 && !inProgress && (
        <div className="mb-4">
          <h3 className="font-semibold text-[14px] mb-3">Récemment</h3>
          <div className="flex flex-col gap-3">
            {recentSessions.map((historyItem, idx) => {
              const session = sessionsData.find(s => s.id === historyItem.sessionId);
              if (!session) return null;
              const situation = getSituation(session.metadata.situation);
              return (
                <SessionCard
                  key={`${historyItem.sessionId}-${idx}`}
                  title={session.metadata.title}
                  duration={session.metadata.durationSeconds}
                  situationName={situation?.shortLabel}
                  situationColor={situation?.color}
                  situationVoile={situation?.voile}
                  onClick={() => router.push(`/player?id=${session.id}`)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
