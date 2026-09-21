"use client";

import { useStorageRevision } from "@/hooks/useStorageRevision";
import { useCatalogRevision } from "@/hooks/useCatalogRevision";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { storage, SessionHistoryItem, Favori, requestPersistence } from "@/lib/storage";
import { sessions as sessionsData } from "@/lib/sessions";
import { getSituation } from "@/lib/sessions";
import { getRecommendedSession, getRepriseSession, RecommendationResult, isSameSession } from "@/lib/recommendation";
import { SESSIONS_CATALOG, CatalogSession } from "@/config/sessionsCatalog";
import { ProModal } from "@/components/ui/ProModal";
import { BreathingVisualizer } from "@/components/ui/BreathingVisualizer";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { LielaEmblem } from "@/components/ui/Icons";

export default function HomePage() {
  const catalogRevision = useCatalogRevision();
  const storageRevision = useStorageRevision();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [inProgress, setInProgress] = useState<SessionHistoryItem | null>(null);
  const [favorites, setFavorites] = useState<Favori[]>([]);
  const isOnline = useOnlineStatus();
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [proModalSession, setProModalSession] = useState<CatalogSession | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    return () => {
      document.body.classList.remove("transitioning-to-player");
    };
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
      const openedFromReminder = new URLSearchParams(window.location.search).get("from") === "reminder";

      // Suggestion calculée en excluant strictement la reprise en cours
      let rec = await getRecommendedSession(new Date(), {
        isOffline: typeof navigator !== "undefined" && !navigator.onLine,
        excludeSessionId: rep?.sessionId,
        forceRecalculate: openedFromReminder || Boolean(rep),
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
      if (openedFromReminder) window.history.replaceState(window.history.state, "", "/");
    };

    loadData();

    return () => {
      active = false;
      clearTimeout(skeletonTimer);
    };
  }, [storageRevision, catalogRevision]);

  // Calculé ici pour l'utiliser dans le useEffect ci-dessous (qui doit rester avant les early returns)
  const situationVoile = (() => {
    if (!isMounted || !recommendation) return "#F5E4DA";
    const sit = getSituation(recommendation.session.situationId);
    return sit?.voile || "#F5E4DA";
  })();

  // Applique la couleur de fond dynamique — doit rester avant tous les early returns
  useEffect(() => {
    document.documentElement.style.setProperty("--home-bg", situationVoile);
    return () => {
      document.documentElement.style.removeProperty("--home-bg");
    };
  }, [situationVoile]);

  if (!isMounted) {
    if (!showSkeleton) return null;
    return (
      <div
        className="flex flex-col flex-1 pb-3 px-5 relative h-full max-h-full overflow-hidden select-none transition-colors duration-500"
        style={{ backgroundColor: "#F5E4DA" }}
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

  // S'il n'y a pas de recommandation du tout (ex: hors ligne sans aucun téléchargement)
  if (!recommendation) {
    return (
      <div
        className="flex flex-col flex-1 pb-3 px-5 relative h-full max-h-full overflow-hidden select-none transition-colors duration-500 ease-out"
        style={{ backgroundColor: "#F5E4DA" }}
      >
        <div className="flex items-center justify-between pt-[14px] pb-[6px] px-[2px] shrink-0">
          <span className="font-poppins font-light text-[26px] tracking-[-0.015em] text-encre">
            liela
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h2 className="font-poppins font-light text-[24px] sm:text-[26px] mb-3 text-encre">
            Aucune séance disponible hors ligne
          </h2>
          <p className="text-[14px] text-gris-2 max-w-[280px] leading-relaxed mb-8">
            Connectez-vous à Internet pour télécharger des séances et pouvoir les écouter partout.
          </p>
          <Button onClick={() => router.push("/library")}>
            Voir ma bibliothèque
          </Button>
        </div>
      </div>
    );
  }

  const session = recommendation.session;
  const situation = getSituation(session.situationId);
  const isFav = favorites.some((f) => f.sessionId === session.id);
  // situationVoile already computed above

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Optimistic UI update
    const previousFavorites = [...favorites];
    if (isFav) {
      setFavorites(favorites.filter((f) => f.sessionId !== session.id));
    } else {
      setFavorites([{ sessionId: session.id, addedAt: new Date().toISOString(), source: "home" }, ...favorites]);
    }

    let success = false;
    if (isFav) {
      success = await storage.removeFavorite(session.id);
    } else {
      success = await storage.addFavorite(session.id, "home");
    }

    if (!success) {
      // Revert on failure
      setFavorites(previousFavorites);
    } else {
      const newFavs = await storage.getFavorites();
      setFavorites(newFavs);
    }
  };

  const isDark = situation?.id === "trouver-le-sommeil";
  const targetBgColor = isDark ? "#3E4753" : (situation?.color || "#A26248");

  const handleLaunchSession = () => {
    if (session.isAvailable) {
      if (isTransitioning) return;
      setIsTransitioning(true);
      const targetUrl = `/player?id=${session.realSessionId || session.id}&from=home`;
      router.prefetch(targetUrl);
      if (typeof document !== "undefined") {
        document.body.classList.add("transitioning-to-player");
        document.documentElement.style.setProperty("--home-bg", targetBgColor);
      }

      setTimeout(() => {
        router.push(targetUrl);
      }, 380);
    } else {
      setProModalSession(session);
    }
  };

  const handleCompleteOnboarding = async () => {
    await storage.setOnboardingCompleted(true);
    setIsOnboarded(true);
  };

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
      className="flex flex-col flex-1 pb-3 px-5 relative h-full max-h-full overflow-hidden select-none transition-colors duration-500 ease-out"
      style={{ backgroundColor: isTransitioning ? targetBgColor : situationVoile }}
    >
      {/* En-tête : "liela" et contrôle de favori */}
      <div
        className={`flex items-center justify-between pt-[14px] pb-[6px] px-[2px] shrink-0 transition-all duration-300 ease-out ${
          isTransitioning ? "opacity-0 -translate-y-3 pointer-events-none" : "opacity-100"
        }`}
      >
        <span
          onClick={() => window.location.reload()}
          className="font-poppins font-light text-[26px] tracking-[-0.015em] text-encre cursor-pointer select-none"
        >
          liela
        </span>
        <button
          onClick={handleToggleFavorite}
          className="p-2 -mr-2 cursor-pointer active:scale-90 transition-transform"
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill={isFav ? (situation?.color || "#A26248") : "none"}
            stroke={isFav ? (situation?.color || "#A26248") : "#C6BBA9"}
            strokeWidth={isFav ? "1.8" : "1.8"}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z" />
          </svg>
        </button>
      </div>

      {/* Corps principal centré aux proportions généreuses */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-1 pb-2 min-h-0 relative">
        <div className="flex-1 flex flex-col items-center justify-center gap-[16px] sm:gap-[20px] text-center min-h-0 w-full">
          {/* Badge Suggestion de Liela */}
          <span
            className={`inline-flex items-center gap-[6px] text-[11.5px] font-semibold py-[6px] pr-[14px] pl-[10px] rounded-full bg-[rgba(253,249,240,0.85)] text-gris-2 select-none shadow-[0_1px_3px_rgba(67,53,40,.06)] transition-all duration-300 ease-out ${
              isTransitioning ? "opacity-0 -translate-y-2 pointer-events-none" : "opacity-100"
            }`}
          >
            <LielaEmblem width={13} height={13} />
            Suggestion de Liela
          </span>

          {/* Galet respirant avec continuité animée vers le lecteur */}
          <div
            className={`w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] max-w-[78vw] max-h-[35vh] relative flex items-center justify-center cursor-pointer my-1 shrink-0 transition-transform duration-500 ease-out ${
              isTransitioning ? "scale-[1.27] z-30" : "scale-100"
            }`}
            onClick={handleLaunchSession}
          >
            {/* Galet teinté pour l'accueil */}
            <div
              className={`w-full h-full absolute inset-0 transition-opacity duration-350 ease-out ${
                isTransitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              <BreathingVisualizer
                color={situation?.color || "#A26248"}
                onClick={handleLaunchSession}
              />
            </div>

            {/* Galet crème lumineux pour la continuité vers le lecteur */}
            <div
              className={`w-full h-full absolute inset-0 transition-opacity duration-350 ease-out ${
                isTransitioning ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <BreathingVisualizer />
            </div>
          </div>

          {/* Situation & Titre */}
          <div
            className={`px-2 transition-all duration-300 ease-out ${
              isTransitioning ? "opacity-0 translate-y-3 pointer-events-none" : "opacity-100"
            }`}
          >
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
          <p
            className={`text-[13px] sm:text-[14px] text-gris-2 max-w-[28ch] sm:max-w-[32ch] text-center leading-relaxed px-2 transition-all duration-300 ease-out ${
              isTransitioning ? "opacity-0 translate-y-3 pointer-events-none" : "opacity-100"
            }`}
          >
            {recommendation?.reason || "Il est temps de s'accorder un moment."}
          </p>

          {/* Bouton de lecture circulaire plus grand */}
          <div
            className={`flex flex-col items-center pt-1 transition-all duration-300 ease-out ${
              isTransitioning ? "opacity-0 scale-75 pointer-events-none" : "opacity-100"
            }`}
          >
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
            className={`w-full max-w-[320px] flex items-center gap-[11px] p-[11px_14px] rounded-[15px] bg-[rgba(253,249,240,.9)] shadow-[0_1px_3px_rgba(67,53,40,.06)] shrink-0 cursor-pointer active:scale-[0.98] transition-all duration-300 ease-out mt-2 mb-1 ${
              isTransitioning ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100 animate-in fade-in"
            }`}
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
          <div
            className={`flex items-center gap-[7px] py-[8px] px-[12px] rounded-[12px] bg-[#F6EEDC] text-[10.5px] text-[#8E6A1C] font-medium shrink-0 mt-2 mb-1 transition-all duration-300 ease-out ${
              isTransitioning ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100"
            }`}
          >
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
