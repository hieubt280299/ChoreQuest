import { motion } from 'framer-motion';
import { Sparkles } from 'pixelarticons/react';
import { SKILL_POOL } from '../../constants/gameRules';
import { useLanguage } from '../../context/LanguageContext';
import type { Character } from '../../types';
import { getXpProgress, skillPointsAvailable } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { LevelBadge } from '../ui/LevelBadge';
import { pixelEase } from '../ui/Modal';
import { ProgressBar } from '../ui/ProgressBar';
import { SkillIcon } from '../ui/SkillIcon';

export function CharacterCard({
  character,
  active,
  onSelect,
}: {
  character: Character;
  active?: boolean;
  onSelect?: () => void;
}) {
  const { t } = useLanguage();
  const progress = getXpProgress(character.xp);
  const points = skillPointsAvailable(progress.level, character.skills);

  const frame = `px-panel block w-full p-4 transition-transform ${active ? 'px-panel-ember -translate-y-1' : ''}`;
  const body = (
    <>
        <div className="flex gap-4">
          <CharacterAvatar id={character.id} scale={4} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-2xl font-extrabold uppercase leading-none">{t(`character.${character.id}`)}</h3>
              <LevelBadge level={progress.level} />
            </div>
            <div className="flex items-center justify-between gap-2 text-base font-bold text-wood-700">
              <span>
                {progress.needed
                  ? t('character.xp', { current: Math.round(progress.currentInLevel), needed: progress.needed })
                  : t('character.maxLevel')}
              </span>
              <GoldCounter amount={character.gold} spin />
            </div>
            <ProgressBar percent={progress.percent} label="XP" />
            {points > 0 && (
              <p className="inline-flex items-center gap-1 text-base font-extrabold uppercase text-moss-700">
                <Icon as={Sparkles} size={24} />
                {t('character.skillPoints', { count: points })}
              </p>
            )}
          </div>
        </div>
        {character.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {character.skills.map((owned) => {
              const def = SKILL_POOL.find((skill) => skill.id === owned.skillId);
              if (!def) return null;
              return (
                <span
                  key={owned.skillId}
                  className="px-slot inline-flex items-center gap-1 px-2 py-0.5 text-sm font-bold text-wood-800"
                >
                  <SkillIcon icon={def.icon} size={12} />
                  {t(def.nameKey as TranslationKey)}
                  <span className="font-arcade text-[8px] text-brick-600">{owned.level}</span>
                </span>
              );
            })}
          </div>
        )}
    </>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: pixelEase(4) }}>
      {/* Selectable only where you can switch characters (demo); otherwise a plain card. */}
      {onSelect ? (
        <button type="button" aria-pressed={active} className={`${frame} px-focus text-left`} onClick={onSelect}>
          {body}
        </button>
      ) : (
        <div className={frame}>{body}</div>
      )}
    </motion.div>
  );
}
