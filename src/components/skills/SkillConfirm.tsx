import { useLanguage } from '../../context/LanguageContext';
import type { SkillDefinition } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SkillIcon } from '../ui/SkillIcon';
import { SkillDescription } from './SkillDescription';

export interface SkillChoice {
  skill: SkillDefinition;
  /** Its current level (0 = not learned). */
  level: number;
}

/** Skill points can't be taken back, so spending one shows what it buys and asks first. */
export function SkillConfirm({
  choice,
  characterLevel,
  onCancel,
  onConfirm,
}: {
  choice: SkillChoice | null;
  characterLevel: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  const action = choice && choice.level > 0 ? t('skills.upgrade') : t('skills.unlock');

  return (
    <Modal open={!!choice} onClose={onCancel} title={action}>
      {choice && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <span className="px-slot-dark flex h-12 w-12 shrink-0 items-center justify-center text-flame-300">
              <SkillIcon icon={choice.skill.icon} size={24} />
            </span>
            <p className="min-w-0 text-xl font-extrabold leading-tight">
              {t(choice.skill.nameKey as TranslationKey)}
              <span className="block text-base font-bold text-wood-600">{t('skills.levelShort', { level: choice.level + 1 })}</span>
            </p>
          </div>
          <SkillDescription skill={choice.skill} level={choice.level + 1} exact interactive={false} characterLevel={characterLevel} className="mb-3 text-lg leading-snug" />
          <p className="mb-4 text-base text-wood-600">{t('skills.confirmHint')}</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onCancel}>
              {t('tasks.cancel')}
            </Button>
            <Button onClick={onConfirm}>{action}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
