import { Fire } from 'pixelarticons/react';
import { useEffect, useMemo, useState } from 'react';
import { intensityApplies, TASK_INTENSITIES } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, Completer, RewardBreakdown, Task, TaskIntensity } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { CharacterName } from '../ui/CharacterName';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { RewardBreakdownTable } from './RewardBreakdownTable';

type Breakdown = Record<CharacterId, RewardBreakdown | null>;

function CompleterLabel({ who }: { who: Completer }) {
  const { t } = useLanguage();
  return <span className="block max-w-full truncate">{who === 'both' ? t('tasks.both') : <CharacterName id={who} />}</span>;
}

/** Compact reward total under a "Who did it?" tile: one of the few spots short enough on space for "G". */
function OptionTotal({ breakdown }: { breakdown: Breakdown }) {
  const parts = Object.values(breakdown).filter((part): part is RewardBreakdown => !!part);
  const xp = Math.round(parts.reduce((sum, part) => sum + part.xp, 0));
  const gold = Math.round(parts.reduce((sum, part) => sum + part.gold, 0));
  const streak = parts.some((part) => part.streakGold > 0);
  return (
    <span className="flex items-center gap-1 font-arcade text-[8px] normal-case leading-tight">
      +{xp}XP {gold}G
      {streak && <Icon as={Fire} size={12} className="text-brick-700" />}
    </span>
  );
}

/** Character-select tiles for "Who did it?" (also used to re-assign an entry). */
export function CompleterPicker({
  options,
  value,
  onChange,
  previews,
}: {
  options: Completer[];
  value: Completer;
  onChange: (who: Completer) => void;
  /** Live reward per option, summed over recipients, shown under each tile. */
  previews?: Partial<Record<Completer, Breakdown | null>>;
}) {
  const { t } = useLanguage();
  return (
    <div className={`mb-5 grid gap-3 ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} role="radiogroup" aria-label={t('tasks.who')}>
      {options.map((who) => {
        const selected = value === who;
        return (
          <button
            key={who}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(who)}
            className={`px-btn flex-col gap-2 px-1 py-3 ${selected ? 'px-btn-primary -translate-y-1' : ''}`}
          >
            <span className="flex h-[52px] items-end">
              {who === 'both' ? (
                <>
                  <CharacterAvatar id="husband" scale={2} framed={false} />
                  <CharacterAvatar id="wife" scale={2} framed={false} />
                </>
              ) : (
                <CharacterAvatar id={who} scale={3} framed={false} />
              )}
            </span>
            <CompleterLabel who={who} />
            {previews?.[who] && <OptionTotal breakdown={previews[who]!} />}
          </button>
        );
      })}
    </div>
  );
}

/** Light / Normal / Heavy effort for an intensity-enabled Moderate quest. */
function IntensityPicker({ value, onChange }: { value: TaskIntensity; onChange: (intensity: TaskIntensity) => void }) {
  const { t } = useLanguage();
  return (
    <div className="mb-5">
      <p className="mb-2 text-base font-extrabold uppercase text-wood-700">{t('intensity.title')}</p>
      <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label={t('intensity.title')}>
        {TASK_INTENSITIES.map((level) => {
          const selected = value === level;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(level)}
              className={`px-btn py-2 text-base ${selected ? 'px-btn-primary -translate-y-1' : ''}`}
            >
              {t(`intensity.${level}` as TranslationKey)}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-wood-600">{t('intensity.hint')}</p>
    </div>
  );
}

/**
 * "Who did it?" when completing a quest: who did it (with each choice's reward), the effort for
 * intensity-enabled Moderate quests (Normal by default), and the reward breakdown for the current pick.
 */
export function WhoDidItModal({
  task,
  late,
  initialCompleter,
  error,
  onClose,
  onConfirm,
}: {
  /** The quest being completed; the dialog is open while it's set. */
  task: Task | null;
  /** Completing yesterday's quest late. */
  late: boolean;
  initialCompleter: Completer;
  /** Why the last confirm failed, shown above the button. */
  error: TranslationKey | null;
  onClose: () => void;
  onConfirm: (completer: Completer, intensity: TaskIntensity) => void;
}) {
  const { t } = useLanguage();
  const { completerOptions, previewReward } = useGame();
  const [completer, setCompleter] = useState<Completer>(initialCompleter);
  const [intensity, setIntensity] = useState<TaskIntensity>('normal');
  const askIntensity = !!task && intensityApplies(task);

  // Each time it opens: the suggested completer and Normal effort.
  useEffect(() => {
    if (!task) return;
    setCompleter(initialCompleter);
    setIntensity('normal');
  }, [task, initialCompleter]);

  const previews = useMemo(() => {
    if (!task) return undefined;
    const result: Partial<Record<Completer, Breakdown | null>> = {};
    for (const who of completerOptions) result[who] = previewReward(task.id, who, { late, intensity });
    return result;
  }, [task, completerOptions, previewReward, late, intensity]);

  return (
    <Modal open={!!task} onClose={onClose} title={t('tasks.who')}>
      <CompleterPicker options={completerOptions} value={completer} onChange={setCompleter} previews={previews} />
      {askIntensity && <IntensityPicker value={intensity} onChange={setIntensity} />}
      {previews?.[completer] && <RewardBreakdownTable breakdown={previews[completer]!} />}
      {error && (
        <p className="mb-4 bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
          {t(error)}
        </p>
      )}
      <Button className="w-full" onClick={() => onConfirm(completer, askIntensity ? intensity : 'normal')}>
        {t('common.confirm')}
      </Button>
    </Modal>
  );
}
