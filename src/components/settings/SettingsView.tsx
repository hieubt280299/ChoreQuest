import { Calendar, Check, CircleInfo, Coins, Lock, Monitor, Pencil, Script, Sparkles } from 'pixelarticons/react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TASK_GROUPS } from '../../constants/gameRules';
import { TASK_CATEGORIES, useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { LanguageCode, TaskGroup } from '../../types';
import { formatDateRange, localDateKey } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { taskName } from '../../utils/taskNames';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { MoneyInput } from '../ui/MoneyInput';
import { PageHeader } from '../ui/PageHeader';
import { Tooltip } from '../ui/Tooltip';
import { TEXT_ACTION } from '../ui/textAction';
import { AudioSettingsCard } from './AudioSettingsCard';
import { ChangePasswordForm } from './ChangePassword';
import { SettingsQualityToggle } from './SettingsQualityToggle';
import { DeleteAccountButton } from './DeleteAccountButton';
import { HouseholdCard } from './HouseholdCard';
import { InstallAppCard } from './InstallAppCard';
import { NewLegendCard } from './NewLegendCard';
import { ResetQuestsButton } from './ResetQuestsButton';
import { PatchNotesModal } from './PatchNotesModal';
import { APP_VERSION } from '../../constants/patchNotes';

function SectionTitle({ icon, children }: { icon: typeof Coins; children: string }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide text-brick-600">
      <Icon as={icon} size={24} />
      {children}
    </h3>
  );
}

/** Heading of a group of settings cards (Preferences / Household / Account), on the page background. */
function GroupTitle({ children }: { children: string }) {
  return <h2 className="px-title pt-2 text-2xl">{children}</h2>;
}

/** Small uppercase label for one setting inside a card. */
function FieldLabel({ children }: { children: string }) {
  return <p className="mb-2 text-base font-extrabold uppercase tracking-wide text-wood-700">{children}</p>;
}


/** Shown on household settings a non-moderator can view but not change. */
function ModeratorOnlyNote() {
  const { t } = useLanguage();
  return (
    <p className="mb-4 flex items-center gap-2 text-base font-bold text-wood-600">
      <Icon as={Lock} size={24} />
      {t('household.moderatorOnly')}
    </p>
  );
}

/** The chronicle's rules in one card: its end date and the prize pool. */
function ChronicleCard() {
  const { t, locale } = useLanguage();
  const { state, canEditSettings, setChronicleEndDate, setPrizePool } = useGame();
  const [error, setError] = useState<TranslationKey | null>(null);
  const { chronicle } = state;
  const today = localDateKey();
  const min = chronicle.startDate > today ? chronicle.startDate : today;
  // Edits stay a draft until Save, so picking a date doesn't end the chronicle mid-typing.
  const [draft, setDraft] = useState(chronicle.endDate);
  useEffect(() => {
    setDraft(chronicle.endDate);
    setError(null);
  }, [chronicle.endDate]);
  const dirty = draft !== chronicle.endDate;

  const save = () => {
    const result = setChronicleEndDate(draft);
    setError(result.ok ? null : result.error);
  };

  return (
    <Card>
      <SectionTitle icon={Calendar}>{t('settings.chronicle')}</SectionTitle>
      {!canEditSettings && <ModeratorOnlyNote />}
      <p className="mb-4 text-lg font-extrabold">
        {t('chronicle.label', { id: chronicle.id })}
        <span className="ml-2 text-base font-bold text-wood-600">{formatDateRange(chronicle.startDate, chronicle.endDate, locale)}</span>
        <Tooltip
          label={<Icon as={CircleInfo} size={24} className="text-wood-600" />}
          content={t('chronicle.endHint')}
          triggerClassName="ml-2 align-middle"
          align="right"
        />
      </p>
      <FieldLabel>{t('chronicle.endDate')}</FieldLabel>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <input
          type="date"
          className="px-input min-w-0 flex-1"
          aria-label={t('chronicle.endDate')}
          value={draft}
          min={min}
          disabled={!canEditSettings}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
        />
        {canEditSettings && dirty && (
          <Button type="submit" disabled={!draft}>
            {t('tasks.save')}
          </Button>
        )}
      </form>
      {error && (
        <p className="mt-3 text-base font-bold text-brick-600" role="alert">
          {t(error)}
        </p>
      )}
      <div className="mt-5">
        <FieldLabel>{t('settings.prize')}</FieldLabel>
        <MoneyInput
          value={state.prizePool}
          onChange={(amount) => setPrizePool(amount)}
          locale={locale}
          disabled={!canEditSettings}
          aria-label={t('settings.prize')}
        />
      </div>
    </Card>
  );
}

