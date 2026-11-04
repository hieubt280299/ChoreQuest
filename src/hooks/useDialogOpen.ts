import { useEffect, useState } from 'react';

const anyDialog = () => typeof document !== 'undefined' && !!document.querySelector('[role="dialog"]');

/** Whether any dialog is on screen, so something passing (a toast) can wait instead of covering it. */
export function useDialogOpen(): boolean {
  const [open, setOpen] = useState(anyDialog);
  useEffect(() => {
    const update = () => setOpen(anyDialog());
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    update();
    return () => observer.disconnect();
  }, []);
  return open;
}
