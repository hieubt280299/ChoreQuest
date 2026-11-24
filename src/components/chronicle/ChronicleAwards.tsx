import { Crown, Fire, Heart, Trophy } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { ChronicleAward } from '../../types';
import { taskName } from '../../utils/taskNames';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { CharacterName } from '../ui/CharacterName';
import { Icon } from '../ui/Icon';

function Award({ award }: { award: ChronicleAward }) {
  const { t, language } = useLanguage();
  const { state } = useGame();
  let title: string;
  let icon = Trophy;
  if (award.kind === 'champion') {
    const task = state.tasks.find((item) => item.id === award.taskId);
    title = t('archive.champion', { quest: task ? taskName(task, language) : t('history.removedQuest') });
  } else if (award.kind === 'streak') {
    title = t('archive.streakMaster', { days: award.days });
    icon = Fire;
  } else if (award.kind === 'hearts') {
    title = award.count === 1 ? t('archive.mostLovedOne') : t('archive.mostLoved', { count: award.count });
    icon = Heart;
  } else {
    title = t('archive.mvpKing', { days: award.days });
    icon = Crown;
  }
  return (
    <li className="px-slot flex items-center gap-2 px-2 py-1.5">
      <Icon as={icon} size={24} className="shrink-0 text-ember-600" />
      <span className="min-w-0 flex-1 text-base font-extrabold leading-tight">{title}</span>
      <CharacterAvatar id={award.characterId} scale={1} framed={false} />
      <span className="max-w-[7rem] truncate text-sm font-bold uppercase text-wood-700">
        <CharacterName id={award.characterId} />
      </span>
    </li>
  );
}

/** A chronicle's fun awards: quest champions, Streak Master, most MVP days, most hearts. */
export function ChronicleAwards({ awards }: { awards: ChronicleAward[] }) {
  const { t } = useLanguage();
  if (awards.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-extrabold uppercase text-brick-600">{t('archive.awards')}</p>
      <ul className="space-y-2">
        {awards.map((award) => (
          <Award key={`${award.kind}-${award.kind === 'champion' ? award.taskId : ''}`} award={award} />
        ))}
      </ul>
    </div>
  );
}
