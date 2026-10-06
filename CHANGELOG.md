# Changelog

All notable changes to ChoreQuest are listed here, newest first. Each version matches an `UPDATE_vX.Y.Z.md` spec in the repository root.

## [1.1.0] - 2026-10-06

Spec: [UPDATE_v1.1.0.md](UPDATE_v1.1.0.md)

### Added

- **Change password** in Settings: current password, new password and confirmation, checked against your current password before the change.
- **Confirm password** on the sign-up form. New passwords need at least 8 characters with a letter and a number.
- **Yesterday's quests:** until noon, if nothing has been logged today (and it isn't a chronicle's first day), the Quests tab offers yesterday's unfinished quests.
  - They pay no XP and half of base + skill gold (rounded down), and no streak bonus.
  - They still keep the streak going.
  - The gold counts for the payout but never changes yesterday's MVP, which is settled at midnight. Late entries are tagged in the day log.
- **Theme scenes:** each theme has its own cabin scene: a Mushroom Kingdom level, a meadow cottage, and an enchanted forest clearing with a rune stone.
- **Graphics quality** in Settings:
  - **High** is the full experience.
  - **Low** stops what can lag older phones: sprite and scene animation, looping effects, confetti and fixed backgrounds. The wheel spins for only 2 seconds.
  - Both settings keep the quick open, close and press transitions. The choice is saved per device.

### Changed

- "8-Bit Mushroom Kingdom" is now **Mushroom Kingdom**, using the exact palette: #5C94FC sky, #00A800 greens, #F8B800 gold accents, #C84C0C brick structure, black and white type.
- **Mushroom Kingdom boards:** the top bar and chronicle banner use deep brick with large, faint bricks and outlined text, so they're easy to read.
- **Shorter texts:** hints, warnings and setting descriptions are shorter and to the point (for example, Low graphics now reads just "Smoother on older phones.").

### Fixed

- **Tooltips:** every tooltip is now dark text on a light bubble in every theme. On Mushroom Kingdom's brick boards they used to pick up the board's text outline and were hard to read.
- **Lazy-loaded themes:** each non-default theme's scene and styles are now a separate download, fetched only when the theme is used or previewed. Cozy Hearth stays built in.

## [1.0.0] - 2026-10-05

Spec: [UPDATE_v1.0.0.md](UPDATE_v1.0.0.md)

### Added

- **Cosmetics:**
  - Four app themes: Cozy Hearth (default), 8-Bit Mushroom Kingdom, Whimsical Cottage and Enchanted Forest.
  - 16 new avatars for each character, on top of the Knight and Mage.
    - Husband: Forester, Harvester, Wayfarer, Artificer, Spellsmith, Botanist, Troubadour, Dreamer, Scrapper, Voyager, Courier, Monk, Fisherman, Merchant, Ranger, Sailor.
    - Wife: Baker, Florist, Herbalist, Apothecary, Beastmaster, Ranger, Courier, Explorer, Dancer, Acrobat, Puppeteer, Storyteller, Mechanic, Tailor, Cartographer, Captain.
- **Winner's reward:** from Day 1 of a new chronicle, the last chronicle's winner unlocks one theme or one of their own avatars for the household.
- **Wardrobe:** tap your character in the top bar to switch themes (just for you, on your device) and avatars (seen by your spouse too).
- **New skills:**
  - **Synergistic Streak** (_Cộng hưởng_): more gold and XP on quests your spouse has an active streak on.
  - **Hall of Fame** (_Đỉnh cao phong độ_): extra wheel tickets at every 5th MVP day of a chronicle, settled at midnight.
- **Quest search:** a fuzzy search on the Quests tab matches English and Vietnamese names at once, with or without accents.
- **Past chronicles** in the History tab: payouts, quests and gold per day, best streaks, MVP days and awards such as "Dishwashing Champion".
- **Mobile navigation:** Home, Quests, Skills and a **More** drawer with History, Calendar and Settings.
- **Theme previews** in the wardrobe: a miniature screen drawn in each theme.
- **Wheel result card:** after a spin, a popup shows the gold won or a good-luck wish, like "Quest complete!".

### Changed

- **Skills:**
  - Up to **8** skills per character; points still cap at 24.
  - XP-only skills now also pay gold at half their XP bonus.
  - Master Chef 10/18/26/34% gold, Quick Hands and Team Player 5/10/15/20% gold, Heavy Lifter 15/25/35/45% gold.
  - The Skills tab is split into **Learned** and **Unlearned** skills, and the Unlearned list hides when all slots are full.
- **Quest rebalance:**
  - Cooking quests −5 XP and −10 gold (40 XP, 45 gold).
  - Supermarket Shopping −5 gold.
  - Dust Furniture −10 XP and −15 gold.
  - Sweep House −5 XP and −5 gold.
  - Mop House −5 gold.
  - Vacuum House +2 XP (now Heavy).
  - Wash Clothes and Collect Dried Clothes +3 XP and +3 gold.
  - Dishwashing quests +5 XP and +5 gold.
  - Take Out Trash +5 gold.
  - Clean Fridge −5 gold.
  - Groups now follow XP: Quick up to 10, Moderate 11–40, Heavy 41+. Supermarket Shopping and Vacuum House are Heavy.
  - Existing households get the new values on unedited built-in quests.
- **Completed quest cards** are tinted by who did them: red for the husband, purple for the wife, and a blend of both for quests done together.
- **Level-up cards** only show for your own character, including level-ups caused by your spouse logging a quest.
- **Top bar:** fixed to the top of the screen, like the bottom bar.
- **Production domain:** `cqvn.vercel.app`, alongside the legacy `chore-quest-hieu-anh.vercel.app`.

### Fixed

- No more sideways scrolling or clipped cards on narrow phones, from 320px wide (e.g. Galaxy Z Flip 6), including the Skills page and the end-of-chronicle split.
- Household member names, roles and badges no longer overlap on small screens.
- The bottom bar no longer flickers during Wheel of Fortune spins.

## [0.2.1] - 2026-10-03

### Changed

- **Wheel of Fortune:** tap the wheel itself to spin; the separate Spin button is gone, and a blinking "Spin" label on the hub shows when you can.
- **Wheel face:** slices now have different sizes, with the jackpot slice the smallest to reflect its rarity, and run X, Jackpot, X, 3, 5, 10, 5, 3. At rest the pointer sits on the jackpot slice, and a shorter pointer never covers slice icons or values. Each spin lasts a random 5–10 seconds. The odds are unchanged.
- **Wheel layout:** your ticket count moved into the jackpot bar, with a tooltip showing how many tickets you have (or how to get more), and the empty gap under the wheel is gone.
- **Settings:** the quest configuration list shows the first 5 quests, with a "Show all" toggle for the rest.

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
