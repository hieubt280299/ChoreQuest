import { Play } from 'pixelarticons/react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { CabinScene } from '../dashboard/CabinScene';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

export function AuthScreen() {
  const { t } = useLanguage();
  const { login, register, enterDemo, firebaseConfigured, missingKeys, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-4 py-10">
      {/* Arcade title screen */}
      <div className="text-center">
        <h1 className="px-wordmark text-[22px] sm:text-[28px]" style={{ textShadow: '3px 3px 0 #b04a34, 6px 6px 0 #1f130c' }}>
          ChoreQuest
        </h1>
        <p className="px-subtitle mt-4 text-xl">{t('app.tagline')}</p>
      </div>
      <div className="px-panel px-panel-wood p-2">
        <CabinScene />
      </div>
      {!firebaseConfigured && (
        <Card tone="ember">
          <p className="text-base font-bold">{t('auth.missingFirebase')}</p>
          {missingKeys.length > 0 && <p className="mt-2 break-all font-mono text-xs">{missingKeys.join(', ')}</p>}
        </Card>
      )}
      <Card className="pt-6">
        <h2 className="mb-5 text-3xl font-extrabold uppercase">{t('auth.welcome')}</h2>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === 'login') void login(email, password);
            else void register(email, password);
          }}
        >
          <input
            type="email"
            autoComplete="email"
            placeholder={t('auth.email')}
            aria-label={t('auth.email')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="px-input"
            disabled={!firebaseConfigured}
          />
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={t('auth.password')}
            aria-label={t('auth.password')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="px-input"
            disabled={!firebaseConfigured}
          />
          {error && (
            <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
              {t(error)}
            </p>
          )}
          <div className="flex gap-3 pt-1">
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
        <Button className="mt-6 w-full" variant="brick" onClick={enterDemo}>
          <Icon as={Play} size={24} />
          {t('auth.demo')}
        </Button>
      </Card>
    </div>
  );
}
