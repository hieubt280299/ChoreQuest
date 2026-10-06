import type { ComponentType } from 'react';

/** Every theme's cabin scene shares one 120x54 pixel stage; the two heroes stand at the same spots. */
export const SCENE_W = 120;
export const SCENE_H = 54;

export interface SceneProps {
  /** Local hour (0-23), for day/night touches. */
  hour: number;
}

/**
 * What a theme provides: the scene behind the heroes and (optionally) in front of them. Importing a theme
 * module also loads its CSS (palette and styles), so locked or unused themes stay out of the main bundle.
 */
export interface ThemeModule {
  SceneBack: ComponentType<SceneProps>;
  SceneFront?: ComponentType<SceneProps>;
  /** Accessible description of the scene. */
  sceneLabel: string;
}

export type Sky = { sky: string; glow: string; night: boolean };

export function skyFor(hour: number): Sky {
  if (hour >= 20 || hour < 5) return { sky: '#2d2a4a', glow: '#46406b', night: true };
  if (hour < 8) return { sky: '#f2a86b', glow: '#f7c89a', night: false };
  if (hour < 17) return { sky: '#8ec5e0', glow: '#bfe0ee', night: false };
  return { sky: '#d9785a', glow: '#f2a86b', night: false };
}
