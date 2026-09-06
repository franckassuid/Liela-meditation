"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SESSIONS_CATALOG, getCategoryInfo, CatalogSession, getCatalogSessionById } from "@/config/sessionsCatalog";
import { getAvailableSituations, getSituation } from "@/lib/sessions";
import { storage, Favori, SessionHistoryItem } from "@/lib/storage";
import { ProModal } from "@/components/ui/ProModal";
import { SessionCard } from "@/components/ui/SessionCard";
import { HeartIcon } from "@/components/ui/Icons";
import sessionsData from "@/generated/sessions.json";

type LibrarySegment = "situations" | "favoris" | "historique";

// Galet SVG — forme organique inspirée du logo Liela
function GaletIcon({ color, voile, situationId }: { color: string; voile: string; situationId: string }) {
  const icons: Record<string, React.ReactElement> = {
    "calmer-le-stress": (
      <path d="M3 12h3l2-5 3 10 2.5-7 1.8 4H21" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
    "trouver-le-sommeil": (
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
    "calmer-les-pensees": (
      <>
        <path d="M4 16.5c3.5-1 5.5-4 6.5-8.5 2.5 3.5 5 5 9 5" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="19.5" cy="13" r="1.6" stroke={color} strokeWidth="1.75" fill="none" />
      </>
    ),
    "retrouver-sa-concentration": (
      <>
        <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.75" fill="none" />
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.75" fill="none" />
      </>
    ),
    "relacher-les-tensions": (
      <path d="M12 3.2c4 3.4 6 6 6 8.8a6 6 0 0 1-12 0c0-2.8 2-5.4 6-8.8Z" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
    "se-recentrer": (
      <>
        <circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="1.75" fill="none" />
        <path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6" stroke={color} strokeWidth="1.75" strokeLinecap="round" fill="none" />
      </>
    ),
  };

  return (
    <div className="relative shrink-0 w-[52px] h-[44px]">
      {/* Galet shape */}
      <svg viewBox="0 0 52 44" width="52" height="44" style={{ position: "absolute", inset: 0 }}>
        {/* Organic pebble path inspired by Liela logo */}
        <path
          d="M8 38 C2 34 0 26 2 18 C4 10 12 4 24 3 C36 2 48 8 50 18 C52 28 46 38 36 41 C26 44 14 42 8 38Z"
          fill={voile}
        />
      </svg>
      {/* Icon centered */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 2 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          {icons[situationId] || null}
        </svg>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<LibrarySegment>("situations");
  const [proModalSession, setProModalSession] = useState<CatalogSession | null>(null);
  const [favorites, setFavorites] = useState<Favori[]>([]);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [toastMessage, setToastMessage] = useState<{ id: string, timer: NodeJS.Timeout } | null>(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      const [favs, hist] = await Promise.all([
        storage.getFavorites(),
        storage.getHistory(),
      ]);
      if (active) {
        setFavorites(favs);
        setHistory(hist.filter(h => h.completed || h.duration > 0));
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

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

  const availableSituations = getAvailableSituations();

  // Count sessions per situation
  const sessionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableSituations.forEach(sit => {
      counts[sit.id] = SESSIONS_CATALOG.filter(s => s.situationId === sit.id).length;
    });
    return counts;
  }, [availableSituations]);

  const handleSessionClick = (session: CatalogSession) => {
    if (session.isAvailable) {
      router.push(`/player?id=${session.realSessionId || session.id}`);
    } else {
      setProModalSession(session);
    }
  };

  const handleToggleFavorite = async (session: CatalogSession, fromFavorisTab: boolean) => {
    const isFav = favorites.some((f) => f.sessionId === session.id);
    if (isFav) {
      await storage.removeFavorite(session.id);
      if (fromFavorisTab) {
        if (toastMessage) clearTimeout(toastMessage.timer);
        const timer = setTimeout(() => setToastMessage(null), 5000);
        setToastMessage({ id: session.id, timer });
      }
    } else {
      await storage.addFavorite(session.id, "library");
      if (toastMessage && toastMessage.id === session.id) {
        clearTimeout(toastMessage.timer);
        setToastMessage(null);
      }
    }
    const newFavs = await storage.getFavorites();
    setFavorites(newFavs);
  };

  const handleToggleHistoryFavorite = async (sessionId: string) => {
    const isFav = favorites.some((f) => f.sessionId === sessionId);
    if (isFav) {
      await storage.removeFavorite(sessionId);
    } else {
      await storage.addFavorite(sessionId, "historique");
    }
    const newFavs = await storage.getFavorites();
    setFavorites(newFavs);
  };

  const undoRemove = async () => {
    if (toastMessage) {
      await storage.addFavorite(toastMessage.id, "undo");
      const newFavs = await storage.getFavorites();
      setFavorites(newFavs);
      clearTimeout(toastMessage.timer);
      setToastMessage(null);
    }
  };

  return (
    <div className="p-marge pb-8 flex flex-col flex-1">
      <h1 className="font-poppins font-light text-[24px] leading-[1.2] mb-5 mt-2">
        Bibliothèque
      </h1>

      {/* Segments — pills style per maquette */}
      <div className="flex gap-[6px] mb-6">
        <button
          onClick={() => setActiveSegment("situations")}
          className={`text-[12px] font-medium px-[14px] py-[7px] rounded-full transition-colors ${
            activeSegment === "situations"
              ? "bg-encre text-creme"
              : "bg-coquille text-gris-2"
          }`}
        >
          Situations
        </button>
        <button
          onClick={() => setActiveSegment("favoris")}
          className={`text-[12px] font-medium px-[14px] py-[7px] rounded-full transition-colors ${
            activeSegment === "favoris"
              ? "bg-encre text-creme"
              : "bg-coquille text-gris-2"
          }`}
        >
          Favoris
        </button>
        <button
          onClick={() => setActiveSegment("historique")}
          className={`text-[12px] font-medium px-[14px] py-[7px] rounded-full transition-colors ${
            activeSegment === "historique"
              ? "bg-encre text-creme"
              : "bg-coquille text-gris-2"
          }`}
        >
          Historique
        </button>
      </div>

      {/* Situations list — galet + nom + compteur */}
      {activeSegment === "situations" && (
        <div className="flex flex-col">
          {availableSituations.map((situation, idx) => (
            <button
              key={situation.id}
              onClick={() => router.push(`/situation/${situation.id}`)}
              className={`flex items-center gap-[14px] py-[14px] text-left active:bg-coquille/60 transition-colors ${
                idx < availableSituations.length - 1 ? "border-b border-filet" : ""
              }`}
            >
              <GaletIcon
                color={situation.color}
                voile={situation.voile}
                situationId={situation.id}
              />
              <div className="flex-1 min-w-0">
                <b className="block font-poppins font-light text-[17px] leading-[1.2] text-encre">
                  {situation.shortLabel}
                </b>
                <i className="block not-italic text-[12px] text-gris-2 mt-[2px]">
                  {sessionCounts[situation.id] || 0} séances
                </i>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gris3)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 5 7 7-7 7"/>
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Favoris */}
      {activeSegment === "favoris" && (
        <div className="flex flex-col gap-3 flex-1">
          {favorites.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center mt-[14px]">
              <div className="px-2">
                <span className="inline-flex w-[56px] h-[56px] rounded-full bg-coquille items-center justify-center mb-[14px]">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--bord)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z"/>
                  </svg>
                </span>
                <p className="font-poppins font-light text-[17px]">Rien ici pour l'instant</p>
                <p className="text-[11.5px] text-gris-2 leading-[1.5] mt-[6px]">
                  À la fin d'une séance, on vous demandera si vous voulez la retrouver. Celles que vous gardez apparaîtront ici.
                </p>
                <button
                  onClick={() => setActiveSegment("situations")}
                  className="inline-block mt-[16px] text-[12.5px] font-semibold px-[18px] py-[10px] rounded-[11px] shadow-[inset_0_0_0_1px_var(--bord)] transition-colors active:bg-coquille"
                >
                  Voir les situations
                </button>
              </div>
            </div>
          ) : (
            favorites.map((fav) => {
              const session = getCatalogSessionById(fav.sessionId);
              if (!session) return null;
              const catInfo = getCategoryInfo(session.situationId);
              return (
                <SessionCard
                  key={session.id}
                  title={session.title}
                  duration={session.durationSeconds}
                  situationName={catInfo.label}
                  situationColor={catInfo.color}
                  situationVoile={catInfo.voile}
                  isLocked={!session.isAvailable}
                  isFavorite={true}
                  onToggleFavorite={() => handleToggleFavorite(session, true)}
                  onClick={() => handleSessionClick(session)}
                />
              );
            })
          )}
        </div>
      )}

      {/* Historique */}
      {activeSegment === "historique" && (
        <div className="flex flex-col flex-1">
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center mt-[14px]">
              <div className="px-2">
                <span className="inline-flex w-[56px] h-[56px] rounded-full bg-coquille items-center justify-center mb-[14px]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bord)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <p className="font-poppins font-light text-[17px]">Aucune séance pour le moment</p>
                <p className="text-[11.5px] text-gris-2 leading-[1.5] mt-[6px]">
                  Vos séances terminées apparaîtront ici.
                </p>
                <button
                  onClick={() => setActiveSegment("situations")}
                  className="inline-block mt-[16px] text-[12.5px] font-semibold px-[18px] py-[10px] rounded-[11px] shadow-[inset_0_0_0_1px_var(--bord)] transition-colors active:bg-coquille"
                >
                  Découvrir les séances
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {history.map((item, idx) => {
                const session = sessionsData.find(s => s.id === item.sessionId);
                if (!session) return null;
                const sit = getSituation(session.metadata.situation);
                const isFav = favorites.some(f => f.sessionId === item.sessionId);

                return (
                  <div
                    key={`${item.sessionId}-${item.startedAt}-${idx}`}
                    className="flex items-center gap-[12px] py-[12px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/50 transition-colors"
                    onClick={() => router.push(`/player?id=${session.id}`)}
                  >
                    <div
                      className="w-[9px] h-[9px] rounded-full shrink-0"
                      style={{ background: sit?.color || "var(--bord)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <b className="block text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis text-encre">
                        {session.metadata.title}
                      </b>
                      <i className="block not-italic text-[11px] text-gris-2 mt-[1px]">
                        {formatRelativeDate(item.startedAt)} · {Math.max(1, Math.round((item.duration || session.metadata.durationSeconds) / 60))} min
                      </i>
                    </div>
                    <div
                      className="p-2 -mr-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleHistoryFavorite(session.id);
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
              })}
            </div>
          )}
        </div>
      )}

      {/* Pro Modal */}
      <ProModal
        isOpen={proModalSession !== null}
        onClose={() => setProModalSession(null)}
        sessionTitle={proModalSession?.title}
      />

      {/* Undo Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-4 right-4 bg-encre text-creme rounded-lg p-4 shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-bottom-5">
          <span className="text-[14px] font-medium">Retiré des favoris</span>
          <button onClick={undoRemove} className="text-[14px] font-semibold text-[#C6BBA9] active:opacity-70 transition-opacity">
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
