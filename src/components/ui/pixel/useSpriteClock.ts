import { useSyncExternalStore } from 'react';
import { getQuality, subscribeQuality } from '../../../hooks/useQuality';

// One shared 8 fps clock drives every sprite, so animations stay in step and cost a single timer.
const TICK_MS = 125;
let tick = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function startOrStop() {
  const still = reducedMotion || getQuality() === 'low';
  if (still && timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
    tick = 0;
    listeners.forEach((fn) => fn());
  } else if (!still && timer === undefined && listeners.size > 0) {
    timer = window.setInterval(() => {
      tick += 1;
      listeners.forEach((fn) => fn());
    }, TICK_MS);
  }
}
if (typeof window !== 'undefined') subscribeQuality(startOrStop);

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === undefined && !reducedMotion && getQuality() !== 'low') {
    timer = window.setInterval(() => {
      tick += 1;
      listeners.forEach((fn) => fn());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Current frame index for an animation of `frames` frames running at `fps` (max 8). */
export function useSpriteFrame(frames: number, fps = 4, offset = 0): number {
  const current = useSyncExternalStore(subscribe, () => tick);
  if (frames <= 1) return 0;
  return (Math.floor((current * fps) / 8) + offset) % frames;
}
