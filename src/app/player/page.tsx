"use client";

import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionById, Session } from "@/lib/sessions";
import { getCatalogSessionById } from "@/config/sessionsCatalog";
import { getSituation } from "@/config/situations";
import { AudioState, AudioTrackManager } from "@/lib/audio/AudioTrackManager";
import { storage, SessionHistoryItem, AudioPreferences } from "@/lib/storage";
import { PlayIcon, PauseIcon, RewindIcon, ForwardIcon, HeartIcon } from "@/components/ui/Icons";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BreathingVisualizer } from "@/components/ui/BreathingVisualizer";

function PlayerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");
  
  const [session] = useState<Session | null>(() => (sessionId ? getSessionById(sessionId) ?? null : null));
  const catalogSession = sessionId ? getCatalogSessionById(sessionId) : undefined;
  const managerRef = useRef<AudioTrackManager | null>(null);
  
  const [state, setState] = useState<AudioState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<"main" | "son" | "about">("main");
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showFavPrompt, setShowFavPrompt] = useState(false);
  const [nextSession, setNextSession] = useState<{ id: string; title: string; duration: number; situationColor: string } | null>(null);
  const sessionStartedAt = useRef<string>(new Date().toISOString());
  const [rmsData, setRmsData] = useState<number[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [prefs, setPrefs] = useState<AudioPreferences>({
    voiceVolume: 1,
    musicVolume: 0.75,
    ambienceVolume: 0.50,
    musicEnabled: true,
    ambienceEnabled: true,
  });

  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const saveProgressInterval = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Initialize
  useEffect(() => {
    if (!session) {
      router.push("/");
      return;
    }

    const init = async () => {
      // Fetch RMS data for the visualization
      try {
        const res = await fetch(`/sessions/${session.id}/audio/rms.json`);
        if (res.ok) {
          const data = await res.json();
          setRmsData(data);
        }
      } catch (e) {
        console.warn("Failed to load RMS data", e);
      }

      const savedPrefs = await storage.getAudioPreferences();
      setPrefs(savedPrefs);
      
      const manager = new AudioTrackManager(session, savedPrefs);
      managerRef.current = manager;

      manager.setCallbacks(
        (s) => setState(s),
        (t) => setCurrentTime(t)
      );

      await manager.load();
      
      // Seek to saved position if resuming setting is enabled
      const userSettings = await storage.getSettings();
      if (userSettings.resumePlayback) {
        const inProgress = await storage.getInProgressSession();
        if (inProgress && inProgress.sessionId === session.id && inProgress.lastPosition > 0) {
          manager.seek(inProgress.lastPosition);
          setCurrentTime(inProgress.lastPosition);
        }
      }
      
      const isFav = await storage.hasFavorite(session.id);
      setIsFavorite(isFav);

      const downloaded = await storage.isSessionDownloaded(session.id);
      setIsDownloaded(downloaded);
    };

    init();

    return () => {
      managerRef.current?.cleanup();
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (saveProgressInterval.current) clearInterval(saveProgressInterval.current);
      
      // Save stats on close if it didn't naturally end
      if (managerRef.current && session) {
        const time = managerRef.current.getCurrentTime();
        const dur = session.metadata.durationSeconds;
        if (time > 0 && time < dur - 1) { // If playing stopped in the middle
          const completed = time >= dur * 0.8;
          const abandoned = time < 90;
          const item: SessionHistoryItem = {
            sessionId: session.id,
            startedAt: new Date().toISOString(), // roughly
            lastPosition: time,
            duration: dur,
            completed,
            abandoned,
          };
          storage.addHistoryItem(item);
          storage.setInProgressSession(completed ? null : item);
        }
      }
    };
  }, [session, router]);

  // Screen Wake Lock: prevents device from sleeping while session is playing
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator && document.visibilityState === "visible") {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        console.warn("WakeLock request failed", err);
      }
    }

    function releaseWakeLock() {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }

    if (state === "playing") {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && state === "playing") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [state]);

  // Default Sleep Timer from settings
  useEffect(() => {
    if (state !== "playing") return;

    let timer: NodeJS.Timeout | null = null;
    const checkSleepTimer = async () => {
      const s = await storage.getSettings();
      if (s.defaultSleepTimer && s.defaultSleepTimer !== "Jamais") {
        let mins = 30;
        if (s.defaultSleepTimer === "15 min") mins = 15;
        else if (s.defaultSleepTimer === "30 min") mins = 30;
        else if (s.defaultSleepTimer === "45 min") mins = 45;
        else if (s.defaultSleepTimer === "1 heure") mins = 60;

        timer = setTimeout(() => {
          managerRef.current?.pause();
        }, mins * 60 * 1000);
      }
    };
    checkSleepTimer();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state]);

  // Media Session API: allows audio to keep playing and stay controllable when screen is locked
  useEffect(() => {
    if (!session || !("mediaSession" in navigator)) return;

    const situation = getSituation(session.metadata.situation);
    const slug = situation?.slug || "calmer-le-stress";
    const artistName = situation ? `Liela · ${situation.shortLabel}` : "Liela";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: session.metadata.title,
      artist: artistName,
      album: "Liela",
      artwork: [
        { src: `/artwork-${slug}.png`, sizes: "1024x1024", type: "image/png" },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      managerRef.current?.play();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      managerRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      setCurrentTime((prev) => {
        const offset = details.seekOffset || 15;
        const target = Math.max(0, prev - offset);
        managerRef.current?.seek(target);
        return target;
      });
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      setCurrentTime((prev) => {
        const offset = details.seekOffset || 15;
        const target = Math.min(session.metadata.durationSeconds - 1, prev + offset);
        managerRef.current?.seek(target);
        return target;
      });
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) {
        const target = Math.max(0, Math.min(session.metadata.durationSeconds - 1, details.seekTime));
        setCurrentTime(target);
        managerRef.current?.seek(target);
      }
    });

    // Explicitly disable previous and next track since it's a meditation app
    try {
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    } catch (e) {
      // Ignored if browser doesn't support setting to null
    }

    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
        navigator.mediaSession.setActionHandler("seekto", null);
        try {
          navigator.mediaSession.setActionHandler("previoustrack", null);
          navigator.mediaSession.setActionHandler("nexttrack", null);
        } catch (e) {}
      }
    };
  }, [session]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !session) return;
    navigator.mediaSession.playbackState = state === "playing" ? "playing" : "paused";
    
    // Update position state for progress bar / scrubber
    if ("setPositionState" in navigator.mediaSession && !isNaN(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: session.metadata.durationSeconds,
          playbackRate: 1.0,
          position: currentTime
        });
      } catch (e) {
        console.warn("Failed to set position state", e);
      }
    }
  }, [state, currentTime, session]);

  // Keep a ref of current time for the interval
  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Handle saving progress periodically
  useEffect(() => {
    if (state === "playing" && session) {
      saveProgressInterval.current = setInterval(() => {
        const item: SessionHistoryItem = {
          sessionId: session.id,
          startedAt: new Date().toISOString(),
          lastPosition: currentTimeRef.current,
          duration: session.metadata.durationSeconds,
          completed: false,
        };
        storage.setInProgressSession(item);
      }, 5000);
    } else {
      if (saveProgressInterval.current) clearInterval(saveProgressInterval.current);
    }
    return () => {
      if (saveProgressInterval.current) clearInterval(saveProgressInterval.current);
    };
  }, [state, session]);

  // Handle end of session
  useEffect(() => {
    if (state === "ended" && session) {
      const item: SessionHistoryItem = {
        sessionId: session.id,
        startedAt: sessionStartedAt.current,
        completedAt: new Date().toISOString(),
        lastPosition: session.metadata.durationSeconds,
        duration: session.metadata.durationSeconds,
        completed: true,
        abandoned: false,
      };
      storage.addHistoryItem(item).then(async () => {
        await storage.setInProgressSession(null);
        // Check conditions for showing the fav prompt (spec 3.1)
        const alreadyFav = await storage.hasFavorite(session.id);
        const alreadyRefused = await storage.hasRefusedFavorite(session.id);
        const dailyPrompts = await storage.getDailyFavoritePrompts();
        const shouldPrompt = !alreadyFav && !alreadyRefused && dailyPrompts < 2;
        if (shouldPrompt) {
          await storage.incrementDailyFavoritePrompts();
        }
        setShowFavPrompt(shouldPrompt);
        setIsFavorite(alreadyFav);
        // Find a next session suggestion (same situation, different session)
        const SESSIONS_CATALOG = (await import("@/config/sessionsCatalog")).SESSIONS_CATALOG;
        const others = SESSIONS_CATALOG.filter(s => s.situationId === session.metadata.situation && s.id !== session.id && s.isAvailable);
        if (others.length > 0) {
          const pick = others[Math.floor(Math.random() * others.length)];
          const sit = getSituation(pick.situationId);
          setNextSession({ id: pick.realSessionId || pick.id, title: pick.title, duration: pick.durationSeconds, situationColor: sit?.color || "var(--encre)" });
        }
        setShowCompletion(true);
      });
    }
  }, [state, session]);

  // Handle interaction timeout
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (state === "playing" && !showSettings) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [state, showSettings]);

  useEffect(() => {
    if (state === "playing" && !showSettings) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [state, showSettings]);

  if (!session) return <div className="min-h-screen bg-creme" />;

  const situation = getSituation(session.metadata.situation);
  const isDark = situation?.id === "trouver-le-sommeil";
  
  const bgColor = isDark ? "var(--sommeil-fond)" : (situation?.color || "var(--encre)");
  const textColor = isDark ? "var(--sommeil-texte)" : (situation?.textColor || "var(--creme)");

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const remaining = Math.max(0, session.metadata.durationSeconds - currentTime);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (state === "playing") {
      managerRef.current?.pause();
    } else {
      managerRef.current?.play();
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (!session) return;
    if (isFavorite) {
      await storage.removeFavorite(session.id);
      setIsFavorite(false);
    } else {
      await storage.addFavorite(session.id, "player");
      setIsFavorite(true);
    }
  };

  const handleRewind = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    const newTime = Math.max(0, currentTime - 15);
    setCurrentTime(newTime);
    managerRef.current?.seek(newTime);
  };

  const handleForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    const newTime = Math.min(session.metadata.durationSeconds - 1, currentTime + 15);
    setCurrentTime(newTime);
    managerRef.current?.seek(newTime);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push("/");
  };

  // Settings handlers
  const handleMusicSlider = (val: number) => {
    if (val <= 0) {
      setPrefs((prev) => ({ ...prev, musicEnabled: false, musicVolume: 0 }));
      storage.setAudioPreferences({ musicEnabled: false, musicVolume: 0 });
      managerRef.current?.setTrackEnabled("music", false);
    } else {
      const ratio = Math.min(1, val / 100);
      setPrefs((prev) => ({ ...prev, musicEnabled: true, musicVolume: ratio }));
      storage.setAudioPreferences({ musicEnabled: true, musicVolume: ratio });
      managerRef.current?.setTrackEnabled("music", true);
      managerRef.current?.setVolume("music", ratio);
    }
  };

  const handleAmbienceSlider = (val: number) => {
    if (val <= 0) {
      setPrefs((prev) => ({ ...prev, ambienceEnabled: false, ambienceVolume: 0 }));
      storage.setAudioPreferences({ ambienceEnabled: false, ambienceVolume: 0 });
      managerRef.current?.setTrackEnabled("ambience", false);
    } else {
      const ratio = Math.min(1, val / 100);
      setPrefs((prev) => ({ ...prev, ambienceEnabled: true, ambienceVolume: ratio }));
      storage.setAudioPreferences({ ambienceEnabled: true, ambienceVolume: ratio });
      managerRef.current?.setTrackEnabled("ambience", true);
      managerRef.current?.setVolume("ambience", ratio);
    }
  };

  const handleToggleDownload = async () => {
    if (!session) return;
    if (isDownloaded) {
      await storage.removeDownload(session.id);
      setIsDownloaded(false);
      showToast("Séance retirée des téléchargements");
    } else {
      const sizeMo = Math.max(5, Math.round((session.metadata.durationSeconds / 60) * 2.4));
      await storage.addDownload({
        sessionId: session.id,
        title: session.metadata.title,
        duration: session.metadata.durationSeconds,
        sizeMo,
        isFavorite,
      });
      setIsDownloaded(true);
      showToast("Disponible hors ligne");
    }
  };

  const handleShare = () => {
    // Option de partage (ne fait rien pour l'instant comme demandé)
  };

  const musicVal = prefs.musicEnabled ? Math.round(prefs.musicVolume * 100) : 0;
  const ambienceVal = prefs.ambienceEnabled ? Math.round(prefs.ambienceVolume * 100) : 0;

  return (
    <div 
      className="h-[100dvh] max-h-[100dvh] flex flex-col justify-between relative overflow-hidden select-none transition-colors duration-500"
      style={{ backgroundColor: bgColor, color: textColor }}
      onClick={resetControlsTimeout}
    >
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#433528]/95 backdrop-blur-md text-[#FDF9F0] text-[13px] font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Top bar */}
      <div 
        className={`h-14 px-5 flex justify-between items-center z-10 w-full shrink-0 transition-opacity duration-700 ${
          showControls || showSettings || state !== "playing" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button 
          onClick={handleClose} 
          className="p-2 -ml-2 rounded-full active:scale-95 transition-transform" 
          aria-label="Fermer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <span className="font-poppins font-light text-[15px] opacity-90">{situation?.shortLabel}</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSettingsView("main");
            setShowSettings(true);
          }} 
          className="p-2 -mr-2 rounded-full active:scale-95 transition-transform cursor-pointer" 
          aria-label="Options et réglages"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* Central visualizer and title: Perfectly centered */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 my-auto">
        <div className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] relative flex items-center justify-center">
          <BreathingVisualizer 
            rmsData={rmsData}
            getCurrentTime={() => managerRef.current?.getCurrentTime() || 0}
          />
        </div>

        <h2 className="font-poppins font-light text-[20px] sm:text-[24px] leading-[1.25] mt-5 text-center max-w-[280px] sm:max-w-[340px]">
          {session.metadata.title}
        </h2>
      </div>

      {/* Bottom controls */}
      <div 
        className={`w-full px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] shrink-0 transition-opacity duration-700 ${
          showControls || showSettings || state !== "playing" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
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

          <div className="w-[50px] shrink-0" /> {/* Spacer to balance the heart button */}
        </div>
      </div>

      {/* === COMPLETION SCREEN === */}
      {showCompletion && (
        <div className="absolute inset-0 z-50 bg-creme text-encre flex flex-col overflow-y-auto">
          {/* Header area */}
          <div className="flex flex-col items-center pt-[max(3rem,env(safe-area-inset-top))] pb-6 px-6">
            <span className="w-14 h-14 rounded-full bg-[#E8F2EC] flex items-center justify-center mb-4">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4E7259" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6.5 9.5 17 4 11.5"/>
              </svg>
            </span>
            <p className="font-poppins font-light text-[24px] leading-[1.1]">C'est fini.</p>
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
                      await storage.addFavorite(session.id, "fin_de_seance");
                      setIsFavorite(true);
                      setShowFavPrompt(false);
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

            <button
              className="mt-2 text-[13px] font-medium text-gris-2 active:opacity-60 transition-opacity"
              onClick={() => router.push("/")}
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal Drawer */}
      {showSettings && (
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
                    {isDownloaded ? (
                      <div className="w-[22px] h-[22px] rounded-full border-[1.8px] border-[#5F6A52] flex items-center justify-center text-[#5F6A52]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
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
                      {isDownloaded ? "Téléchargée" : "Télécharger"}
                    </p>
                    <p className="text-[13px] text-[#8E8478] font-light leading-tight mt-0.5">Disponible hors ligne</p>
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
      )}
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-creme" />}>
      <PlayerContent />
    </Suspense>
  );
}
