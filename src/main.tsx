import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';
import './utils/installPrompt';

function BridgedApp() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream font-display text-2xl text-stone-500">
        ChoreQuest
      </div>
    );
  }
  return (
    <GameProvider>
      <LanguageBridge />
    </GameProvider>
  );
}

function LanguageBridge() {
  const { state, setLanguage } = useGame();
  return (
    <LanguageProvider language={state.language} setLanguage={setLanguage}>
      <App />
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BridgedApp />
    </AuthProvider>
  </StrictMode>,
);
