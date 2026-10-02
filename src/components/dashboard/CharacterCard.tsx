import { motion } from 'framer-motion';
import { Check, Crown, Pencil } from 'pixelarticons/react';
import { useState, type ReactNode } from 'react';
import { MAX_LEVEL, SKILL_POOL } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { Character } from '../../types';
import { formatGold, getXpProgress } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { CharacterName } from '../ui/CharacterName';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { LevelBadge } from '../ui/LevelBadge';
import { pixelEase } from '../ui/Modal';
import { Ticket } from '../ui/pixel/TicketIcon';
import { ProgressBar } from '../ui/ProgressBar';
import { Tooltip } from '../ui/Tooltip';
import { RenameCharacterModal } from './RenameCharacterModal';
import { SkillChip } from './SkillChip';

const STAT_CLASS = 'px-slot h-9 items-center gap-1.5 px-2 text-base font-extrabold leading-none';

/** Small sunken stat badge, a fixed 36px tall so badges with icons of different sizes line up. */
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className={`${STAT_CLASS} inline-flex`}>
      <span aria-hidden className="inline-flex items-center gap-1.5">
        {children}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * A character's status card. Fills its grid cell (h-full) with the daily-ticket action pinned to the
 * bottom, so both cards line up whatever the name length or number of skills.
 */
export function CharacterCard({ character, active }: { character: Character; active?: boolean }) {
  const { t } = useLanguage();
  const { today, canRename, canActAs, claimDailyTicket } = useGame();
  const { role, hasCustomName } = useCharacterName();
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const progress = getXpProgress(character.xp);
  const id = character.id;
  const claimed = character.ticketClaimedOn === today;
  const ticketLabel = character.tickets === 1 ? t('wheel.ticketTooltipOne') : t('wheel.ticketTooltip', { count: character.tickets });

  return (
    <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: pixelEase(4) }}>
      <div className={`px-panel flex h-full flex-col gap-3 p-4 transition-transform ${active ? 'px-panel-ember -translate-y-1' : ''}`}>
        <div className="flex items-start gap-3">
          <CharacterAvatar id={id} scale={3} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              {/* Long names wrap onto a second line instead of being cut off. */}
              <h3 className="min-w-0 text-xl font-extrabold uppercase leading-tight [overflow-wrap:anywhere] sm:text-2xl">
                <CharacterName id={id} />
                {canRename(id) && (
                  <button
                    type="button"
                    onClick={() => setRenaming(true)}
                    className="px-focus ml-1 inline-flex p-0.5 align-middle text-wood-600 hover:text-brick-600"
                    aria-label={t('character.rename')}
                    title={t('character.rename')}
                  >
                    <Icon as={Pencil} size={24} />
                  </button>
                )}
              </h3>
              <LevelBadge level={progress.level} className="shrink-0" />
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
        </div>

        <div>
          <p className="mb-1.5 text-sm font-bold uppercase text-wood-700">
            {progress.needed
              ? t('character.xp', { current: Math.round(progress.currentInLevel), needed: progress.needed })
              : t('character.maxLevel')}
          </p>
          <ProgressBar percent={progress.percent} label="XP" />
        </div>

        {/* Equal-height badges: gold, and wheel tickets (count only; the tooltip spells it out). */}
        <div className="flex flex-wrap items-center gap-2">
          <Stat label={`${t('character.gold')}: ${formatGold(character.gold)}`}>
            <GoldCounter amount={character.gold} spin />
          </Stat>
          <Tooltip
            label={
              <span className="inline-flex items-center gap-1.5 text-plum-600">
                <Icon as={Ticket} size={24} />
                <span className="font-arcade text-[10px]">{character.tickets}</span>
                <span className="sr-only">{ticketLabel}</span>
              </span>
            }
            content={ticketLabel}
            triggerClassName={`${STAT_CLASS} inline-flex`}
          />
        </div>

        {character.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {character.skills.map((owned) => {
              const def = SKILL_POOL.find((skill) => skill.id === owned.skillId);
              return def ? <SkillChip key={owned.skillId} skill={def} level={owned.level} /> : null;
            })}
          </div>
        )}

        {/* Daily ticket, pinned to the bottom so both cards align. */}
        <div className="mt-auto pt-1">
          {canActAs(id) ? (
            <>
              <Button
                variant={claimed ? 'secondary' : 'moss'}
                className="w-full"
                disabled={claimed}
                onClick={() => {
                  const result = claimDailyTicket(id);
                  setError(result.ok ? null : result.error);
                }}
              >
                <Icon as={claimed ? Check : Ticket} size={24} />
                {claimed ? t('wheel.claimed') : t('wheel.claim')}
              </Button>
              {error && (
                <p className="mt-2 text-sm font-bold text-brick-600" role="alert">
                  {t(error)}
                </p>
              )}
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm font-bold uppercase text-wood-600">
              <Icon as={claimed ? Check : Ticket} size={24} />
              {claimed ? t('wheel.partnerClaimed') : t('wheel.partnerWaiting')}
            </p>
          )}
        </div>
      </div>
      {renaming && <RenameCharacterModal characterId={id} open onClose={() => setRenaming(false)} />}
    </motion.div>
  );
}
