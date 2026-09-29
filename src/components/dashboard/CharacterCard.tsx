import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
import { SKILL_POOL } from '../../constants/gameRules';
import { useLanguage } from '../../context/LanguageContext';
import type { Character } from '../../types';
import { getXpProgress, skillPointsAvailable } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Card } from '../ui/Card';
import { GoldCounter } from '../ui/GoldCounter';
import { ProgressBar } from '../ui/ProgressBar';
import { SkillIcon } from '../ui/SkillIcon';

export function CharacterCard({
  character,
  accent,
  active,
  onSelect,
}: {
  character: Character;
  accent: 'rose' | 'sage';
  active?: boolean;
  onSelect?: () => void;
}) {
  const { t } = useLanguage();
  const progress = getXpProgress(character.xp);
  const points = skillPointsAvailable(progress.level, character.skills);
  const bg = accent === 'rose' ? 'from-rose-soft to-white' : 'from-sage-soft to-white';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <button type="button" className="w-full text-left" onClick={onSelect}>
      <Card className={`bg-gradient-to-br ${bg} ${active ? 'ring-2 ring-amber-500' : ''}`}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-2xl text-stone-800">{t(`character.${character.id}`)}</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-amber-800">
            <Crown size={14} />
            {t('character.level', { level: progress.level })}
          </span>
        </div>
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-stone-600">
          <span>
            {progress.needed
              ? t('character.xp', {
                  current: Math.round(progress.currentInLevel),
                  needed: progress.needed,
                })
              : t('character.maxLevel')}
          </span>
          <GoldCounter amount={character.gold} />
        </div>
        <ProgressBar percent={progress.percent} />
        {points > 0 && (
          <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
            <Sparkles size={14} />
            {t('character.skillPoints', { count: points })}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {character.skills.map((owned) => {
            const def = SKILL_POOL.find((skill) => skill.id === owned.skillId);
            if (!def) return null;
            return (
              <span
                key={owned.skillId}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-stone-700"
              >
                <SkillIcon icon={def.icon} size={12} />
                {t(def.nameKey as TranslationKey)} · {owned.level}
              </span>
            );
          })}
        </div>
      </Card>
      </button>
    </motion.div>
  );
}
