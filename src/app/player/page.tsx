"use client";

import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionById, Session } from "@/lib/sessions";
import { getSituation } from "@/config/situations";
import { AudioState, AudioTrackManager } from "@/lib/audio/AudioTrackManager";
import { storage, SessionHistoryItem, AudioPreferences } from "@/lib/storage";
import { PlayIcon, PauseIcon, RewindIcon, ForwardIcon, SoundMixerIcon, HeartIcon } from "@/components/ui/Icons";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BreathingVisualizer } from "@/components/ui/BreathingVisualizer";

function PlayerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");
  
  const [session] = useState<Session | null>(() => (sessionId ? getSessionById(sessionId) ?? null : null));
  const managerRef = useRef<AudioTrackManager | null>(null);
  
  const [state, setState] = useState<AudioState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showFavPrompt, setShowFavPrompt] = useState(false);
  const [nextSession, setNextSession] = useState<{ id: string; title: string; duration: number; situationColor: string } | null>(null);
  const sessionStartedAt = useRef<string>(new Date().toISOString());
  const [rmsData, setRmsData] = useState<number[] | null>(null);
  
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
      
      // Seek to saved position if resuming
      const inProgress = await storage.getInProgressSession();
      if (inProgress && inProgress.sessionId === session.id && inProgress.lastPosition > 0) {
        manager.seek(inProgress.lastPosition);
        setCurrentTime(inProgress.lastPosition);
      }
      
      const isFav = await storage.hasFavorite(session.id);
      setIsFavorite(isFav);
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
  const handleVoiceVolumeChange = (vol: number) => {
    const updated = { ...prefs, voiceVolume: vol };
    setPrefs(updated);
    storage.setAudioPreferences({ voiceVolume: vol });
    managerRef.current?.setVolume("voice", vol);
  };

  const handleMusicVolumeChange = (vol: number) => {
    const updated = { ...prefs, musicVolume: vol };
    setPrefs(updated);
    storage.setAudioPreferences({ musicVolume: vol });
    managerRef.current?.setVolume("music", vol);
  };

  const handleToggleMusic = () => {
    const val = !prefs.musicEnabled;
    const updated = { ...prefs, musicEnabled: val };
    setPrefs(updated);
    storage.setAudioPreferences({ musicEnabled: val });
    managerRef.current?.setTrackEnabled("music", val);
  };

  const handleAmbienceVolumeChange = (vol: number) => {
    const updated = { ...prefs, ambienceVolume: vol };
    setPrefs(updated);
    storage.setAudioPreferences({ ambienceVolume: vol });
    managerRef.current?.setVolume("ambience", vol);
  };

  const handleToggleAmbience = () => {
    const val = !prefs.ambienceEnabled;
    const updated = { ...prefs, ambienceEnabled: val };
    setPrefs(updated);
    storage.setAudioPreferences({ ambienceEnabled: val });
    managerRef.current?.setTrackEnabled("ambience", val);
  };

  return (
    <div 
      className="h-[100dvh] max-h-[100dvh] flex flex-col justify-between relative overflow-hidden select-none transition-colors duration-500"
      style={{ backgroundColor: bgColor, color: textColor }}
      onClick={resetControlsTimeout}
    >
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
            setShowSettings(true);
          }} 
          className="p-2 -mr-2 rounded-full active:scale-95 transition-transform cursor-pointer" 
          aria-label="Réglages sonores"
        >
          <SoundMixerIcon size={22} />
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
        
        <div className="flex justify-center items-center gap-6 mt-8 mb-2 px-2">
          <button 
            onClick={handleToggleFavorite} 
            className="p-3 active:scale-90 transition-transform opacity-90 hover:opacity-100" 
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <HeartIcon size={26} filled={isFavorite} className={isFavorite ? "text-[#FDF9F0]" : "text-white/60"} />
          </button>

          <button 
            onClick={handleRewind} 
            className="p-3 active:scale-90 transition-transform opacity-90 hover:opacity-100" 
            aria-label="Reculer 15s"
          >
            <RewindIcon size={26} />
          </button>
          
          <button 
            onClick={handlePlayPause} 
            className="w-[66px] h-[66px] rounded-full bg-creme text-encre flex items-center justify-center active:scale-95 transition-transform shadow-p2 cursor-pointer mx-2"
            aria-label={state === "playing" ? "Pause" : "Lecture"}
          >
            {state === "playing" ? <PauseIcon size={28} /> : <PlayIcon size={28} className="ml-1" />}
          </button>
          
          <button 
            onClick={handleForward} 
            className="p-3 active:scale-90 transition-transform opacity-90 hover:opacity-100" 
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
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="w-full max-w-md bg-creme text-encre rounded-t-lg p-6 pb-8 shadow-p2 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 border-b border-filet pb-3">
              <h3 className="font-poppins font-medium text-[17px]">Réglages sonores</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 text-gris-2 hover:text-encre text-[20px] leading-none cursor-pointer"
                aria-label="Fermer les réglages"
              >
                ✕
              </button>
            </div>

            {/* Voice volume */}
            <div className="mb-5">
              <div className="flex justify-between text-[14px] font-medium mb-1.5">
                <span>Voix</span>
                <span className="text-gris-2 text-[12px]">{Math.round(prefs.voiceVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={prefs.voiceVolume}
                onChange={(e) => handleVoiceVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-encre"
              />
            </div>

            {/* Music */}
            <div className="mb-5 border-t border-filet pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-medium">Musique</span>
                <button 
                  onClick={handleToggleMusic}
                  className={`w-10 h-5 rounded-full relative transition-colors ${prefs.musicEnabled ? "bg-sauge-p" : "bg-bord"}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${prefs.musicEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {prefs.musicEnabled && (
                <div className="mt-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={prefs.musicVolume}
                    onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-encre"
                  />
                </div>
              )}
            </div>

            {/* Ambience */}
            <div className="border-t border-filet pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-medium">Ambiance sonore</span>
                <button 
                  onClick={handleToggleAmbience}
                  className={`w-10 h-5 rounded-full relative transition-colors ${prefs.ambienceEnabled ? "bg-sauge-p" : "bg-bord"}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${prefs.ambienceEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {prefs.ambienceEnabled && (
                <div className="mt-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={prefs.ambienceVolume}
                    onChange={(e) => handleAmbienceVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-encre"
                  />
                </div>
              )}
            </div>
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
