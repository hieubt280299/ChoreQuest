import { motion } from 'framer-motion';
import { Crown, Pencil, Sparkles } from 'pixelarticons/react';
import { useState } from 'react';
import { MAX_LEVEL, SKILL_POOL } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { Character } from '../../types';
import { getXpProgress, skillPointsAvailable } from '../../utils/calculations';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { LevelBadge } from '../ui/LevelBadge';
import { pixelEase } from '../ui/Modal';
import { ProgressBar } from '../ui/ProgressBar';
import { RenameCharacterModal } from './RenameCharacterModal';
import { SkillChip } from './SkillChip';

export function CharacterCard({ character, active }: { character: Character; active?: boolean }) {
  const { t } = useLanguage();
  const { canRename } = useGame();
  const { name, role, hasCustomName } = useCharacterName();
  const [renaming, setRenaming] = useState(false);
  const progress = getXpProgress(character.xp);
  const points = skillPointsAvailable(progress.level, character.skills);
  const id = character.id;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: pixelEase(4) }}>
      <div className={`px-panel block w-full p-4 transition-transform ${active ? 'px-panel-ember -translate-y-1' : ''}`}>
        <div className="flex gap-4">
          <CharacterAvatar id={id} scale={4} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start gap-2">
              {/* Name as the header (truncated if long), role as a subheader once a name is set. */}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1">
                  <h3 className="min-w-0 truncate text-2xl font-extrabold uppercase leading-none" title={name(id)}>
                    {name(id)}
                  </h3>
                  {canRename(id) && (
                    <button
                      type="button"
                      onClick={() => setRenaming(true)}
                      className="px-focus shrink-0 p-0.5 text-wood-600 hover:text-brick-600"
                      aria-label={t('character.rename')}
                      title={t('character.rename')}
                    >
                      <Icon as={Pencil} size={24} />
                    </button>
                  )}
                </div>
                {(hasCustomName(id) || progress.level >= MAX_LEVEL) && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {hasCustomName(id) && <span className="text-sm font-bold uppercase text-wood-600">{role(id)}</span>}
                    {progress.level >= MAX_LEVEL && (
                      <span className="inline-flex items-center gap-1 bg-flame-300 px-1.5 text-sm font-extrabold uppercase leading-tight text-ink shadow-[0_0_0_2px_#2b1a12]">
                        <Icon as={Crown} size={12} className="text-brick-700" />
                        {t('mastery.badge')}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <LevelBadge level={progress.level} className="shrink-0" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-base font-bold text-wood-700">
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
              return def ? <SkillChip key={owned.skillId} skill={def} level={owned.level} /> : null;
            })}
          </div>
        )}
      </div>
      {renaming && <RenameCharacterModal characterId={id} open onClose={() => setRenaming(false)} />}
    </motion.div>
  );
}
