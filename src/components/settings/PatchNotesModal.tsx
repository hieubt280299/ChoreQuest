import { Bug, Chart, Sparkles, Zap } from 'pixelarticons/react';
import { BALANCE_PARTS, PATCH_HEADINGS, PATCH_NOTES, type PatchSection, type VersionConfig } from '../../constants/patchNotes';
import { useLanguage } from '../../context/LanguageContext';
import { formatDay } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

const SECTION_ICONS: Partial<Record<PatchSection, typeof Sparkles>> = {
  features: Sparkles,
  balance: Chart,
  fixes: Bug,
  performance: Zap,
};

function NoteList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-base leading-snug">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 bg-ember-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * "What's New": the current version's notes in plain language, grouped into Major features, Balance adjustments
 * (general notes, then Skills and Quests), Bug fixes and Performance (empty sections are left out).
 */
export function PatchNotesModal({ open, onClose, release = PATCH_NOTES[0] }: { open: boolean; onClose: () => void; release?: VersionConfig }) {
  const { t, language, locale } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} title={t('patch.title')}>
      <div className="space-y-5">
        <p className="font-arcade text-[10px] text-wood-600">
          {t('patch.version', { version: release.version, date: formatDay(release.date, locale) })}
        </p>
        {PATCH_HEADINGS.map((section) => {
          const notes = (key: PatchSection) => release.notes[key]?.[language] ?? [];
          const items = notes(section);
          const parts = section === 'balance' ? BALANCE_PARTS.filter((part) => notes(part).length > 0) : [];
          if (items.length === 0 && parts.length === 0) return null;
          return (
            <section key={section}>
              <h3 className="mb-2 flex items-center gap-2 text-lg font-extrabold uppercase text-brick-600">
                <Icon as={SECTION_ICONS[section]!} size={24} />
                {t(`patch.section.${section}` as TranslationKey)}
              </h3>
              <div className="space-y-3">
                {items.length > 0 && <NoteList items={items} />}
                {parts.map((part) => (
                  <div key={part}>
                    <h4 className="mb-1.5 text-base font-extrabold uppercase text-wood-600">{t(`patch.section.${part}` as TranslationKey)}</h4>
                    <NoteList items={notes(part)} />
                  </div>
                ))}
              </div>
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
