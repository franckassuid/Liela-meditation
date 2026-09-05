"use client";

import React, { useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { SessionCard } from "@/components/ui/SessionCard";
import { SESSIONS_CATALOG, getCategoryInfo, CatalogSession } from "@/config/sessionsCatalog";
import { getSituation } from "@/lib/sessions";
import { storage, Favori } from "@/lib/storage";

import { SleepIcon, StressIcon, FocusIcon, BreathIcon, EnergyIcon, EmotionsIcon } from "@/components/ui/Icons";

const situationIcons: Record<string, React.FC<any>> = {
  "trouver-le-sommeil": SleepIcon,
  "calmer-le-stress": StressIcon,
  "calmer-les-pensees": EmotionsIcon,
  "retrouver-sa-concentration": FocusIcon,
  "relacher-les-tensions": EnergyIcon,
  "se-recentrer": BreathIcon,
};

export default function SituationPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const situationId = params.id;
  const situation = getSituation(situationId);
  const [selectedDuration, setSelectedDuration] = useState<string>("all");
  const [favorites, setFavorites] = useState<Favori[]>([]);

  React.useEffect(() => {
    let active = true;
    const loadFavs = async () => {
      const favs = await storage.getFavorites();
      if (active) setFavorites(favs);
    };
    loadFavs();
    return () => { active = false; };
  }, []);

  const handleToggleFavorite = async (session: CatalogSession) => {
    const isFav = favorites.some((f) => f.sessionId === session.id);
    if (isFav) {
      await storage.removeFavorite(session.id);
    } else {
      await storage.addFavorite(session.id, "situation");
    }
    const newFavs = await storage.getFavorites();
    setFavorites(newFavs);
  };

  const isSleep = situationId === "trouver-le-sommeil";
  const bgClass = isSleep ? "bg-[#3E4753] text-[#FDF9F0]" : "bg-creme text-encre";
  const backIconColor = isSleep ? "#FDF9F0" : "#433528";

  const Icon = situationIcons[situationId] || BreathIcon;

  const filteredSessions = useMemo(() => {
    let sessions = SESSIONS_CATALOG.filter(s => s.situationId === situationId);
    
    if (selectedDuration !== "all") {
      sessions = sessions.filter(s => {
        const d = s.durationSeconds;
        if (selectedDuration === "short") return d <= 600; // <= 10 min
        if (selectedDuration === "long") return d > 600;
        return true;
      });
    }
    
    return sessions;
  }, [situationId, selectedDuration]);

  if (!situation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-marge">
        <p>Situation introuvable.</p>
        <button onClick={() => router.push("/")} className="mt-4 underline">Retour</button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 min-h-[100dvh] pb-[max(1rem,env(safe-area-inset-bottom))] transition-colors duration-300 ${bgClass}`}>
      {/* Top Bar */}
      <div className="flex items-center gap-[7px] p-[17px_16px_7px] sticky top-0 z-10 bg-inherit">
        <button
          onClick={() => router.back()}
          className="flex"
          aria-label="Retour"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={backIconColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7"/>
          </svg>
        </button>
        <span className={`font-poppins font-normal text-[17px] ${isSleep ? "text-[#FDF9F0]" : ""}`}>
          {situation.shortLabel}
        </span>
      </div>

      <div className="px-[16px] flex-1 mt-[6px]">
        {/* Entete Block */}
        {!isSleep ? (
          <div className="rounded-[15px] p-[14px] text-[#FDF9F0] flex flex-col gap-[8px]" style={{ background: situation.color }}>
            <Icon size={22} color="rgba(253,249,240,.9)" />
            <p className="text-[11.5px] leading-[1.45] opacity-88">
              {situation.shortDescription}
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-creme/70 mt-[4px] mb-[14px]">
            L'écran s'éteindra tout seul.
          </p>
        )}

        {/* Chips */}
        {!isSleep && (
          <div className="flex flex-wrap gap-[6px] mt-[14px]">
            {[
              { id: "all", label: "Toutes" },
              { id: "short", label: "Courtes" },
              { id: "long", label: "Longues" },
            ].map((chip) => {
              const isOn = selectedDuration === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setSelectedDuration(chip.id)}
                  className={`text-[11px] px-[11px] py-[6px] rounded-full transition-colors ${
                    isOn 
                      ? "bg-encre text-creme shadow-none" 
                      : "bg-white text-gris-2 shadow-[inset_0_0_0_1px_var(--bord)]"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}
        
        {isSleep && (
          <div className="flex justify-between items-center mt-[16px] mb-[14px] p-[12px] rounded-[13px] bg-creme/10 text-[11.5px] text-creme/85">
            <span>Minuteur d'arrêt</span>
            <b className="font-semibold">À venir</b>
          </div>
        )}

        {/* Sessions List */}
        <div className="flex flex-col gap-3 pb-8">
          {filteredSessions.length === 0 ? (
            <p className="text-[14px] opacity-70 mt-4">Aucune séance pour cette durée.</p>
          ) : (
            filteredSessions.map((session) => {
              const catInfo = getCategoryInfo(session.situationId);
              return (
                <SessionCard
                  key={session.id}
                  title={session.title}
                  duration={session.durationSeconds}
                  situationName={catInfo.label}
                  situationColor={isSleep ? "#2D333A" : catInfo.color}
                  situationVoile={isSleep ? "#3A414A" : catInfo.voile}
                  textColor={isSleep ? "#FDF9F0" : undefined}
                  isLocked={!session.isAvailable}
                  isFavorite={favorites.some((f) => f.sessionId === session.id)}
                  onToggleFavorite={() => handleToggleFavorite(session)}
                  onClick={() => {
                    if (session.isAvailable) {
                      router.push(`/player?id=${session.realSessionId || session.id}`);
                    }
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
