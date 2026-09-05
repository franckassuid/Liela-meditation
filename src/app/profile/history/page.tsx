"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { storage, SessionHistoryItem } from "@/lib/storage";
import { SessionCard } from "@/components/ui/SessionCard";
import sessionsData from "@/generated/sessions.json";
import { getSituation } from "@/config/situations";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [promptFavSessionId, setPromptFavSessionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const hist = await storage.getHistory();
      if (!active) return;
      setHistory(hist);

      // Vérifier s'il faut proposer la mise en favoris pour la dernière séance
      if (hist.length > 0) {
        const lastSession = hist[0];
        if (lastSession.completed && lastSession.completedAt) {
          const completedTime = new Date(lastSession.completedAt).getTime();
          const now = Date.now();
          // Si terminée il y a moins d'une minute
          if (now - completedTime < 60000) {
            const isFav = await storage.hasFavorite(lastSession.sessionId);
            const hasRefused = await storage.hasRefusedFavorite(lastSession.sessionId);
            const dailyPrompts = await storage.getDailyFavoritePrompts();

            if (!isFav && !hasRefused && dailyPrompts < 2) {
              setPromptFavSessionId(lastSession.sessionId);
              await storage.incrementDailyFavoritePrompts();
            }
          }
        }
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const handleAcceptFav = async () => {
    if (promptFavSessionId) {
      await storage.addFavorite(promptFavSessionId, "post-session");
      setPromptFavSessionId(null);
    }
  };

  const handleDeclineFav = async () => {
    if (promptFavSessionId) {
      await storage.addFavoriteRefusal(promptFavSessionId);
      setPromptFavSessionId(null);
    }
  };

  const totalTimeMinutes = Math.round(history.reduce((acc, item) => acc + item.lastPosition, 0) / 60);
  const completedCount = history.filter((item) => item.completed).length;

  // Group by date
  const groupedHistory = history.reduce((acc, item) => {
    const date = new Date(item.startedAt);
    const dateStr = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const capitalizedDateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    if (!acc[capitalizedDateStr]) acc[capitalizedDateStr] = [];
    acc[capitalizedDateStr].push(item);
    return acc;
  }, {} as Record<string, SessionHistoryItem[]>);

  const promptSession = promptFavSessionId ? sessionsData.find(s => s.id === promptFavSessionId) : null;
  const promptSituation = promptSession ? getSituation(promptSession.metadata.situation) : null;

  return (
    <div className="p-marge pb-8 flex flex-col flex-1">
      <h1 className="font-poppins font-light text-[24px] leading-[1.2] mb-6 mt-2">
        Mon profil
      </h1>

      <div className="bg-surface rounded-xl p-5 mb-8 border border-filet shadow-sm">
        <h2 className="text-[14px] font-semibold text-gris-2 mb-4">Statistiques bienveillantes</h2>
        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-filet">
            <p className="text-[28px] font-poppins font-light text-encre leading-none mb-1">
              {totalTimeMinutes}
            </p>
            <p className="text-[12px] text-gris-2">Minutes de sérénité</p>
          </div>
          <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-filet">
            <p className="text-[28px] font-poppins font-light text-encre leading-none mb-1">
              {completedCount}
            </p>
            <p className="text-[12px] text-gris-2">Séances complétées</p>
          </div>
        </div>
      </div>

      {promptSession && (
        <div className="bg-white rounded-xl p-5 mb-8 shadow-p2 border border-filet relative overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: promptSituation?.color || "var(--bord)" }} />
          <h3 className="font-poppins font-medium text-[16px] mb-2">Vous voulez la retrouver ?</h3>
          <p className="text-[14px] text-gris-2 mb-4">
            Vous venez de terminer « {promptSession.metadata.title} ». L'ajouter à vos favoris ?
          </p>
          <div className="flex gap-3">
            <button 
              onClick={handleAcceptFav}
              className="flex-1 py-2.5 rounded-full bg-encre text-creme text-[14px] font-semibold active:scale-95 transition-transform"
            >
              Ajouter aux favoris
            </button>
            <button 
              onClick={handleDeclineFav}
              className="flex-1 py-2.5 rounded-full bg-surface text-gris-2 text-[14px] font-semibold active:scale-95 transition-transform"
            >
              Non merci
            </button>
          </div>
        </div>
      )}

      <h2 className="font-poppins font-medium text-[18px] mb-4">Historique</h2>
      
      {history.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10 bg-surface rounded-xl border border-filet">
          <p className="text-[15px] text-gris-2 text-center px-4">
            Vos séances terminées apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedHistory).map(([dateStr, items]) => (
            <div key={dateStr}>
              <h3 className="text-[13px] font-medium text-gris-2 mb-3 ml-1">{dateStr}</h3>
              <div className="flex flex-col gap-3">
                {items.map((historyItem, idx) => {
                  const session = sessionsData.find(s => s.id === historyItem.sessionId);
                  if (!session) return null;
                  const situation = getSituation(session.metadata.situation);
                  
                  return (
                    <div key={`${historyItem.sessionId}-${idx}`} className="relative">
                      <SessionCard
                        title={session.metadata.title}
                        duration={session.metadata.durationSeconds}
                        situationName={situation?.shortLabel}
                        situationColor={situation?.color}
                        situationVoile={situation?.voile}
                        onClick={() => router.push(`/player?id=${session.id}`)}
                      />
                      {/* Badge indicateur d'état */}
                      <div className="absolute top-4 right-4 flex gap-1">
                        {historyItem.completed ? (
                          <span className="w-2 h-2 rounded-full bg-sauge-p" title="Complétée" />
                        ) : historyItem.abandoned ? (
                          <span className="w-2 h-2 rounded-full bg-red-400" title="Abandonnée" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[#E5B55C]" title="Inachevée" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
