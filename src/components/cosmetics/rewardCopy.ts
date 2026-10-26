import type { RewardOffer } from '../../utils/chronicleRewards';
import type { TranslationKey } from '../../utils/i18n';

/** Title and hint for a chronicle reward offer: what's left to unlock (avatar, theme or both). */
export function rewardCopy(reward: RewardOffer): { title: TranslationKey; hint: TranslationKey } {
  return {
    title: reward.winner ? 'cosmetics.rewardTitle' : 'cosmetics.rewardTitleAll',
    hint: reward.avatar && reward.theme ? 'cosmetics.rewardHintBoth' : reward.theme ? 'cosmetics.rewardHintTheme' : 'cosmetics.rewardHintAvatar',
  };
}
