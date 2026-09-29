import { SKILL_POOL } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SkillIcon } from '../ui/SkillIcon';

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
  const { state, unlockSkill, upgradeSkill } = useGame();
  if (!characterId) return null;

  const character = state.characters[characterId];
  const points = skillPointsAvailable(getLevelFromXp(character.xp), character.skills);

  return (
    <Modal open={open} onClose={onClose} title={`${t('skills.picker')} · ${t(`character.${characterId}`)}`}>
      <p className="mb-3 text-sm font-bold text-emerald-700">{t('character.skillPoints', { count: points })}</p>
      {points < 1 && <p className="mb-3 text-sm text-stone-500">{t('skills.noPoints')}</p>}
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {SKILL_POOL.map((skill) => {
          const owned = character.skills.find((item) => item.skillId === skill.id);
          const canUnlock = !owned && points > 0 && character.skills.length < 6;
          const canUpgrade = !!owned && owned.level < 4 && points > 0;
          return (
            <div key={skill.id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
              <div className="rounded-xl bg-amber-warm p-2 text-amber-800">
                <SkillIcon icon={skill.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-stone-800">{t(skill.nameKey as TranslationKey)}</p>
                <p className="text-xs text-stone-500">{t(skill.descriptionKey as TranslationKey)}</p>
              </div>
              {owned?.level === 4 ? (
                <span className="text-xs font-bold text-stone-400">{t('skills.maxed')}</span>
              ) : owned ? (
                <Button disabled={!canUpgrade} onClick={() => upgradeSkill(characterId, skill.id)}>
                  {t('skills.upgrade')} {owned.level}/4
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
