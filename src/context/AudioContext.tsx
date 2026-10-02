import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { audioSupported, ChiptuneEngine } from '../utils/chiptune';

// Audio preferences + the chiptune engine. Named AudioSettingsContext internally so it never
// shadows the browser's own window.AudioContext.

const STORAGE_KEY = 'chorequest.audio.v1';

interface AudioSettings {
  isMuted: boolean;
  bgmEnabled: boolean;
  bgmVolume: number;
  sfxVolume: number;
}

// Sound starts off: players opt in with the speaker button, which also satisfies autoplay rules.
const DEFAULTS: AudioSettings = { isMuted: true, bgmEnabled: true, bgmVolume: 0.3, sfxVolume: 0.5 };

const clamp01 = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

function readSettings(): AudioSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<AudioSettings> | null;
    if (!raw || typeof raw !== 'object') return DEFAULTS;
    return {
      isMuted: typeof raw.isMuted === 'boolean' ? raw.isMuted : DEFAULTS.isMuted,
      bgmEnabled: typeof raw.bgmEnabled === 'boolean' ? raw.bgmEnabled : DEFAULTS.bgmEnabled,
      bgmVolume: clamp01(raw.bgmVolume, DEFAULTS.bgmVolume),
      sfxVolume: clamp01(raw.sfxVolume, DEFAULTS.sfxVolume),
    };
  } catch {
    return DEFAULTS;
  }
}

interface AudioContextValue extends AudioSettings {
  audioSupported: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setBgmEnabled: (enabled: boolean) => void;
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  playTaskCompleteSFX: (delaySeconds?: number) => void;
  playLevelUpSFX: (delaySeconds?: number) => void;
  playMasterySFX: (delaySeconds?: number) => void;
  playClickSFX: () => void;
  playWheelTickSFX: () => void;
  playWheelWinSFX: (tier: 0 | 1 | 2) => void;
  playWheelMissSFX: () => void;
  playJackpotSFX: () => void;
}

const AudioSettingsContext = createContext<AudioContextValue | null>(null);

const engine = new ChiptuneEngine();

// Stable references so consumers can list them as effect dependencies safely.
const sfx = {
  playTaskCompleteSFX: (delay?: number) => engine.playCoin(delay),
  playLevelUpSFX: (delay?: number) => engine.playLevelUp(delay),
  playMasterySFX: (delay?: number) => engine.playMastery(delay),
  playClickSFX: () => engine.playClick(),
  playWheelTickSFX: () => engine.playTick(),
  playWheelWinSFX: (tier: 0 | 1 | 2) => engine.playWheelWin(tier),
  playWheelMissSFX: () => engine.playWheelMiss(),
  playJackpotSFX: () => engine.playJackpot(),
};

/** Elements that get the retro click tick. */
const CLICKABLE = '.px-btn, .px-tab, [role="switch"]';

export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(readSettings);
  const [unlocked, setUnlocked] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable (private mode / quota); settings still work for this session.
    }
  }, [settings]);

  useEffect(() => engine.setMuted(settings.isMuted), [settings.isMuted]);
  useEffect(() => engine.setBgmVolume(settings.bgmVolume), [settings.bgmVolume]);
  useEffect(() => engine.setSfxVolume(settings.sfxVolume), [settings.sfxVolume]);

  // Background loop runs only once audio is unlocked, sound is on and music is enabled.
  useEffect(() => {
    if (unlocked && !settings.isMuted && settings.bgmEnabled) engine.startBgm();
    else engine.stopBgm();
  }, [unlocked, settings.isMuted, settings.bgmEnabled]);

  // Autoplay compliance: browsers only start audio inside a user gesture, so (re)unlock on the
  // first tap/key of each session, and on later ones in case the OS suspended audio.
  useEffect(() => {
    if (!audioSupported) return;
    const onGesture = () => {
      if (settingsRef.current.isMuted) return;
      engine.unlock();
      setUnlocked(true);
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(CLICKABLE) : null;
      if (target && !(target as HTMLButtonElement).disabled) engine.playClick();
    };
    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('keydown', onGesture, true);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  // Pause while the tab/app is in the background.
  useEffect(() => {
    const onVisibility = () => (document.hidden ? engine.suspend() : engine.resume());
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    // Apply to the engine synchronously so the resume happens inside the click gesture (Safari).
    engine.setMuted(muted);
    if (!muted) {
      engine.unlock();
      setUnlocked(true);
    }
    setSettings((prev) => ({ ...prev, isMuted: muted }));
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      ...settings,
      audioSupported,
      setMuted,
      toggleMute: () => setMuted(!settingsRef.current.isMuted),
      setBgmEnabled: (bgmEnabled) => setSettings((prev) => ({ ...prev, bgmEnabled })),
      setBgmVolume: (volume) => setSettings((prev) => ({ ...prev, bgmVolume: clamp01(volume, prev.bgmVolume) })),
      setSfxVolume: (volume) => setSettings((prev) => ({ ...prev, sfxVolume: clamp01(volume, prev.sfxVolume) })),
      ...sfx,
    }),
    [settings, setMuted],
  );

  return <AudioSettingsContext.Provider value={value}>{children}</AudioSettingsContext.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioSettingsContext);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}
