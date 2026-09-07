"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SESSIONS_CATALOG, getCategoryInfo, CatalogSession, getCatalogSessionById } from "@/config/sessionsCatalog";
import { getAvailableSituations, getSituation } from "@/lib/sessions";
import { SituationId } from "@/config/situations";
import { storage, Favori, SessionHistoryItem } from "@/lib/storage";
import { ProModal } from "@/components/ui/ProModal";
import { HeartIcon } from "@/components/ui/Icons";
import sessionsData from "@/generated/sessions.json";

type LibrarySegment = "situations" | "favoris" | "historique";
export type DurationOption = 3 | 5 | 10 | 20;
const DURATION_OPTIONS: DurationOption[] = [3, 5, 10, 20];

// Teinte douce du galet SVG pour chaque situation dans l'Index (depuis la maquette)
const INDEX_PEBBLE_FILLS: Record<string, string> = {
  "calmer-le-stress": "#E4CFC1",
  "trouver-le-sommeil": "#D0D1CE",
  "calmer-les-pensees": "#D5CFC5",
  "retrouver-sa-concentration": "#D1D1C4",
  "relacher-les-tensions": "#E0D3B9",
  "se-recentrer": "#D8CBC8",
};

// Icône SVG spécifique à chaque situation
function SituationIcon({ situationId, color = "rgba(253,249,240,.9)", size = 22 }: { situationId: string; color?: string; size?: number }) {
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
      {icons[situationId] || null}
    </svg>
  );
}

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSegment, setActiveSegment] = useState<LibrarySegment>("situations");
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(null);
  const [selectedDurations, setSelectedDurations] = useState<DurationOption[]>([]);

  const [proModalSession, setProModalSession] = useState<CatalogSession | null>(null);
  const [favorites, setFavorites] = useState<Favori[]>([]);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [toastMessage, setToastMessage] = useState<{ id: string; timer: NodeJS.Timeout } | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Network online listener
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine !== false);
      const on = () => setIsOnline(true);
      const off = () => setIsOnline(false);
      window.addEventListener("online", on);
      window.addEventListener("offline", off);
      return () => {
        window.removeEventListener("online", on);
        window.removeEventListener("offline", off);
      };
    }
  }, []);

  // Initialize selected situation from URL query parameter
  useEffect(() => {
    const sitParam = searchParams.get("situation");
    if (sitParam && getSituation(sitParam)) {
      setSelectedSituationId(sitParam);
      setActiveSegment("situations");
    } else {
      setSelectedSituationId(null);
    }
  }, [searchParams]);

  // Load storage data
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      const [favs, hist] = await Promise.all([
        storage.getFavorites(),
        storage.getHistory(),
      ]);
      if (active) {
        setFavorites(favs);
        setHistory(hist.filter((h) => h.completed || h.duration > 0));
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const availableSituations = getAvailableSituations();

  // Session counts per situation
  const sessionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    availableSituations.forEach((sit) => {
      map[sit.id] = SESSIONS_CATALOG.filter((s) => s.situationId === sit.id).length;
    });
    return map;
  }, [availableSituations]);

  const handleSelectSituation = (id: string | null) => {
    setSelectedSituationId(id);
    setSelectedDurations([]);
    if (id) {
      router.replace(`/library?situation=${id}`, { scroll: false });
    } else {
      router.replace(`/library`, { scroll: false });
    }
  };

  const toggleDuration = (dur: DurationOption) => {
    setSelectedDurations((prev) =>
      prev.includes(dur) ? prev.filter((d) => d !== dur) : [...prev, dur]
    );
  };

  const resetDurations = () => {
    setSelectedDurations([]);
  };

  const handleSessionClick = (session: CatalogSession) => {
    if (session.isAvailable) {
      router.push(`/player?id=${session.realSessionId || session.id}`);
    } else {
      setProModalSession(session);
    }
  };

  const handleToggleFavorite = async (session: CatalogSession, fromFavorisTab = false) => {
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

  // Date format for history grouped items
  const formatHistoryDate = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0 && d.getDate() === now.getDate()) return "aujourd'hui";
    if (diffDays === 1) return "hier";

    const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    if (diffDays < 7) return days[d.getDay()];

    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  };

  // Active situation details (if viewing a category)
  const currentSituation = selectedSituationId ? getSituation(selectedSituationId) : null;
  const isSleep = selectedSituationId === "trouver-le-sommeil";

  // Filtered sessions for category view (multi-select durations)
  const categorySessions = useMemo(() => {
    if (!selectedSituationId) return [];
    let list = SESSIONS_CATALOG.filter((s) => s.situationId === selectedSituationId);

    // Filter duration (sleep has no duration chip filter)
    if (!isSleep && selectedDurations.length > 0) {
      list = list.filter((s) => {
        const min = Math.round(s.durationSeconds / 60) as DurationOption;
        return selectedDurations.includes(min);
      });
    }

    // Sort : "Pour commencer" first, then duration ascending
    return [...list].sort((a, b) => {
      if (a.estPorteEntree && !b.estPorteEntree) return -1;
      if (!a.estPorteEntree && b.estPorteEntree) return 1;
      return a.durationSeconds - b.durationSeconds;
    });
  }, [selectedSituationId, selectedDurations, isSleep]);

  const totalSituationCount = selectedSituationId ? sessionCounts[selectedSituationId] || 0 : 0;
  const availableSituationCount = categorySessions.filter((s) => s.isAvailable).length;

  // History grouped by period: "Cette semaine" (< 7 days) and "Plus tôt" (>= 7 days)
  const { historyThisWeek, historyEarlier } = useMemo(() => {
    const week: SessionHistoryItem[] = [];
    const earlier: SessionHistoryItem[] = [];
    const now = Date.now();

    history.forEach((item) => {
      const diffTime = Math.abs(now - new Date(item.startedAt).getTime());
      if (diffTime < 7 * 24 * 60 * 60 * 1000) {
        week.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { historyThisWeek: week, historyEarlier: earlier };
  }, [history]);

  return (
    <div
      className={`flex flex-col flex-1 min-h-[100dvh] pb-10 transition-colors duration-300 ${
        currentSituation && isSleep ? "bg-[#3E4753] text-[#FDF9F0]" : "bg-creme text-encre"
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. TOP BAR : either Bibliothèque header + segments, OR Category Header    */}
      {/* ========================================================================= */}

      {/* CASE A: No situation selected -> Title + 3 Segments */}
      {!currentSituation && (
        <>
          <div className="flex items-center pt-[10px] px-[16px] pb-[10px]">
            <h1 className="font-poppins font-light text-[24px] text-encre flex-1 tracking-[-0.01em]">
              Bibliothèque
            </h1>
          </div>

          <div className="flex gap-[6px] px-[16px] pb-[10px]">
            <button
              onClick={() => setActiveSegment("situations")}
              className={`text-[11px] font-medium px-[11px] py-[6px] rounded-full transition-colors ${
                activeSegment === "situations"
                  ? "bg-encre text-creme"
                  : "bg-coquille text-gris-2 active:bg-sable"
              }`}
            >
              Situations
            </button>
            <button
              onClick={() => setActiveSegment("favoris")}
              className={`text-[11px] font-medium px-[11px] py-[6px] rounded-full transition-colors ${
                activeSegment === "favoris"
                  ? "bg-encre text-creme"
                  : "bg-coquille text-gris-2 active:bg-sable"
              }`}
            >
              Favoris
            </button>
            <button
              onClick={() => setActiveSegment("historique")}
              className={`text-[11px] font-medium px-[11px] py-[6px] rounded-full transition-colors ${
                activeSegment === "historique"
                  ? "bg-encre text-creme"
                  : "bg-coquille text-gris-2 active:bg-sable"
              }`}
            >
              Historique
            </button>
          </div>
        </>
      )}

      {/* CASE B: Category View -> Grand en-tête coloré avec galet filigrane */}
      {currentSituation && (
        <div
          className="relative overflow-hidden pt-[12px] px-[16px] pb-[18px] rounded-b-[24px] text-[#FDF9F0]"
          style={{ background: isSleep ? "#5D6A78" : currentSituation.color }}
        >
          {/* Filigree Background Pebble */}
          <svg
            viewBox="0 0 120 90"
            className="absolute top-[-30%] right-[-24%] w-[110%] h-auto pointer-events-none"
            aria-hidden="true"
          >
            <path
              fill="rgba(253,249,240,.13)"
              d="M14 62C14 34 32 18 60 18c26 0 46 12 50 28 4 14-8 24-24 24-22 0-32-8-46-8-14 0-26 4-26 0z"
            />
          </svg>

          {/* Back button */}
          <div className="relative flex mb-[12px]">
            <button
              onClick={() => handleSelectSituation(null)}
              className="p-1 -ml-1 text-[#FDF9F0] active:opacity-75 transition-opacity"
              aria-label="Retour à la bibliothèque"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(253,249,240,.9)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
          </div>

          {/* Category info */}
          <div className="relative">
            <SituationIcon situationId={currentSituation.id} size={22} color="rgba(253,249,240,.9)" />
            <h4 className="font-poppins font-light text-[22px] my-[6px] tracking-[-0.01em]">
              {currentSituation.shortLabel}
            </h4>
            <p className="text-[11.5px] opacity-85 leading-[1.45]">
              {isSleep
                ? "L'écran s'éteindra tout seul."
                : currentSituation.shortDescription || currentSituation.phrase}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SCROLLABLE CONTENT (Index, Catégorie, Favoris, Historique)            */}
      {/* ========================================================================= */}

      <div className="flex-1 px-[16px] pb-[10px]">
        {/* --------------------------------------------------------------------- */}
        {/* ÉCRAN 1 : Index des 6 situations                                      */}
        {/* --------------------------------------------------------------------- */}
        {!currentSituation && activeSegment === "situations" && (
          <div className="flex flex-col pt-1">
            {availableSituations.map((sit) => (
              <div
                key={sit.id}
                onClick={() => handleSelectSituation(sit.id)}
                className="flex items-center gap-[12px] py-[13px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
              >
                {/* Petit galet teinté */}
                <svg viewBox="0 0 120 90" width="34" height="25" className="shrink-0" aria-hidden="true">
                  <path
                    fill={INDEX_PEBBLE_FILLS[sit.id] || sit.voile}
                    d="M14 62C14 34 32 18 60 18c26 0 46 12 50 28 4 14-8 24-24 24-22 0-32-8-46-8-14 0-26 4-26 0z"
                  />
                </svg>

                <div className="flex-1 min-w-0">
                  <b className="block font-poppins font-light text-[15px] leading-[1.2] text-encre">
                    {sit.shortLabel}
                  </b>
                  <i className="block not-italic text-[10.5px] text-gris-3 mt-[2px]">
                    {sessionCounts[sit.id] || 0} séances
                  </i>
                </div>

                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C6BBA9"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* ÉCRANS 2, 3, 4, 8 : Vue Catégorie                                     */}
        {/* --------------------------------------------------------------------- */}
        {currentSituation && (
          <div className="flex flex-col">
            {/* Offline Alert Banner if network is down */}
            {!isOnline && (
              <div className="flex items-center gap-[7px] p-[8px_12px] rounded-[11px] bg-[#F6EEDC] text-[#8E6A1C] text-[10.5px] font-medium mt-[14px]">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8E6A1C"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 18.5h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.3A3.4 3.4 0 0 0 7 18.5Z" />
                  <path d="m4 4 16 16" />
                </svg>
                <span>Hors ligne · {availableSituationCount} séances disponibles</span>
              </div>
            )}

            {/* Duration Filter Chips — non présent sur le sommeil */}
            {!isSleep && (
              <div className="flex gap-[6px] flex-wrap mt-[14px] mb-[8px]">
                {/* 1. Pastille de comptage : active par défaut, réinitialise quand au moins un filtre est actif */}
                <button
                  onClick={resetDurations}
                  className={`inline-flex items-center gap-[5px] text-[10.5px] px-[11px] py-[6px] rounded-full transition-colors cursor-pointer ${
                    selectedDurations.length === 0
                      ? "bg-encre text-creme shadow-none font-medium"
                      : "bg-white text-gris-2 shadow-[inset_0_0_0_1px_var(--bord)] active:bg-coquille font-normal"
                  }`}
                >
                  {totalSituationCount} séances
                </button>

                {/* 2. Filtres par durée : 3 mn, 5 mn, 10 mn, 20 mn avec multi-sélection */}
                {DURATION_OPTIONS.map((dur) => {
                  const isSelected = selectedDurations.includes(dur);

                  return (
                    <button
                      key={dur}
                      onClick={() => toggleDuration(dur)}
                      className={`inline-flex items-center gap-[5px] text-[10.5px] px-[11px] py-[6px] rounded-full transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-encre text-creme shadow-none font-medium"
                          : "bg-white text-gris-2 shadow-[inset_0_0_0_1px_var(--bord)] active:bg-coquille font-normal"
                      }`}
                    >
                      <span>{dur} mn</span>
                      {isSelected && (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#FDF9F0"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0"
                          aria-hidden="true"
                        >
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pile de séances de la catégorie */}
            <div className={`flex flex-col ${isSleep ? "mt-[14px]" : ""}`}>
              {categorySessions.length === 0 ? (
                <p className="text-[12px] opacity-70 py-4">Aucune séance pour ce filtre.</p>
              ) : (
                categorySessions.map((session) => {
                  const isFav = favorites.some((f) => f.sessionId === session.id);
                  const isUnavailableOffline = !isOnline && !session.isAvailable;

                  // Ligne grisée hors-ligne
                  if (isUnavailableOffline) {
                    return (
                      <div
                        key={session.id}
                        onClick={() => setProModalSession(session)}
                        className="flex items-center gap-[10px] py-[11px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer opacity-75"
                      >
                        <div className="flex-1 min-w-0">
                          <b className="block font-normal text-[13.5px] leading-[1.25] text-gris-3">
                            {session.title}
                          </b>
                          <span className="inline-block text-[9px] font-semibold text-[#8E6A1C] mt-[1px]">
                            Nécessite une connexion
                          </span>
                        </div>
                        <span className="text-[11.5px] text-gris-3 shrink-0">
                          {Math.round(session.durationSeconds / 60)} min
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(session);
                          }}
                          className="p-1 -mr-1"
                          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                          <HeartIcon size={16} filled={isFav} className={isFav ? "text-[#A26248]" : "text-[#C6BBA9]"} />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSessionClick(session)}
                      className={`flex items-center gap-[10px] py-[11px] px-[2px] border-b last:border-b-0 cursor-pointer transition-colors ${
                        isSleep
                          ? "border-[rgba(253,249,240,.14)] active:bg-white/5"
                          : "border-filet active:bg-coquille/40"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <b
                          className={`block font-normal text-[13.5px] leading-[1.25] ${
                            isSleep ? "text-[#FDF9F0]" : "text-encre"
                          }`}
                        >
                          {session.title}
                        </b>
                        {session.estPorteEntree && (
                          <span
                            className={`inline-block text-[9px] font-semibold mt-[1px] ${
                              isSleep ? "text-[rgba(253,249,240,.6)]" : "text-gris-3"
                            }`}
                          >
                            Pour commencer
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[11.5px] shrink-0 ${
                          isSleep ? "text-[rgba(253,249,240,.6)]" : "text-gris-2"
                        }`}
                      >
                        {Math.round(session.durationSeconds / 60)} min
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(session);
                        }}
                        className="p-1 -mr-1 transition-transform active:scale-90"
                        aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                      >
                        <HeartIcon
                          size={16}
                          filled={isFav}
                          className={
                            isSleep
                              ? isFav
                                ? "text-[#D09B83]" // Terre rosée sur fond sombre
                                : "text-[rgba(253,249,240,.45)]"
                              : isFav
                              ? "text-[#A26248]"
                              : "text-[#C6BBA9]"
                          }
                        />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* ÉCRANS 5 & 6 : Favoris                                                */}
        {/* --------------------------------------------------------------------- */}
        {!currentSituation && activeSegment === "favoris" && (
          <div className="flex flex-col flex-1">
            {favorites.length === 0 ? (
              /* Écran 6 : Favoris vide */
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-2">
                <span className="inline-flex w-[54px] h-[54px] rounded-full bg-coquille items-center justify-center mb-[12px]">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D8CAB4"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z" />
                  </svg>
                </span>
                <p className="font-poppins font-light text-[17px] text-encre">
                  Rien ici pour l'instant
                </p>
                <p className="text-[11px] text-gris-2 leading-[1.5] mt-[6px] max-w-[270px]">
                  À la fin d'une séance, on vous demandera si vous voulez la retrouver. Celles que vous gardez apparaîtront ici.
                </p>
                <button
                  onClick={() => setActiveSegment("situations")}
                  className="inline-block mt-[14px] text-[12px] font-semibold px-[17px] py-[10px] rounded-[11px] shadow-[inset_0_0_0_1px_var(--bord)] transition-colors active:bg-coquille"
                >
                  Voir les situations
                </button>
              </div>
            ) : (
              /* Écran 5 : Liste des favoris */
              <div className="flex flex-col">
                <p className="text-[10.5px] text-gris-3 m-[4px_0_4px_2px]">
                  {favorites.length} {favorites.length > 1 ? "séances" : "séance"}
                </p>
                <div className="flex flex-col">
                  {favorites.map((fav) => {
                    const session = getCatalogSessionById(fav.sessionId);
                    if (!session) return null;
                    const catInfo = getCategoryInfo(session.situationId);

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className="flex items-center gap-[11px] py-[11px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
                      >
                        {/* Pastille de situation 8px */}
                        <span
                          className="w-[8px] h-[8px] rounded-full shrink-0"
                          style={{ background: catInfo.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <b className="block font-poppins font-light text-[14px] leading-[1.2] text-encre">
                            {session.title}
                          </b>
                          <i className="block not-italic text-[10.5px] text-gris-3 mt-[1px]">
                            {Math.round(session.durationSeconds / 60)} min · {catInfo.label}
                          </i>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(session, true);
                          }}
                          className="p-1 -mr-1 transition-transform active:scale-90"
                          aria-label="Retirer des favoris"
                        >
                          <HeartIcon size={16} filled={true} className="text-[#A26248]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* ÉCRAN 7 : Historique groupé par période                                */}
        {/* --------------------------------------------------------------------- */}
        {!currentSituation && activeSegment === "historique" && (
          <div className="flex flex-col flex-1">
            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-2">
                <span className="inline-flex w-[54px] h-[54px] rounded-full bg-coquille items-center justify-center mb-[12px]">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D8CAB4"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <p className="font-poppins font-light text-[17px] text-encre">
                  Aucune séance pour le moment
                </p>
                <p className="text-[11px] text-gris-2 leading-[1.5] mt-[6px] max-w-[270px]">
                  Vos séances terminées apparaîtront ici.
                </p>
                <button
                  onClick={() => setActiveSegment("situations")}
                  className="inline-block mt-[14px] text-[12px] font-semibold px-[17px] py-[10px] rounded-[11px] shadow-[inset_0_0_0_1px_var(--bord)] transition-colors active:bg-coquille"
                >
                  Découvrir les séances
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Cette semaine */}
                {historyThisWeek.length > 0 && (
                  <div className="flex flex-col">
                    <p className="text-[10.5px] font-semibold text-gris-3 m-[14px_0_4px_2px]">
                      Cette semaine
                    </p>
                    <div className="flex flex-col">
                      {historyThisWeek.map((item, idx) => {
                        const rawSession = sessionsData.find((s) => s.id === item.sessionId);
                        const catSession = getCatalogSessionById(item.sessionId);
                        const title = rawSession?.metadata?.title || catSession?.title;
                        if (!title) return null;

                        const situationId = rawSession?.metadata?.situation || catSession?.situationId;
                        const sit = getSituation(situationId);
                        const durationSec = item.duration || rawSession?.metadata?.durationSeconds || catSession?.durationSeconds || 600;
                        const isFav = favorites.some((f) => f.sessionId === item.sessionId);
                        const playId = rawSession?.id || catSession?.realSessionId || item.sessionId;

                        return (
                          <div
                            key={`week-${item.sessionId}-${item.startedAt}-${idx}`}
                            onClick={() => router.push(`/player?id=${playId}`)}
                            className="flex items-center gap-[11px] py-[11px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
                          >
                            <span
                              className="w-[8px] h-[8px] rounded-full shrink-0"
                              style={{ background: sit?.color || "var(--bord)" }}
                            />
                            <div className="flex-1 min-w-0">
                              <b className="block font-poppins font-light text-[14px] leading-[1.2] text-encre whitespace-nowrap overflow-hidden text-ellipsis">
                                {title}
                              </b>
                              <i className="block not-italic text-[10.5px] text-gris-3 mt-[1px]">
                                {formatHistoryDate(item.startedAt)} ·{" "}
                                {Math.max(1, Math.round(durationSec / 60))} min
                              </i>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleHistoryFavorite(item.sessionId);
                              }}
                              className="p-1 -mr-1 transition-transform active:scale-90"
                              aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                              <HeartIcon
                                size={16}
                                filled={isFav}
                                className={isFav ? "text-[#A26248]" : "text-[#C6BBA9]"}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Plus tôt */}
                {historyEarlier.length > 0 && (
                  <div className="flex flex-col">
                    <p className="text-[10.5px] font-semibold text-gris-3 m-[14px_0_4px_2px]">
                      Plus tôt
                    </p>
                    <div className="flex flex-col">
                      {historyEarlier.map((item, idx) => {
                        const rawSession = sessionsData.find((s) => s.id === item.sessionId);
                        const catSession = getCatalogSessionById(item.sessionId);
                        const title = rawSession?.metadata?.title || catSession?.title;
                        if (!title) return null;

                        const situationId = rawSession?.metadata?.situation || catSession?.situationId;
                        const sit = getSituation(situationId);
                        const durationSec = item.duration || rawSession?.metadata?.durationSeconds || catSession?.durationSeconds || 600;
                        const isFav = favorites.some((f) => f.sessionId === item.sessionId);
                        const playId = rawSession?.id || catSession?.realSessionId || item.sessionId;

                        return (
                          <div
                            key={`earlier-${item.sessionId}-${item.startedAt}-${idx}`}
                            onClick={() => router.push(`/player?id=${playId}`)}
                            className="flex items-center gap-[11px] py-[11px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
                          >
                            <span
                              className="w-[8px] h-[8px] rounded-full shrink-0"
                              style={{ background: sit?.color || "var(--bord)" }}
                            />
                            <div className="flex-1 min-w-0">
                              <b className="block font-poppins font-light text-[14px] leading-[1.2] text-encre whitespace-nowrap overflow-hidden text-ellipsis">
                                {title}
                              </b>
                              <i className="block not-italic text-[10.5px] text-gris-3 mt-[1px]">
                                {formatHistoryDate(item.startedAt)} ·{" "}
                                {Math.max(1, Math.round(durationSec / 60))} min
                              </i>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleHistoryFavorite(item.sessionId);
                              }}
                              className="p-1 -mr-1 transition-transform active:scale-90"
                              aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                              <HeartIcon
                                size={16}
                                filled={isFav}
                                className={isFav ? "text-[#A26248]" : "text-[#C6BBA9]"}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pro Modal */}
      <ProModal
        isOpen={proModalSession !== null}
        onClose={() => setProModalSession(null)}
        sessionTitle={proModalSession?.title}
      />

      {/* Undo Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-encre text-creme rounded-xl p-4 shadow-lg flex items-center justify-between z-30 animate-in fade-in slide-in-from-bottom-5">
          <span className="text-[13px] font-medium">Retiré des favoris</span>
          <button
            onClick={undoRemove}
            className="text-[13px] font-semibold text-[#D8CAB4] active:opacity-70 transition-opacity"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="p-4 text-[13px] text-gris-2">Chargement de la bibliothèque...</div>}>
      <LibraryContent />
    </Suspense>
  );
}
