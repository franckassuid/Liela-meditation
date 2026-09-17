import { resolveSessionAsset, Session } from "../sessions";

export type AudioState = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

const MAX_SECONDARY_TRACK_VOLUME = 0.15;

export class AudioTrackManager {
  private voice: HTMLAudioElement | null = null;
  private music: HTMLAudioElement | null = null;
  private ambience: HTMLAudioElement | null = null;
  private cues: HTMLAudioElement | null = null;
  private fallback: HTMLAudioElement | null = null;

  private tracks: HTMLAudioElement[] = [];
  private isUsingFallback: boolean = false;

  // Track which secondary tracks are enabled by the user (distinct from whether they loaded)
  private musicEnabled: boolean;
  private ambienceEnabled: boolean;

  public state: AudioState = "idle";
  private duration: number = 0;

  private onStateChange: (state: AudioState) => void = () => {};
  private onTimeUpdate: (currentTime: number, duration: number) => void = () => {};

  constructor(
    private session: Session,
    private preferences: { musicEnabled: boolean; ambienceEnabled: boolean; voiceVolume: number; musicVolume: number; ambienceVolume: number }
  ) {
    this.duration = session.metadata.durationSeconds;
    this.musicEnabled = preferences.musicEnabled;
    this.ambienceEnabled = preferences.ambienceEnabled;
  }

  public setCallbacks(
    onStateChange: (state: AudioState) => void,
    onTimeUpdate: (currentTime: number, duration: number) => void
  ) {
    this.onStateChange = onStateChange;
    this.onTimeUpdate = onTimeUpdate;
  }

