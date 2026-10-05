import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Calendar, Home, MoreHorizontal, Sliders, Sword, TreePine } from 'pixelarticons/react';
import { useState } from 'react';
import { FIRE } from '../../assets/sprites';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { AppView } from '../../types';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Icon } from '../ui/Icon';
import { pixelEase } from '../ui/Modal';
import { PixelSprite } from '../ui/pixel/PixelSprite';

const items: { id: AppView; icon: typeof Home; label: TranslationKey }[] = [
  { id: 'dashboard', icon: Home, label: 'nav.dashboard' },
  { id: 'tasks', icon: Sword, label: 'nav.tasks' },
  { id: 'skills', icon: TreePine, label: 'nav.skills' },
  { id: 'history', icon: BookOpen, label: 'nav.history' },
  { id: 'calendar', icon: Calendar, label: 'nav.calendar' },
  { id: 'settings', icon: Sliders, label: 'nav.settings' },
];

/** Unspent skill points of the character this player controls (0 when they can't act). */
function useUnspentPoints(): number {
  const { state, activeCharacter, canActAs } = useGame();
  if (!canActAs(activeCharacter)) return 0;
  const character = state.characters[activeCharacter];
  return skillPointsAvailable(getLevelFromXp(character.xp), character.skills);
}

/** Pixel count bubble on a nav tab, e.g. unspent skill points on Skills. */
function TabBadge({ count, className = '' }: { count: number; className?: string }) {
  const { t } = useLanguage();
  if (count <= 0) return null;
  return (
    <span
      className={`bg-brick-500 px-1 font-arcade text-[9px] leading-[16px] text-parchment-50 shadow-[0_0_0_2px_#2b1a12] ${className}`}
      aria-label={t('character.skillPoints', { count })}
    >
      {count}
    </span>
  );
}

/** Phone tabs: three main sections, the rest live in the "More" drawer. */
const PRIMARY: AppView[] = ['dashboard', 'tasks', 'skills'];
const MORE = items.filter((item) => !PRIMARY.includes(item.id));

/**
 * Phone navigation, fixed to the bottom edge: Home, Quests, Skills and a "More" tab that opens a drawer
 * with History, Calendar and Settings.
 */
export function BottomNav({
  view,
  onChange,
}: {
  view: AppView;
  onChange: (view: AppView) => void;
}) {
  const { t } = useLanguage();
  const points = useUnspentPoints();
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = MORE.some((item) => item.id === view);
  const tabClass = (active: boolean) =>
    `px-tab relative flex-1 flex-col gap-0.5 px-1 py-1.5 text-[15px] leading-none ${active ? '-translate-y-1.5' : ''}`;

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-wood-950/60 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: pixelEase(3) }}
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              id="more-drawer"
              role="menu"
              aria-label={t('nav.more')}
              className="px-panel px-panel-wood absolute inset-x-0 bottom-0 space-y-3 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4"
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              transition={{ duration: 0.18, ease: pixelEase(4) }}
              onClick={(event) => event.stopPropagation()}
            >
              {MORE.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onChange(item.id);
                    setMoreOpen(false);
                  }}
                  aria-current={view === item.id ? 'page' : undefined}
                  className="px-tab w-full px-4 py-3 text-lg"
                >
                  <Icon as={item.icon} size={24} />
                  {t(item.label)}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Own compositing layer, so the wheel's animation never repaints it. */}
      <nav className="px-panel-wood fixed bottom-0 left-0 right-0 z-50 border-t-4 border-ink px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 [transform:translateZ(0)] md:hidden">
        <div className="mx-auto flex max-w-lg justify-between gap-1.5">
          {items
            .filter((item) => PRIMARY.includes(item.id))
            .map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setMoreOpen(false);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={tabClass(active)}
                >
                  <Icon as={item.icon} size={24} />
                  {item.id === 'skills' && <TabBadge count={points} className="absolute right-1 top-1" />}
                  <span className="max-w-full truncate">{t(item.label)}</span>
                </button>
              );
            })}
          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            aria-expanded={moreOpen}
            aria-controls="more-drawer"
            aria-current={inMore ? 'page' : undefined}
            className={tabClass(inMore || moreOpen)}
          >
            <Icon as={inMore ? (MORE.find((item) => item.id === view)?.icon ?? MoreHorizontal) : MoreHorizontal} size={24} />
            <span className="max-w-full truncate">{inMore ? t(MORE.find((item) => item.id === view)!.label) : t('nav.more')}</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export function SideNav({
  view,
  onChange,
}: {
  view: AppView;
  onChange: (view: AppView) => void;
}) {
  const { t } = useLanguage();
  const points = useUnspentPoints();
  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <div className="sticky top-24 space-y-5">
        <div className="px-panel px-panel-wood flex flex-col items-center gap-2 px-3 pb-3 pt-4">
          <PixelSprite frames={FIRE} fps={6} scale={3} />
          <p className="px-wordmark text-[13px]">ChoreQuest</p>
        </div>
        <div className="space-y-3 px-1">
          {items.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`px-tab w-full px-4 py-2.5 text-lg ${active ? 'translate-x-2' : ''}`}
              >
                <Icon as={item.icon} size={24} />
                {t(item.label)}
                {item.id === 'skills' && <TabBadge count={points} className="ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