export function SettingsView() {
  const { t, language, setLanguage } = useLanguage();
  const [changingPassword, setChangingPassword] = useState(false);
  const [patchNotesOpen, setPatchNotesOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [showAllQuests, setShowAllQuests] = useState(false);
  const { state, canEditSettings, upsertTask } = useGame();
  const { demoMode, user, logout, exitDemo } = useAuth();

  return (
    <section className="space-y-6">
      <PageHeader title={t('settings.title')} />
      <InstallAppCard />

      {/* This device only: sound, graphics and language. */}
      <GroupTitle>{t('settings.group.preferences')}</GroupTitle>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AudioSettingsCard />
        <Card>
          <SectionTitle icon={Monitor}>{t('settings.display')}</SectionTitle>
          <SettingsQualityToggle />
          <div className="mt-5 border-t-[3px] border-ink/15 pt-5">
            <FieldLabel>{t('settings.language')}</FieldLabel>
            <div className="flex flex-wrap gap-3">
              {(['en', 'vi'] as LanguageCode[]).map((code) => (
                <Button
                  key={code}
                  variant={language === code ? 'primary' : 'secondary'}
                  aria-pressed={language === code}
                  onClick={() => setLanguage(code)}
                >
                  {code === 'en' ? 'English' : 'Tiếng Việt'}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Shared by the household; changes are moderator-only. */}
      <GroupTitle>{t('settings.group.household')}</GroupTitle>
      <HouseholdCard />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChronicleCard />
        <Card>
          <SectionTitle icon={Script}>{t('settings.tasks')}</SectionTitle>
          {!canEditSettings && <ModeratorOnlyNote />}
          {/* The quest list opens in a dialog, so it never stretches this card (or the one beside it on wide screens);
              resetting lives inside it. */}
          <Button variant="secondary" className="w-full" aria-haspopup="dialog" onClick={() => setShowAllQuests(true)}>
            <Icon as={canEditSettings ? Pencil : Script} size={24} />
            {t(canEditSettings ? 'settings.editQuests' : 'settings.showAllQuests', { count: state.tasks.length })}
          </Button>
          <Modal wide open={showAllQuests} onClose={() => setShowAllQuests(false)} title={t('settings.tasks')}>
            <div className="space-y-4">
            <fieldset id="quest-config" disabled={!canEditSettings} className="space-y-4 disabled:opacity-70">
              {state.tasks.map((task) => {
                const name = taskName(task, language);
                return (
                  <div key={task.id} className="px-slot flex flex-wrap items-center gap-3 p-3">
                    <p className="min-w-40 flex-1 text-lg font-extrabold">{name}</p>
                    <select
                      value={task.group}
                      aria-label={`${name}: ${t('tasks.group')}`}
                      onChange={(event) => upsertTask({ ...task, group: event.target.value as TaskGroup })}
                      className="px-input w-auto py-1 text-base"
                    >
                      {TASK_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {t(`group.${group}`)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={task.category}
                      aria-label={`${name}: ${t('tasks.category')}`}
                      onChange={(event) =>
                        upsertTask({ ...task, category: event.target.value as (typeof TASK_CATEGORIES)[number] })
                      }
                      className="px-input w-auto py-1 text-base"
                    >
                      {TASK_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {t(`category.${category}` as TranslationKey)}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-sm font-extrabold uppercase text-moss-700">
                      XP
                      <input
                        type="number"
                        className="px-input w-20 py-1 text-base"
                        value={task.xp}
                        onChange={(event) => upsertTask({ ...task, xp: Number(event.target.value) })}
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-sm font-extrabold uppercase text-ember-700">
                      {t('tasks.gold')}
                      <input
                        type="number"
                        className="px-input w-20 py-1 text-base"
                        value={task.gold}
                        onChange={(event) => upsertTask({ ...task, gold: Number(event.target.value) })}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-base font-bold">
                      <input
                        type="checkbox"
                        className="px-check"
                        checked={task.enabled}
                        onChange={(event) => upsertTask({ ...task, enabled: event.target.checked })}
                      />
                      {t('settings.enabled')}
                    </label>
                    {/* Moderate quests can ask for effort (Light / Normal / Heavy) when completed; off by default. */}
                    {task.group === 'main' && (
                      <label className="flex items-center gap-2 text-base font-bold">
                        <input
                          type="checkbox"
                          className="px-check"
                          checked={task.intensityEnabled === true}
                          onChange={(event) => upsertTask({ ...task, intensityEnabled: event.target.checked })}
                        />
                        {t('settings.intensity')}
                      </label>
                    )}
                  </div>
                );
              })}
            </fieldset>
              <ResetQuestsButton />
            </div>
          </Modal>
        </Card>
      </div>
      {/* Only once a player reaches the level cap (the mastery card points here). */}
      <NewLegendCard />

      {/* Account, plus the app's version and rarely used actions in a quiet footer. */}
      <GroupTitle>{t('settings.group.account')}</GroupTitle>
      <Card>
        {user?.email && <p className="text-lg font-extrabold [overflow-wrap:anywhere]">{user.email}</p>}
        <p className="text-base text-wood-600">{demoMode ? t('settings.demo') : t('settings.cloud')}</p>
        {user && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void logout()}>
              {t('auth.logout')}
            </Button>
            {user.email && (
              <Button
                variant="secondary"
                aria-expanded={changingPassword}
                onClick={() => {
                  setChangingPassword((value) => !value);
                  setPasswordChanged(false);
                }}
              >
                <Icon as={Lock} size={24} />
                {t('password.title')}
              </Button>
            )}
          </div>
        )}
        {passwordChanged && (
          <p className="mt-4 flex items-center gap-2 text-base font-extrabold text-moss-700" role="status">
            <Icon as={Check} size={24} />
            {t('password.changed')}
          </p>
        )}
        {user?.email && changingPassword && (
          <ChangePasswordForm
            onCancel={() => setChangingPassword(false)}
            onDone={() => {
              setChangingPassword(false);
              setPasswordChanged(true);
            }}
          />
        )}
        {demoMode && !user && (
          <Button className="mt-4" variant="secondary" onClick={exitDemo}>
            {t('auth.exitDemo')}
          </Button>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 border-t-[3px] border-ink/15 pt-2">
          <span className="flex flex-wrap items-center gap-x-3">
            <span className="font-arcade text-[10px] text-wood-600">{t('settings.version', { version: APP_VERSION })}</span>
            <button type="button" className={`${TEXT_ACTION} text-wood-700`} onClick={() => setPatchNotesOpen(true)}>
              <Icon as={Sparkles} size={12} />
              {t('patch.open')}
            </button>
          </span>
          {user && (
            <span className="ml-auto">
              <DeleteAccountButton />
            </span>
          )}
        </div>
        <PatchNotesModal open={patchNotesOpen} onClose={() => setPatchNotesOpen(false)} />
      </Card>
    </section>
  );
}
