import type { TranslationKey } from './i18n';

/** New passwords (sign-up and change): at least 8 characters with a letter and a number. */
export const PASSWORD_MIN_LENGTH = 8;

/** What's wrong with a new password, or null if it's acceptable. */
export function passwordProblem(password: string): TranslationKey | null {
  if (!password) return 'password.error.empty';
  if (password.length < PASSWORD_MIN_LENGTH) return 'password.error.short';
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'password.error.pattern';
  return null;
}

/** Checks a new password and its confirmation together. */
export function newPasswordProblem(password: string, confirm: string): TranslationKey | null {
  return passwordProblem(password) ?? (password === confirm ? null : 'password.error.mismatch');
}
