"use client";

import React, { useState, useMemo, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SESSIONS_CATALOG, getCategoryInfo, CatalogSession, getCatalogSessionById } from "@/config/sessionsCatalog";
import { getAvailableSituations, getSituation } from "@/lib/sessions";
import { SituationId } from "@/config/situations";
import { storage, Favori, SessionHistoryItem } from "@/lib/storage";
import { ProModal } from "@/components/ui/ProModal";
import { HeartIcon } from "@/components/ui/Icons";
import sessionsData from "@/generated/sessions.json";

type LibrarySegment = "seances" | "favoris" | "historique";
type DurationFilter = "all" | "under10" | "plus10";

// Teinte douce du galet SVG pour chaque situation (depuis la maquette)
const SITUATION_SOFT_BG: Record<string, string> = {
  "calmer-le-stress": "#E2CCBE",
  "trouver-le-sommeil": "#CDCECC",
  "calmer-les-pensees": "#D2CCC2",
  "retrouver-sa-concentration": "#CDD3C9",
  "relacher-les-tensions": "#E5D8BE",
  "se-recentrer": "#DACBCE",
};

// Galet SVG organique de l'intertitre
function PebbleIcon({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 120 90" width="26" height="19" className="shrink-0" aria-hidden="true">
      <path
        fill={fill}
        d="M14 62C14 34 32 18 60 18c26 0 46 12 50 28 4 14-8 24-24 24-22 0-32-8-46-8-14 0-26 4-26 0z"
      />
    </svg>
  );
}

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [activeSegment, setActiveSegment] = useState<LibrarySegment>("seances");
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationFilter>("all");
  const [durationMenuOpen, setDurationMenuOpen] = useState(false);
  const [expandedSituationId, setExpandedSituationId] = useState<string | null>(null);

  const [proModalSession, setProModalSession] = useState<CatalogSession | null>(null);
  const [favorites, setFavorites] = useState<Favori[]>([]);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [toastMessage, setToastMessage] = useState<{ id: string; timer: NodeJS.Timeout } | null>(null);

  const durationMenuRef = useRef<HTMLDivElement>(null);

  // Initialize selected situation from URL query parameter
  useEffect(() => {
    const sitParam = searchParams.get("situation");
    if (sitParam && getSituation(sitParam)) {
      setSelectedSituationId(sitParam);
      setActiveSegment("seances");
    }
  }, [searchParams]);

  // Click outside listener for duration menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (durationMenuRef.current && !durationMenuRef.current.contains(event.target as Node)) {
        setDurationMenuOpen(false);
      }
    }
    if (durationMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [durationMenuOpen]);

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

  const handleSelectSituation = (id: string | null) => {
    setSelectedSituationId(id);
    setExpandedSituationId(null);
    if (id) {
      router.replace(`/library?situation=${id}`, { scroll: false });
    } else {
      router.replace(`/library`, { scroll: false });
    }
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

  // Filter sessions by duration helper
  const matchesDuration = (session: CatalogSession, duration: DurationFilter) => {
    if (duration === "all") return true;
    if (duration === "under10") return session.durationSeconds <= 600; // <= 10 min
    if (duration === "plus10") return session.durationSeconds > 600; // > 10 min
    return true;
  };

  // Sort helper: "Pour commencer" first, then duration ascending
  const sortSessions = (list: CatalogSession[]) => {
    return [...list].sort((a, b) => {
      if (a.estPorteEntree && !b.estPorteEntree) return -1;
      if (!a.estPorteEntree && b.estPorteEntree) return 1;
      return a.durationSeconds - b.durationSeconds;
    });
  };

  // Grouped sessions per situation (for default view)
  const groupedSessions = useMemo(() => {
    const map: Record<string, CatalogSession[]> = {};
    availableSituations.forEach((sit) => {
      const allInSit = SESSIONS_CATALOG.filter((s) => s.situationId === sit.id);
      const filtered = allInSit.filter((s) => matchesDuration(s, selectedDuration));
      map[sit.id] = sortSessions(filtered);
    });
    return map;
  }, [availableSituations, selectedDuration]);

  // Total count in situation (regardless of duration)
  const totalInSituationMap = useMemo(() => {
    const map: Record<string, number> = {};
    availableSituations.forEach((sit) => {
      map[sit.id] = SESSIONS_CATALOG.filter((s) => s.situationId === sit.id).length;
    });
    return map;
  }, [availableSituations]);

  // Active situation if filtered
  const activeSituation = selectedSituationId ? getSituation(selectedSituationId) : null;

  // Filtered sessions when a single situation is selected
  const situationFilteredSessions = useMemo(() => {
    if (!selectedSituationId) return [];
    const allInSit = SESSIONS_CATALOG.filter((s) => s.situationId === selectedSituationId);
    const filtered = allInSit.filter((s) => matchesDuration(s, selectedDuration));
    return sortSessions(filtered);
  }, [selectedSituationId, selectedDuration]);

  const durationLabels: Record<DurationFilter, string> = {
    all: "Toutes durées",
    under10: "Moins de 10 min",
    plus10: "10 min et plus",
  };

  return (
    <div className="flex flex-col flex-1 pb-10">
      {/* 1. Header Top */}
      <div className="pt-[17px] px-[16px] pb-[9px]">
        <h1 className="font-poppins font-light text-[23px] text-encre tracking-[-0.01em]">
          Bibliothèque
        </h1>
      </div>

      {/* 2. Segments: Séances | Favoris | Historique */}
      <div className="flex gap-[6px] px-[16px] pb-[10px]">
        <button
          onClick={() => setActiveSegment("seances")}
          className={`text-[11.5px] font-medium px-[11px] py-[6px] rounded-full transition-colors ${
            activeSegment === "seances"
              ? "bg-encre text-creme"
              : "bg-coquille text-gris-2 active:bg-sable"
          }`}
        >
          Séances
        </button>
        <button
          onClick={() => setActiveSegment("favoris")}
          className={`text-[11.5px] font-medium px-[11px] py-[6px] rounded-full transition-colors ${
            activeSegment === "favoris"
              ? "bg-encre text-creme"
              : "bg-coquille text-gris-2 active:bg-sable"
          }`}
        >
          Favoris
        </button>
        <button
          onClick={() => setActiveSegment("historique")}
          className={`text-[11.5px] font-medium px-[11px] py-[6px] rounded-full transition-colors ${
            activeSegment === "historique"
              ? "bg-encre text-creme"
              : "bg-coquille text-gris-2 active:bg-sable"
          }`}
        >
          Historique
        </button>
      </div>

      {/* 3. Séances View (Filters + Groups or Flat List) */}
      {activeSegment === "seances" && (
        <>
          {/* Ligne 1 : Situation Chips */}
          <div className="flex gap-[6px] px-[16px] pb-[7px] overflow-x-auto scrollbar-none">
            {selectedSituationId === null ? (
              <>
                <button
                  onClick={() => handleSelectSituation(null)}
                  className="inline-flex items-center gap-[5px] shrink-0 text-[10.5px] px-[10px] py-[6px] rounded-full bg-encre text-creme whitespace-nowrap"
                >
                  Toutes
                </button>
                {availableSituations.map((sit) => (
                  <button
                    key={sit.id}
                    onClick={() => handleSelectSituation(sit.id)}
                    className="inline-flex items-center gap-[5px] shrink-0 text-[10.5px] px-[10px] py-[6px] rounded-full bg-white shadow-[inset_0_0_0_1px_var(--bord)] text-gris-2 whitespace-nowrap active:bg-coquille transition-colors"
                  >
                    <i
                      className="w-[6px] h-[6px] rounded-full shrink-0"
                      style={{ background: sit.color }}
                    />
                    {sit.shortLabel}
                  </button>
                ))}
              </>
            ) : (
              <>
                {/* Active situation chip */}
                {activeSituation && (
                  <button
                    onClick={() => handleSelectSituation(null)}
                    className="inline-flex items-center gap-[5px] shrink-0 text-[10.5px] font-medium px-[10px] py-[6px] rounded-full text-[#FDF9F0] whitespace-nowrap shadow-none"
                    style={{ background: activeSituation.color }}
                  >
                    {activeSituation.shortLabel}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FDF9F0"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                )}
                {/* "Toutes" button to clear */}
                <button
                  onClick={() => handleSelectSituation(null)}
                  className="inline-flex items-center gap-[5px] shrink-0 text-[10.5px] px-[10px] py-[6px] rounded-full bg-white shadow-[inset_0_0_0_1px_var(--bord)] text-gris-2 whitespace-nowrap active:bg-coquille transition-colors"
                >
                  Toutes
                </button>
                {/* Other situations for 1-tap switch */}
                {availableSituations
                  .filter((s) => s.id !== selectedSituationId)
                  .map((sit) => (
                    <button
                      key={sit.id}
                      onClick={() => handleSelectSituation(sit.id)}
                      className="inline-flex items-center gap-[5px] shrink-0 text-[10.5px] px-[10px] py-[6px] rounded-full bg-white shadow-[inset_0_0_0_1px_var(--bord)] text-gris-2 whitespace-nowrap active:bg-coquille transition-colors"
                    >
                      <i
                        className="w-[6px] h-[6px] rounded-full shrink-0"
                        style={{ background: sit.color }}
                      />
                      {sit.shortLabel}
                    </button>
                  ))}
              </>
            )}
          </div>

          {/* Ligne 2 : Duration Filter */}
          <div className="flex px-[16px] pb-[10px] relative" ref={durationMenuRef}>
            {selectedDuration === "all" ? (
              <button
                onClick={() => setDurationMenuOpen(!durationMenuOpen)}
                className="inline-flex items-center gap-[5px] shrink-0 text-[10.5px] px-[10px] py-[6px] rounded-full bg-white shadow-[inset_0_0_0_1px_var(--bord)] text-gris-2 whitespace-nowrap active:bg-coquille transition-colors"
              >
                Toutes durées
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7A6E5E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            ) : (
              <div className="inline-flex items-center gap-[5px] shrink-0 text-[10.5px] px-[10px] py-[6px] rounded-full bg-white shadow-[inset_0_0_0_1px_var(--bord)] text-gris-2 whitespace-nowrap">
                <button
                  onClick={() => setDurationMenuOpen(!durationMenuOpen)}
                  className="font-medium text-encre"
                >
                  {durationLabels[selectedDuration]}
                </button>
                <button
                  onClick={() => setSelectedDuration("all")}
                  className="p-[1px] hover:text-encre text-gris-2 ml-1"
                  aria-label="Réinitialiser la durée"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7A6E5E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            )}

            {/* Dropdown Menu for Duration */}
            {durationMenuOpen && (
              <div className="absolute top-[34px] left-[16px] z-30 bg-white rounded-[14px] p-[6px] shadow-[0_4px_16px_rgba(67,53,40,0.12)] border border-filet min-w-[150px] animate-in fade-in zoom-in-95 duration-100">
                {(["all", "under10", "plus10"] as DurationFilter[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setSelectedDuration(d);
                      setDurationMenuOpen(false);
                    }}
                    className={`w-full text-left text-[12px] px-[12px] py-[7px] rounded-[8px] transition-colors ${
                      selectedDuration === d
                        ? "bg-coquille text-encre font-medium"
                        : "text-gris-2 hover:bg-creme"
                    }`}
                  >
                    {durationLabels[d]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 px-[16px] pb-[10px]">
            {/* CASE A: No situation selected -> 6 fixed groups */}
            {selectedSituationId === null && (
              <div className="flex flex-col">
                {availableSituations.map((sit) => {
                  const sessions = groupedSessions[sit.id] || [];
                  const isExpanded = expandedSituationId === sit.id;
                  const isOtherExpanded = expandedSituationId !== null && !isExpanded;
                  const visibleSessions = isExpanded ? sessions : sessions.slice(0, 3);
                  const totalCount = sessions.length;

                  return (
                    <div
                      key={sit.id}
                      className={`transition-opacity duration-200 ${
                        isOtherExpanded ? "opacity-35" : "opacity-100"
                      }`}
                    >
                      {/* Intertitre: Galet teinté + Titre en couleur */}
                      <div className="flex items-center gap-[8px] mt-[14px] mb-[7px]">
                        <PebbleIcon fill={SITUATION_SOFT_BG[sit.id] || sit.voile} />
                        <b
                          className="font-poppins font-light text-[14px]"
                          style={{ color: sit.color }}
                        >
                          {sit.shortLabel}
                        </b>
                      </div>

                      {/* Pile de séances */}
                      <div className="flex flex-col">
                        {visibleSessions.length === 0 ? (
                          <p className="text-[11.5px] text-gris-3 py-2">
                            Aucune séance pour cette durée.
                          </p>
                        ) : (
                          visibleSessions.map((session) => {
                            const isFav = favorites.some((f) => f.sessionId === session.id);
                            return (
                              <div
                                key={session.id}
                                onClick={() => handleSessionClick(session)}
                                className="flex items-center gap-[10px] py-[11px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <b className="block font-normal text-[13.5px] leading-[1.25] text-encre">
                                    {session.title}
                                  </b>
                                  {session.estPorteEntree && (
                                    <span className="inline-block text-[9px] font-semibold text-gris-3 mt-[2px]">
                                      Pour commencer
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11.5px] text-gris-2 shrink-0">
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
                                    className={isFav ? "text-[#A26248]" : "text-[#C6BBA9]"}
                                  />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Bouton Voir les X / Réduire */}
                      {totalCount > 3 && (
                        <div>
                          {isExpanded ? (
                            <button
                              onClick={() => setExpandedSituationId(null)}
                              className="flex items-center gap-[3px] text-[11.5px] font-semibold pt-[9px] pb-[4px] px-[2px] active:opacity-70 transition-opacity"
                              style={{ color: sit.color }}
                            >
                              Réduire
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={sit.color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m6 15 6-6 6 6" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => setExpandedSituationId(sit.id)}
                              className="flex items-center gap-[3px] text-[11.5px] font-semibold pt-[9px] pb-[4px] px-[2px] active:opacity-70 transition-opacity"
                              style={{ color: sit.color }}
                            >
                              Voir les {totalCount}
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={sit.color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* CASE B: Situation Filter Active -> Flat list without intertitles + Description at bottom */}
            {selectedSituationId !== null && activeSituation && (
              <div className="flex flex-col">
                <p className="text-[10.5px] text-gris-3 m-[8px_0_4px_2px]">
                  {selectedDuration !== "all"
                    ? `${situationFilteredSessions.length} séances sur ${totalInSituationMap[activeSituation.id] || 0}`
                    : `${situationFilteredSessions.length} séances`}
                </p>

                {/* Flat pile */}
                <div className="flex flex-col">
                  {situationFilteredSessions.length === 0 ? (
                    <p className="text-[13px] text-gris-2 py-4">
                      Aucune séance ne correspond à cette durée.
                    </p>
                  ) : (
                    situationFilteredSessions.map((session) => {
                      const isFav = favorites.some((f) => f.sessionId === session.id);
                      return (
                        <div
                          key={session.id}
                          onClick={() => handleSessionClick(session)}
                          className="flex items-center gap-[10px] py-[11px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <b className="block font-normal text-[13.5px] leading-[1.25] text-encre">
                              {session.title}
                            </b>
                            {session.estPorteEntree && (
                              <span className="inline-block text-[9px] font-semibold text-gris-3 mt-[2px]">
                                Pour commencer
                              </span>
                            )}
                          </div>
                          <span className="text-[11.5px] text-gris-2 shrink-0">
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
                              className={isFav ? "text-[#A26248]" : "text-[#C6BBA9]"}
                            />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Description de la situation après les séances */}
                <div
                  className="rounded-[13px] p-[12px] mt-[16px]"
                  style={{ background: activeSituation.voile }}
                >
                  <b
                    className="font-poppins font-light text-[13.5px] block"
                    style={{ color: activeSituation.color }}
                  >
                    {activeSituation.shortLabel}
                  </b>
                  <p className="text-[11px] text-gris-2 leading-[1.45] mt-[4px]">
                    {activeSituation.shortDescription || activeSituation.phrase}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 4. Favoris View */}
      {activeSegment === "favoris" && (
        <div className="flex-1 px-[16px] pt-[6px] flex flex-col">
          {favorites.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
              <span className="inline-flex w-[56px] h-[56px] rounded-full bg-coquille items-center justify-center mb-[14px]">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--bord)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z" />
                </svg>
              </span>
              <p className="font-poppins font-light text-[17px]">Rien ici pour l'instant</p>
              <p className="text-[11.5px] text-gris-2 leading-[1.5] mt-[6px] max-w-[260px]">
                À la fin d'une séance, on vous demandera si vous voulez la retrouver. Celles que vous gardez apparaîtront ici.
              </p>
              <button
                onClick={() => {
                  setActiveSegment("seances");
                  setSelectedSituationId(null);
                }}
                className="inline-block mt-[16px] text-[12px] font-semibold px-[18px] py-[9px] rounded-[11px] shadow-[inset_0_0_0_1px_var(--bord)] transition-colors active:bg-coquille"
              >
                Découvrir les séances
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              <p className="text-[10.5px] text-gris-3 m-[8px_0_4px_2px]">
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
                      className="flex items-center gap-[10px] py-[11px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
                    >
                      {/* Pastille de situation à gauche */}
                      <span
                        className="w-[7px] h-[7px] rounded-full shrink-0"
                        style={{ background: catInfo.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <b className="block font-normal text-[13.5px] leading-[1.25] text-encre">
                          {session.title}
                        </b>
                      </div>
                      <span className="text-[11.5px] text-gris-2 shrink-0">
                        {Math.round(session.durationSeconds / 60)} min
                      </span>
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

      {/* 5. Historique View */}
      {activeSegment === "historique" && (
        <div className="flex-1 px-[16px] pt-[6px] flex flex-col">
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
              <span className="inline-flex w-[56px] h-[56px] rounded-full bg-coquille items-center justify-center mb-[14px]">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--bord)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <p className="font-poppins font-light text-[17px]">Aucune séance pour le moment</p>
              <p className="text-[11.5px] text-gris-2 leading-[1.5] mt-[6px] max-w-[260px]">
                Vos séances terminées apparaîtront ici.
              </p>
              <button
                onClick={() => {
                  setActiveSegment("seances");
                  setSelectedSituationId(null);
                }}
                className="inline-block mt-[16px] text-[12px] font-semibold px-[18px] py-[9px] rounded-[11px] shadow-[inset_0_0_0_1px_var(--bord)] transition-colors active:bg-coquille"
              >
                Découvrir les séances
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              <p className="text-[10.5px] text-gris-3 m-[8px_0_4px_2px]">
                {history.length} {history.length > 1 ? "séances" : "séance"}
              </p>
              <div className="flex flex-col">
                {history.map((item, idx) => {
                  const session = sessionsData.find((s) => s.id === item.sessionId);
                  if (!session) return null;
                  const sit = getSituation(session.metadata.situation);
                  const isFav = favorites.some((f) => f.sessionId === item.sessionId);

                  return (
                    <div
                      key={`${item.sessionId}-${item.startedAt}-${idx}`}
                      onClick={() => router.push(`/player?id=${session.id}`)}
                      className="flex items-center gap-[10px] py-[11px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
                    >
                      {/* Pastille de situation à gauche */}
                      <span
                        className="w-[7px] h-[7px] rounded-full shrink-0"
                        style={{ background: sit?.color || "var(--bord)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <b className="block font-normal text-[13.5px] leading-[1.25] text-encre whitespace-nowrap overflow-hidden text-ellipsis">
                          {session.metadata.title}
                        </b>
                        <span className="block text-[10.5px] text-gris-3 mt-[1px]">
                          {formatRelativeDate(item.startedAt)}
                        </span>
                      </div>
                      <span className="text-[11.5px] text-gris-2 shrink-0">
                        {Math.max(
                          1,
                          Math.round((item.duration || session.metadata.durationSeconds) / 60)
                        )}{" "}
                        min
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleHistoryFavorite(session.id);
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

      {/* Pro Modal */}
      <ProModal
        isOpen={proModalSession !== null}
        onClose={() => setProModalSession(null)}
        sessionTitle={proModalSession?.title}
      />

      {/* Undo Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-encre text-creme rounded-xl p-4 shadow-lg flex items-center justify-between z-30 animate-in fade-in slide-in-from-bottom-5">
          <span className="text-[13.5px] font-medium">Retiré des favoris</span>
          <button
            onClick={undoRemove}
            className="text-[13.5px] font-semibold text-[#D8CAB4] active:opacity-70 transition-opacity"
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
