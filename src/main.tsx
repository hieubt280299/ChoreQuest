import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { AudioProvider } from './context/AudioContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';
import './utils/installPrompt';

function BridgedApp() {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
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
    <AudioProvider>
      <AuthProvider>
        <BridgedApp />
      </AuthProvider>
    </AudioProvider>
  </StrictMode>,
);
