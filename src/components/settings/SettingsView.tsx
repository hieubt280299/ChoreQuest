import { useAuth } from '../../context/AuthContext';
import { TASK_CATEGORIES, useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { LanguageCode } from '../../types';
import { translations, type TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function SettingsView() {
  const { t, language, setLanguage } = useLanguage();
  const { state, setPrizePool, upsertTask } = useGame();
  const { demoMode, user, logout, exitDemo } = useAuth();

  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl text-stone-800">{t('settings.title')}</h1>
      <Card>
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-stone-400">{t('settings.language')}</p>
        <div className="flex gap-2">
          {(['en', 'vi'] as LanguageCode[]).map((code) => (
            <Button
              key={code}
              variant={language === code ? 'primary' : 'secondary'}
              onClick={() => setLanguage(code)}
            >
              {code === 'en' ? 'English' : 'Tiếng Việt'}
            </Button>
          ))}
        </div>
      </Card>
      <Card>
        <label className="block text-sm font-bold text-stone-600">
          {t('settings.prize')}
          <input
            type="number"
            min={0}
            value={state.prizePool}
            onChange={(event) => setPrizePool(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 font-semibold"
          />
        </label>
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-xl">{t('settings.tasks')}</h2>
        <div className="space-y-3">
          {state.tasks.map((task) => (
            <div key={task.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-stone-50 p-3">
              <p className="min-w-40 flex-1 font-bold">
                {task.nameKey in translations.en ? t(task.nameKey as TranslationKey) : task.nameKey}
              </p>
              <select
                value={task.category}
                onChange={(event) => upsertTask({ ...task, category: event.target.value as (typeof TASK_CATEGORIES)[number] })}
                className="rounded-xl border border-stone-200 bg-white px-2 py-1 text-sm"
              >
                {TASK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(`category.${category}` as TranslationKey)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="w-20 rounded-xl border border-stone-200 px-2 py-1 text-sm"
                value={task.xp}
                onChange={(event) => upsertTask({ ...task, xp: Number(event.target.value) })}
              />
              <input
                type="number"
                className="w-20 rounded-xl border border-stone-200 px-2 py-1 text-sm"
                value={task.gold}
                onChange={(event) => upsertTask({ ...task, gold: Number(event.target.value) })}
              />
              <label className="flex items-center gap-1 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={task.enabled}
                  onChange={(event) => upsertTask({ ...task, enabled: event.target.checked })}
                />
                {t('settings.enabled')}
              </label>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <p className="text-sm text-stone-600">{demoMode ? t('settings.demo') : t('settings.cloud')}</p>
        {user && (
          <Button className="mt-3" variant="secondary" onClick={() => void logout()}>
            {t('auth.logout')}
          </Button>
        )}
        {demoMode && !user && (
          <Button className="mt-3" variant="secondary" onClick={exitDemo}>
            {t('auth.exitDemo')}
          </Button>
        )}
      </Card>
    </section>
  );
}
