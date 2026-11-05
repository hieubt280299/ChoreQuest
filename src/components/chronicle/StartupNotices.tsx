import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useThemeScope } from '../../hooks/useTheme';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import { chronicleSummaryDue } from '../../utils/chronicleRewards';
import { markPatchNotesSeen, patchNotesPending } from '../../utils/seenVersion';
import { PatchNotesModal } from '../settings/PatchNotesModal';
import { RefundNoticeModal } from '../skills/RefundNoticeModal';
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
 * Notices shown when the app opens, one at a time: "What's New" once after each update, then (once per player) that
 * a rebalance refunded their skill points, then the last chronicle's summary the first time the app opens during
 * the new one, whichever day that is (once per household on this device).
 */
export function StartupNotices({ onOpenWardrobe, onOpenSkills }: { onOpenWardrobe: () => void; onOpenSkills: () => void }) {
  const { state, activeCharacter, canActAs, dismissRefundNotice } = useGame();
  const scope = useThemeScope();
  const [patchOpen, setPatchOpen] = useState(patchNotesPending);
  const [summarySeen, setSummarySeen] = useState(() => readSummarySeen(scope));

  const character = state.characters[activeCharacter];
  const showRefund = !patchOpen && !!character.refundNotice && canActAs(activeCharacter);
  const due = chronicleSummaryDue(state);
  // After the notices above are closed, and only for a chronicle not shown on this device yet.
  const showSummary = !patchOpen && !showRefund && !!due && (summarySeen === null || summarySeen < due.chronicleId);

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
      <RefundNoticeModal
        open={showRefund}
        points={skillPointsAvailable(getLevelFromXp(character.xp), character.skills)}
        onClose={() => dismissRefundNotice(activeCharacter)}
        onOpenSkills={() => {
          dismissRefundNotice(activeCharacter);
          onOpenSkills();
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
