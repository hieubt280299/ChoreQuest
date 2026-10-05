import { ChevronUp, Plus } from 'pixelarticons/react';
import { useState, type ReactNode } from 'react';
import { HALL_OF_FAME_EVERY, MAX_SKILL_LEVEL, MAX_SKILLS_PER_CHARACTER, SKILL_POOL } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { Character, CharacterId, SkillDefinition } from '../../types';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { CharacterName, NAME_SLOT, spliceName } from '../ui/CharacterName';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { IconButton } from '../ui/IconButton';
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
          <CharacterName id={character.id} />
        </h2>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold text-parchment-300">
          {t('skills.owned', { count: character.skills.length, max: MAX_SKILLS_PER_CHARACTER })}
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

/** One skill card with its unlock / upgrade action. */
function SkillCard({
  skill,
  level,
  editable,
  canUnlock,
  canUpgrade,
  onUnlock,
  onUpgrade,
  extra,
}: {
  skill: SkillDefinition;
  level: number;
  editable: boolean;
  canUnlock: boolean;
  canUpgrade: boolean;
  onUnlock: () => void;
  onUpgrade: () => void;
  extra?: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center ${level > 0 ? 'px-slot-dark text-flame-300' : 'px-slot text-wood-500'}`}
        >
          <SkillIcon icon={skill.icon} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-extrabold leading-tight">{t(skill.nameKey as TranslationKey)}</p>
          <SkillDescription skill={skill} level={level} className="text-base leading-snug text-wood-600" />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <TierPips level={level} />
            {extra}
          </div>
        </div>
        {level === MAX_SKILL_LEVEL ? (
          <span className="text-base font-extrabold uppercase text-moss-700">{t('skills.maxed')}</span>
        ) : !editable ? null : level > 0 ? (
          <IconButton icon={ChevronUp} variant="primary" align="right" label={t('skills.upgrade')} disabled={!canUpgrade} onClick={onUpgrade} />
        ) : (
          <IconButton icon={Plus} align="right" label={t('skills.unlock')} disabled={!canUnlock} onClick={onUnlock} />
        )}
      </div>
    </Card>
  );
}

/**
 * Your character's skills, split into Learned and Unlearned (hidden once all 8 slots are used). Each list
 * keeps the fixed pool order, and unlock buttons pause briefly after an unlock: the learned card leaves the
 * list, so a quick second tap would otherwise land on the skill that slid into its place.
 */
function SkillTree({ characterId }: { characterId: CharacterId }) {
  const { t } = useLanguage();
  const { state, unlockSkill, upgradeSkill, canActAs } = useGame();
  const [cooling, setCooling] = useState(false);
  const character = state.characters[characterId];
  const points = skillPointsAvailable(getLevelFromXp(character.xp), character.skills);
  const editable = canActAs(characterId);
  const levelOf = (skillId: string) => character.skills.find((item) => item.skillId === skillId)?.level ?? 0;
  const learned = SKILL_POOL.filter((skill) => levelOf(skill.id) > 0);
  const unlearned = SKILL_POOL.filter((skill) => levelOf(skill.id) === 0);
  const slotsFull = character.skills.length >= MAX_SKILLS_PER_CHARACTER;

  const unlock = (skillId: string) => {
    if (unlockSkill(characterId, skillId).ok) {
      setCooling(true);
      window.setTimeout(() => setCooling(false), 600);
    }
  };
  const card = (skill: SkillDefinition) => {
    const level = levelOf(skill.id);
    return (
      <SkillCard
        key={skill.id}
        skill={skill}
        level={level}
        editable={editable}
        canUnlock={!cooling && level === 0 && points > 0 && !slotsFull}
        canUpgrade={level > 0 && level < MAX_SKILL_LEVEL && points > 0}
        onUnlock={() => unlock(skill.id)}
        onUpgrade={() => upgradeSkill(characterId, skill.id)}
        extra={
          skill.effect.kind === 'mvp_tickets' && level > 0 ? (
            <span className="text-sm font-bold uppercase text-wood-600">
              {t('skills.mvpProgress', { count: character.mvpDays % HALL_OF_FAME_EVERY, every: HALL_OF_FAME_EVERY })}
            </span>
          ) : undefined
        }
      />
    );
  };

  return (
    <div className="space-y-5">
      <CharacterSkillHeader character={character} />
      <section className="space-y-4" aria-label={t('skills.learned')}>
        <h2 className="px-title text-2xl">
          {t('skills.learned')}
          <span className="ml-2 font-arcade text-[10px] text-parchment-300">
            {character.skills.length}/{MAX_SKILLS_PER_CHARACTER}
          </span>
        </h2>
        {learned.length === 0 ? (
          <Card className="p-4 text-base text-wood-600">{t('skills.noneLearned')}</Card>
        ) : (
          <div className="grid grid-cols-1 gap-5">{learned.map(card)}</div>
        )}
      </section>
      {!slotsFull && (
        <section className="space-y-4" aria-label={t('skills.unlearned')}>
          <h2 className="px-title text-2xl">{t('skills.unlearned')}</h2>
          <div className="grid grid-cols-1 gap-5">{unlearned.map(card)}</div>
        </section>
      )}
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
          {spliceName(t('skills.partnerLoadout', { name: NAME_SLOT }), <CharacterName id={characterId} />)}
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <SkillTree characterId={activeCharacter} />
        <aside className="lg:sticky lg:top-6">
          <PartnerLoadout characterId={partner} />
        </aside>
      </div>
    </section>
  );
}
