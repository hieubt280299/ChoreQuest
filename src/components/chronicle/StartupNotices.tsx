import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useThemeScope } from '../../hooks/useTheme';
import { chronicleSummaryDue } from '../../utils/chronicleRewards';
import { markPatchNotesSeen, patchNotesPending } from '../../utils/seenVersion';
import { PatchNotesModal } from '../settings/PatchNotesModal';
import { ChronicleSummaryModal } from './ChronicleSummaryModal';

const summaryKey = (scope: string) => `chorequest.summarySeen.${scope}`;

function readSummarySeen(scope: string | null): number | null {
  if (!scope) return null;
  try {
    const value = Number(localStorage.getItem(summaryKey(scope)));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Notices shown when the app opens, one at a time: "What's New" once after each update, then the last
 * chronicle's summary the first time the app opens during the new one, whichever day that is (once per household
 * on this device).
 */
export function StartupNotices({ onOpenWardrobe }: { onOpenWardrobe: () => void }) {
  const { state } = useGame();
  const scope = useThemeScope();
  const [patchOpen, setPatchOpen] = useState(patchNotesPending);
  const [summarySeen, setSummarySeen] = useState(() => readSummarySeen(scope));

  const due = chronicleSummaryDue(state);
  // After "What's New" is closed, and only for a chronicle not shown on this device yet.
  const showSummary = !patchOpen && !!due && (summarySeen === null || summarySeen < due.chronicleId);

  const dismissSummary = () => {
    if (!due || !scope) return;
    setSummarySeen(due.chronicleId);
    try {
      localStorage.setItem(summaryKey(scope), String(due.chronicleId));
    } catch {
      // Storage unavailable: it may show again on the next launch today.
    }
  };

  return (
    <>
      <PatchNotesModal
        open={patchOpen}
        onClose={() => {
          markPatchNotesSeen();
          setPatchOpen(false);
        }}
      />
      <ChronicleSummaryModal
        result={showSummary ? due : null}
        onClose={dismissSummary}
        onOpenRewards={() => {
          dismissSummary();
          onOpenWardrobe();
        }}
      />
    </>
  );
}
