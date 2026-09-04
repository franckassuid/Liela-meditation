"use client";

import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionById, Session } from "@/lib/sessions";
import { getSituation } from "@/config/situations";
import { AudioState, AudioTrackManager } from "@/lib/audio/AudioTrackManager";
import { storage, SessionHistoryItem, AudioPreferences } from "@/lib/storage";
import { PlayIcon, PauseIcon, RewindIcon, ForwardIcon, SoundMixerIcon } from "@/components/ui/Icons";
import { ProgressBar } from "@/components/ui/ProgressBar";

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
  
  const [prefs, setPrefs] = useState<AudioPreferences>(() => storage.getAudioPreferences());

  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const saveProgressInterval = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Initialize
  useEffect(() => {
    if (!session) {
      router.push("/");
      return;
    }

    const savedPrefs = storage.getAudioPreferences();
    const manager = new AudioTrackManager(session, savedPrefs);
    managerRef.current = manager;

    manager.setCallbacks(
      (s) => setState(s),
      (t) => setCurrentTime(t)
    );

    manager.load().then(() => {
      // Seek to saved position if resuming
      const inProgress = storage.getInProgressSession();
      if (inProgress && inProgress.sessionId === session.id && inProgress.lastPosition > 0) {
        manager.seek(inProgress.lastPosition);
        setCurrentTime(inProgress.lastPosition);
      }
    });

    return () => {
      manager.cleanup();
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (saveProgressInterval.current) clearInterval(saveProgressInterval.current);
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
    const situationSlugMap: Record<string, string> = {
      stress: "calmer-le-stress",
      sleep: "trouver-le-sommeil",
      thoughts: "calmer-les-pensees",
      focus: "retrouver-sa-concentration",
      tensions: "relacher-les-tensions",
      recenter: "se-recentrer",
    };
    const slug = situation?.id ? situationSlugMap[situation.id] : "calmer-le-stress";
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

  // Handle saving progress periodically
  useEffect(() => {
    if (state === "playing" && session) {
      saveProgressInterval.current = setInterval(() => {
        const item: SessionHistoryItem = {
          sessionId: session.id,
          startedAt: new Date().toISOString(),
          lastPosition: currentTime,
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
  }, [state, currentTime, session]);

  // Handle end of session
  useEffect(() => {
    if (state === "ended" && session) {
      const item: SessionHistoryItem = {
        sessionId: session.id,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        lastPosition: session.metadata.durationSeconds,
        duration: session.metadata.durationSeconds,
        completed: true,
      };
      storage.addHistoryItem(item);
      storage.setInProgressSession(null);
      router.push("/history");
    }
  }, [state, session, router]);

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
  const isSleep = situation?.id === "sleep";
  
  const bgColor = isSleep ? "var(--sommeil-fond)" : (situation?.color || "var(--encre)");
  const textColor = isSleep ? "var(--sommeil-texte)" : (situation?.textColor || "var(--creme)");

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
        <div 
          className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full border border-[rgba(253,249,240,0.32)] flex items-center justify-center transition-transform duration-[3500ms] ease-in-out"
          style={{ transform: state === "playing" ? "scale(1.06)" : "scale(1)" }}
        >
          <div className="w-[110px] h-[110px] sm:w-[140px] sm:h-[140px] rounded-full bg-[rgba(253,249,240,0.18)]" />
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
        
        <div className="flex justify-center items-center gap-10 mt-8 mb-2">
          <button 
            onClick={handleRewind} 
            className="p-3 active:scale-90 transition-transform opacity-90 hover:opacity-100" 
            aria-label="Reculer 15s"
          >
            <RewindIcon size={26} />
          </button>
          
          <button 
            onClick={handlePlayPause} 
            className="w-[66px] h-[66px] rounded-full bg-creme text-encre flex items-center justify-center active:scale-95 transition-transform shadow-p2 cursor-pointer"
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
        </div>
      </div>

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
