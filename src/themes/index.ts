import { useEffect, useState } from 'react';
import type { ThemeId } from '../types';
import * as hearth from './hearth';
import type { ThemeModule } from './scene';

// Theme modules: Cozy Hearth ships with the app; every other theme (scene art + CSS) is a separate chunk
// fetched the first time it is applied or previewed.
const LOADERS: Record<Exclude<ThemeId, 'hearth'>, () => Promise<ThemeModule>> = {
  mushroom: () => import('./mushroom'),
  cottage: () => import('./cottage'),
  forest: () => import('./forest'),
};

const cache = new Map<ThemeId, ThemeModule>([['hearth', hearth]]);
const pending = new Map<ThemeId, Promise<ThemeModule>>();

/** Loads (once) and returns a theme's module; falls back to Cozy Hearth if the chunk fails to load. */
export function loadTheme(id: ThemeId): Promise<ThemeModule> {
  const cached = cache.get(id);
  if (cached) return Promise.resolve(cached);
  let promise = pending.get(id);
  if (!promise) {
    promise = LOADERS[id as Exclude<ThemeId, 'hearth'>]()
      .then((module) => {
        cache.set(id, module);
        return module;
      })
      .catch((err) => {
        console.warn(`ChoreQuest: could not load the ${id} theme`, err);
        pending.delete(id);
        return hearth as ThemeModule;
      });
    pending.set(id, promise);
  }
  return promise;
}

/** A theme's module once loaded (null while loading). */
export function useThemeModule(id: ThemeId): ThemeModule | null {
  const [module, setModule] = useState<ThemeModule | null>(() => cache.get(id) ?? null);
  useEffect(() => {
    let alive = true;
    const cached = cache.get(id);
    if (cached) setModule(cached);
    else {
      setModule(null);
      void loadTheme(id).then((loaded) => alive && setModule(loaded));
    }
    return () => {
      alive = false;
    };
  }, [id]);
  return module;
}
