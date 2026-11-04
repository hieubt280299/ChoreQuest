import { Check, ChevronRight, Fire, Heart, Sword, TreePine } from 'pixelarticons/react';
import { useState, type ReactNode } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { prefersReducedMotion } from '../../hooks/useQuality';
import type { AppView } from '../../types';
import { addDays } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { firstSteps, todayStatus } from '../../utils/today';
import { Card } from '../ui/Card';
import { CharacterName, NAME_SLOT, spliceName } from '../ui/CharacterName';
import { Icon } from '../ui/Icon';
import { Snowflake } from '../ui/pixel/SnowflakeIcon';
import { Ticket } from '../ui/pixel/TicketIcon';

function Row({ icon, label, done = false, onClick }: { icon: ReactNode; label: string; done?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={done}
      onClick={onClick}
      className="px-focus flex min-h-11 w-full items-center gap-3 border-t-2 border-ink/10 text-left text-lg font-bold leading-tight first:border-t-0 disabled:cursor-default"
    >
      <span className={`flex w-6 shrink-0 justify-center ${done ? 'text-moss-700' : 'text-brick-600'}`}>{done ? <Icon as={Check} size={24} /> : icon}</span>
      <span className={`min-w-0 flex-1 ${done ? 'text-wood-600 line-through' : ''}`}>{label}</span>
      {!done && <Icon as={ChevronRight} size={24} className="shrink-0 text-wood-600" />}
    </button>
  );
}

/** Something that happened, not something to do: no tap, no chevron. */
function Note({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex min-h-11 items-center gap-3 border-t-2 border-ink/10 py-1 text-base font-bold leading-tight text-wood-700 first:border-t-0">
      <span className="flex w-6 shrink-0 justify-center text-brick-600">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

const scrollToWheel = () =>
  document.getElementById('wheel')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });

/**
 * Answers "what should I do now?": quests left, streaks at risk, the daily ticket, skill points and tickets to spin,
 * each one tap away. A new player sees a three-step checklist here instead.
 */
export function TodayCard({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { t } = useLanguage();
  const { state, today, activeCharacter, getTodayLog, getStreak, claimDailyTicket, freezesLeft } = useGame();
  const [error, setError] = useState<TranslationKey | null>(null);
  const character = state.characters[activeCharacter];
  const status = todayStatus(character, state.tasks, today, (taskId) => !!getTodayLog(taskId), (taskId) => getStreak(taskId, activeCharacter));
  const steps = firstSteps(character, state.logs);
  const newPlayer = !steps.skill;
  const heart = state.hearts.find((item) => item.to === activeCharacter && item.date === today);
  const frozeYesterday = state.freezes.some((freeze) => freeze.characterId === activeCharacter && freeze.date === addDays(today, -1));
  const freezes = freezesLeft(activeCharacter);

  const claim = () => {
    const result = claimDailyTicket(activeCharacter);
    setError(result.ok ? null : result.error);
  };
  const ticketIcon = <Icon as={Ticket} size={24} />;

  return (
    <Card className="!py-3">
      <h2 className="mb-1 text-xl font-extrabold uppercase leading-none text-brick-600">{t(newPlayer ? 'today.firstSteps' : 'today.title')}</h2>
      {newPlayer ? (
        <>
          <Row icon={<Icon as={Sword} size={24} />} label={t('today.stepQuest')} done={steps.quest} onClick={() => onNavigate('tasks')} />
          <Row icon={ticketIcon} label={t('today.ticket')} done={steps.ticket} onClick={claim} />
          <Row icon={<Icon as={TreePine} size={24} />} label={t('today.stepSkill')} onClick={() => onNavigate('skills')} />
        </>
      ) : (
        <>
          <Row
            icon={<Icon as={Sword} size={24} />}
            label={t('today.quests', { done: status.questsDone, total: status.questsTotal })}
            done={status.questsTotal > 0 && status.questsDone === status.questsTotal}
            onClick={() => onNavigate('tasks')}
          />
          {status.streaksAtRisk > 0 && (
            <Row
              icon={<Icon as={Fire} size={24} />}
              label={status.streaksAtRisk === 1 ? t('today.streakOne') : t('today.streaks', { count: status.streaksAtRisk })}
              onClick={() => onNavigate('tasks')}
            />
          )}
          {status.ticketReady && <Row icon={ticketIcon} label={t('today.ticket')} onClick={claim} />}
          {status.tickets > 0 && (
            <Row icon={ticketIcon} label={status.tickets === 1 ? t('today.spinOne') : t('today.spin', { count: status.tickets })} onClick={scrollToWheel} />
          )}
          {status.skillPoints > 0 && (
            <Row
              icon={<Icon as={TreePine} size={24} />}
              label={status.skillPoints === 1 ? t('today.pointOne') : t('today.points', { count: status.skillPoints })}
              onClick={() => onNavigate('skills')}
            />
          )}
        </>
      )}
      {heart && (
        <Note icon={<Icon as={Heart} size={24} />}>
          {spliceName(t('today.heart', { who: NAME_SLOT }), <CharacterName id={heart.from} />)}
        </Note>
      )}
      {frozeYesterday && (
        <Note icon={<Icon as={Snowflake} size={24} />}>
          {freezes === 1 ? t('today.frozeOne') : t('today.froze', { count: freezes })}
        </Note>
      )}
      {error && (
        <p className="mt-1 text-sm font-bold text-brick-600" role="alert">
          {t(error)}
        </p>
      )}
    </Card>
  );
}
