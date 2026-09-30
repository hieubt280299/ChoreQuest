import { SKILL_POOL } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { LevelBadge } from '../ui/LevelBadge';
import { PageHeader } from '../ui/PageHeader';
import { SkillIcon } from '../ui/SkillIcon';

/** Four chunky tier pips. */
export function TierPips({ level }: { level: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`${level}/4`}>
      {[1, 2, 3, 4].map((tier) => (
        <span
          key={tier}
          className={`h-3 w-6 ${level >= tier ? 'bg-ember-500 shadow-[inset_0_-3px_0_0_#a44a14,0_0_0_2px_#2b1a12]' : 'bg-parchment-300 shadow-[0_0_0_2px_#2b1a12]'}`}
        />
      ))}
    </div>
  );
}

export function SkillsView() {
  const { t } = useLanguage();
  const { state, unlockSkill, upgradeSkill } = useGame();

  return (
    <section className="space-y-6">
      <PageHeader title={t('skills.title')} subtitle={t('skills.subtitle')} />
      <div className="grid gap-8 lg:grid-cols-2">
        {(['husband', 'wife'] as CharacterId[]).map((id) => {
          const character = state.characters[id];
          const level = getLevelFromXp(character.xp);
          const points = skillPointsAvailable(level, character.skills);
          return (
            <div key={id} className="space-y-5">
              <Card tone="wood" className="flex items-center gap-3 p-3">
                <CharacterAvatar id={id} scale={2} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-extrabold uppercase leading-none text-parchment-50">{t(`character.${id}`)}</h2>
                  <p className="text-base font-bold text-parchment-300">
                    {t('skills.owned', { count: character.skills.length })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <LevelBadge level={level} />
                  <span className={`text-base font-extrabold uppercase ${points > 0 ? 'text-flame-300' : 'text-parchment-300'}`}>
                    {t('character.skillPoints', { count: points })}
                  </span>
                </div>
              </Card>
              <div className="grid gap-5">
                {SKILL_POOL.map((skill) => {
                  const owned = character.skills.find((item) => item.skillId === skill.id);
                  const canUnlock = !owned && points > 0 && character.skills.length < 6;
                  const canUpgrade = !!owned && owned.level < 4 && points > 0;
                  return (
                    <Card key={skill.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-12 w-12 shrink-0 items-center justify-center ${
                            owned ? 'px-slot-dark text-flame-300' : 'px-slot text-wood-500'
                          }`}
                        >
                          <SkillIcon icon={skill.icon} size={24} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xl font-extrabold leading-tight">{t(skill.nameKey as TranslationKey)}</p>
                          <p className="text-base leading-snug text-wood-600">{t(skill.descriptionKey as TranslationKey)}</p>
                          <div className="mt-2">
                            <TierPips level={owned?.level ?? 0} />
                          </div>
                        </div>
                        {owned?.level === 4 ? (
                          <span className="text-base font-extrabold uppercase text-moss-700">{t('skills.maxed')}</span>
                        ) : owned ? (
                          <Button disabled={!canUpgrade} onClick={() => upgradeSkill(id, skill.id)}>
                            {t('skills.upgrade')}
                          </Button>
                        ) : (
                          <Button variant="secondary" disabled={!canUnlock} onClick={() => unlockSkill(id, skill.id)}>
                            {t('skills.unlock')}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
