import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'pixelarticons/react';
import { MAX_LEVEL, SKILL_POOL } from '../../constants/gameRules';
import { useLanguage } from '../../context/LanguageContext';
import type { Character } from '../../types';
import { getXpProgress, skillPointsAvailable } from '../../utils/calculations';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { LevelBadge } from '../ui/LevelBadge';
import { pixelEase } from '../ui/Modal';
import { ProgressBar } from '../ui/ProgressBar';
import { SkillChip } from './SkillChip';

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
            <div className="flex flex-wrap items-start gap-2">
              <h3 className="text-2xl font-extrabold uppercase leading-none">{t(`character.${character.id}`)}</h3>
              {progress.level >= MAX_LEVEL && (
                <span className="inline-flex items-center gap-1 bg-flame-300 px-1.5 text-sm font-extrabold uppercase leading-tight text-ink shadow-[0_0_0_2px_#2b1a12]">
                  <Icon as={Crown} size={12} className="text-brick-700" />
                  {t('mastery.badge')}
                </span>
              )}
              <LevelBadge level={progress.level} className="ml-auto" />
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
    </>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: pixelEase(4) }}>
      <div className={frame}>
        {/* Selectable only where you can switch characters (demo). The skill chips sit outside the
            button so each can be its own tooltip trigger. */}
        {onSelect ? (
          <button type="button" aria-pressed={active} className="px-focus block w-full text-left" onClick={onSelect}>
            {body}
          </button>
        ) : (
          body
        )}
        {character.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {character.skills.map((owned) => {
              const def = SKILL_POOL.find((skill) => skill.id === owned.skillId);
              return def ? <SkillChip key={owned.skillId} skill={def} level={owned.level} /> : null;
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
