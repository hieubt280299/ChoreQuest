import { Trophy, User } from 'pixelarticons/react';
import { useEffect, useState } from 'react';
import { AVATARS, DEFAULT_AVATAR, DEFAULT_THEME, THEMES } from '../../constants/cosmetics';
import { WINNER_GOLDEN_TICKETS } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../hooks/useTheme';
import type { AvatarId, CharacterId, ThemeId } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { Ticket } from '../ui/pixel/TicketIcon';
import { rewardCopy } from './rewardCopy';
import { ThemePreview } from './ThemePreview';
import { Tile } from './Tile';

/**
 * The chronicle reward dialog, apart from the Wardrobe: it lists only what this player can take right now. The
 * winner picks ONE prize (a locked theme, OR Golden Tickets; only the tickets once every theme is unlocked), and
 * everyone unlocks one locked avatar. It closes itself once nothing is left to take.
 */
export function RewardPickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const { state, activeCharacter, canRename, pendingReward, claimReward } = useGame();
  const { setTheme } = useTheme();
  const [theme, setPickedTheme] = useState<ThemeId | null>(null);
  const [avatar, setPickedAvatar] = useState<AvatarId | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const me: CharacterId = activeCharacter;
  const { cosmetics } = state;
  const reward = canRename(me) ? pendingReward(me) : null;

  // Fresh picks each time it opens, and closed once every reward is taken.
  useEffect(() => {
    if (open) {
      setPickedTheme(null);
      setPickedAvatar(null);
      setError(null);
    }
  }, [open]);
  const empty = !reward;
  useEffect(() => {
    if (open && empty) onClose();
  }, [open, empty, onClose]);

  // Only what can be taken: locked themes and locked avatars.
  const lockedThemes = THEMES.filter((item) => item !== DEFAULT_THEME && !cosmetics.themes.includes(item));
  const lockedAvatars = AVATARS[me].filter((item) => item !== DEFAULT_AVATAR[me] && !cosmetics.avatars[me].includes(item));

  const take = (kind: 'theme' | 'avatar' | 'tickets', item?: ThemeId | AvatarId) => {
    const result = claimReward(me, kind, item);
    setError(result.ok ? null : result.error);
    if (!result.ok) return;
    if (kind === 'theme' && item) setTheme(item as ThemeId);
    if (kind === 'avatar') setPickedAvatar(null);
    else setPickedTheme(null);
  };

  const copy = reward ? rewardCopy(reward) : null;
  const themeName = (item: ThemeId) => t(`theme.${item}` as TranslationKey);
  const avatarName = (item: AvatarId) => t(`avatar.${item}` as TranslationKey);

  return (
    <Modal open={open && !!reward} onClose={onClose} title={reward ? t(copy!.title, { id: reward.chronicleId }) : ''}>
      {reward && (
        <div className="space-y-5">
          {/* The winner's prize: ONE of a theme or the tickets. */}
          {reward.tickets && (
            <section aria-labelledby="reward-prize" className="space-y-3">
              <h3 id="reward-prize" className="flex items-center gap-2 text-lg font-extrabold uppercase leading-tight">
                <Icon as={Trophy} size={24} className="shrink-0 text-ember-700" />
                {t(reward.theme ? 'cosmetics.winnerPick' : 'cosmetics.winnerPrize')}
              </h3>
              {reward.theme && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {lockedThemes.map((item) => (
                      <Tile
                        key={item}
                        label={themeName(item)}
                        state="pick"
                        selected={theme === item}
                        onClick={() => setPickedTheme(item)}
                      >
                        <ThemePreview theme={item} />
                      </Tile>
                    ))}
                  </div>
                  <Button className="w-full" disabled={!theme} onClick={() => theme && take('theme', theme)}>
                    {theme ? t('cosmetics.claimPrize', { item: themeName(theme) }) : t('cosmetics.pickTheme')}
                  </Button>
                  {/* Plain font: the arcade font has no Vietnamese "Ặ" (HOẶC). */}
                  <div className="flex items-center gap-3" aria-hidden="true">
                    <span className="h-0.5 flex-1 bg-ink/20" />
                    <span className="bg-flame-300 px-2 py-0.5 text-sm font-extrabold uppercase leading-tight text-ink shadow-[0_0_0_2px_#2b1a12]">
                      {t('cosmetics.or')}
                    </span>
                    <span className="h-0.5 flex-1 bg-ink/20" />
                  </div>
                </>
              )}
              <div className="px-slot flex items-center gap-3 p-3">
                <Icon as={Ticket} size={36} className="shrink-0 text-ember-700" />
                <span className="min-w-0 flex-1 text-base font-extrabold leading-tight">
                  {t('cosmetics.prizeTickets', { count: WINNER_GOLDEN_TICKETS })}
                </span>
                <Button
                  variant="moss"
                  className="shrink-0"
                  onClick={() => take('tickets')}
                  aria-label={t('cosmetics.takeTickets', { count: WINNER_GOLDEN_TICKETS })}
                >
                  {t('cosmetics.take')}
                </Button>
              </div>
            </section>
          )}

          {/* Everyone's unlock: one locked avatar. */}
          {reward.avatar && (
            <section aria-labelledby="reward-avatar" className={`space-y-3 ${reward.tickets ? 'border-t-2 border-ink/10 pt-4' : ''}`}>
              <h3 id="reward-avatar" className="flex items-center gap-2 text-lg font-extrabold uppercase leading-tight">
                <Icon as={User} size={24} className="shrink-0 text-ember-700" />
                {t('cosmetics.avatarPrize')}
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {lockedAvatars.map((item) => (
                  <Tile key={item} label={avatarName(item)} state="pick" selected={avatar === item} onClick={() => setPickedAvatar(item)}>
                    <span className="flex h-14 items-end">
                      <CharacterAvatar id={me} avatar={item} scale={3} framed={false} />
                    </span>
                  </Tile>
                ))}
              </div>
              <Button className="w-full" disabled={!avatar} onClick={() => avatar && take('avatar', avatar)}>
                {avatar ? t('cosmetics.claim', { item: avatarName(avatar) }) : t('cosmetics.pickAvatar')}
              </Button>
            </section>
          )}

          {error && (
            <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50" role="alert">
              {t(error)}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
