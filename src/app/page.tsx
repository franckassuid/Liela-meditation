"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { storage, SessionHistoryItem, Favori, requestPersistence } from "@/lib/storage";
import sessionsData from "@/generated/sessions.json";
import { getSituation } from "@/lib/sessions";
import { getRecommendedSession, getRepriseSession, RecommendationResult, isSameSession } from "@/lib/recommendation";
import { SESSIONS_CATALOG, CatalogSession } from "@/config/sessionsCatalog";
import { ProModal } from "@/components/ui/ProModal";
import { BreathingVisualizer } from "@/components/ui/BreathingVisualizer";

function LielaEmblem({
  width = 14,
  height = 14,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <svg viewBox="0 0 100 100" width={width} height={height} className="block shrink-0" aria-hidden="true">
      <path
        fill="#919780"
        d="M15.23 6.27C14.97 6.55 14.97 6.55 14.99 34.79C15.01 63.04 15.01 63.04 15.23 64.48C15.98 69.58 17.66 74.06 20.41 78.24C21.04 79.18 22.26 80.83 22.73 81.37C24.46 83.32 24.79 83.65 26.6 85.22C27.61 86.11 30.54 88.15 31.88 88.9C33.2 89.65 34.69 90.34 36.84 91.2C37.55 91.49 39.6 92.11 41.15 92.51C46.7 93.94 53.08 94 59.4 92.69C60.45 92.48 60.85 92.37 62.32 91.91C67.7 90.27 71.9 87.92 75.84 84.35C77.18 83.15 77.53 82.73 77.23 82.73C77.17 82.73 76.82 82.94 76.46 83.19C76.1 83.44 75.64 83.73 75.43 83.84C74.71 84.25 71.49 85.87 70.74 86.22C67.82 87.51 64.74 88.35 61.7 88.66C61.18 88.72 60.51 88.8 60.22 88.85C59.53 88.96 55.9 88.96 55.05 88.85C54.69 88.8 54.07 88.72 53.68 88.67C52.02 88.46 49.22 87.79 47.45 87.18C46.34 86.8 43.93 85.59 42.67 84.79C39.54 82.79 38.22 81.68 36.09 79.3C35.05 78.14 33.3 75.76 32.75 74.76C32.65 74.59 32.46 74.25 32.33 74.02C31.52 72.59 30.63 70.68 30.27 69.62C29.92 68.58 29.44 66.84 29.34 66.3C29.28 66 29.22 65.74 29.2 65.7C29.12 65.57 28.68 62.84 28.57 61.79C28.49 61 28.45 54.83 28.4 38.2C28.36 16.64 28.35 15.66 28.18 15.13C28.09 14.82 27.98 14.41 27.93 14.2C27.5 12.16 26.01 9.86 24.2 8.47C21.94 6.72 19.82 6 16.98 6C15.5 6 15.5 6 15.23 6.27Z"
      />
      <path
        fill="#D09B83"
        stroke="#FDF9F0"
        strokeWidth="2.4"
        d="M84.25 49.45C84.19 49.54 82.63 50.58 81.69 51.19C81.04 51.59 80.2 52.02 79.35 52.38C78.94 52.57 78.5 52.75 78.4 52.8C77.4 53.26 75.29 53.91 74.04 54.14C73.64 54.22 73.12 54.32 72.89 54.37C72.5 54.47 71.85 54.55 70.01 54.74C68.83 54.87 65.01 55.1 62.05 55.21C60.61 55.27 59.19 55.36 58.9 55.4C58.61 55.44 58.09 55.52 57.73 55.57C57.08 55.66 56.85 55.72 55.18 56.19C52.86 56.84 50.87 57.7 49.18 58.79C47.6 59.8 45.7 61.54 44.48 63.07C43.11 64.77 41.56 67.71 41.15 69.4C41.02 69.92 40.87 70.52 40.81 70.71C40.61 71.46 40.36 73.22 40.36 73.9C40.36 74.88 40.62 77.06 40.77 77.42C40.85 77.59 40.98 77.73 41.06 77.73C41.15 77.73 42.11 76.82 43.19 75.7C44.29 74.59 45.57 73.36 46.04 72.98C46.97 72.21 49.05 70.8 50.47 69.94C51.64 69.23 53.54 68.34 55.22 67.71C55.63 67.55 56.13 67.37 56.32 67.29C57.51 66.85 58.75 66.5 59.91 66.28C60.29 66.21 60.9 66.09 61.25 66.01C62.2 65.8 62.41 65.82 62.41 66.09C62.41 66.26 62.36 66.31 62.08 66.36C61.33 66.48 57.29 68.24 56.07 68.97C55.86 69.09 55.61 69.23 55.5 69.28C55.28 69.39 53.69 70.45 53.01 70.96C52.76 71.15 52.19 71.56 51.76 71.88C50.15 73.07 48.8 74.44 46.99 76.71C46.05 77.89 45.58 78.58 45.29 79.23C45.18 79.48 45 79.85 44.9 80.07C44.8 80.29 44.71 80.53 44.71 80.62C44.71 81.21 48.23 82.78 51.11 83.46C54.21 84.2 56.9 84.29 60.56 83.79C63.93 83.32 67.7 81.89 70.75 79.91C73.52 78.13 77.01 74.77 78.64 72.34C79.41 71.19 80.21 69.95 80.21 69.9C80.21 69.87 80.37 69.56 80.59 69.23C82.05 66.81 83.79 62.09 84.25 59.33C84.27 59.13 84.36 58.75 84.43 58.5C84.54 58.08 84.72 56.56 84.93 54.05C85.03 52.99 84.95 49.78 84.82 49.53C84.74 49.36 84.33 49.3 84.25 49.45Z"
      />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [inProgress, setInProgress] = useState<SessionHistoryItem | null>(null);
  const [favorites, setFavorites] = useState<Favori[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [proModalSession, setProModalSession] = useState<CatalogSession | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine !== false);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Squelette sans balayage animé si le chargement dépasse 400 ms
    const skeletonTimer = setTimeout(() => {
      if (active) setShowSkeleton(true);
    }, 400);

    const loadData = async () => {
      await requestPersistence();
      const onboarded = await storage.getOnboardingCompleted();
      const rep = await getRepriseSession();
      const favs = await storage.getFavorites();

      // Suggestion calculée en excluant strictement la reprise en cours
      let rec = await getRecommendedSession(new Date(), {
        isOffline: typeof navigator !== "undefined" && !navigator.onLine,
        excludeSessionId: rep?.sessionId,
        forceRecalculate: Boolean(rep),
      });

      if (rep && rec && isSameSession(rec.session, rep.sessionId)) {
        const alt = SESSIONS_CATALOG.find(
          (s) => s.isAvailable && !isSameSession(s, rep.sessionId)
        );
        if (alt) {
          rec = {
            session: alt,
            reason: rec.reason,
          };
        }
      }

      if (!active) return;
      clearTimeout(skeletonTimer);

      setIsOnboarded(onboarded);
      setInProgress(rep);
      setFavorites(favs);
      setRecommendation(rec);
      setIsMounted(true);
    };

    loadData();

    return () => {
      active = false;
      clearTimeout(skeletonTimer);
    };
  }, []);

  const session = recommendation?.session || SESSIONS_CATALOG[0];
  const situation = getSituation(session.situationId);
  const isFav = favorites.some((f) => f.sessionId === session.id);
  const situationVoile = situation?.voile || "#F5E4DA";

  // Applique la couleur de fond dynamique de la situation à toute la page et à AppShell
  useEffect(() => {
    document.documentElement.style.setProperty("--home-bg", situationVoile);
    return () => {
      document.documentElement.style.removeProperty("--home-bg");
    };
  }, [situationVoile]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFav) {
      await storage.removeFavorite(session.id);
    } else {
      await storage.addFavorite(session.id, "home");
    }
    const newFavs = await storage.getFavorites();
    setFavorites(newFavs);
  };

  const handleLaunchSession = () => {
    if (session.isAvailable) {
      router.push(`/player?id=${session.realSessionId || session.id}`);
    } else {
      setProModalSession(session);
    }
  };

  const handleCompleteOnboarding = async () => {
    await storage.setOnboardingCompleted(true);
    setIsOnboarded(true);
  };

  if (!isMounted) {
    if (!showSkeleton) return null;
    return (
      <div
        className="flex flex-col flex-1 pb-3 px-5 relative h-full max-h-full overflow-hidden select-none transition-colors duration-500"
        style={{ backgroundColor: situationVoile }}
      >
        <div className="flex items-center justify-between pt-[14px] pb-[4px] px-[2px] shrink-0">
          <span className="font-poppins font-light text-[26px] tracking-[-0.015em] text-encre">
            liela
          </span>
          <span className="w-[20px] h-[20px]" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-[18px] text-center min-h-0">
          <span className="w-[140px] h-[26px] rounded-full bg-[rgba(67,53,40,.07)]" />
          <span className="w-[220px] h-[220px] rounded-full bg-[rgba(67,53,40,.07)]" />
          <div className="w-full flex flex-col items-center gap-2">
            <span className="w-[40%] h-[14px] rounded-[7px] bg-[rgba(67,53,40,.07)]" />
            <span className="w-[75%] h-[26px] rounded-[8px] bg-[rgba(67,53,40,.07)]" />
            <span className="w-[60%] h-[14px] rounded-[7px] bg-[rgba(67,53,40,.07)]" />
          </div>
          <span className="w-[72px] h-[72px] rounded-full bg-[rgba(67,53,40,.07)]" />
        </div>
      </div>
    );
  }

  if (!isOnboarded) {
    return (
      <div className="fixed inset-0 z-50 bg-creme flex flex-col justify-between max-w-md mx-auto p-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] h-[100dvh] overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <LielaEmblem width={84} height={84} />
          <h1 className="font-poppins font-light text-[26px] sm:text-[28px] leading-[1.25] mb-3 mt-6">
            La méditation qu&apos;il vous faut, maintenant.
          </h1>
          <p className="text-gris-2 text-[15px] leading-relaxed max-w-[290px]">
            Choisissez ce dont vous avez besoin, indiquez le temps disponible. Liela propose une séance.
          </p>
        </div>
        <Button className="w-full shrink-0 text-[15px] py-3" onClick={handleCompleteOnboarding}>
          Commencer
        </Button>
      </div>
    );
  }

  // Informations sur la séance interrompue (< 24h)
  const inProgressReal = inProgress
    ? sessionsData.find((s) => s.id === inProgress.sessionId)
    : null;
  const inProgressSituation = inProgressReal
    ? getSituation(inProgressReal.metadata.situation)
    : null;
  const inProgressMinutesRemaining = inProgress && inProgressReal
    ? Math.max(1, Math.round((inProgressReal.metadata.durationSeconds - inProgress.lastPosition) / 60))
    : 0;

  const availableSessionsCount = SESSIONS_CATALOG.filter((s) => s.isAvailable).length;

  return (
    <div
      className="flex flex-col flex-1 pb-3 px-5 relative h-full max-h-full overflow-hidden select-none transition-colors duration-500"
      style={{ backgroundColor: situationVoile }}
    >
      {/* En-tête : "liela" et contrôle de favori */}
      <div className="flex items-center justify-between pt-[14px] pb-[6px] px-[2px] shrink-0">
        <span
          onClick={() => window.location.reload()}
          className="font-poppins font-light text-[26px] tracking-[-0.015em] text-encre cursor-pointer select-none"
        >
          liela
        </span>
        <button
          onClick={handleToggleFavorite}
          className="p-1 -mr-1 cursor-pointer active:scale-90 transition-transform"
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill={isFav ? (situation?.color || "#A26248") : "none"}
            stroke={isFav ? (situation?.color || "#A26248") : "#C6BBA9"}
            strokeWidth={isFav ? "1.8" : "1.75"}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z" />
          </svg>
        </button>
      </div>

      {/* Corps principal centré aux proportions généreuses */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-1 pb-2 min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center gap-[16px] sm:gap-[20px] text-center min-h-0 w-full">
          {/* Badge Suggestion de Liela */}
          <span className="inline-flex items-center gap-[6px] text-[11.5px] font-semibold py-[6px] pr-[14px] pl-[10px] rounded-full bg-[rgba(253,249,240,0.85)] text-gris-2 select-none shadow-[0_1px_3px_rgba(67,53,40,.06)]">
            <LielaEmblem width={13} height={13} />
            Suggestion de Liela
          </span>

          {/* Galet respirant : exactement le même composant et la même animation que la page de lecture */}
          <div
            className="w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] max-w-[78vw] max-h-[35vh] relative flex items-center justify-center cursor-pointer my-1 shrink-0"
            onClick={handleLaunchSession}
          >
            <BreathingVisualizer
              color={situation?.color || "#A26248"}
              onClick={handleLaunchSession}
            />
          </div>

          {/* Situation & Titre */}
          <div className="px-2">
            <p
              className="text-[12.5px] font-semibold tracking-wide"
              style={{ color: situation?.color || "#A26248" }}
            >
              {situation?.shortLabel}
            </p>
            <h2 className="font-poppins font-light text-[28px] sm:text-[32px] leading-[1.18] mt-[4px] text-encre max-w-[320px] sm:max-w-[360px]">
              {session.title}
            </h2>
          </div>

          {/* Ligne de raison */}
          <p className="text-[13px] sm:text-[14px] text-gris-2 max-w-[28ch] sm:max-w-[32ch] text-center leading-relaxed px-2">
            {recommendation?.reason || "Il est temps de s'accorder un moment."}
          </p>

          {/* Bouton de lecture circulaire plus grand */}
          <div className="flex flex-col items-center pt-1">
            <button
              onClick={handleLaunchSession}
              className="w-[72px] h-[72px] sm:w-[78px] sm:h-[78px] rounded-full flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(67,53,40,.40)] cursor-pointer active:scale-95 transition-transform shrink-0"
              style={{ background: situation?.color || "#A26248" }}
              aria-label={`Lancer ${session.title}`}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="#FDF9F0"
                stroke="#FDF9F0"
                strokeWidth="0"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-1"
              >
                <path d="M8 5.5v13l11-6.5Z" />
              </svg>
            </button>

            {/* Durée */}
            <p className="text-[12.5px] text-gris-2 font-medium mt-2">
              {Math.round(session.durationSeconds / 60)} minutes
            </p>
          </div>
        </div>

        {/* Reprise de séance interrompue (< 24h) si présente */}
        {inProgress && inProgressReal && (
          <div
            onClick={() => router.push(`/player?id=${inProgress.sessionId}`)}
            className="w-full max-w-[320px] flex items-center gap-[11px] p-[11px_14px] rounded-[15px] bg-[rgba(253,249,240,.9)] shadow-[0_1px_3px_rgba(67,53,40,.06)] shrink-0 cursor-pointer active:scale-[0.98] transition-transform animate-in fade-in mt-2 mb-1"
          >
            <span
              className="w-[9px] h-[9px] rounded-full shrink-0"
              style={{ background: inProgressSituation?.color || "#5D6A78" }}
            />
            <div className="flex-1 min-w-0 text-left">
              <b className="block text-[13px] font-semibold text-encre truncate">
                {inProgressReal.metadata.title}
              </b>
              <i className="block not-italic text-[11px] text-gris-2">
                Reprendre · {inProgressMinutesRemaining} min restantes
              </i>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#433528"
              stroke="#433528"
              strokeWidth="0"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M8 5.5v13l11-6.5Z" />
            </svg>
          </div>
        )}

        {/* Bandeau Hors ligne */}
        {!isOnline && (
          <div className="flex items-center gap-[7px] py-[8px] px-[12px] rounded-[12px] bg-[#F6EEDC] text-[10.5px] text-[#8E6A1C] font-medium shrink-0 mt-2 mb-1">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8E6A1C"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M7 18.5h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.3A3.4 3.4 0 0 0 7 18.5Z" />
              <path d="m4 4 16 16" />
            </svg>
            <span>Hors ligne · {availableSessionsCount} séances disponibles</span>
          </div>
        )}
      </div>

      {/* Fenêtre modale Pro */}
      <ProModal
        isOpen={proModalSession !== null}
        onClose={() => setProModalSession(null)}
        sessionTitle={proModalSession?.title}
      />
    </div>
  );
}
