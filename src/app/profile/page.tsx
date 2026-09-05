"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { storage, SessionHistoryItem, Favori } from "@/lib/storage";
import { getSituation } from "@/lib/sessions";
import sessionsData from "@/generated/sessions.json";
import { HeartIcon } from "@/components/ui/Icons";

export default function ProfilePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<Favori[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const profile = await storage.getProfile();
      const hist = await storage.getHistory();
      const favs = await storage.getFavorites();
      if (active) {
        setFirstName(profile.firstName || "Profil");
        setHistory(hist.filter(h => h.completed || h.duration > 0)); // Filter out unstarted/invalid
        setFavorites(favs);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  // Stats calculation
  const totalSessions = history.length;
  const totalSeconds = history.reduce((acc, h) => acc + h.lastPosition, 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);


  const formatRelativeDate = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0 && d.getDate() === now.getDate()) return "aujourd'hui";
    if (diffDays === 1) return "hier";
    
    const days = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
    if (diffDays < 7) return days[d.getDay()];
    
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const handleToggleFavorite = async (sessionId: string) => {
    const isFav = favorites.some(f => f.sessionId === sessionId);
    if (isFav) {
      await storage.removeFavorite(sessionId);
    } else {
      await storage.addFavorite(sessionId, "profile");
    }
    const newFavs = await storage.getFavorites();
    setFavorites(newFavs);
  };

  return (
    <div className="p-marge pb-4 flex flex-col min-h-screen">
      <h1 className="font-poppins font-light text-[32px] sm:text-[36px] leading-[1.1] pt-[max(1rem,env(safe-area-inset-top))] mb-[24px]">
        {firstName}
      </h1>

      {/* Stats — spec §6: pas de streak/jours consécutifs */}
      <div className="flex gap-[7px] mt-[10px]">
        <div className="flex-1 bg-coquille rounded-[13px] p-[11px] min-h-[96px] flex flex-col justify-center">
          <b className="block font-poppins font-light text-[22px] sm:text-[24px]">{totalSessions}</b>
          <i className="not-italic text-[10px] text-gris-2 mt-1">séances</i>
        </div>
        <div className="flex-1 bg-coquille rounded-[13px] p-[11px] min-h-[96px] flex flex-col justify-center">
          <b className="block font-poppins font-light text-[22px] sm:text-[24px]">
            {totalHours > 0 ? `${totalHours} h ${totalMinutes < 10 ? '0' : ''}${totalMinutes}` : `${totalMinutes} min`}
          </b>
          <i className="not-italic text-[10px] text-gris-2 mt-1">au total</i>
        </div>
      </div>

      {/* History */}
      <p className="text-[11.5px] font-semibold m-[24px_0_10px]">Historique</p>
      <div className="flex flex-col">
        {history.length === 0 ? (
          <p className="text-[13px] text-gris-2">Aucune séance pour le moment.</p>
        ) : (
          history.slice(0, 5).map((item, idx) => {
            const session = sessionsData.find(s => s.id === item.sessionId);
            if (!session) return null;
            const sit = getSituation(session.metadata.situation);
            const isFav = favorites.some(f => f.sessionId === item.sessionId);
            const mins = Math.max(1, Math.round(item.lastPosition / 60));

            return (
              <div 
                key={`${item.sessionId}-${item.startedAt}-${idx}`} 
                className="flex items-center gap-[10px] py-[10px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/50 transition-colors"
                onClick={() => router.push(`/player?id=${session.id}`)}
              >
                <div 
                  className="w-[9px] h-[9px] rounded-full shrink-0" 
                  style={{ background: sit?.color || "var(--bord)" }}
                />
                <div className="flex-1 min-w-0">
                  <b className="block text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                    {session.metadata.title}
                  </b>
                  <i className="block not-italic text-[10.5px] text-gris-2">
                    {formatRelativeDate(item.startedAt)} · {Math.max(1, Math.round((item.duration || session.metadata.durationSeconds) / 60))} min
                  </i>
                </div>
                <div 
                  className="p-2 -mr-2 cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(session.id);
                  }}
                >
                  <HeartIcon 
                    size={16} 
                    filled={isFav} 
                    className={isFav ? "text-[#A26248]" : "text-gris-2"} 
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Settings */}
      <p className="text-[11.5px] font-semibold m-[24px_0_2px]">Réglages</p>
      <div className="flex flex-col mb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center py-[12px] border-b border-filet text-[12.5px] cursor-pointer active:bg-coquille/50 transition-colors">
          <span>Rappel quotidien</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gris2)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7"/></svg>
        </div>
        <div className="flex justify-between items-center py-[12px] border-b border-filet text-[12.5px] cursor-pointer active:bg-coquille/50 transition-colors">
          <span>Téléchargements</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gris2)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7"/></svg>
        </div>
        <div className="flex justify-between items-center py-[12px] border-b border-filet text-[12.5px] cursor-pointer active:bg-coquille/50 transition-colors">
          <span>Compte</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gris2)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  );
}
