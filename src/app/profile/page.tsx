"use client";

import React, { useState, useEffect } from "react";
import { storage, SessionHistoryItem } from "@/lib/storage";

export default function ProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const profile = await storage.getProfile();
      const hist = await storage.getHistory();
      if (active) {
        setFirstName(profile.firstName || "Profil");
        setHistory(hist.filter(h => h.completed || h.duration > 0)); // Filter out unstarted/invalid
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
