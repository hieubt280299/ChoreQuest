# Changelog

All notable changes to ChoreQuest are listed here, newest first. Each version matches an `UPDATE_vX.Y.Z.md` spec in the repository root.

## [0.2.0] - 2026-10-02

Spec: [UPDATE_v0.2.0.md](UPDATE_v0.2.0.md)

### Added

- **Wheel of Fortune** on the Home tab: spend a ticket to spin an 8-bit pixel wheel.
  - Prizes: +3, +5 or +10 gold, a jackpot of 100 gold plus the bonus pot, or no prize ("Good luck next time!").
  - Every miss adds 10 gold to the shared jackpot, and a jackpot win resets it. Jackpot wins get pixel confetti and a fanfare.
  - Wheel gold counts for the chronicle payout but not for the day's MVP.
- **Wheel tickets:**
  - Claim one free ticket per day from your character card.
  - Earn one ticket per new level. Undoing and redoing a quest can't earn the same level's ticket twice.
  - The ticket count shows next to gold on each card.
- **New skills:**
  - **Fortune's Favor** (_Kiếm vé may mắn_): 2 / 3 / 4 / 5 extra tickets at the start of each chronicle.
  - **Gold Interest** (_Tích tiểu thành đại_): gain 2 / 4 / 6 / 8% of your current gold each day, from day 2 of a chronicle. Interest counts for the payout but not for the day's MVP.
- **Level-up modal:** each level-up gets its own retro card with a badge animation and the gold bonus, wheel ticket and skill point it paid. It appears after the "Quest complete!" card.
- **Chronicle banner** on Home: chronicle number, countdown, prize pool and the live payout split in one place.
- **Calendar day log:**
  - Tap any day to read its page of the chronicle: quests and wheel spins with times, each player's gold and XP, and the day's MVP.
  - Tags mark today, the best day, the payout day, rest days and upcoming days.
  - Interest and wheel gold appear in a bonus tooltip.
- **Character names:** rename your own character (up to 16 letters, numbers or spaces). The name replaces the role label across the app and keeps the exact case you typed.
- **Quests tab "Show" filter** (All / Incomplete / Completed). The defaults are now Your streak / None / All, each listed first.
- **History:** shows the top 5 quests per player, with a "Show all quests" toggle.
- **Unspent skill points** appear as a number on the Skills tab.
- **Save button** for the chronicle end date, so a date isn't applied while you're still choosing it.

### Changed

- **Home tab:**
  - The header is now **Party status**, with a "quests completed today · gold earned" summary.
  - The cabin scene sits above the chronicle banner.
  - Character cards wrap long names, line up evenly, and show equal-height gold and ticket badges.
- **Compact actions:** completed quests use an icon "Fix entry" button. Edit quest, skill unlock and upgrade, and moderator roles are also icon buttons with tooltips.
- **Quest cards:**
  - Cards are tighter.
  - Streak badges are compact chips ("🔥 3") on the quest's name line, with a "3-day streak" tooltip.
  - Streaks show only from day 3, when they start counting.
- **Tooltips** fit their content and always stay on screen.
- **Comparison bars** in History show full names when there's room.
- **Settings:** the household join code is hidden once both players have joined.
- **Vietnamese dates** read `01/10/2026` instead of `1 thg 10, 2026`.
- **Copy cleanup:** long helper texts became info tooltips or were removed.

### Fixed

- Quest cards no longer overflow narrow phone screens.
- Skill tooltips no longer make the page scroll sideways.
- Character name input is capped at 16 characters, and each Vietnamese letter counts once.
- Pull-to-refresh no longer reloads the installed Android app.

## [0.1.0] - 2026-10-01

Spec: [UPDATE_v0.1.0.md](UPDATE_v0.1.0.md)

### Added

- **Households** for two players (husband and wife): create one or join with a 6-character code.
  - Onboarding and an offline demo mode.
  - Moderator and member roles; only the founder can change roles.
  - Leaving a household and deleting your account.
- **Chronicles (seasons):**
  - Moderators set the end date.
  - A chronicle rolls over automatically into a new one-month chronicle.
  - Gold resets at rollover while XP, levels and skills persist. The prize pool is split by gold earned.
- **Quest audit:** undo a completion or change who did it, by the person who logged it, the affected player or a moderator.
- **Streaks:** completing a quest on consecutive days pays Fibonacci bonus gold from day 3.
- **Quest groups** (Quick / Moderate / Heavy) and skills that boost a group instead of a time of day.
- **Skills:**
  - Descriptions show every level's value (Dota-style) with the current level highlighted.
  - Highlighted quest categories and groups show which quests they apply to.
- **"Who did it?" reward preview** with the full base, skills and streak breakdown.
- **Quests tab** sorting and grouping.
- **History tab:** each player's quests this chronicle, compared with their partner.
- **Level 30 mastery** celebration and Master badge, and a moderator "New legend" reset of levels and skills.
- **Quests:**
  - Bilingual quest names.
  - A rebalanced default quest list, with XP halved so levelling feels earned.
  - A "Reset quests to defaults" action.
- **Formatted prize pool input** with thousand separators.
- **NES-style chiptune** background music and sound effects.
- **Retro pixel theme, PWA and Firebase** (from the earlier groundwork):
  - A retro 16-bit pixel cabin theme and a Dota-style level ring.
  - An installable PWA.
  - Optional Firebase Analytics.

### Fixed

- The modal close button is aligned inside its frame.
- Creating a household no longer hits a permission error from a listener race.
