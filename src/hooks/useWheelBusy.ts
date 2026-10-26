import { useSyncExternalStore } from 'react';

// Whether the Wheel of Fortune is busy (saving a spin or turning). While it is, navigation and the character
// switcher are locked: leaving the Home tab mid-spin would unmount the wheel before its result card shows.
let busy = false;
const listeners = new Set<() => void>();

export function setWheelBusy(next: boolean) {
  if (busy === next) return;
  busy = next;
  listeners.forEach((listener) => listener());
}

export function isWheelBusy(): boolean {
  return busy;
}

export function useWheelBusy(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => busy,
    () => false,
  );
}
