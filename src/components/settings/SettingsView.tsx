import { Coins, Languages, Script, User } from 'pixelarticons/react';
import { useAuth } from '../../context/AuthContext';
import { TASK_CATEGORIES, useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { LanguageCode } from '../../types';
import { translations, type TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { AudioSettingsCard } from './AudioSettingsCard';
import { InstallAppCard } from './InstallAppCard';

function SectionTitle({ icon, children }: { icon: typeof Coins; children: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide text-brick-600">
      <Icon as={icon} size={24} />
      {children}
    </h2>
  );
}

export function SettingsView() {
  const { t, language, setLanguage } = useLanguage();
  const { state, setPrizePool, upsertTask } = useGame();
  const { demoMode, user, logout, exitDemo } = useAuth();

  return (
    <section className="space-y-6">
      <PageHeader title={t('settings.title')} />
      <InstallAppCard />
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
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label={t('settings.prize')}
            value={state.prizePool}
            onChange={(event) => setPrizePool(Number(event.target.value))}
            className="px-input"
          />
        </Card>
      </div>
      <Card>
        <SectionTitle icon={Script}>{t('settings.tasks')}</SectionTitle>
        <div className="space-y-4">
          {state.tasks.map((task) => {
            const name = task.nameKey in translations.en ? t(task.nameKey as TranslationKey) : task.nameKey;
            return (
              <div key={task.id} className="px-slot flex flex-wrap items-center gap-3 p-3">
                <p className="min-w-40 flex-1 text-lg font-extrabold">{name}</p>
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
        </div>
      </Card>
      <Card>
        <SectionTitle icon={User}>{t('settings.account')}</SectionTitle>
        {user?.email && <p className="text-lg font-extrabold">{user.email}</p>}
        <p className="text-base text-wood-600">{demoMode ? t('settings.demo') : t('settings.cloud')}</p>
        {user && (
          <Button className="mt-4" variant="secondary" onClick={() => void logout()}>
            {t('auth.logout')}
          </Button>
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
