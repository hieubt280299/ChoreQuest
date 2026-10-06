import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AudioProvider } from './context/AudioContext';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { HouseholdProvider } from './context/HouseholdContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';
import './hooks/useQuality';
import './utils/installPrompt';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AudioProvider>
        <AuthProvider>
          <HouseholdProvider>
            <GameProvider>
              <App />
            </GameProvider>
          </HouseholdProvider>
        </AuthProvider>
      </AudioProvider>
    </LanguageProvider>
  </StrictMode>,
);
