"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SessionCard } from "@/components/ui/SessionCard";
import { ProModal } from "@/components/ui/ProModal";
import { SESSIONS_CATALOG, getCategoryInfo, CatalogSession, getCatalogSessionById } from "@/config/sessionsCatalog";
import { getAvailableSituations } from "@/lib/sessions";
import { storage, Favori } from "@/lib/storage";

type LibrarySegment = "situations" | "favoris";

export default function LibraryPage() {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<LibrarySegment>("situations");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [proModalSession, setProModalSession] = useState<CatalogSession | null>(null);
  const [favorites, setFavorites] = useState<Favori[]>([]);
  const [toastMessage, setToastMessage] = useState<{ id: string, timer: NodeJS.Timeout } | null>(null);

  React.useEffect(() => {
    let active = true;
    const loadFavs = async () => {
      const favs = await storage.getFavorites();
      if (active) setFavorites(favs);
    };
    loadFavs();
    return () => { active = false; };
  }, []);

  const availableSituations = getAvailableSituations();

  const allCategories = useMemo(() => {
    return availableSituations.map((sit) => ({
      id: sit.id,
      label: sit.shortLabel,
      color: sit.color,
      voile: sit.voile,
      textColor: sit.textColor,
    }));
  }, [availableSituations]);

  const filtered = useMemo(() => {
    if (activeSegment === "favoris") {
      // Lot 2 : Favoris non encore implémentés
      return [];
    }

    return SESSIONS_CATALOG.filter((session) => {
      return selectedCategory === "all" || session.situationId === selectedCategory;
    });
  }, [selectedCategory, activeSegment]);

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
      <h1 className="font-poppins font-light text-[24px] leading-[1.2] mb-6 mt-2">
        Bibliothèque
      </h1>

      {/* Segments (Tabs) */}
      <div className="flex bg-surface rounded-lg p-1 mb-6 border border-filet shadow-sm">
        <button
          onClick={() => setActiveSegment("situations")}
          className={`flex-1 py-2 text-[14px] font-semibold rounded-md transition-colors ${
            activeSegment === "situations" ? "bg-white text-encre shadow-sm" : "text-gris-2"
          }`}
        >
          Situations
        </button>
        <button
          onClick={() => setActiveSegment("favoris")}
          className={`flex-1 py-2 text-[14px] font-semibold rounded-md transition-colors ${
            activeSegment === "favoris" ? "bg-white text-encre shadow-sm" : "text-gris-2"
          }`}
        >
          Favoris
        </button>
      </div>

      {activeSegment === "situations" && (
        <>
          {/* Category Filter Chips with color coding */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-120 flex items-center ${
                selectedCategory === "all"
                  ? "bg-encre text-creme shadow-sm"
                  : "bg-surface text-gris-2 shadow-[inset_0_0_0_1px_var(--bord)]"
              }`}
            >
              Toutes ({SESSIONS_CATALOG.length})
            </button>

            {allCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-120 flex items-center gap-1.5"
                  style={{
                    backgroundColor: isSelected ? cat.color : cat.voile,
                    color: isSelected ? cat.textColor : cat.color,
                    boxShadow: isSelected ? "var(--p1)" : "none",
                  }}
                >
                  <span 
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: isSelected ? cat.textColor : cat.color }}
                  />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Session cards list */}
          <div className="flex flex-col gap-3">
            {filtered.map((session) => {
              const catInfo = getCategoryInfo(session.situationId);
              const isFav = favorites.some((f) => f.sessionId === session.id);
              return (
                <SessionCard
                  key={session.id}
                  title={session.title}
                  duration={session.durationSeconds}
                  situationName={catInfo.label}
                  situationColor={catInfo.color}
                  situationVoile={catInfo.voile}
                  isLocked={!session.isAvailable}
                  isFavorite={isFav}
                  onToggleFavorite={() => handleToggleFavorite(session, false)}
                  onClick={() => handleSessionClick(session)}
                />
              );
            })}
          </div>
        </>
      )}

      {activeSegment === "favoris" && (
        <div className="flex flex-col gap-3">
          {favorites.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center mt-[14px]">
              <div className="px-2">
                <span className="inline-flex w-[56px] h-[56px] rounded-full bg-coquille items-center justify-center mb-[14px]">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--bord)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z"/></svg>
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
