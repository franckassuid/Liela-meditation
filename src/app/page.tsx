"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { storage, SessionHistoryItem, Favori, requestPersistence } from "@/lib/storage";
import sessionsData from "@/generated/sessions.json";
import { getSituation, getAvailableSituations, getCategoryInfo } from "@/lib/sessions";
import { ENABLE_RECOMMENDATION } from "@/config/recommendation";
import { getRecommendedSession, getRepriseSession, RecommendationResult } from "@/lib/recommendation";

const SITUATION_ICONS: Record<string, string> = {
  "calmer-le-stress":           '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(253,249,240,.92)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h3l2-5 3 10 2.5-7 1.8 4H21"/></svg>',
  "trouver-le-sommeil":         '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(253,249,240,.92)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/></svg>',
  "calmer-les-pensees":         '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(253,249,240,.92)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16.5c3.5-1 5.5-4 6.5-8.5 2.5 3.5 5 5 9 5"/><circle cx="19.5" cy="13" r="1.6"/></svg>',
  "retrouver-sa-concentration": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(253,249,240,.92)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/></svg>',
  "relacher-les-tensions":      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(253,249,240,.92)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2c4 3.4 6 6 6 8.8a6 6 0 0 1-12 0c0-2.8 2-5.4 6-8.8Z"/></svg>',
  "se-recentrer":               '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(253,249,240,.92)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6"/></svg>',
};

function getSituationIcon(situationId: string): string {
  return SITUATION_ICONS[situationId] || '';
}

