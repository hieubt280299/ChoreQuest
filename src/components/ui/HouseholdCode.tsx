import { Check, Copy, Share } from 'pixelarticons/react';
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { inviteUrl } from '../../utils/invite';
import { Button } from './Button';
import { Icon } from './Icon';

/** The household join code in arcade digits, with copy and share-link buttons. */
export function HouseholdCode({ code }: { code: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const copy = async (text: string, what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard blocked (e.g. insecure context): the code stays visible to copy by hand.
    }
  };

  // The phone's share sheet where there is one (Zalo, Messages and so on), otherwise the link is copied.
  const share = async () => {
    const url = inviteUrl(code, window.location.origin);
    if (typeof navigator.share !== 'function') {
      await copy(url, 'link');
      return;
    }
    try {
      await navigator.share({ title: 'ChoreQuest', text: t('household.shareText', { code }), url });
    } catch (err) {
      if (err instanceof DOMException && err.name !== 'AbortError') await copy(url, 'link');
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
      <Button variant="secondary" onClick={() => void copy(code, 'code')} aria-live="polite">
        <Icon as={copied === 'code' ? Check : Copy} size={24} />
        {copied === 'code' ? t('household.copied') : t('household.copy')}
      </Button>
      <Button onClick={() => void share()} aria-live="polite">
        <Icon as={copied === 'link' ? Check : Share} size={24} />
        {copied === 'link' ? t('household.linkCopied') : t('household.share')}
      </Button>
    </div>
  );
}
