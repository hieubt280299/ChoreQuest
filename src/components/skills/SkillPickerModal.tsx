import { SKILL_POOL } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SkillIcon } from '../ui/SkillIcon';
import { SkillDescription } from './SkillDescription';
import { TierPips } from './SkillsView';

export function SkillPickerModal({
  open,
  characterId,
  onClose,
}: {
  open: boolean;
  characterId: CharacterId | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { state, unlockSkill, upgradeSkill, canActAs } = useGame();
  if (!characterId || !canActAs(characterId)) return null;

  const character = state.characters[characterId];
  const points = skillPointsAvailable(getLevelFromXp(character.xp), character.skills);

  return (
    <Modal open={open} onClose={onClose} title={`${t('skills.picker')} · ${t(`character.${characterId}`)}`}>
      <p className="mb-1 text-lg font-extrabold uppercase text-moss-700">{t('character.skillPoints', { count: points })}</p>
      {points < 1 && <p className="mb-2 text-base text-wood-600">{t('skills.noPoints')}</p>}
      <div className="-mx-1 max-h-[55vh] space-y-4 overflow-y-auto px-2 py-2">
        {SKILL_POOL.map((skill) => {
          const owned = character.skills.find((item) => item.skillId === skill.id);
          const canUnlock = !owned && points > 0 && character.skills.length < 6;
          const canUpgrade = !!owned && owned.level < 4 && points > 0;
          return (
            <div key={skill.id} className="px-slot flex items-center gap-3 p-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${owned ? 'px-slot-dark text-flame-300' : 'text-wood-600'}`}>
                <SkillIcon icon={skill.icon} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold leading-tight">{t(skill.nameKey as TranslationKey)}</p>
                <SkillDescription skill={skill} level={owned?.level ?? 0} className="text-sm leading-snug text-wood-600" />
                <div className="mt-1.5">
                  <TierPips level={owned?.level ?? 0} />
                </div>
              </div>
              {owned?.level === 4 ? (
                <span className="text-base font-extrabold uppercase text-moss-700">{t('skills.maxed')}</span>
              ) : owned ? (
                <Button disabled={!canUpgrade} onClick={() => upgradeSkill(characterId, skill.id)}>
                  {t('skills.upgrade')}
                </Button>
              ) : (
                <Button variant="secondary" disabled={!canUnlock} onClick={() => unlockSkill(characterId, skill.id)}>
                  {t('skills.unlock')}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
