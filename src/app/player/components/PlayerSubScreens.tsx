import React from "react";
import { PlayIcon, PauseIcon, RewindIcon, ForwardIcon, HeartIcon, MaximizeIcon, MinimizeIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Session } from "@/lib/sessions";
import { AudioState } from "@/lib/audio/AudioTrackManager";
import { CatalogSession } from "@/config/sessionsCatalog";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// ── Typed interfaces ─────────────────────────────────────────────────────────

interface PlayerControlsProps {
  currentTime: number;
  remaining: number;
  session: Session;
  liftForToast: boolean;
  showControls: boolean;
  showSettings: boolean;
  state: AudioState;
  fromHome: boolean;
  handleToggleFavorite: () => void;
  isFavorite: boolean;
  handleRewind: () => void;
  handlePlayPause: () => void;
  handleForward: () => void;
  handleShare: () => void;
  formatTime: (s: number) => string;
}

interface NextSessionInfo {
  id: string;
  title: string;
  duration: number;
  situationColor: string;
}

interface StorageForCompletion {
  addFavorite: (sessionId: string, source: string) => Promise<boolean>;
  addFavoriteRefusal: (sessionId: string) => Promise<boolean>;
}

interface CompletionOverlayProps {
  session: Session;
  situation: { shortLabel: string } | null;
  showFavPrompt: boolean;
  setShowFavPrompt: (v: boolean) => void;
  isFavorite: boolean;
  setIsFavorite: (v: boolean) => void;
  nextSession: NextSessionInfo | null;
  handleShare: () => void;
  router: AppRouterInstance;
  storage: StorageForCompletion;
  showToast: (msg: string) => void;
}

interface TrackMixerProps {
  settingsView: "main" | "son" | "about";
  setSettingsView: (v: "main" | "son" | "about") => void;
  isDownloaded: boolean;
  downloadStatus?: "idle" | "downloading" | "available" | "error";
  downloadProgressPercent?: number;
  handleToggleDownload: () => void;
  handleShare: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  setShowSettings: (v: boolean) => void;
  musicVal: number;
  ambienceVal: number;
  handleMusicSlider: (v: number) => void;
  handleAmbienceSlider: (v: number) => void;
  session: Session;
  catalogSession: CatalogSession | undefined;
  situation: { shortLabel: string; color?: string } | null;
}

interface ShareFallbackModalProps {
  session: Session;
  setShowShareFallback: (v: boolean) => void;
  showToast: (msg: string) => void;
}