export default function HomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>("");
  const [recentSessions, setRecentSessions] = useState<SessionHistoryItem[]>([]);
  const [showCatalog, setShowCatalog] = useState(!ENABLE_RECOMMENDATION);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [inProgress, setInProgress] = useState<SessionHistoryItem | null>(null);
  const [favorites, setFavorites] = useState<Favori[]>([]);

  const pathname = usePathname();

  React.useEffect(() => {
    let active = true;
    const loadData = async () => {
      // Demander la persistance des données
      await requestPersistence();
      
      const onboarded = await storage.getOnboardingCompleted();
      const profile = await storage.getProfile();
      const history = await storage.getHistory();
      const inProg = await storage.getInProgressSession();
      const favs = await storage.getFavorites();
      const rep = ENABLE_RECOMMENDATION ? await getRepriseSession() : inProg;
      
      let rec: RecommendationResult | null = null;
      if (ENABLE_RECOMMENDATION) {
        rec = await getRecommendedSession();
      }

      if (!active) return;
      
      setIsOnboarded(onboarded);
      setFirstName(profile.firstName);
      setRecentSessions(history.slice(0, 2));
      setInProgress(rep);
      setFavorites(favs);
      
      if (ENABLE_RECOMMENDATION) {
        if (rec) {
          setRecommendation(rec);
        } else {
          setShowCatalog(true);
        }
      }
      setIsMounted(true);
    };
    
    loadData();
    return () => { active = false; };
  }, [pathname]);

  if (!isMounted) return null;

  const handleCompleteOnboarding = async () => {
    await storage.setOnboardingCompleted(true);
    setIsOnboarded(true);
  };

  if (!isOnboarded) {
    return (
      <div className="fixed inset-0 z-50 bg-creme flex flex-col justify-between max-w-md mx-auto p-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] h-[100dvh] overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <BrandLogo variant="icon" className="w-[84px] h-[84px] mb-6" />
          <h1 className="font-poppins font-light text-[24px] sm:text-[26px] leading-[1.25] mb-3">
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    const greeting = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
    return firstName ? `${greeting} ${firstName}` : greeting;
  };

  return (
    <div className="p-marge pb-4 flex flex-col flex-1">
      {/* Header with prominent Logo */}
      <div 
        className="flex justify-between items-center pt-[4px] cursor-pointer"
        onClick={() => window.location.reload()}
      >
        <BrandLogo variant="horizontal" width={110} className="h-8 w-auto" />
      </div>
      
      <h1 className="font-poppins font-light text-[24px] leading-[1.15] mt-[6px]">
        {getGreeting()}
      </h1>
      <p className="text-[11.5px] text-gris-2 mt-[2px]">
        Il est {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')}.
      </p>

      {ENABLE_RECOMMENDATION && !showCatalog && recommendation ? (
        <div className="mt-[12px]">
          <div 
            className="rounded-[18px] overflow-hidden relative h-[184px] shadow-[0_10px_24px_-14px_rgba(67,53,40,0.3)] cursor-pointer"
            onClick={() => {
              if (recommendation.session.isAvailable) {
                router.push(`/player?id=${recommendation.session.realSessionId || recommendation.session.id}`);
              }
            }}
          >
            <div className="absolute inset-0">
              <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" style={{ display: "block", width: "100%", height: "100%" }}>
                <rect width="200" height="200" fill={getCategoryInfo(recommendation.session.situationId).color} />
                <path fill="#FDF9F0" opacity="0.2" d="M32 118C32 74 62 46 106 46c40 0 70 20 76 46 5 20-12 38-38 38-32 0-48-12-70-12-22 0-42 6-42 0z"/>
                <path fill="#FDF9F0" opacity="0.1" d="M50 132C50 98 76 76 112 76c32 0 54 16 58 34 3 14-10 24-30 24-24 0-38-8-54-8-16 0-24 4-36 6z"/>
              </svg>
            </div>
            <div className="absolute inset-x-0 bottom-0 top-auto p-[12px_13px_13px] text-creme">
              <span className="inline-block text-[10px] font-semibold px-[9px] py-[3px] rounded-full bg-creme/20">
                {getCategoryInfo(recommendation.session.situationId).label}
              </span>
              <h4 className="font-poppins font-light text-[19px] m-[6px_0_3px]">
                {recommendation.session.title}
              </h4>
              <p className="text-[10.5px] opacity-80 leading-[1.4]">
                {recommendation.reason}
              </p>
              <div className="flex items-center mt-[10px]">
                <span className="inline-flex items-center gap-[6px] bg-creme text-encre text-[12px] font-semibold px-[13px] py-[7px] rounded-full">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#433528" stroke="#433528" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5.5v13l11-6.5Z"/></svg>
                  <b>{Math.round(recommendation.session.durationSeconds / 60)} min</b>
                </span>
                <span 
                  className="ml-auto flex cursor-pointer p-2 -mr-2"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const isFav = favorites.some(f => f.sessionId === recommendation.session.id);
                    if (isFav) {
                      await storage.removeFavorite(recommendation.session.id);
                    } else {
                      await storage.addFavorite(recommendation.session.id, "home");
                    }
                    const newFavs = await storage.getFavorites();
                    setFavorites(newFavs);
                  }}
                >
                  {favorites.some(f => f.sessionId === recommendation.session.id) ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#FDF9F0" stroke="#FDF9F0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(253,249,240,.85)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z"/></svg>
                  )}
                </span>
              </div>
            </div>
          </div>
          
          <div 
            className="flex items-center gap-1 text-[12px] text-gris-2 mt-[11px] font-medium cursor-pointer"
            onClick={() => setShowCatalog(true)}
          >
            Autre chose ?
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A6E5E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7"/></svg>
          </div>
        </div>
      ) : (
        <>
          <h3 className="font-poppins font-light text-[24px] leading-[1.2] mt-[6px] mb-[14px]">
            De quoi<br />avez-vous besoin<br />maintenant&nbsp;?
          </h3>
          {/* Full-width color bands per maquette */}
          <div className="flex flex-col gap-[6px]">
            {getAvailableSituations().map((situation) => (
              <button
                key={situation.id}
                onClick={() => router.push(`/situation/${situation.id}`)}
                className="w-full flex items-center gap-3 rounded-[14px] px-[16px] py-[15px] text-creme text-left active:scale-[0.98] transition-transform"
                style={{ background: situation.color }}
              >
                <span className="shrink-0" dangerouslySetInnerHTML={{ __html: getSituationIcon(situation.id) }} />
                <b className="flex-1 text-[15px] font-semibold">{situation.shortLabel}</b>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(253,249,240,.55)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7"/></svg>
              </button>
            ))}
          </div>
        </>
      )}

      {inProgress && (
        <div className="mb-2 animate-in fade-in slide-in-from-bottom-4">
          <p className="text-[11.5px] font-semibold m-[16px_0_8px]">Reprendre</p>
          {(() => {
            const session = sessionsData.find(s => s.id === inProgress.sessionId);
            if (!session) return null;
            const situation = getSituation(session.metadata.situation);
            const remainingMinutes = Math.max(1, Math.round((session.metadata.durationSeconds - inProgress.lastPosition) / 60));
            
            return (
              <div 
                className="flex items-center gap-[10px] bg-white rounded-[13px] p-[9px_11px] shadow-[0_1px_2px_rgba(67,53,40,0.05),_0_8px_18px_-14px_rgba(67,53,40,0.2)] cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => router.push(`/player?id=${session.id}`)}
              >
                <span 
                  className="w-[36px] h-[36px] rounded-[10px] shrink-0" 
                  style={{ background: situation?.color || "var(--bord)" }}
                ></span>
                <div className="flex-1 min-w-0">
                  <b className="block text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                    {session.metadata.title}
                  </b>
                  <i className="block not-italic text-[10.5px] text-gris-2">
                    {remainingMinutes} min restantes
                  </i>
                </div>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#433528" stroke="#433528" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 5.5v13l11-6.5Z"/>
                </svg>
              </div>
            );
          })()}
        </div>
      )}

      {/* Favoris */}
      <div className="animate-in fade-in mb-2">
        <p className="text-[11.5px] font-semibold m-[16px_0_8px]">Vos favoris</p>
        {favorites.length === 0 ? (
          <div className="rounded-[12px] p-[16px] bg-coquille text-center">
            <p className="text-[12px] text-gris-2 leading-[1.5]">
              Rien ici pour l'instant.<br/>
              Celles que vous gardez apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="flex gap-[8px] overflow-x-auto pb-2 scrollbar-none">
            {favorites.map(fav => {
              const session = sessionsData.find(s => s.id === fav.sessionId);
              if (!session) return null;
              const situation = getCategoryInfo(session.metadata.situation);
              return (
                <div 
                  key={session.id}
                  onClick={() => router.push(`/player?id=${session.id}`)}
                  className="flex-none w-[92px] h-[68px] rounded-[12px] p-[9px] text-creme flex flex-col justify-end cursor-pointer active:scale-[0.95] transition-transform relative"
                  style={{ background: situation?.color || "var(--terre)" }}
                >
                  <span className="absolute top-[8px] right-[8px]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z"/></svg>
                  </span>
                  <span className="text-[10.5px] leading-[1.2] font-medium">{session.metadata.title}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
