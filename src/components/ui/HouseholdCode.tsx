import { Check, Copy } from 'pixelarticons/react';
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from './Button';
import { Icon } from './Icon';

/** The household join code in arcade digits, with a copy button. */
export function HouseholdCode({ code }: { code: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (e.g. insecure context): the code stays visible to copy by hand.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className="px-slot-dark select-all px-4 py-2 font-arcade text-lg tracking-[0.25em] text-flame-300"
        aria-label={`${t('household.code')}: ${code.split('').join(' ')}`}
      >
        {code}
      </span>
      <Button variant="secondary" onClick={() => void copy()} aria-live="polite">
        <Icon as={copied ? Check : Copy} size={24} />
        {copied ? t('household.copied') : t('household.copy')}
      </Button>
    </div>
  );
}
