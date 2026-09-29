import { useState } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { BottomNav, SideNav } from './components/auth/Navigation';
import { ProfileSwitcher } from './components/auth/ProfileSwitcher';
import { CalendarView } from './components/calendar/CalendarView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { SkillPickerModal } from './components/skills/SkillPickerModal';
import { SkillsView } from './components/skills/SkillsView';
import { RewardModal } from './components/tasks/RewardModal';
import { TasksView } from './components/tasks/TasksView';
import { useAuth } from './context/AuthContext';
import { useGame } from './context/GameContext';
import type { AppView, CharacterId } from './types';
import { getLevelFromXp, skillPointsAvailable } from './utils/calculations';

export default function App() {
  const { user, demoMode, loading: authLoading } = useAuth();
  const { state, loading: gameLoading } = useGame();
  const [view, setView] = useState<AppView>('dashboard');
  const [skillCharacter, setSkillCharacter] = useState<CharacterId | null>(null);

  if (authLoading || gameLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-2xl text-stone-500">
        ChoreQuest
      </div>
    );
  }

  if (!user && !demoMode) {
    return <AuthScreen />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-6 px-4 pb-24 pt-6 md:pb-10">
      <SideNav view={view} onChange={setView} />
      <main className="min-w-0 flex-1 space-y-4">
        <div className="flex justify-end">
          <ProfileSwitcher />
        </div>
        {view === 'dashboard' && <DashboardView />}
        {view === 'tasks' && <TasksView />}
        {view === 'skills' && <SkillsView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'settings' && <SettingsView />}
      </main>
      <BottomNav view={view} onChange={setView} />
      <RewardModal
        onAssignSkills={() => {
          const leveled = (['husband', 'wife'] as CharacterId[]).find((id) => {
            const character = state.characters[id];
            return skillPointsAvailable(getLevelFromXp(character.xp), character.skills) > 0;
          });
          setSkillCharacter(leveled ?? state.activeCharacter);
          setView('skills');
        }}
      />
      <SkillPickerModal
        open={!!skillCharacter}
        characterId={skillCharacter}
        onClose={() => setSkillCharacter(null)}
      />
    </div>
  );
}
