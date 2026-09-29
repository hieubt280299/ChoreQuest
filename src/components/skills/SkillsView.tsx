import { SKILL_POOL } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SkillIcon } from '../ui/SkillIcon';

export function SkillsView() {
  const { t } = useLanguage();
  const { state, unlockSkill, upgradeSkill } = useGame();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-stone-800">{t('skills.title')}</h1>
        <p className="text-stone-500">{t('skills.subtitle')}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(['husband', 'wife'] as CharacterId[]).map((id) => {
          const character = state.characters[id];
          const level = getLevelFromXp(character.xp);
          const points = skillPointsAvailable(level, character.skills);
          return (
            <div key={id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">{t(`character.${id}`)}</h2>
                <p className="text-sm font-bold text-emerald-700">
                  {t('skills.owned', { count: character.skills.length })} · {t('character.skillPoints', { count: points })}
                </p>
              </div>
              <div className="grid gap-3">
                {SKILL_POOL.map((skill) => {
                  const owned = character.skills.find((item) => item.skillId === skill.id);
                  const canUnlock = !owned && points > 0 && character.skills.length < 6;
                  const canUpgrade = !!owned && owned.level < 4 && points > 0;
                  return (
                    <Card key={skill.id}>
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-amber-warm p-2 text-amber-800">
                          <SkillIcon icon={skill.icon} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-stone-800">{t(skill.nameKey as TranslationKey)}</p>
                          <p className="text-sm text-stone-500">{t(skill.descriptionKey as TranslationKey)}</p>
                          <div className="mt-2 flex gap-1">
                            {[1, 2, 3, 4].map((tier) => (
                              <span
                                key={tier}
                                className={`h-2 flex-1 rounded-full ${
                                  (owned?.level ?? 0) >= tier ? 'bg-amber-500' : 'bg-stone-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {owned?.level === 4 ? (
                          <span className="text-xs font-bold text-stone-400">{t('skills.maxed')}</span>
                        ) : owned ? (
                          <Button disabled={!canUpgrade} onClick={() => upgradeSkill(id, skill.id)}>
                            {t('skills.upgrade')}
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            disabled={!canUnlock}
                            onClick={() => unlockSkill(id, skill.id)}
                          >
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
