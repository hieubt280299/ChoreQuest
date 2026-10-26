import { Bug, Chart, Sparkles, Zap } from 'pixelarticons/react';
import { PATCH_NOTES, PATCH_SECTIONS, type PatchSection, type VersionConfig } from '../../constants/patchNotes';
import { useLanguage } from '../../context/LanguageContext';
import { formatDay } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

const SECTION_ICONS: Record<PatchSection, typeof Sparkles> = {
  features: Sparkles,
  balance: Chart,
  fixes: Bug,
  performance: Zap,
};

/**
 * "What's New": the current version's notes in plain language, grouped into Major features, Balance adjustments,
 * Bug fixes and Performance (empty sections are left out).
 */
export function PatchNotesModal({ open, onClose, release = PATCH_NOTES[0] }: { open: boolean; onClose: () => void; release?: VersionConfig }) {
  const { t, language, locale } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} title={t('patch.title')}>
      <div className="space-y-5">
        <p className="font-arcade text-[10px] text-wood-600">
          {t('patch.version', { version: release.version, date: formatDay(release.date, locale) })}
        </p>
        {PATCH_SECTIONS.map((section) => {
          const items = release.notes[section]?.[language] ?? [];
          if (items.length === 0) return null;
          return (
            <section key={section}>
              <h3 className="mb-2 flex items-center gap-2 text-lg font-extrabold uppercase text-brick-600">
                <Icon as={SECTION_ICONS[section]} size={24} />
                {t(`patch.section.${section}` as TranslationKey)}
              </h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex gap-2 text-base leading-snug">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 bg-ember-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <Button className="w-full" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Modal>
  );
}
