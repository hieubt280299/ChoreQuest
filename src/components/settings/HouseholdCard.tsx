import { Castle, Crown, Logout } from 'pixelarticons/react';
import { useState } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, HouseholdMember } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { HouseholdCode } from '../ui/HouseholdCode';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

/** Join code, members and roles, and leaving. Only shown for online households. */
export function HouseholdCard() {
  const { t } = useLanguage();
  const { status, household, me, isModerator, grantModerator, leaveHousehold } = useHousehold();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  if (status !== 'ready' || !household || !me) return null;

  const members = household.data.memberIds
    .map((id) => household.data.members[id])
    .filter((member): member is HouseholdMember => !!member);
  const isLast = members.length <= 1;
  const missing = (['husband', 'wife'] as CharacterId[]).filter((id) => !members.some((member) => member.characterId === id));

  const run = async (action: () => Promise<{ ok: boolean; error?: TranslationKey }>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    if (!result.ok && result.error) setError(result.error);
    setBusy(false);
    return result.ok;
  };

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide text-brick-600">
        <Icon as={Castle} size={24} />
        {t('household.title')}
      </h2>
      <p className="mb-2 text-base font-extrabold uppercase text-wood-700">{t('household.code')}</p>
      <HouseholdCode code={household.data.code} />

      <p className="mb-3 mt-5 text-base font-extrabold uppercase text-wood-700">{t('household.members')}</p>
      <ul className="space-y-3">
        {members.map((member) => {
          const isMe = member.uid === me.uid;
          return (
            <li key={member.uid} className="px-slot flex flex-wrap items-center gap-3 p-3">
              <CharacterAvatar id={member.characterId} scale={2} framed={false} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold leading-tight">
                  {t(`character.${member.characterId}`)}
                  {isMe && <span className="ml-2 text-base text-wood-600">({t('household.you')})</span>}
                </p>
                {member.email && <p className="truncate text-sm text-wood-600">{member.email}</p>}
              </div>
              {member.role === 'moderator' ? (
                <span className="px-level font-sans text-sm font-extrabold uppercase">
                  <Icon as={Crown} size={12} />
                  {t('household.moderator')}
                </span>
              ) : (
                <span className="text-sm font-extrabold uppercase text-wood-600">{t('household.member')}</span>
              )}
              {isModerator && !isMe && member.role !== 'moderator' && (
                <Button variant="secondary" disabled={busy} onClick={() => void run(() => grantModerator(member.uid))}>
                  <Icon as={Crown} size={24} />
                  {t('household.makeModerator')}
                </Button>
              )}
            </li>
          );
        })}
        {missing.map((id) => (
          <li key={id} className="px-slot flex items-center gap-3 p-3 opacity-60">
            <CharacterAvatar id={id} scale={2} framed={false} />
            <p className="flex-1 text-lg font-extrabold">{t(`character.${id}`)}</p>
            <span className="text-sm font-bold uppercase text-wood-600">{t('household.emptySlot')}</span>
          </li>
        ))}
      </ul>

      {error && !confirmLeave && (
        <p className="mt-4 bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
          {t(error)}
        </p>
      )}
      <Button className="mt-5" variant="secondary" onClick={() => setConfirmLeave(true)}>
        <Icon as={Logout} size={24} />
        {t('household.leave')}
      </Button>

      <Modal open={confirmLeave} onClose={() => setConfirmLeave(false)} title={t('household.leaveConfirmTitle')}>
        <p className="mb-3 text-base">{t('household.leaveConfirm')}</p>
        {isLast && <p className="mb-3 text-base font-extrabold text-brick-600">{t('household.leaveLast')}</p>}
        {error && (
          <p className="mb-3 bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50" role="alert">
            {t(error)}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
            {t('tasks.cancel')}
          </Button>
          <Button
            variant="brick"
            disabled={busy}
            onClick={() => void run(leaveHousehold).then((ok) => ok && setConfirmLeave(false))}
          >
            <Icon as={Logout} size={24} />
            {t('household.leave')}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
