import { useState } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { CosmeticPicker } from './components/cosmetics/CosmeticPicker';
import { RewardBanner } from './components/cosmetics/RewardBanner';
import { BottomNav, SideNav } from './components/auth/Navigation';
import { OnboardingScreen } from './components/auth/OnboardingScreen';
import { ProfileSwitcher } from './components/auth/ProfileSwitcher';
import { CalendarView } from './components/calendar/CalendarView';
import { DashboardView } from './components/dashboard/DashboardView';
import { InviteBanner } from './components/dashboard/InviteBanner';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { SkillPickerModal } from './components/skills/SkillPickerModal';
import { SkillsView } from './components/skills/SkillsView';
import { RewardModal } from './components/tasks/RewardModal';
import { TasksView } from './components/tasks/TasksView';
import { AudioToggle } from './components/ui/AudioToggle';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { useAuth } from './context/AuthContext';
import { useGame } from './context/GameContext';
import { useHousehold } from './context/HouseholdContext';
import { useApplyTheme, useTheme } from './hooks/useTheme';
import type { AppView, CharacterId } from './types';
import { getLevelFromXp, skillPointsAvailable } from './utils/calculations';

export default function App() {
  const { user, demoMode, loading: authLoading } = useAuth();
  const { status } = useHousehold();
  const { state, loading: gameLoading, activeCharacter, canActAs } = useGame();
  const [view, setView] = useState<AppView>('dashboard');
  const [skillCharacter, setSkillCharacter] = useState<CharacterId | null>(null);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  // This player's theme (per device), applied to the whole page.
  const { theme } = useTheme();
  useApplyTheme(status === 'ready' || status === 'demo' ? theme : 'hearth');

  if (authLoading) return <LoadingScreen />;
  if (!user && !demoMode) return <AuthScreen />;
  // Online play requires a household; only the offline demo skips this.
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'none') return <OnboardingScreen />;
  if (gameLoading) return <LoadingScreen />;

  return (
    <div className="max-w-full overflow-x-clip">
      {/* Fixed top bar: sound and character controls stay in reach while the page scrolls. */}
      <header className="px-panel-wood fixed inset-x-0 top-0 z-50 border-b-4 border-ink [transform:translateZ(0)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 md:justify-end">
          <p className="px-wordmark hidden text-[11px] min-[400px]:block md:hidden">ChoreQuest</p>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <AudioToggle />
            <ProfileSwitcher onOpenWardrobe={() => setWardrobeOpen(true)} />
          </div>
        </div>
      </header>
      <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-4 pb-32 pt-20 md:pb-10">
        <SideNav view={view} onChange={setView} />
        <main className="min-w-0 flex-1 space-y-6">
          <InviteBanner />
          <RewardBanner onOpen={() => setWardrobeOpen(true)} />
          {view === 'dashboard' && <DashboardView />}
          {view === 'tasks' && <TasksView />}
          {view === 'skills' && <SkillsView />}
          {view === 'history' && <HistoryView />}
          {view === 'calendar' && <CalendarView />}
          {view === 'settings' && <SettingsView />}
        </main>
      </div>
      <BottomNav view={view} onChange={setView} />
      <RewardModal
        onAssignSkills={() => {
          const leveled = (['husband', 'wife'] as CharacterId[]).find((id) => {
            const character = state.characters[id];
            return canActAs(id) && skillPointsAvailable(getLevelFromXp(character.xp), character.skills) > 0;
          });
          setSkillCharacter(leveled ?? activeCharacter);
          setView('skills');
        }}
      />
      <SkillPickerModal open={!!skillCharacter} characterId={skillCharacter} onClose={() => setSkillCharacter(null)} />
      <CosmeticPicker open={wardrobeOpen} onClose={() => setWardrobeOpen(false)} />
    </div>
  );
}
