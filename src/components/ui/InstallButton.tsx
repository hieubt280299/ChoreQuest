import { Close, Dock, Download, ExternalLink, MoreHorizontal, MoreVertical, Plus, Share } from 'pixelarticons/react';
import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import type { InstallStep } from '../../utils/installGuide';
import { canInstall, currentInstallGuide, promptInstall, showInstallButton, subscribeInstallPrompt } from '../../utils/installPrompt';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

const stepIcons: Record<InstallStep['icon'], typeof Download> = {
  external: ExternalLink,
  share: Share,
  plus: Plus,
  menuVertical: MoreVertical,
  menuHorizontal: MoreHorizontal,
  download: Download,
  dock: Dock,
  close: Close,
};

/** Whether "Get the app" shows here, kept up to date as the browser offers or finishes an install. */
export function useInstallButton(): boolean {
  return useSyncExternalStore(subscribeInstallPrompt, showInstallButton);
}

/** The short, numbered install guide for this device and browser. */
export function InstallGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const steps = currentInstallGuide();
  return (
    <Modal open={open} onClose={onClose} title={t('install.title')}>
      <div className="space-y-4">
        <p className="text-lg leading-snug">{t('install.intro')}</p>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step.text} className="px-slot flex items-center gap-3 px-3 py-2 text-lg leading-snug">
              <span className="font-arcade text-[13px] text-brick-600">{index + 1}</span>
              <Icon as={stepIcons[step.icon]} size={24} />
              <span className="min-w-0 flex-1">{t(step.text)}</span>
            </li>
          ))}
        </ol>
        <Button className="w-full" onClick={onClose}>
          {t('install.done')}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * "Get the app": opens the browser's own install dialog where it has one, otherwise a short guide. Hidden inside the
 * installed app. `icon` is the square top-bar button, `menu` a navigation row, `card` a full-width button.
 * `onPrompted` runs once the browser's dialog opens (e.g. to close the More drawer); the guide keeps the drawer open,
 * since closing it would unmount the guide too.
 */
export function InstallButton({
  variant,
  menuItem = false,
  onPrompted,
  className = '',
}: {
  variant: 'icon' | 'menu' | 'card';
  /** Inside a `role="menu"` list (the More drawer). */
  menuItem?: boolean;
  onPrompted?: () => void;
  /** Extra classes for the `icon` button (e.g. `md:hidden` in the top bar). */
  className?: string;
}) {
  const { t } = useLanguage();
  const visible = useInstallButton();
  const [guideOpen, setGuideOpen] = useState(false);
  if (!visible) return null;

  const label = t('install.button');
  const open = () => {
    if (!canInstall()) {
      setGuideOpen(true);
      return;
    }
    void promptInstall();
    onPrompted?.();
  };
  // Rendered at the page root: the side menu (sticky), the More drawer (animated) and the top bar (own layer) would
  // otherwise trap the guide under the page or inside themselves.
  const guide = createPortal(<InstallGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />, document.body);

  if (variant === 'icon') {
    return (
      <>
        <button type="button" onClick={open} aria-label={label} title={label} className={`px-btn h-11 w-11 shrink-0 p-0 ${className}`}>
          <Icon as={Download} size={24} />
        </button>
        {guide}
      </>
    );
  }
  if (variant === 'menu') {
    return (
      <>
        <button
          type="button"
          role={menuItem ? 'menuitem' : undefined}
          onClick={open}
          className={`px-tab w-full px-4 text-lg ${menuItem ? 'py-3' : 'py-2.5'}`}
        >
          <Icon as={Download} size={24} />
          {label}
        </button>
        {guide}
      </>
    );
  }
  return (
    <>
      <Button variant="moss" onClick={open}>
        <Icon as={Download} size={24} />
        {label}
      </Button>
      {guide}
    </>
  );
}
