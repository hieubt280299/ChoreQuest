import { AnimatePresence, motion } from 'framer-motion';
import { Fire } from 'pixelarticons/react';
import { useEffect } from 'react';
import { COIN } from '../../assets/sprites';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, TaskLog } from '../../types';
import { taskName } from '../../utils/taskNames';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { pixelEase } from '../ui/Modal';
import { PixelSprite } from '../ui/pixel/PixelSprite';
import { TEXT_ACTION } from '../ui/textAction';

const SHOW_MS = 6000;

/**
 * What a completed quest paid, above the phone nav bar, with quick Undo and Change (who did it) actions. Replaces the
 * old full-screen card, so logging several chores doesn't take a dialog each; level-ups still get their own card.
 */
export function QuestToast({ onChange }: { onChange: (log: TaskLog) => void }) {
  const { t, language } = useLanguage();
  const { state, reward, clearReward, undoLog, canManageLog } = useGame();
  const log = reward ? state.logs.find((item) => item.id === reward.id) : undefined;

  const rewardId = reward?.id;
  useEffect(() => {
    if (!rewardId) return;
    const id = window.setTimeout(clearReward, SHOW_MS);
    return () => window.clearTimeout(id);
    // `clearReward` only resets state, so the timer needn't restart when it's re-created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewardId]);
  // A reward without its entry was undone, or came from re-assigning one.
  useEffect(() => {
    if (rewardId && !log) clearReward();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewardId, log]);

  const recipients = reward && log ? (['husband', 'wife'] as CharacterId[]).filter((id) => reward.xp[id] > 0 || reward.gold[id] > 0) : [];
  const fixable = !!log && canManageLog(log);

  return (
    <AnimatePresence>
      {reward && log && (
        <motion.div
          key={reward.id}
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: pixelEase(3) }}
          className="px-panel fixed inset-x-4 bottom-24 z-[55] mx-auto flex max-w-md items-center gap-3 p-2.5 md:bottom-6"
        >
          <span className="shrink-0">
            <PixelSprite frames={COIN} fps={8} scale={3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold leading-tight">{taskName({ nameKey: reward.title, names: reward.names }, language)}</p>
            <div className="flex flex-wrap items-center gap-x-3">
              {recipients.map((id) => (
                <span key={id} className="inline-flex items-center gap-1.5">
                  {recipients.length > 1 && <CharacterAvatar id={id} scale={1} framed={false} />}
                  <span className="font-arcade text-[10px] text-moss-700">+{Math.round(reward.xp[id])}XP</span>
                  <GoldCounter amount={reward.gold[id]} />
                  {(reward.streakGold?.[id] ?? 0) > 0 && <Icon as={Fire} size={12} className="text-brick-700" />}
                </span>
              ))}
            </div>
          </div>
          {fixable && (
            <div className="flex shrink-0 items-center gap-3">
              <button type="button" className={`${TEXT_ACTION} text-wood-700`} onClick={() => undoLog(log.id)}>
                {t('tasks.toastUndo')}
              </button>
              <button
                type="button"
                className={`${TEXT_ACTION} text-wood-700`}
                onClick={() => {
                  clearReward();
                  onChange(log);
                }}
              >
                {t('tasks.toastChange')}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
