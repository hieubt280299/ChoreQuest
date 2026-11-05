import { TreePine } from 'pixelarticons/react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

/** Once after the v1.8.0 skill rebalance: every learned skill was unlearned, so the points can be spent again. */
export function RefundNoticeModal({
  open,
  points,
  onClose,
  onOpenSkills,
}: {
  open: boolean;
  /** Skill points the player now has to spend. */
  points: number;
  onClose: () => void;
  onOpenSkills: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} title={t('refund.title')}>
      <div className="space-y-4">
        <p className="text-lg leading-snug">{t('refund.body')}</p>
        <p className="px-slot flex items-center gap-2 px-3 py-2 text-lg font-extrabold text-brick-600">
          <Icon as={TreePine} size={24} />
          {points === 1 ? t('refund.pointsOne') : t('refund.points', { count: points })}
        </p>
        <div className="space-y-3">
          <Button className="w-full" onClick={onOpenSkills}>
            {t('refund.pick')}
          </Button>
          <Button className="w-full" variant="secondary" onClick={onClose}>
            {t('refund.later')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
