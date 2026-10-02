import { motion } from 'framer-motion';
import { Sparkles, Star } from 'pixelarticons/react';
import type { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { LevelUpReward } from '../../types';
import { CharacterName } from '../ui/CharacterName';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { LevelBadge } from '../ui/LevelBadge';
import { pixelEase } from '../ui/Modal';
import { Ticket } from '../ui/pixel/TicketIcon';

function RewardRow({ icon, label, children, delay }: { icon: ReactNode; label: string; children: ReactNode; delay: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2, ease: pixelEase(3) }}
      className="px-slot flex items-center gap-3 px-3 py-2"
    >
      {icon}
      <span className="flex-1 text-left text-base font-extrabold uppercase text-wood-700">{label}</span>
      {children}
    </motion.li>
  );
}

/** Dedicated retro level-up card: the new level badge, then what the level paid out. */
export function LevelUpModal({
  levelUp,
  onContinue,
  onAssignSkills,
}: {
  levelUp: LevelUpReward;
  onContinue: () => void;
  /** Shown when this player can spend the new skill points now. */
  onAssignSkills?: () => void;
}) {
  const { t } = useLanguage();
  const { name } = useCharacterName();

  return (
    <motion.div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-wood-950/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: pixelEase(3) }}
      onClick={onContinue}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${t('tasks.levelUp')} ${name(levelUp.characterId)}`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.08, 1], opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.35, ease: pixelEase(5) }}
        className="px-panel px-panel-ember w-full max-w-sm p-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-2 text-brick-700">
          <Icon as={Star} size={24} className="px-blink" />
          <h2 className="px-title text-4xl uppercase text-flame-300" style={{ textShadow: '3px 3px 0 #b04a34, 5px 5px 0 #2b1a12' }}>
            {t('tasks.levelUp')}
          </h2>
          <Icon as={Star} size={24} className="px-blink" />
        </div>
        <div
          className="mx-auto my-3 flex h-24 w-24 items-end justify-center"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,224,138,0.85) 0%, rgba(255,224,138,0) 70%)' }}
        >
          <span className="bob">
            <CharacterAvatar id={levelUp.characterId} scale={4} framed={false} />
          </span>
        </div>
        <p className="text-xl font-extrabold uppercase leading-tight [overflow-wrap:anywhere]"><CharacterName id={levelUp.characterId} /></p>

        {/* Old level fades, the new one pops in. */}
        <div className="my-4 flex items-center justify-center gap-3" aria-label={`${levelUp.from} → ${levelUp.to}`}>
          <motion.span initial={{ opacity: 1 }} animate={{ opacity: 0.45 }} transition={{ delay: 0.3, duration: 0.2 }}>
            <LevelBadge level={levelUp.from} />
          </motion.span>
          <span className="font-arcade text-sm text-brick-700" aria-hidden>
            →
          </span>
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.6, 1.3], rotate: 0 }}
            transition={{ delay: 0.35, duration: 0.45, ease: pixelEase(6) }}
            className="inline-block"
          >
            <LevelBadge level={levelUp.to} />
          </motion.span>
        </div>

        <ul className="mb-5 space-y-2">
          <RewardRow icon={<Icon as={Star} size={24} className="text-ember-600" />} label={t('levelUp.gold')} delay={0.6}>
            <GoldCounter amount={levelUp.bonusGold} spin />
          </RewardRow>
          {levelUp.tickets > 0 && (
            <RewardRow icon={<Icon as={Ticket} size={24} className="text-plum-600" />} label={t('levelUp.tickets')} delay={0.75}>
              <span className="font-arcade text-[10px]">+{levelUp.tickets}</span>
            </RewardRow>
          )}
          {levelUp.skillPoints > 0 && (
            <RewardRow icon={<Icon as={Sparkles} size={24} className="text-moss-700" />} label={t('levelUp.skillPoints')} delay={0.9}>
              <span className="font-arcade text-[10px]">+{levelUp.skillPoints}</span>
            </RewardRow>
          )}
        </ul>

        {onAssignSkills && (
          <Button className="mb-3 w-full" variant="brick" onClick={onAssignSkills}>
            {t('skills.assign')}
          </Button>
        )}
        <Button className="w-full" onClick={onContinue}>
          {t('mastery.continue')}
        </Button>
      </motion.div>
    </motion.div>
  );
}
