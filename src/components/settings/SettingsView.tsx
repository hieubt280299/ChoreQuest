import { Calendar, Coins, Languages, Lock, Script, User } from 'pixelarticons/react';
import { useState } from 'react';
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
import { MoneyInput } from '../ui/MoneyInput';
import { PageHeader } from '../ui/PageHeader';
import { AudioSettingsCard } from './AudioSettingsCard';
import { DeleteAccountButton } from './DeleteAccountButton';
import { HouseholdCard } from './HouseholdCard';
import { InstallAppCard } from './InstallAppCard';

function SectionTitle({ icon, children }: { icon: typeof Coins; children: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide text-brick-600">
      <Icon as={icon} size={24} />
      {children}
    </h2>
  );
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

function ChronicleCard() {
  const { t, locale } = useLanguage();
  const { state, canEditSettings, setChronicleEndDate } = useGame();
  const [error, setError] = useState<TranslationKey | null>(null);
  const { chronicle } = state;
  const today = localDateKey();
  const min = chronicle.startDate > today ? chronicle.startDate : today;

  return (
    <Card>
      <SectionTitle icon={Calendar}>{t('chronicle.endDate')}</SectionTitle>
      {!canEditSettings && <ModeratorOnlyNote />}
      <p className="mb-3 text-lg font-extrabold">
        {t('chronicle.label', { id: chronicle.id })}
        <span className="ml-2 text-base font-bold text-wood-600">{formatDateRange(chronicle.startDate, chronicle.endDate, locale)}</span>
      </p>
      <input
        type="date"
        className="px-input"
        aria-label={t('chronicle.endDate')}
        aria-describedby="chronicle-end-hint"
        value={chronicle.endDate}
        min={min}
        disabled={!canEditSettings}
        onChange={(event) => {
          const result = setChronicleEndDate(event.target.value);
          setError(result.ok ? null : result.error);
        }}
      />
      {error && (
        <p className="mt-3 text-base font-bold text-brick-600" role="alert">
          {t(error)}
        </p>
      )}
      <p id="chronicle-end-hint" className="mt-3 text-base text-wood-600">
        {t('chronicle.endHint')}
      </p>
    </Card>
  );
}

export function SettingsView() {
  const { t, language, setLanguage, locale } = useLanguage();
  const { state, canEditSettings, setPrizePool, upsertTask } = useGame();
  const { demoMode, user, logout, exitDemo } = useAuth();

  return (
    <section className="space-y-6">
      <PageHeader title={t('settings.title')} />
      <InstallAppCard />
      <HouseholdCard />
      <AudioSettingsCard />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle icon={Languages}>{t('settings.language')}</SectionTitle>
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
        </Card>
        <Card>
          <SectionTitle icon={Coins}>{t('settings.prize')}</SectionTitle>
          {!canEditSettings && <ModeratorOnlyNote />}
          <MoneyInput
            value={state.prizePool}
            onChange={(amount) => setPrizePool(amount)}
            locale={locale}
            disabled={!canEditSettings}
            aria-label={t('settings.prize')}
          />
        </Card>
      </div>
      <ChronicleCard />
      <Card>
        <SectionTitle icon={Script}>{t('settings.tasks')}</SectionTitle>
        {!canEditSettings && <ModeratorOnlyNote />}
        <fieldset disabled={!canEditSettings} className="space-y-4 disabled:opacity-70">
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
              </div>
            );
          })}
        </fieldset>
      </Card>
      <Card>
        <SectionTitle icon={User}>{t('settings.account')}</SectionTitle>
        {user?.email && <p className="text-lg font-extrabold">{user.email}</p>}
        <p className="text-base text-wood-600">{demoMode ? t('settings.demo') : t('settings.cloud')}</p>
        {user && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void logout()}>
              {t('auth.logout')}
            </Button>
            <DeleteAccountButton />
          </div>
        )}
        {demoMode && !user && (
          <Button className="mt-4" variant="secondary" onClick={exitDemo}>
            {t('auth.exitDemo')}
          </Button>
        )}
      </Card>
    </section>
  );
}