export function PlayerControls({
  currentTime,
  remaining,
  session,
  liftForToast,
  showControls,
  showSettings,
  state,
  fromHome,
  handleToggleFavorite,
  isFavorite,
  handleRewind,
  handlePlayPause,
  handleForward,
  handleShare,
  formatTime
}: PlayerControlsProps) {
  return (
      <div 
        className={`w-full px-6 pb-[max(2.25rem,calc(env(safe-area-inset-bottom)+1.5rem))] shrink-0 transition-all duration-700 ease-out ${
          liftForToast ? "-translate-y-12 sm:-translate-y-8" : "translate-y-0"
        } ${
          showControls || showSettings || state !== "playing" ? "opacity-100" : "opacity-0 pointer-events-none"
        } ${fromHome ? "animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 fill-mode-both" : ""}`}
      >
        <div className="flex justify-between text-[12px] opacity-80 mb-2 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(remaining)}</span>
        </div>
        
        <ProgressBar progress={currentTime / session.metadata.durationSeconds} isPlayer />
        
        <div className="flex justify-center items-center gap-4 sm:gap-6 mt-8 mb-2 px-2">
          <button 
            onClick={handleToggleFavorite} 
            className="p-3 active:scale-90 transition-transform opacity-90 hover:opacity-100 shrink-0" 
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <HeartIcon size={26} filled={isFavorite} className={isFavorite ? "text-[#FDF9F0]" : "text-white/60"} />
          </button>

          <button 
            onClick={handleRewind} 
            className="p-3 active:scale-90 transition-transform opacity-90 hover:opacity-100 shrink-0" 
            aria-label="Reculer 15s"
          >
            <RewindIcon size={26} />
          </button>
          
          <button 
            onClick={handlePlayPause} 
            className="w-[66px] h-[66px] min-w-[66px] min-h-[66px] shrink-0 aspect-square rounded-full bg-creme text-encre flex items-center justify-center active:scale-95 transition-transform shadow-p2 cursor-pointer"
            aria-label={state === "playing" ? "Pause" : "Lecture"}
          >
            {state === "playing" ? <PauseIcon size={28} /> : <PlayIcon size={28} className="ml-1" />}
          </button>
          
          <button 
            onClick={handleForward} 
            className="p-3 active:scale-90 transition-transform opacity-90 hover:opacity-100 shrink-0" 
            aria-label="Avancer 15s"
          >
            <ForwardIcon size={26} />
          </button>

          {/* Bouton Partager rapide */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-3 active:scale-90 transition-transform opacity-90 hover:opacity-100 shrink-0"
            aria-label="Partager cette séance"
            title="Partager"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
              <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
        </div>
      </div>
  );
}

export function CompletionOverlay({
  session,
  situation,
  showFavPrompt,
  setShowFavPrompt,
  setIsFavorite,
  nextSession,
  handleShare,
  router,
  storage,
  showToast
}: CompletionOverlayProps) {
  return (
      
        <div className="absolute inset-0 z-50 bg-creme text-encre flex flex-col overflow-y-auto">
          {/* Header area */}
          <div className="flex flex-col items-center pt-[max(3rem,env(safe-area-inset-top))] pb-6 px-6">
            <span className="w-14 h-14 rounded-full bg-[#E8F2EC] flex items-center justify-center mb-4">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4E7259" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6.5 9.5 17 4 11.5"/>
              </svg>
            </span>
            <p className="font-poppins font-light text-[24px] leading-[1.1]">C&apos;est fini.</p>
            <p className="text-[12px] text-gris-2 mt-1">
              {Math.round(session.metadata.durationSeconds / 60)} min · {situation?.shortLabel}
            </p>
          </div>

          <div className="px-6 pb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col gap-4">
            {/* Fav prompt card — condition: not already fav, not refused, <2 today */}
            {showFavPrompt && (
              <div className="bg-white rounded-[18px] p-5 shadow-n1">
                <p className="font-poppins font-light text-[17px] leading-[1.3] mb-4">
                  Vous voulez la retrouver&nbsp;?
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-encre text-creme rounded-[12px] py-3 text-[14px] font-semibold active:scale-[0.97] transition-transform"
                    onClick={async () => {
                      setShowFavPrompt(false);
                      setIsFavorite(true); // Optimistic UI
                      const success = await storage.addFavorite(session.id, "fin_de_seance");
                      if (!success) {
                        setIsFavorite(false);
                        showToast("Erreur lors de la sauvegarde.");
                      }
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FDF9F0" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z"/>
                    </svg>
                    Ajouter aux favoris
                  </button>
                </div>
                <button
                  className="block w-full text-center text-[11.5px] text-gris-2 mt-3 active:opacity-60"
                  onClick={async () => {
                    await storage.addFavoriteRefusal(session.id);
                    setShowFavPrompt(false);
                  }}
                >
                  Non merci
                </button>
              </div>
            )}

            {/* Next session suggestion */}
            {nextSession && (
              <div>
                <p className="text-[11.5px] font-semibold mb-2">Ensuite</p>
                <div
                  className="flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => router.push(`/player?id=${nextSession.id}`)}
                >
                  <span
                    className="w-9 h-9 rounded-[10px] shrink-0"
                    style={{ background: nextSession.situationColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <b className="block text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                      {nextSession.title}
                    </b>
                    <i className="block not-italic text-[11px] text-gris-2">
                      {Math.round(nextSession.duration / 60)} min
                    </i>
                  </div>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="#433528" stroke="#433528" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 5.5v13l11-6.5Z"/>
                  </svg>
                </div>
              </div>
            )}

            {/* Partager en fin de séance */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2.5 bg-white border border-filet text-encre rounded-[14px] py-3 text-[13.5px] font-medium active:scale-[0.98] transition-transform shadow-sm cursor-pointer hover:bg-coquille"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Partager la séance avec un proche</span>
            </button>

            <button
              className="mt-2 text-[13px] font-medium text-gris-2 active:opacity-60 transition-opacity"
              onClick={() => router.push("/")}
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      );
}

export function TrackMixer({
  settingsView,
  setSettingsView,
  isDownloaded,
  downloadStatus,
  downloadProgressPercent = 0,
  handleToggleDownload,
  handleShare,
  isFullscreen,
  toggleFullscreen,
  setShowSettings,
  musicVal,
  ambienceVal,
  handleMusicSlider,
  handleAmbienceSlider,
  session,
  catalogSession,
  situation
}: TrackMixerProps) {
  return (
      
        <div 
          className="fixed inset-0 z-50 bg-black/20 flex items-end justify-center animate-in fade-in duration-200"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="w-full max-w-md bg-[#FDF9F0] text-[#433528] rounded-t-[30px] pt-3 pb-8 px-6 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pill drag handle */}
            <div className="flex justify-center pb-3 pt-1">
              <div className="w-[36px] h-[3.5px] bg-[#E2D5C4] rounded-full" />
            </div>

            {settingsView === "main" && (
              <div className="flex flex-col">
                {/* 1. Son */}
                <button
                  onClick={() => setSettingsView("son")}
                  className="w-full flex items-center gap-4 py-3.5 text-left active:opacity-70 transition-opacity cursor-pointer"
                >
                  <div className="w-7 flex items-center justify-start text-[#433528]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-poppins text-[17px] text-[#433528] font-normal leading-snug">Son</p>
                    <p className="text-[13px] text-[#8E8478] font-light leading-tight mt-0.5">Musique et ambiance</p>
                  </div>
                </button>

                <div className="h-[1px] bg-[#EDE4D6] w-full" />

                {/* 2. Téléchargée / Télécharger */}
                <button
                  onClick={handleToggleDownload}
                  className="w-full flex items-center gap-4 py-3.5 text-left active:opacity-70 transition-opacity cursor-pointer"
                >
                  <div className="w-7 flex items-center justify-start">
                    {downloadStatus === "downloading" ? (
                      <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#8E8478]/30 border-t-[#433528] animate-spin flex items-center justify-center" />
                    ) : downloadStatus === "available" || isDownloaded ? (
                      <div className="w-[22px] h-[22px] rounded-full border-[1.8px] border-[#5F6A52] flex items-center justify-center text-[#5F6A52]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : downloadStatus === "error" ? (
                      <div className="w-[22px] h-[22px] rounded-full border-[1.8px] border-red-500 flex items-center justify-center text-red-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-[22px] h-[22px] rounded-full border-[1.8px] border-[#8E8478] flex items-center justify-center text-[#433528]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M5 19h14" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-poppins text-[17px] text-[#433528] font-normal leading-snug">
                      {downloadStatus === "downloading"
                        ? `Téléchargement... ${downloadProgressPercent > 0 ? `${downloadProgressPercent}%` : ""}`
                        : downloadStatus === "available" || isDownloaded
                        ? "Téléchargée"
                        : downloadStatus === "error"
                        ? "Réessayer le téléchargement"
                        : "Télécharger"}
                    </p>
                    <p className="text-[13px] text-[#8E8478] font-light leading-tight mt-0.5">
                      {downloadStatus === "downloading"
                        ? "Toucher pour annuler"
                        : downloadStatus === "available" || isDownloaded
                        ? "Disponible hors ligne · Toucher pour retirer"
                        : downloadStatus === "error"
                        ? "Une erreur est survenue"
                        : "Disponible hors ligne"}
                    </p>
                    {downloadStatus === "downloading" && (
                      <div className="w-full bg-[#EDE4D6] h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="bg-[#5F6A52] h-full transition-all duration-200"
                          style={{ width: `${Math.max(5, downloadProgressPercent)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>

                <div className="h-[1px] bg-[#EDE4D6] w-full" />

                {/* 3. À propos de cette séance */}
                <button
                  onClick={() => setSettingsView("about")}
                  className="w-full flex items-center gap-4 py-3.5 text-left active:opacity-70 transition-opacity cursor-pointer"
                >
                  <div className="w-7 flex items-center justify-start text-[#433528]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="12" y1="12" x2="12" y2="16" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-poppins text-[17px] text-[#433528] font-normal leading-snug">
                      À propos de cette séance
                    </p>
                  </div>
                </button>

                <div className="h-[1px] bg-[#EDE4D6] w-full" />

                {/* 4. Partager */}
                <button
                  onClick={handleShare}
                  className="w-full flex items-center gap-4 py-3.5 text-left active:opacity-70 transition-opacity cursor-pointer"
                >
                  <div className="w-7 flex items-center justify-start text-[#433528]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-poppins text-[17px] text-[#433528] font-normal leading-snug">
                      Partager
                    </p>
                  </div>
                </button>

                <div className="h-[1px] bg-[#EDE4D6] w-full" />

                {/* 5. Plein écran */}
                <button
                  onClick={() => {
                    setShowSettings(false);
                    toggleFullscreen();
                  }}
                  className="w-full flex items-center gap-4 py-3.5 text-left active:opacity-70 transition-opacity cursor-pointer"
                >
                  <div className="w-7 flex items-center justify-start text-[#433528]">
                    {isFullscreen ? <MinimizeIcon size={22} /> : <MaximizeIcon size={22} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-poppins text-[17px] text-[#433528] font-normal leading-snug">
                      {isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                    </p>
                  </div>
                  <span className="text-[12px] text-[#7A6E5E] font-medium">
                    {isFullscreen ? "Activé" : "Désactivé"}
                  </span>
                </button>
              </div>
            )}

            {settingsView === "son" && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EDE4D6]">
                  <h3 className="font-poppins text-[22px] text-[#433528] font-normal">Son</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 text-[#8E8478] hover:text-[#433528] active:scale-95 transition-transform cursor-pointer"
                    aria-label="Fermer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Musique */}
                <div className="mt-4 mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-poppins text-[16px] text-[#433528] font-normal">Musique</span>
                    <span className="text-[14.5px] text-[#8E8478] font-light">
                      {musicVal === 0 ? "Éteinte" : `${musicVal} %`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={musicVal}
                    onChange={(e) => handleMusicSlider(parseInt(e.target.value, 10))}
                    className="slider-liela"
                    style={{
                      background: `linear-gradient(to right, #433528 ${musicVal}%, #F0E5D6 ${musicVal}%)`,
                    }}
                  />
                </div>

                {/* Ambiance */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-poppins text-[16px] text-[#433528] font-normal">Ambiance</span>
                    <span className="text-[14.5px] text-[#8E8478] font-light">
                      {ambienceVal === 0 ? "Éteinte" : `${ambienceVal} %`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={ambienceVal}
                    onChange={(e) => handleAmbienceSlider(parseInt(e.target.value, 10))}
                    className="slider-liela"
                    style={{
                      background: `linear-gradient(to right, #433528 ${ambienceVal}%, #F0E5D6 ${ambienceVal}%)`,
                    }}
                  />
                </div>

                {/* Footnote */}
                <p className="text-[12.5px] text-[#9A8F84] font-light">
                  Conservé pour vos prochaines séances.
                </p>
              </div>
            )}

            {settingsView === "about" && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EDE4D6]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSettingsView("main")}
                      className="p-1 -ml-1 text-[#8E8478] hover:text-[#433528] active:scale-95 transition-transform cursor-pointer"
                      aria-label="Retour"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <h3 className="font-poppins text-[20px] text-[#433528] font-normal">À propos</h3>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 text-[#8E8478] hover:text-[#433528] active:scale-95 transition-transform cursor-pointer"
                    aria-label="Fermer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-3 pt-1">
                  <div>
                    <h4 className="font-poppins text-[17px] font-medium text-[#433528]">
                      {session.metadata.title}
                    </h4>
                    <p className="text-[12.5px] text-[#8E8478] mt-0.5">
                      {Math.round(session.metadata.durationSeconds / 60)} min · {situation?.shortLabel || ""}
                    </p>
                  </div>

                  <p className="text-[13.5px] text-[#635548] leading-relaxed pt-1">
                    {catalogSession?.description || "Une séance de méditation guidée conçue avec soin pour vous accompagner vers le calme et la présence."}
                  </p>

                  <div className="bg-[#F5EDE1]/80 rounded-[14px] p-3.5 mt-3 text-[12.5px] text-[#635548] flex items-start gap-2.5">
                    <span className="text-[16px] shrink-0">🎧</span>
                    <p className="leading-snug">
                      Enregistrement binaural conçu pour une écoute immersive au casque ou aux écouteurs.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
}

export function ShareFallbackModal({
  session,
  setShowShareFallback,
  showToast
}: ShareFallbackModalProps) {
  return (
      
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowShareFallback(false)}
        >
          <div
            className="w-full max-w-sm bg-[#FDF9F0] text-encre rounded-t-[24px] sm:rounded-[24px] p-6 shadow-p2 animate-in slide-in-from-bottom duration-250 flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-filet">
              <b className="font-poppins text-[17px] font-normal text-encre">Partager la séance</b>
              <button
                onClick={() => setShowShareFallback(false)}
                className="text-gris-2 hover:text-encre text-[18px] p-1 cursor-pointer active:scale-90"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <p className="text-[12.5px] text-gris-2 leading-relaxed">
              Partagez <strong>{session.metadata.title}</strong> avec vos contacts via WhatsApp ou copiez le lien d&apos;accès direct.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Je te partage cette séance de méditation "${session.metadata.title}" sur Liela :\n${
                    typeof window !== "undefined" ? `${window.location.origin}/player?id=${session.id}` : ""
                  }`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareFallback(false)}
                className="flex items-center gap-3 p-3 rounded-[14px] bg-[#25D366]/15 text-[#128C7E] font-medium text-[13.5px] hover:bg-[#25D366]/25 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <WhatsAppIcon size={20} />
                <span>Partager sur WhatsApp</span>
              </a>

              {/* Copier le lien */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    const url = `${window.location.origin}/player?id=${session.id}`;
                    navigator.clipboard.writeText(url);
                    showToast("Lien copié dans le presse-papiers !");
                    setShowShareFallback(false);
                  }
                }}
                className="flex items-center gap-3 p-3 rounded-[14px] bg-coquille border border-filet text-encre font-medium text-[13.5px] hover:bg-[#EDE1D1] transition-colors cursor-pointer active:scale-[0.98]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copier le lien</span>
              </button>
            </div>
          </div>
        </div>
      );
}
