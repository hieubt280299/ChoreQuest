import { SKILL_POOL } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { Character, CharacterId } from '../../types';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { LevelBadge } from '../ui/LevelBadge';
import { PageHeader } from '../ui/PageHeader';
import { SkillIcon } from '../ui/SkillIcon';
import { SkillDescription } from './SkillDescription';

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

function CharacterSkillHeader({ character, viewOnly }: { character: Character; viewOnly?: boolean }) {
  const { t } = useLanguage();
  const { name } = useCharacterName();
  const level = getLevelFromXp(character.xp);
  const points = skillPointsAvailable(level, character.skills);
  return (
    <Card tone="wood" className="flex items-center gap-3 p-3">
      <CharacterAvatar id={character.id} scale={2} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-2xl font-extrabold uppercase leading-none text-parchment-50" title={name(character.id)}>
          {name(character.id)}
        </h2>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold text-parchment-300">
          {t('skills.owned', { count: character.skills.length })}
          {viewOnly && (
            <span className="whitespace-nowrap bg-ink/60 px-1.5 uppercase text-parchment-100">{t('household.viewOnly')}</span>
          )}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <LevelBadge level={level} />
        {!viewOnly && (
          <span className={`text-base font-extrabold uppercase ${points > 0 ? 'text-flame-300' : 'text-parchment-300'}`}>
            {t('character.skillPoints', { count: points })}
          </span>
        )}
      </div>
    </Card>
  );
}

/**
 * Your character's full tree with unlock/upgrade actions. Skills keep a fixed order: re-sorting after an
 * unlock moved cards under the pointer, so a following click could land on a different skill.
 */
function SkillTree({ characterId }: { characterId: CharacterId }) {
  const { t } = useLanguage();
  const { state, unlockSkill, upgradeSkill, canActAs } = useGame();
  const character = state.characters[characterId];
  const points = skillPointsAvailable(getLevelFromXp(character.xp), character.skills);
  const editable = canActAs(characterId);
  const levelOf = (skillId: string) => character.skills.find((item) => item.skillId === skillId)?.level ?? 0;

  return (
    <div className="space-y-5">
      <CharacterSkillHeader character={character} />
      <div className="grid gap-5">
        {SKILL_POOL.map((skill) => {
          const level = levelOf(skill.id);
          const canUnlock = level === 0 && points > 0 && character.skills.length < 6;
          const canUpgrade = level > 0 && level < 4 && points > 0;
          return (
            <Card key={skill.id} className="p-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center ${
                    level > 0 ? 'px-slot-dark text-flame-300' : 'px-slot text-wood-500'
                  }`}
                >
                  <SkillIcon icon={skill.icon} size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-extrabold leading-tight">{t(skill.nameKey as TranslationKey)}</p>
                  <SkillDescription skill={skill} level={level} className="text-base leading-snug text-wood-600" />
                  <div className="mt-2">
                    <TierPips level={level} />
                  </div>
                </div>
                {level === 4 ? (
                  <span className="text-base font-extrabold uppercase text-moss-700">{t('skills.maxed')}</span>
                ) : !editable ? null : level > 0 ? (
                  <Button disabled={!canUpgrade} onClick={() => upgradeSkill(characterId, skill.id)}>
                    {t('skills.upgrade')}
                  </Button>
                ) : (
                  <Button variant="secondary" disabled={!canUnlock} onClick={() => unlockSkill(characterId, skill.id)}>
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
}

/** The partner's learned skills only, read-only and compact. */
function PartnerLoadout({ characterId }: { characterId: CharacterId }) {
  const { t } = useLanguage();
  const { name } = useCharacterName();
  const { state } = useGame();
  const character = state.characters[characterId];
  const learned = character.skills
    .map((owned) => ({ owned, skill: SKILL_POOL.find((skill) => skill.id === owned.skillId) }))
    .filter((entry) => entry.skill)
    .sort((a, b) => b.owned.level - a.owned.level);

  return (
    <section className="space-y-4" aria-label={t('skills.partnerLoadout', { name: name(characterId) })}>
      <CharacterSkillHeader character={character} viewOnly />
      <Card className="p-4">
        <p className="mb-3 text-base font-extrabold uppercase text-brick-600">
          {t('skills.partnerLoadout', { name: name(characterId) })}
        </p>
        {learned.length === 0 ? (
          <p className="text-base text-wood-600">{t('skills.partnerNone')}</p>
        ) : (
          <ul className="space-y-4">
            {learned.map(({ owned, skill }) => (
              <li key={owned.skillId} className="flex items-start gap-3">
                <span className="px-slot-dark flex h-10 w-10 shrink-0 items-center justify-center text-flame-300">
                  <SkillIcon icon={skill!.icon} size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold leading-tight">{t(skill!.nameKey as TranslationKey)}</p>
                  <div className="my-1">
                    <TierPips level={owned.level} />
                  </div>
                  <SkillDescription skill={skill!} level={owned.level} className="text-sm leading-snug text-wood-600" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

export function SkillsView() {
  const { t } = useLanguage();
  const { activeCharacter } = useGame();
  const partner: CharacterId = activeCharacter === 'husband' ? 'wife' : 'husband';

  return (
    <section className="space-y-6">
      <PageHeader title={t('skills.title')} subtitle={t('skills.subtitle')} />
      {/* Your full tree takes the main column; the partner's learned skills sit in a slim side panel. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <SkillTree characterId={activeCharacter} />
        <aside className="lg:sticky lg:top-6">
          <PartnerLoadout characterId={partner} />
        </aside>
      </div>
    </section>
  );
}
