import { Castle, Login, Logout, Users } from 'pixelarticons/react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { HOUSEHOLD_CODE_LENGTH, normalizeHouseholdCode } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';

function ErrorNote({ error }: { error: TranslationKey | null }) {
  const { t } = useLanguage();
  if (!error) return null;
  return (
    <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
      {t(error)}
    </p>
  );
}

/** Shown to signed-in accounts without a household: create one or join with a code. */
export function OnboardingScreen() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { createHousehold, joinHousehold } = useHousehold();
  const [character, setCharacter] = useState<CharacterId>('husband');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [createError, setCreateError] = useState<TranslationKey | null>(null);
  const [joinError, setJoinError] = useState<TranslationKey | null>(null);

  const onCreate = async () => {
    setBusy('create');
    setCreateError(null);
    const result = await createHousehold(character);
    if (!result.ok) setCreateError(result.error);
    setBusy(null);
  };

  const onJoin = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('join');
    setJoinError(null);
    const result = await joinHousehold(code);
    if (!result.ok) setJoinError(result.error);
    setBusy(null);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <p className="px-wordmark text-[18px] sm:text-[22px]">ChoreQuest</p>
        <h1 className="px-title mt-5 text-4xl">{t('onboarding.title')}</h1>
        {user?.email && <p className="px-subtitle mt-1 text-lg">{t('onboarding.subtitle', { email: user.email })}</p>}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold uppercase text-brick-600">
            <Icon as={Castle} size={24} />
            {t('onboarding.createTitle')}
          </h2>
          <p className="text-base text-wood-600">{t('onboarding.createHint')}</p>
          <p className="text-base font-extrabold uppercase text-wood-700">{t('onboarding.pickCharacter')}</p>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('onboarding.pickCharacter')}>
            {(['husband', 'wife'] as CharacterId[]).map((id) => {
              const selected = character === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCharacter(id)}
                  className={`px-btn flex-col gap-2 py-3 ${selected ? 'px-btn-primary -translate-y-1' : ''}`}
                >
                  <CharacterAvatar id={id} scale={3} framed={false} />
                  {t(`character.${id}`)}
                </button>
              );
            })}
          </div>
          <ErrorNote error={createError} />
          <Button className="mt-auto w-full" onClick={() => void onCreate()} disabled={busy !== null}>
            <Icon as={Castle} size={24} />
            {t('onboarding.create')}
          </Button>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold uppercase text-brick-600">
            <Icon as={Users} size={24} />
            {t('onboarding.joinTitle')}
          </h2>
          <p className="text-base text-wood-600">{t('onboarding.joinHint')}</p>
          <form className="flex flex-1 flex-col gap-4" onSubmit={(event) => void onJoin(event)}>
            <label className="block text-base font-extrabold uppercase text-wood-700">
              {t('onboarding.code')}
              <input
                value={code}
                onChange={(event) => setCode(normalizeHouseholdCode(event.target.value))}
                maxLength={HOUSEHOLD_CODE_LENGTH}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="A7K9X2"
                className="px-input mt-2 text-center font-arcade text-xl tracking-[0.3em]"
              />
            </label>
            <ErrorNote error={joinError} />
            <Button
              type="submit"
              variant="brick"
              className="mt-auto w-full"
              disabled={busy !== null || code.length !== HOUSEHOLD_CODE_LENGTH}
            >
              <Icon as={Login} size={24} />
              {t('onboarding.join')}
            </Button>
          </form>
        </Card>
      </div>

      <div className="text-center">
        <Button variant="ghost" className="text-parchment-200" onClick={() => void logout()}>
          <Icon as={Logout} size={24} />
          {t('auth.logout')}
        </Button>
      </div>
    </div>
  );
}
