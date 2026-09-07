"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { storage, SessionHistoryItem, Favori, requestPersistence } from "@/lib/storage";
import sessionsData from "@/generated/sessions.json";
import { getSituation, getAvailableSituations } from "@/lib/sessions";
import { getRecommendedSession, getRepriseSession, RecommendationResult } from "@/lib/recommendation";
import { SESSIONS_CATALOG, CatalogSession } from "@/config/sessionsCatalog";
import { ProModal } from "@/components/ui/ProModal";

function LielaEmblem({
  width = 18,
  height = 18,
  isMonochrome = false,
}: {
  width?: number;
  height?: number;
  isMonochrome?: boolean;
}) {
  if (isMonochrome) {
    return (
      <svg viewBox="0 0 100 100" width={width} height={height} className="block shrink-0" aria-hidden="true">
        <path
          fill="#FDF9F0"
          d="M15.23 6.27C14.97 6.55 14.97 6.55 14.99 34.79C15.01 63.04 15.01 63.04 15.23 64.48C15.98 69.58 17.66 74.06 20.41 78.24C21.04 79.18 22.26 80.83 22.73 81.37C24.46 83.32 24.79 83.65 26.6 85.22C27.61 86.11 30.54 88.15 31.88 88.9C33.2 89.65 34.69 90.34 36.84 91.2C37.55 91.49 39.6 92.11 41.15 92.51C46.7 93.94 53.08 94 59.4 92.69C60.45 92.48 60.85 92.37 62.32 91.91C67.7 90.27 71.9 87.92 75.84 84.35C77.18 83.15 77.53 82.73 77.23 82.73C77.17 82.73 76.82 82.94 76.46 83.19C76.1 83.44 75.64 83.73 75.43 83.84C74.71 84.25 71.49 85.87 70.74 86.22C67.82 87.51 64.74 88.35 61.7 88.66C61.18 88.72 60.51 88.8 60.22 88.85C59.53 88.96 55.9 88.96 55.05 88.85C54.69 88.8 54.07 88.72 53.68 88.67C52.02 88.46 49.22 87.79 47.45 87.18C46.34 86.8 43.93 85.59 42.67 84.79C39.54 82.79 38.22 81.68 36.09 79.3C35.05 78.14 33.3 75.76 32.75 74.76C32.65 74.59 32.46 74.25 32.33 74.02C31.52 72.59 30.63 70.68 30.27 69.62C29.92 68.58 29.44 66.84 29.34 66.3C29.28 66 29.22 65.74 29.2 65.7C29.12 65.57 28.68 62.84 28.57 61.79C28.49 61 28.45 54.83 28.4 38.2C28.36 16.64 28.35 15.66 28.18 15.13C28.09 14.82 27.98 14.41 27.93 14.2C27.5 12.16 26.01 9.86 24.2 8.47C21.94 6.72 19.82 6 16.98 6C15.5 6 15.5 6 15.23 6.27Z"
        />
        <path
          fill="#FDF9F0"
          opacity=".55"
          d="M84.25 49.45C84.19 49.54 82.63 50.58 81.69 51.19C81.04 51.59 80.2 52.02 79.35 52.38C78.94 52.57 78.5 52.75 78.4 52.8C77.4 53.26 75.29 53.91 74.04 54.14C73.64 54.22 73.12 54.32 72.89 54.37C72.5 54.47 71.85 54.55 70.01 54.74C68.83 54.87 65.01 55.1 62.05 55.21C60.61 55.27 59.19 55.36 58.9 55.4C58.61 55.44 58.09 55.52 57.73 55.57C57.08 55.66 56.85 55.72 55.18 56.19C52.86 56.84 50.87 57.7 49.18 58.79C47.6 59.8 45.7 61.54 44.48 63.07C43.11 64.77 41.56 67.71 41.15 69.4C41.02 69.92 40.87 70.52 40.81 70.71C40.61 71.46 40.36 73.22 40.36 73.9C40.36 74.88 40.62 77.06 40.77 77.42C40.85 77.59 40.98 77.73 41.06 77.73C41.15 77.73 42.11 76.82 43.19 75.7C44.29 74.59 45.57 73.36 46.04 72.98C46.97 72.21 49.05 70.8 50.47 69.94C51.64 69.23 53.54 68.34 55.22 67.71C55.63 67.55 56.13 67.37 56.32 67.29C57.51 66.85 58.75 66.5 59.91 66.28C60.29 66.21 60.9 66.09 61.25 66.01C62.2 65.8 62.41 65.82 62.41 66.09C62.41 66.26 62.36 66.31 62.08 66.36C61.33 66.48 57.29 68.24 56.07 68.97C55.86 69.09 55.61 69.23 55.5 69.28C55.28 69.39 53.69 70.45 53.01 70.96C52.76 71.15 52.19 71.56 51.76 71.88C50.15 73.07 48.8 74.44 46.99 76.71C46.05 77.89 45.58 78.58 45.29 79.23C45.18 79.48 45 79.85 44.9 80.07C44.8 80.29 44.71 80.53 44.71 80.62C44.71 81.21 48.23 82.78 51.11 83.46C54.21 84.2 56.9 84.29 60.56 83.79C63.93 83.32 67.7 81.89 70.75 79.91C73.52 78.13 77.01 74.77 78.64 72.34C79.41 71.19 80.21 69.95 80.21 69.9C80.21 69.87 80.37 69.56 80.59 69.23C82.05 66.81 83.79 62.09 84.25 59.33C84.27 59.13 84.36 58.75 84.43 58.5C84.54 58.08 84.72 56.56 84.93 54.05C85.03 52.99 84.95 49.78 84.82 49.53C84.74 49.36 84.33 49.3 84.25 49.45Z"
        />
      </svg>
    );
  }

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [proModalSession, setProModalSession] = useState<CatalogSession | null>(null);

  useEffect(() => {
    // Check online status
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

    // Timer for skeleton loading (> 400ms)
    const skeletonTimer = setTimeout(() => {
      if (active) setShowSkeleton(true);
    }, 400);

    const loadData = async () => {
      await requestPersistence();
      const onboarded = await storage.getOnboardingCompleted();
      const rep = await getRepriseSession();
      const favs = await storage.getFavorites();

      // Recommend a session (excluding the session in progress if any)
      const rec = await getRecommendedSession(new Date(), {
        isOffline: typeof navigator !== "undefined" && !navigator.onLine,
        excludeSessionId: rep?.sessionId,
      });

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

  if (!isMounted) {
    if (!showSkeleton) return null;
    return (
      <div className="flex flex-col flex-1 pb-3 px-[14px]">
        <div className="flex items-center gap-[6px] pt-[8px] pb-[12px] px-[4px]">
          <LielaEmblem width={18} height={18} />
          <span className="font-poppins font-normal text-[19px] tracking-[-0.01em] text-encre">
            liela
          </span>
        </div>
        <div className="flex-1 flex flex-col gap-[9px]">
          <div className="flex-1 rounded-[24px] relative overflow-hidden bg-sable flex flex-col justify-end p-[18px]">
            <span className="absolute top-[16px] left-[16px] w-[82px] h-[20px] rounded-full bg-encre/10" />
            <div className="relative">
              <span className="block w-[56%] h-[12px] mb-[10px] rounded-[8px] bg-encre/10" />
              <span className="block w-[78%] h-[22px] mb-[10px] rounded-[8px] bg-encre/10" />
              <span className="block w-[92px] h-[36px] mt-[8px] rounded-full bg-encre/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCompleteOnboarding = async () => {
    await storage.setOnboardingCompleted(true);
    setIsOnboarded(true);
  };

  if (!isOnboarded) {
    return (
      <div className="fixed inset-0 z-50 bg-creme flex flex-col justify-between max-w-md mx-auto p-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] h-[100dvh] overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <LielaEmblem width={84} height={84} />
          <h1 className="font-poppins font-light text-[24px] sm:text-[26px] leading-[1.25] mb-3 mt-6">
            La méditation qu&apos;il vous faut, maintenant.
          </h1>
          <p className="text-gris-2 text-[14px] sm:text-[15px] leading-relaxed max-w-[290px]">
            Choisissez ce dont vous avez besoin, indiquez le temps disponible. Liela propose une séance.
          </p>
        </div>
        <Button className="w-full shrink-0" onClick={handleCompleteOnboarding}>
          Commencer
        </Button>
      </div>
    );
  }

  const session = recommendation?.session || SESSIONS_CATALOG[0];
  const situation = getSituation(session.situationId);
  const isFav = favorites.some((f) => f.sessionId === session.id);

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

  // Find info about interrupted session (if any)
  const inProgressReal = inProgress
    ? sessionsData.find((s) => s.id === inProgress.sessionId)
    : null;
  const inProgressSituation = inProgressReal
    ? getSituation(inProgressReal.metadata.situation)
    : null;
  const inProgressMinutesRemaining = inProgress && inProgressReal
    ? Math.max(1, Math.round((inProgressReal.metadata.durationSeconds - inProgress.lastPosition) / 60))
    : 0;

  const availableSituations = getAvailableSituations();
  const availableSessionsCount = SESSIONS_CATALOG.filter((s) => s.isAvailable).length;

  return (
    <div className="flex flex-col flex-1 pb-3 px-[14px] relative h-full min-h-0">
      {/* Top Header : Logo icon + "liela" wordmark */}
      <div
        className="flex items-center gap-[6px] pt-[8px] pb-[12px] px-[4px] cursor-pointer"
        onClick={() => window.location.reload()}
      >
        <LielaEmblem width={18} height={18} />
        <span className="font-poppins font-normal text-[19px] tracking-[-0.01em] text-encre">
          liela
        </span>
      </div>

      {/* Main Zone : full available height */}
      <div className="flex-1 flex flex-col gap-[9px] min-h-0">
        {/* Offline Banner if disconnected */}
        {!isOnline && (
          <div className="flex items-center gap-[7px] p-[8px_12px] rounded-[11px] bg-[#F6EEDC] text-[#8E6A1C] text-[10.5px] font-medium shrink-0">
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
            <span>Hors ligne · {availableSessionsCount} séances disponibles</span>
          </div>
        )}

        {/* Central Suggestion Card */}
        <div
          className="flex-1 rounded-[24px] relative overflow-hidden flex flex-col justify-end p-[18px] text-[#FDF9F0] transition-colors duration-300 shadow-[0_2px_5px_rgba(67,53,40,.06),0_20px_44px_-20px_rgba(67,53,40,.24)]"
          style={{ background: situation?.color || "#5F6A52" }}
        >
          {/* Filigree Background Pebble 1 */}
          <svg
            viewBox="0 0 120 90"
            className="absolute top-[6%] left-[-18%] w-[150%] h-auto pointer-events-none"
            aria-hidden="true"
          >
            <path
              fill="rgba(253,249,240,.12)"
              d="M14 62C14 34 32 18 60 18c26 0 46 12 50 28 4 14-8 24-24 24-22 0-32-8-46-8-14 0-26 4-26 0z"
            />
          </svg>

          {/* Filigree Background Pebble 2 */}
          <svg
            viewBox="0 0 120 90"
            className="absolute top-[26%] left-[-4%] w-[130%] h-auto -rotate-[8deg] pointer-events-none"
            aria-hidden="true"
          >
            <path
              fill="rgba(253,249,240,.08)"
              d="M14 62C14 34 32 18 60 18c26 0 46 12 50 28 4 14-8 24-24 24-22 0-32-8-46-8-14 0-26 4-26 0z"
            />
          </svg>

          {/* Badge Suggestion */}
          <span className="absolute top-[16px] left-[16px] inline-flex items-center gap-[5px] bg-[rgba(253,249,240,.18)] text-[#FDF9F0] text-[10px] font-semibold py-[5px] pr-[10px] pl-[7px] rounded-full select-none">
            <LielaEmblem width={12} height={12} isMonochrome={true} />
            Suggestion
          </span>

          {/* Heart Button */}
          <button
            onClick={handleToggleFavorite}
            className="absolute top-[16px] right-[16px] p-2 -mr-2 -mt-2 active:scale-90 transition-transform"
            aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill={isFav ? "#FDF9F0" : "none"}
              stroke={isFav ? "#FDF9F0" : "rgba(253,249,240,.75)"}
              strokeWidth={isFav ? "1.8" : "1.75"}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z" />
            </svg>
          </button>

          {/* Bottom Card Content */}
          <div className="relative text-[#FDF9F0] mt-auto">
            <em className="not-italic text-[10.5px] opacity-80 font-semibold block">
              {situation?.shortLabel || ""}
            </em>
            <h4 className="font-poppins font-light text-[25px] leading-[1.12] my-[7px]">
              {session.title}
            </h4>
            <p className="text-[11.5px] opacity-80 leading-[1.45]">
              {recommendation?.reason || "Il est temps de s'accorder un moment."}
            </p>

            <div className="mt-[16px]">
              <button
                onClick={handleLaunchSession}
                className="inline-flex items-center gap-[7px] bg-[#FDF9F0] text-[13px] font-semibold py-[11px] px-[20px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
                style={{ color: situation?.color || "#5F6A52" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="0"
                >
                  <path d="M8 5.5v13l11-6.5Z" />
                </svg>
                {Math.round(session.durationSeconds / 60)} min
              </button>
            </div>
          </div>

          {/* "Autre chose" Drawer Trigger */}
          <div
            onClick={() => setSheetOpen(true)}
            className="relative flex flex-col items-center mt-[14px] text-[rgba(253,249,240,.72)] text-[10.5px] cursor-pointer hover:text-[#FDF9F0] active:scale-95 transition-all"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(253,249,240,.7)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 15 6-6 6 6" />
            </svg>
            <span>Autre chose</span>
          </div>
        </div>

        {/* Reprise Section : Interrupted Session if any (< 24h) */}
        {inProgress && inProgressReal && (
          <div
            onClick={() => router.push(`/player?id=${inProgress.sessionId}`)}
            className="flex items-center gap-[10px] p-[11px_12px] rounded-[14px] bg-white shadow-[0_1px_2px_rgba(67,53,40,.05)] shrink-0 cursor-pointer active:scale-[0.98] transition-transform animate-in fade-in"
          >
            <span
              className="w-[8px] h-[8px] rounded-full shrink-0"
              style={{ background: inProgressSituation?.color || "var(--bord)" }}
            />
            <div className="flex-1 min-w-0">
              <b className="block text-[12.5px] font-semibold text-encre whitespace-nowrap overflow-hidden text-ellipsis">
                {inProgressReal.metadata.title}
              </b>
              <i className="block not-italic text-[10.5px] text-gris-2">
                Reprendre · {inProgressMinutesRemaining} min restantes
              </i>
            </div>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="#433528"
              stroke="#433528"
              strokeWidth="0"
            >
              <path d="M8 5.5v13l11-6.5Z" />
            </svg>
          </div>
        )}
      </div>

      {/* "Autre chose" Bottom Sheet Overlay */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          className="fixed inset-0 bg-[#433528]/25 z-30 transition-opacity animate-in fade-in"
        />
      )}

      {/* "Autre chose" Bottom Sheet Content */}
      {sheetOpen && (
        <div className="absolute left-0 right-0 bottom-0 bg-creme rounded-t-[24px] p-[10px_16px_18px] z-40 shadow-[0_-4px_24px_rgba(67,53,40,0.18)] animate-in slide-in-from-bottom duration-200">
          <span className="block w-[32px] h-[3px] bg-filet rounded-full mx-auto mb-[12px]" />
          <p className="font-poppins font-light text-[17px] mb-[10px] text-encre">
            De quoi avez-vous besoin&nbsp;?
          </p>
          <div className="flex flex-col">
            {availableSituations.map((sit) => (
              <div
                key={sit.id}
                onClick={() => {
                  setSheetOpen(false);
                  router.push(`/library?situation=${sit.id}`);
                }}
                className="flex items-center gap-[11px] py-[11px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/50 transition-colors"
              >
                <span
                  className="w-[8px] h-[8px] rounded-full shrink-0"
                  style={{ background: sit.color }}
                />
                <b className="font-poppins font-light text-[14px] text-encre">
                  {sit.shortLabel}
                </b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pro Modal */}
      <ProModal
        isOpen={proModalSession !== null}
        onClose={() => setProModalSession(null)}
        sessionTitle={proModalSession?.title}
      />
    </div>
  );
}
