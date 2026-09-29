import { Home } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function AuthScreen() {
  const { t } = useLanguage();
  const { login, register, enterDemo, firebaseConfigured, missingKeys, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-amber-700 shadow-cozy">
          <Home />
        </div>
        <h1 className="font-display text-4xl text-stone-800">{t('app.name')}</h1>
        <p className="text-stone-500">{t('app.tagline')}</p>
      </div>
      {!firebaseConfigured && (
        <Card className="mb-4 border border-rose-200 bg-rose-soft">
          <p className="text-sm font-semibold text-rose-900">{t('auth.missingFirebase')}</p>
          {missingKeys.length > 0 && (
            <p className="mt-2 font-mono text-xs text-rose-800">{missingKeys.join(', ')}</p>
          )}
        </Card>
      )}
      <Card>
        <h2 className="mb-4 font-display text-2xl">{t('auth.welcome')}</h2>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === 'login') void login(email, password);
            else void register(email, password);
          }}
        >
          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-stone-200 px-3 py-2"
            disabled={!firebaseConfigured}
          />
          <input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-stone-200 px-3 py-2"
            disabled={!firebaseConfigured}
          />
          {error && <p className="text-sm font-semibold text-rose-600">{t(error)}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={!firebaseConfigured}>
              {mode === 'login' ? t('auth.login') : t('auth.register')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              disabled={!firebaseConfigured}
            >
              {mode === 'login' ? t('auth.register') : t('auth.login')}
            </Button>
          </div>
        </form>
        <Button className="mt-4 w-full" variant="rose" onClick={enterDemo}>
          {t('auth.demo')}
        </Button>
      </Card>
    </div>
  );
}
