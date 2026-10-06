import { useSyncExternalStore } from 'react';

/**
 * Graphics quality, a per-device preference. High is the full experience; Low stops what keeps running and can
 * lag low-end phones (the sprite animation clock, looping CSS animations, confetti, fixed backgrounds) and
 * shortens the wheel's spin. Short transitions stay.
 */
export type Quality = 'high' | 'low';

const KEY = 'chorequest.quality';
const listeners = new Set<() => void>();

function read(): Quality {
  try {
    return localStorage.getItem(KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

let current: Quality = typeof window === 'undefined' ? 'high' : read();

function apply(quality: Quality) {
  if (typeof document !== 'undefined') document.documentElement.dataset.quality = quality;
}
apply(current);

export function getQuality(): Quality {
  return current;
}

export function setQuality(quality: Quality) {
  current = quality;
  try {
    localStorage.setItem(KEY, quality);
  } catch {
    // Storage unavailable: applies until the page reloads.
  }
  apply(quality);
  listeners.forEach((listener) => listener());
}

export function subscribeQuality(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useQuality(): Quality {
  return useSyncExternalStore(subscribeQuality, getQuality);
}

/** The system's reduced-motion setting (skip motion entirely). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