  private setState(newState: AudioState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  private get masterTrack(): HTMLAudioElement | null {
    return this.fallback || this.voice;
  }

  public async load() {
    this.setState("loading");

    const { audio, mix } = this.session;

    try {
      // 1. Primary Voice Track (Master Timeline)
      if (audio.voice) {
        this.voice = new Audio(resolveSessionAsset(this.session.id, audio.voice));
        this.voice.preload = "auto";
        this.voice.volume = Math.max(0, Math.min(1, this.preferences.voiceVolume));
        this.tracks.push(this.voice);

        this.setupMasterListeners(this.voice);

        // Fallback handler if voice fails to load or decode
        this.voice.addEventListener("error", () => {
          console.warn("Voice track failed to load, attempting fallback to final audio");
          this.activateFallback();
        });
      } else if (audio.final) {
        // Direct fallback if no voice specified
        this.activateFallback();
      }

      // 2. Music Track (Secondary) — only load if enabled
      if (audio.music?.file && this.musicEnabled) {
        try {
          this.music = new Audio(resolveSessionAsset(this.session.id, audio.music.file));
          this.music.preload = "auto";
          this.music.volume = Math.max(0, Math.min(1, this.preferences.musicVolume * MAX_SECONDARY_TRACK_VOLUME));
          this.music.loop = true;
          this.tracks.push(this.music);

          this.music.addEventListener("error", (e) => {
            console.warn("Music track error, continuing session without music:", e);
            this.tracks = this.tracks.filter(t => t !== this.music);
            this.music = null;
          });
        } catch (e) {
          console.warn("Could not initialize music track:", e);
        }
      }

      // 3. Ambience Track (Secondary) — only load if enabled
      if (audio.ambience?.file && this.ambienceEnabled) {
        try {
          this.ambience = new Audio(resolveSessionAsset(this.session.id, audio.ambience.file));
          this.ambience.preload = "auto";
          this.ambience.volume = Math.max(0, Math.min(1, this.preferences.ambienceVolume * MAX_SECONDARY_TRACK_VOLUME));
          this.ambience.loop = true;
          this.tracks.push(this.ambience);

          this.ambience.addEventListener("error", (e) => {
            console.warn("Ambience track error, continuing session without ambience:", e);
            this.tracks = this.tracks.filter(t => t !== this.ambience);
            this.ambience = null;
          });
        } catch (e) {
          console.warn("Could not initialize ambience track:", e);
        }
      }

      // 4. Cues Track (Secondary)
      if (audio.cues?.file) {
        try {
          this.cues = new Audio(resolveSessionAsset(this.session.id, audio.cues.file));
          this.cues.preload = "auto";
          this.cues.volume = Math.max(0, Math.min(1, mix?.cuesDefaultVolume ?? audio.cues.defaultVolume ?? 1));
          this.tracks.push(this.cues);

          this.cues.addEventListener("error", (e) => {
            console.warn("Cues track error, continuing session without cues:", e);
            this.tracks = this.tracks.filter(t => t !== this.cues);
            this.cues = null;
          });
        } catch (e) {
          console.warn("Could not initialize cues track:", e);
        }
      }

      this.setState("idle");
    } catch (e) {
      console.error("Error loading session tracks:", e);
      if (!this.isUsingFallback && this.session.audio.final) {
        this.activateFallback();
      } else {
        this.setState("error");
      }
    }
  }

  private setupMasterListeners(track: HTMLAudioElement) {
    track.addEventListener("ended", () => {
      // Session ends ONLY when the master track reaches the end
      if (track.currentTime >= this.duration - 2) {
        this.pause();
        this.setState("ended");
      }
    });

    track.addEventListener("timeupdate", () => {
      if (this.state === "playing") {
        this.onTimeUpdate(track.currentTime, this.duration);
      }
    });
  }

  private activateFallback() {
    if (this.isUsingFallback || !this.session.audio.final) {
      this.setState("error");
      return;
    }

    // FIX A1: Capture wasPlaying BEFORE pause() changes the state
    const wasPlaying = this.state === "playing";
    const savedTime = this.masterTrack?.currentTime ?? 0;

    this.isUsingFallback = true;
    console.log("Activating pre-mixed fallback:", this.session.audio.final);

    // Pause any existing tracks (state becomes "paused" here)
    this.pause();

    try {
      this.fallback = new Audio(resolveSessionAsset(this.session.id, this.session.audio.final));
      this.fallback.preload = "auto";
      this.fallback.volume = Math.max(0, Math.min(1, this.preferences.voiceVolume));
      this.tracks = [this.fallback];
      this.setupMasterListeners(this.fallback);

      this.fallback.addEventListener("error", (e) => {
        console.error("Fallback track also failed:", e);
        this.setState("error");
      });

      // FIX A1: Resume playback if we were playing, using saved position
      if (wasPlaying) {
        // Restore position once canplay fires
        const onCanPlay = () => {
          this.fallback?.removeEventListener("canplay", onCanPlay);
          if (this.fallback && savedTime > 0) {
            this.fallback.currentTime = savedTime;
          }
          this.fallback?.play().catch(() => this.setState("error"));
          this.setState("playing");
        };
        this.fallback.addEventListener("canplay", onCanPlay);
        // Also set state to playing now so the UI reacts
        this.setState("playing");
      } else {
        this.setState("idle");
      }
    } catch (err) {
      console.error("Failed to initialize fallback audio:", err);
      this.setState("error");
    }
  }

  public play() {
    this.setState("playing");

    const master = this.masterTrack;
    const time = master ? master.currentTime : 0;

    // In fallback mode, only fallback track plays (it's already the complete mix)
    if (this.isUsingFallback && this.fallback) {
      this.fallback.play().catch(e => {
        console.error("Fallback play failed:", e);
        this.setState("error");
      });
      return;
    }

    // FIX A2: Normal multi-track mode — only play enabled secondary tracks
    this.tracks.forEach(t => {
      try {
        // Skip music/ambience tracks if they have been disabled by the user
        if (t === this.music && !this.musicEnabled) return;
        if (t === this.ambience && !this.ambienceEnabled) return;

        if (Math.abs(t.currentTime - time) > 0.5 && t.readyState >= 1) {
          t.currentTime = time;
        }
        const p = t.play();
        if (p !== undefined) {
          p.catch(e => {
            // If voice fails, attempt fallback
            if (t === this.voice) {
              console.warn("Voice playback failed, trying fallback:", e);
              this.activateFallback();
            } else {
              console.warn("Secondary track play warning:", e);
            }
          });
        }
      } catch (err) {
        console.warn("Play error on track:", err);
      }
    });
  }

  public pause() {
    this.setState("paused");
    this.tracks.forEach(t => {
      try {
        t.pause();
      } catch (err) {
        console.warn("Pause error:", err);
      }
    });
  }

  public seek(time: number) {
    const clamped = Math.max(0, Math.min(this.duration - 1, time));
    const wasPlaying = this.state === "playing";

    this.tracks.forEach(t => {
      try {
        t.currentTime = clamped;
        if (wasPlaying) {
          // FIX A2: only resume tracks that are enabled
          if (t === this.music && !this.musicEnabled) return;
          if (t === this.ambience && !this.ambienceEnabled) return;
          t.play().catch(() => {});
        }
      } catch (e) {
        console.warn("Seek error on track:", e);
      }
    });

    this.onTimeUpdate(clamped, this.duration);
  }

  public setVolume(type: "voice" | "music" | "ambience", volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    if (type === "voice") {
      if (this.voice) this.voice.volume = clamped;
      if (this.fallback) this.fallback.volume = clamped;
    } else if (type === "music" && this.music) {
      this.music.volume = clamped * MAX_SECONDARY_TRACK_VOLUME;
    } else if (type === "ambience" && this.ambience) {
      this.ambience.volume = clamped * MAX_SECONDARY_TRACK_VOLUME;
    }
  }

  public setTrackEnabled(type: "music" | "ambience", enabled: boolean) {
    // FIX A2: Persist the enabled state so play() respects it on future resumes
    if (type === "music") {
      this.musicEnabled = enabled;
      if (this.music) {
        if (!enabled) {
          this.music.pause();
        } else if (this.state === "playing") {
          this.music.play().catch(console.error);
        }
      }
    } else if (type === "ambience") {
      this.ambienceEnabled = enabled;
      if (this.ambience) {
        if (!enabled) {
          this.ambience.pause();
        } else if (this.state === "playing") {
          this.ambience.play().catch(console.error);
        }
      }
    }
  }

  public getCurrentTime(): number {
    const master = this.masterTrack;
    return master ? master.currentTime : 0;
  }

  public cleanup() {
    // NOTE: Callers must capture getCurrentTime() BEFORE calling cleanup()
    this.onStateChange = () => {};
    this.onTimeUpdate = () => {};
    this.pause();
    this.tracks.forEach(t => {
      t.removeAttribute("src");
      t.load();
    });
    this.tracks = [];
    this.voice = null;
    this.music = null;
    this.ambience = null;
    this.cues = null;
    this.fallback = null;
    this.isUsingFallback = false;
  }
}
