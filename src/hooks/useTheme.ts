import { useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_THEME, isThemeId } from '../constants/cosmetics';
import { useGame } from '../context/GameContext';
import { useHousehold } from '../context/HouseholdContext';
import type { ThemeId } from '../types';

// Each player's theme is a preference on their own device, kept per household: themes are unlocked by a
// household, so joining another one starts back on the default.

const listeners = new Set<() => void>();
const keyFor = (scope: string) => `chorequest.theme.${scope}`;

function read(scope: string): ThemeId {
  try {
    const stored = localStorage.getItem(keyFor(scope));
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** The storage scope for the current player: their household, or the offline demo. */
export function useThemeScope(): string | null {
  const { status, household } = useHousehold();
  if (status === 'demo') return 'demo';
  return status === 'ready' && household ? household.id : null;
}

/** The theme this player picked (falls back to the default if it isn't unlocked in this household). */
export function useTheme(): { theme: ThemeId; setTheme: (theme: ThemeId) => void } {
  const scope = useThemeScope();
  const { state } = useGame();
  const chosen = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => (scope ? read(scope) : DEFAULT_THEME),
  );
  const theme = chosen === DEFAULT_THEME || state.cosmetics.themes.includes(chosen) ? chosen : DEFAULT_THEME;
  const setTheme = (next: ThemeId) => {
    if (!scope) return;
    try {
      localStorage.setItem(keyFor(scope), next);
    } catch {
      // Storage unavailable: the theme still changes until the page reloads.
    }
    listeners.forEach((listener) => listener());
  };
  return { theme, setTheme };
}

/** Applies a theme to the page (`<html data-theme>`), back to the default when unmounted. */
export function useApplyTheme(theme: ThemeId) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      document.documentElement.dataset.theme = DEFAULT_THEME;
    };
  }, [theme]);
}
