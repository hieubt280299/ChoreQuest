import type { RewardOffer } from '../../utils/chronicleRewards';
import type { TranslationKey } from '../../utils/i18n';

/**
 * Title and hint for a chronicle reward offer: what's left to claim. Everyone may have an avatar to unlock; the winner
 * picks a new theme or Golden Tickets (only the tickets once every theme is unlocked).
 */
export function rewardCopy(reward: RewardOffer): { title: TranslationKey; hint: TranslationKey } {
  const hint: TranslationKey = !reward.tickets
    ? 'cosmetics.rewardHintAvatar'
    : reward.avatar
      ? reward.theme
        ? 'cosmetics.rewardHintWinnerAll'
        : 'cosmetics.rewardHintAvatarTickets'
      : reward.theme
        ? 'cosmetics.rewardHintWinner'
        : 'cosmetics.rewardHintTickets';
  return { title: reward.winner ? 'cosmetics.rewardTitle' : 'cosmetics.rewardTitleAll', hint };
}
