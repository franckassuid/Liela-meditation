"use client";

import React, { useState } from "react";
import { storage, SessionHistoryItem } from "@/lib/storage";
import { SessionCard } from "@/components/ui/SessionCard";
import sessionsData from "@/generated/sessions.json";
import { getSituation } from "@/config/situations";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const [history] = useState<SessionHistoryItem[]>(() => storage.getHistory());
  const router = useRouter();

  return (
    <div className="p-marge pb-8 flex flex-col flex-1">
      <h1 className="font-poppins font-light text-[24px] leading-[1.2] mb-6 mt-2">
        Historique
      </h1>
      
      {history.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[15px] text-gris-2 text-center">
            Vos séances terminées apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((historyItem, idx) => {
            const session = sessionsData.find(s => s.id === historyItem.sessionId);
            if (!session) return null;
            const situation = getSituation(session.metadata.situation);
            const date = new Date(historyItem.startedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short"
            });
            
            return (
              <div key={`${historyItem.sessionId}-${idx}`}>
                <p className="text-[12px] text-gris-3 mb-1.5 ml-1">{date}</p>
                <SessionCard
                  title={session.metadata.title}
                  duration={historyItem.duration}
                  situationName={situation?.shortLabel}
                  situationColor={situation?.color}
                  situationVoile={situation?.voile}
                  onClick={() => router.push(`/player?id=${session.id}`)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
