Act as a Principal Full-Stack Engineer specializing in React, TypeScript, and Firebase. You are building a production-ready, gamified household task web application named "ChoreQuest".

---

### 🛠️ Tech Stack & Constraints

- **Frontend:** React 18 + TypeScript (Vite)
- **Styling:** Tailwind CSS + Pixelarticons (pixel icon set) + Framer Motion (stepped, frame-by-frame animations)
- **State Management:** React Context API + Custom Hooks
- **Audio:** Optional chiptune BGM + SFX synthesized with the Web Audio API (`utils/chiptune.ts`, song data in `constants/chiptuneSong.ts`), controlled by `context/AudioContext.tsx` (`useAudio`). No audio files; sound is off until the player enables it (autoplay rules). The BGM is "Brickroad Bounce", an original loop in the style of NES platformer overworld themes (190 BPM; two square voices with a third-below harmony, a triangle bass and noise percussion). It must stay original: no existing game music is reproduced.
- **Backend/Database/Auth:** Google Firebase (v10+ Modular SDK using Firestore and Auth)
- **Localization:** i18next or simple light React i18n Context supporting **English (EN)** and **Vietnamese (VI)** with hot-swapping in settings.
- **Hosting/Deployment:** Vercel (SPA fallback via `vercel.json`).
- **Strict Rule:** Direct client-side SDK integration for all game data. The only server code is the push-notification functions in `api/` (Vercel Functions + Cron, since v1.8.0): they read with Firebase Admin and send Web Push, and never change the game. Do NOT generate an Express/Node server.

---

### 🎨 Visual & UI Design System

- **Theme:** Nostalgic, warm and playful **Retro / Arcade 16-bit** cabin. Husband and Wife warm up by a crackling hearth, not in a cold, industrial arcade.
- **Palette:** Rich earth tones and firelight. Dark wood `#3d2518` / `#5a3621`, parchment `#f7e9c8`, brick red `#b04a34`, ember orange `#e8772e`, flame gold `#ffd166`, moss green `#638c3c`, ink outline `#2b1a12`. Tokens live in `tailwind.config.js`.
- **Typography:** `Handjet` (pixel font with full Vietnamese support) for all text. `Press Start 2P` is Latin-only, so use it only for digits, "LV" badges and the ChoreQuest wordmark, never for translated strings.
- **Sprites:** Hand-made pixel art in `src/assets/sprites.ts` (knight = Husband, mage = Wife, fire, coin, cat), rendered as crisp SVG rects by `components/ui/pixel/PixelSprite.tsx` on one shared 8 fps clock. Scale sprites by whole numbers only; never mix pixel sizes in one scene.
- **Components:** Chunky stepped pixel borders (box-shadow based `.px-panel`, `.px-btn`, `.px-input`, `.px-bar` in `index.css`); parchment panels on a wood-plank wall; arcade tabs for navigation; segmented XP bars; RPG dialog-box modals; inventory-slot icons. No rounded corners.
- **Icons:** `pixelarticons/react` via `components/ui/Icon.tsx`, at 12/24/36px (multiples of their 12px grid) so they stay crisp.
- **Motion:** Stepped easing (`pixelEase`) and `steps()` CSS animations; every looping animation pauses under `prefers-reduced-motion`.
- **Responsiveness:** Mobile-first design optimized for both mobile web and desktop.

---

### 🏗️ Project Architecture & File Structure

Ensure the code is organized into the following clean structure:

```
src/
├── assets/
├── components/
│   ├── auth/           # Login / Register / Profile Switcher
│   ├── dashboard/      # XP progress, Gold totals, Level badges, Month timer
│   ├── tasks/          # Task list, Complete task modal, Create/Edit task
│   ├── skills/         # Skill tree matrix, Skill unlock/upgrade modal
│   ├── calendar/       # Monthly calendar overview, End-of-month prize share
│   ├── settings/       # Language toggle, Task/XP/Prize config editor
│   └── ui/             # Reusable UI elements (Modal, Button, Card, ProgressBar)
├── context/
│   ├── AuthContext.tsx
│   ├── GameContext.tsx
│   └── LanguageContext.tsx
├── config/
│   └── firebase.ts     # Firebase initialization reading VITE_FIREBASE_* env vars
├── constants/
│   └── gameRules.ts    # XP array, Skill tree rules, Default tasks, Default prize pool
├── services/
│   ├── authService.ts  # Google sign-in (popup, redirect), account linking, auth error handling
│   └── firestoreServices.ts # commitOp: saves one player action in a Firestore transaction
├── types/
│   └── index.ts        # Fully typed TypeScript interfaces
├── utils/
│   ├── calculations.ts # XP leveling logic, Gold split ratios, Date math
│   ├── invite.ts       # Invite links (?join=CODE)
│   ├── today.ts        # What the Today card shows
│   ├── transactionUtils.ts # GameOp, applyOp / replayOps (apply-once), householdPatch (field-level)
│   └── i18n.ts         # EN / VI translations dictionary
└── App.tsx
```

---

### 📐 Domain Logic & Game Mechanics

#### 1. Characters & Accounts

- Two persistent characters: **Husband** and **Wife**.
- **Household:** `households/{id}` holds at most **2 accounts** (1 Husband, 1 Wife), joined via a unique 6-character `code` (`householdCodes/{code}`). `users/{uid}.householdId` links an account to it.
    - Signed-in accounts without a household see the **Onboarding Screen**: *Create Household* (creator picks their character, becomes `moderator`) or *Join Household* (6-character code; only while it has fewer than 2 members; joiner gets the remaining character).
    - Online play requires a household; only the **Offline Demo** bypasses this. The household is *active* once both partners have joined; quests and skills unlock then.
    - **Roles:** the creator (`createdBy`) is `moderator`, and **only the creator** can grant or revoke `moderator` for the partner. Only moderators edit settings (quests, prize pool, chronicle end date). If the creator leaves, founder status and moderation pass to the remaining member.
    - **Leave Household** detaches the account and returns it to onboarding; a leaving sole moderator promotes the partner, and the last member leaving deletes the household.
    - **Character binding:** an account spends skill points only for its own character, and the partner's stats are view-only. Quests may be logged for either character or both. Firestore rules (`firestore.rules`) enforce membership, the 2-member cap, and moderator-only settings.
- **Saving (concurrency):** both partners write the same `households/{id}` document, so writes must never overwrite each other.
    - Every game action in `GameContext` is a `GameOp`: a pure `update(state) => state | errorKey` with an id. Clocks, ids and dice rolls are fixed before the op is built, because it may run several times.
    - `commit(op)` applies it locally right away (optimistic UI), then `commitOp` saves it in a **Firestore transaction**: read the latest document, re-apply the op on it, write only the changed field paths (`householdPatch`: `game.characters.husband` / `game.characters.wife`, `game.logs`, `game.wheel`, …). Firestore retries on contention, so the other partner's write is never lost.
    - Op ids are kept in `game.appliedOps` (last 40), so a retried or replayed op applies once. Pending ops are replayed on every snapshot (`replayOps`), so the screen never jumps back.
    - An op that no longer applies (e.g. the partner just logged the same quest) is rejected: the screen returns to the saved state and `SyncErrorToast` explains why.
    - The wheel waits for its transaction before turning (the button is locked meanwhile), so the prize and jackpot shown are the server's.
    - **Offline** (transactions need the server), the op is written as a queued field-level update from the last known state.
    - Leaving a household and deleting an account also run as transactions on the latest document.
- **Character names:** displayed exactly as typed (case kept, via `CharacterName`, even inside uppercase headings and buttons). Each player may rename only their own character (any in the demo) from the Home card. `customName` is at most 16 Unicode letters, digits or spaces, trimmed with inner spaces collapsed; blank means unset. The name replaces the role label throughout the app (via `useCharacterName`), except the "You are / Playing as" switcher; the Home card shows the name with the role as a subheader.
- Each character possesses:
    - `xp`: total experience accumulated.
    - `level`: calculated from XP array index (1 to 30).
    - `gold`: gold accumulated in the current chronicle.
    - `skills`: array of unlocked skills with current level (Max 6 skills per character, Max level 4 per skill).
    - `skillPointsAvailable`: calculated as `(min(level, 24) - totalSkillLevelsAllocated)`. Unlocks 1 point at level 1; capped at 24 (6 skills x 4 levels), reached at level 24.

#### 2. Leveling & Rewards

- **XP Curve Array:**
  `[230, 370, 480, 580, 600, 720, 750, 780, 810, 840, 870, 1000, 1000, 1000, 1000, 1000, 1000, 1500, 1590, 1600, 1850, 2100, 2350, 2600, 3500, 4500, 5500, 6500, 7500]`
- **Level Cap:** Max Level 30.
- **Level Up Gold Bonus:**
    - Levels 2 – 24: Standard bonus (+50 Gold/level).
    - Levels 25 – 29: High-tier bonus (+300 Gold/level).
    - Level 30 (mastery): +2,000 Gold, with a full-screen "Mastery achieved!" celebration (confetti, fanfare) and a permanent "Master" badge.
- **Level-up rewards:** each new level also pays **1 Golden Ticket**, Fortune's Favor's Normal Tickets (1/2/3/4 per level) and a skill point (skill points stop at 24). Tickets are paid once per level (`ticketLevel` marker), so undoing and redoing a quest around a level-up can't farm them; undo keeps tickets already paid. Level-ups get their own retro modal (badge animation, gold / Golden Ticket / Normal Ticket / skill point rows) after the "Quest complete!" card.
- **New legend (anti-inflation):** once any player reaches level 30, a moderator can reset both players to level 1 with no skills from Settings. Gold, the chronicle, quests and history are kept; quest entries logged before the reset (`levelResetAt`) can no longer be undone or re-assigned.

#### 3. Tasks & Bounties

- Pre-populated configurable daily tasks (e.g., Dishwashing, Cooking, Grocery Shopping, Laundry).
- **Completion Rules:**
    - Tasks can be completed by **Husband**, **Wife**, or **Both**.
    - If completed by **Both**, the task's base XP and Gold bounty are split **50/50** between them.
    - Either player may log a completion for **Husband**, **Wife** or **Both** (logging for the spouse is allowed); skill points are only spent on one's own character.
- Tasks reset daily at 00:00 local time or can be marked done per date entry.
- **Task size** (`group` in code; shown as "Task size" / "Mức việc" since v1.7.1, never "Group"): every task has one alongside its `category`, shown as **Quick tasks** (`quick`), **Moderate tasks** (`main`) and **Heavy tasks** (`heavy`). Since v1.0 sizes follow the quest's XP (`groupForXp`): Quick up to 10 XP, Moderate 11–40, Heavy 41+. The quest editor re-picks the group when the XP changes (still overridable). Built-in quests still on an earlier version's values are migrated on load, one rebalance at a time (v0.2 → v1.0 → v1.5 → v1.8, `rebalanceTask`); edited quests are left alone. v1.5 defaults: dishwashing 28 XP / 30 gold, cooking (lunch, dinner, pet food) 40 / 42, vacuum 42 / 42; v1.8: Mop House 42 / 45.
- **Default rewards:** XP ≈ 1 per minute × effort (0.75 pleasant, 1 normal, 1.3 physical/unpleasant, 1.5 heavy, 1.8 hardest; halved from 2/min so levelling feels earned, min 5); gold ≈ 1.2 per minute × effort, rounded to 5 (min 5). Paired lunch/dinner quests are equal. Default quests carry their own EN/VI names.
- **Streaks:** consecutive days a character completes the same task (alone or as "Both"); missing a day resets it to 0. From day 3 a completion pays bonus gold following Fibonacci: day 3–10 = `[1, 1, 2, 3, 5, 8, 13, 21]`, capped at +21/day. The streak bonus is **not** split for "Both": each streaking partner gets their full bonus on top of their 50% share. Streaks are derived from the quest log (`utils/streaks.ts`), so undo/re-assign keep them correct. Two kinds of day keep a streak going without adding to it (`StreakIndex.frozen` / `covered`): a player's **Streak Freezes** (all their quests, streak unchanged) and a spouse's **Tag Team** cover (one quest, `TaskLog.coveredFor`, streak one day shorter each time).
- **Streak Freezes** (v1.8.0): 3 per player per chronicle, not carried over. At each day's end a player who did nothing that day (quests logged late the next morning don't count; quests done together do) uses one, but only if a streak of 3+ days would otherwise break (`settleStreakFreezes`, `streakWouldBreak`; `freezesSettledOn` marker, never retroactive). Stored in `game.freezes`; shown as a snowflake count on each character card, a Today card note the next day and a tag on the Calendar day.
- **Hearts** (v1.8.0): the partner's Home card has a Send heart button (`HeartButton`); once a day per player, no dialog, a burst of hearts. The partner gets **1 Normal Ticket** (`sendHeartOnState`, `game.hearts`), a toast and a Today note (`HeartToast`, held while a dialog is open), and a push notification. All day, the card of a player who got a heart shows animated hearts on the avatar for both players (`ReceivedHearts`; `.heart-beat` / `.heart-rise`, still under reduced motion and low graphics). The day log lists hearts; the Chronicle summary and archive show who received the most (`hearts` award).
- **Reward:** `Base share + skill bonuses (on the share) + streak gold`, shown after a one-tap completion (`QuestToast`), and previewed per option in the "Who did it?" dialog for effort and late quests (`WhoDidItModal`, `computeRewardBreakdown`).
- **Effort levels (intensity):** a moderator can tick **Effort levels** on a Moderate quest (`Task.intensityEnabled`, off by default; ignored in other groups, `intensityApplies`). Completing it then asks **Light / Normal (default) / Heavy**, which scales the base to 0.5× / 1× / 1.5× XP and gold, rounded down (`intensityBase`), before skills, streaks and the "Both" split. The log keeps the scaled base and `intensity` (so re-assigning keeps it), and the card shows a non-Normal effort next to "Done by".
- **Quest board:** a fuzzy search box matches both the English and Vietnamese names at once, accents optional (`utils/fuzzy.ts`); completed rows are quiet, with a bar in the colour of who did them (knight red, mage purple, gold for both). In the Filter dialog: sort by your streak / XP / gold / name, group by none / group / category, show all / incomplete / completed (remembered per device). Defaults are the first option of each list: Your streak, None, All. Streak badges show on each task.
- **History tab:** per player, the quests completed in the current chronicle (ordered by count; top 5 with a "Show all quests" toggle) with completion count and current streak (from day 3); expanding one compares that player's XP and gold from it with the partner's. Below it, **Past chronicles** (newest first) shows each finished chronicle's payout, quests done, quests and gold per day, best streak, MVP days, hearts received and awards (champions of the top quests, Streak Master, most MVP days, most hearts), saved as a compact snapshot in each chronicle's payout record when it ends (`ChronicleResult.stats`, `snapshotChronicle`). The record is kept for 24 chronicles while the quest log is pruned after 120 days, so the archive stays complete. Chronicles from before snapshots are backfilled while their whole period is still in the log.
- **Compact actions:** list cards use square icon buttons (`IconButton`, 44px touch target) whose label shows as a tooltip on mouse hover or keyboard focus, e.g. "Fix entry" (undo icon) on completed quests, edit quest, unlock/upgrade skill, moderator role. Primary actions (Complete, Spin, Claim) stay text buttons.
- **Home:** learned-skill chips read "Name lv. x" and show the skill description (current level highlighted) on hover, focus or tap.
- **Audit:** completed entries in the current chronicle can be **undone** (XP, gold and any level-up bonus gold are revoked; refused if those levels' skill points were spent) or **re-assigned** (Husband / Wife / Both), by the logger, the affected character, or a moderator.

#### 4. Skills Pool (14 Configurable Skills)

- **Caps:** up to **8** skills per character (`MAX_SKILLS_PER_CHARACTER`), max level 4 each, skill points capped at **24**. The Skills tab lists Learned and Unlearned skills; Unlearned is hidden once all 8 slots are used.
- **Descriptions** name exactly what a skill boosts. Equal XP and gold bonuses are written once ("Gain 8% more XP and gold…"), so keep `xp` and `gold` equal for those skills or give the description `{{gold}}` back (tests check this).
- **Values (v1.8.0 rebalance):** each skill lists explicit per-level `xp` / `gold` bonuses (or `values` for tickets and interest, `caps` for interest's daily cap). A `category` skill lists its `categories` (`skillCoversQuest`). Speed Cleaner 8/16/24/32% XP and gold (Cleaning), Master Chef 9/18/27/36% XP and gold (Cooking), Laundry Pro 20/30/40/50% XP and 20/40/60/80% gold (Laundry), **Errand Runner** (_Việc vặt_, id `shop-savvy`, was Shop Savvy) 15/30/45/60% XP and gold on Shopping **and General** quests (filed under the Shopping filter chip). Golden Touch 6/12/18/24% gold on every quest, Quick Hands 10/20/30/40% XP and gold, Steady Worker 10/15/20/25% XP and gold (Moderate), Heavy Lifter 10/20/30/40% XP and 20/30/40/50% gold, Team Player 15/30/45/60% XP and gold (quests done together). The target: skills for every quest are worth about as much per point as Golden Touch; skills for one kind of quest a bit less for an all-rounder and about double for whoever does that chore most.
- **Tag Team** (_Tiếp sức_, id `synergistic-streak`, was Synergistic Streak): +15/30/45/60% gold, no XP, on quests the spouse has a streak of 3+ days on. Done **alone**, it also pays the spouse's current streak bonus gold (`coverGold`, counted with the skill gold) and keeps the spouse's streak going, one day shorter (`coveredFor` on the log), so covering the same quest every day runs it down and then stops at under 3 days instead of farming double streak gold. A late completion still keeps it but pays no streak gold.
- **Fast Learner** (_Học nhanh_, id `zen-housekeeper`): 30/45/60/75% + 1% per character level (`xpPerCharacterLevel`) more XP on every quest, no gold. `FastLearnerTooltip` shows the live total (character lv. 5, skill lv. 2 → 50%).
- **Hall of Fame** (_Đỉnh cao phong độ_): +1/2/3/4 **Golden Tickets** at every 3rd MVP day of a chronicle (`HALL_OF_FAME_EVERY`). The day's MVP (most quest gold) is settled once at day end (`settleMvpDays`, `mvpSettledOn` marker; `mvpDays` per character resets each chronicle), never retroactively. The "MVP" word in its description has a tooltip explaining MVP (`MvpTooltip`).
- Shared pool of 14 household buff skills (e.g., _"Speed Cleaner"_, _"Master Chef"_, _"Golden Touch"_, _"Laundry Pro"_, _"Fast Learner"_). Bonuses key off task **category**, **group** (_"Quick Hands"_, _"Steady Worker: +10/15/20/25% XP and gold from Moderate tasks"_, _"Heavy Lifter: +15% gold from Heavy tasks per level"_) or co-op, never time of day. Retired skills migrate to their replacements (`SKILL_MIGRATIONS`) so no points are lost.
- **Fortune's Favor** (_Kiếm vé may mắn_): 1 / 2 / 3 / 4 extra **Normal Tickets** at the start of each new chronicle (granted at rollover) and at every level-up (`fortunesFavorTickets`), and +20/40/60/80% gold from wheel prizes won with a **Normal Ticket**, jackpot included (`wheelGoldFor`). It doesn't stack with a Golden Ticket's 2×.
- **Gold Interest** (_Tích tiểu thành đại_): at the start of each day gain 2 / 3 / 4 / 5% of the character's current gold (rounded; compounds, since paid interest is gold), at most **15 / 30 / 45 / 60 gold per day** by level (`dailyInterestCap`). Interest is ordinary gold, so it **counts for the payout**, but each payout is also logged as an `interest` event so it is **excluded from the day's MVP** and shown in the day log's bonus tooltip ("+X Interest Gold today"). A chronicle's first day never pays (gold has just reset). It starts the day after the skill is learned (`interestOn` marker).
- Each skill has 4 upgrade levels.
- Skill picker modal allows assigning available points upon leveling up.
- Descriptions list every level's value Dota-style with the active level highlighted, e.g. "Gain 8% / 16% / **24%** / 32% more XP from cleaning quests" (values come from `effect.perLevel`).

#### 5. Chronicles (Seasons) & Prize Pool

- Play is organised in **Chronicles**: `chronicle = { id, startDate, endDate }` (local dates, `endDate` inclusive). Moderators can change `endDate`; the default length is **1 month**.
- **Prize Pool Split:**
    - Configurable prize pool per chronicle (Default: `1,000,000 VND`), entered with live thousand separators.
    - At the end of the chronicle, calculates payout ratio based on gold earned:
      $$\text{Payout}_{\text{Husband}} = \text{PrizePool} \times \left( \frac{\text{Gold}_{\text{Husband}}}{\text{Gold}_{\text{Husband}} + \text{Gold}_{\text{Wife}}} \right)$$
- **Chronicle Transition Rule:**
    - **Rollover:** after `endDate`, the result is settled into `prizeHistory` and a new 1-month chronicle starts the next calendar day.
    - **Reset:** Gold resets to `0` at rollover.
    - **Persistent:** Character XP, Levels, and Skills are **NEVER** reset.
- **Settling days:** MVPs, interest, Streak Freezes and rollover are derived only from stored dates (`advanceDays`: the old chronicle's days up to its `endDate`, rollover, then the new chronicle's days), so every device computes the same result whoever opens the app first; the first online load after a gap saves it.
- **One-time skill refund** (`refundSkills`, first step of `advanceDays`): a rebalance that changes skill values can refund every learned skill once per household (`SKILL_REFUND_VERSION`, marker `skillsRefundedIn`; v1.8.0 did). Players who had skills get `refundNotice`, shown as a dialog after What's New with a shortcut to the Skills page (`RefundNoticeModal`), cleared once read. New games start with the marker set.
- **Home banner:** one chronicle banner shows the chronicle number, countdown, prize pool and the live payout split.
- **Chronicle summary:** from Chronicle 2 on, the first launch during a new chronicle (any day, not only Day 1) shows the chronicle that just ended: winner (or tie), each player's gold, MVP days, hearts received (and who got the most), prize and share (`chronicleSummary`, `chronicleSummaryDue`). Shown once per household per device (`chorequest.summarySeen.<scope>`), after "What's New" if both are due, with a shortcut to the Wardrobe when rewards are waiting.
- **What's New:** `constants/patchNotes.ts` holds plain-language release notes per version (`VersionConfig`: Major features, Balance adjustments, Bug fixes, Performance; EN and VI). The first entry is the app version (tests check it equals `package.json`). Existing players see it once after each update (`utils/seenVersion.ts`; fresh installs don't), and Settings → About reopens it. Add the notes for every release.

#### 6. Cosmetics

- **Chronicle rewards:** from Day 1 of a new chronicle, **both players** may unlock **1 avatar** of their own, and the previous chronicle's **winner** (most gold; both on a tie) also **1 theme** (`rewardOffer` in `utils/chronicleRewards.ts`). Each kind is claimed once (`cosmetics.rewards`); nothing is offered for a chronicle nobody earned gold in, or for a kind with nothing left to unlock. The offer stays open for that chronicle and shows as a banner and in the wardrobe.
- **Wardrobe** (`CosmeticPicker`): two tabs, **Themes** and **Avatars**; it opens on Avatars when an avatar is the only reward left, and a trophy marks a tab with a reward to claim.
- **Themes** (`cozy hearth` default, `mushroom`, `cottage`, `forest`): unlocked per household, but each player picks their own, stored on their device per household. Colours are CSS variables per `[data-theme]` (Tailwind colours read them), plus per-theme backgrounds and frames in `index.css`.
- **Avatars:** the Knight and Mage plus 16 unlockable avatars each (`AVATARS`; pixel art generated into `assets/avatarSprites.ts`, husband ones on the knight's 16 px grid, wife ones on the mage's 18 px grid). Ranger and Courier exist for both with different art, so sprites are looked up per character (`avatarFrames`). The chosen avatar is household-wide (`cosmetics.activeAvatar`), so the spouse sees it everywhere, including the cabin.
- **Wardrobe:** tapping your character button in the top bar opens the picker; it's also in the More drawer (phones) and the desktop menu, not in Settings. Each theme shows a live miniature screen (`ThemePreview`, real components under `data-theme`; page backgrounds also apply to `.theme-bg`). Cosmetics live in the household's `game.cosmetics`, so a new household starts with the defaults.

#### 7. Account, grace period and performance

- **Passwords:** sign-up needs a confirmation, and new passwords (sign-up or change) need 8+ characters with a letter and a number (`utils/password.ts`). The Settings **Account** card has a **Change password** button that opens the form inline; it re-authenticates with the current password (`reauthenticateWithCredential`) before `updatePassword`.
- **Forgot password** (`ForgotPassword`, `AuthContext.sendPasswordReset`): Firebase `sendPasswordResetEmail` with `auth.languageCode` set to the app language and a return link to the app (retried without it if the domain isn't authorized). It always shows the same confirmation (no account enumeration; `auth/user-not-found` is treated as sent), and resending waits 60 s.
- **Google sign-in** (`services/authService.ts`, `AuthContext`, `auth/LinkGoogle`, `settings/SignInMethods`): all data is keyed by `uid`, so linking methods needs no Firestore change; every path must end on the same `uid`.
  - **Never use `fetchSignInMethodsForEmail`:** email enumeration protection makes it return an empty list. Use the sign-in result and `auth/account-exists-with-different-credential`, which `resolveGoogleError` turns into a `link-required` result carrying the pending credential; `LinkGoogle` asks for the password and `completeGoogleLink` links it. That error needs **One account per email address** on.
  - **Gmail with an unverified email:** Firebase replaces the password with Google on a direct sign-in (same `uid`). Settings → Connect (`linkWithPopup`) keeps the password. Forgot password and Set a password both add one back through the reset email, because `linkWithCredential` with a password failed on the emulator with `auth/email-already-in-use`.
  - **Popup or redirect:** popup by default; redirect on iOS standalone and when the popup is blocked. A sessionStorage flag (`chorequest.googleRedirect`) marks a redirect the app started: only then does `finishGoogleRedirect` run, and a return with no result shows an error.
  - `onAuthStateChanged` doesn't fire on link or unlink, so `AuthContext` refreshes `user` itself. `HouseholdUser.hasPassword` / `hasGoogle` drive the Settings rows, Change password and Delete account (Google-only accounts confirm with `reauthenticateWithPopup`).
  - **New characters** start with the Google profile's name (`nameFromProfile`, `seedCharacterName`); joining sets it in a second transaction, because the join write may only touch membership.
- **App updates** (`utils/appUpdate.ts`, started in `main.tsx`): the app registers the service worker itself (`injectRegister: false`). It checks for updates on launch, on resume (`visibilitychange`), when back online and every 30 minutes. A downloaded version waits (`skipWaiting` isn't automatic) until the app posts `SKIP_WAITING` to it once nothing is in progress (a save in flight via `utils/savesInFlight.ts`, a dialog, typing, a wheel spin); the worker then claims the page (`clientsClaim`) and `controllerchange` reloads it. `version.json` (emitted by `vite.config.ts`, not precached, no-cache on Vercel) is compared with `APP_VERSION` as a fallback, reloading at most once per version per tab.
- **Notifications** (v1.8.0, `utils/push.ts`, `settings/NotificationsSetting`, `public/push-sw.js`, `api/`): per device, from one row of Settings → Display, shown only until it's on (the device's own settings turn it off, and the row comes back if they do). Signing out unsubscribes the device first (`forgetPushDevice`), and the server sends to each subscription once (`distinctDevices`). The device subscribes with Web Push (VAPID key `VITE_VAPID_PUBLIC_KEY`) and the subscription is saved under `users/{uid}.push.devices.{deviceId}` with its time zone and language (`usePushRefresh` keeps it current). `api/heart` (called after a heart is saved, authenticated with the player's ID token) notifies the partner once per heart; `api/reminders`, run by Vercel Cron at every hour, sends each device what's due at its local time: 9 PM if that player did no quest today, 8 AM on Day 1 of a Chronicle (`api/_lib/reminders.ts`, pure and tested). Server code imports only `api/_lib/*.js` (Vercel bundles each function on its own). iPhones need the Home Screen app. Setup: README "Notifications".
- **Tier pips** (`TierPips` with `skill`): hovering or tapping them shows the skill's values at all 4 levels, the current one highlighted (`skillLevelTable`).
- **Skill descriptions:** `exact` shows only the current values. Use it wherever the skill can't be upgraded in place (Home tips, the partner's loadout, the spend confirmation). Your own Skills page shows current → next.
- **Daily loop (v1.7.0):** Complete is one tap (`TasksView.startCompleting` credits the active player); only effort and late quests open `WhoDidItModal`. `QuestToast` shows the reward with Undo and Change, and `RewardModal` now only plays the coin sound and shows level-up cards. Quests are compact rows (`TaskCard`); finished ones collapse into "Done today" unless searching, filtering by Show, editing or viewing yesterday. Sort, group and show live in the Filter dialog (`QuestViewControls`), and an edit mode reveals New quest and the quest editors.
- **Today card** (`dashboard/TodayCard`, `utils/today.ts`): the top of Home. Shows the First steps checklist until the player has a skill.
- **Invites** (`utils/invite.ts`): `?join=CODE` is captured on launch in `main.tsx`, kept in localStorage through sign-up (including Google's redirect), and prefills onboarding. `App` clears it once the player is in a household.
- **Tooltips:** use `ui/Tooltip` (or `ui/IconButton` for an icon's label). Their bubble is a `ui/FloatingBubble`: drawn at the top level of the page (a portal, above everything, dialogs included), above its trigger or below it when there's no room under the top bar, kept inside the screen and following its trigger on scroll (`utils/placeBubble`; the fixed bars are marked `data-app-bar`). Never position a bubble inside its card (`absolute bottom-full`): neighbouring cards, the top bar or a scroll area would cover or clip it. Only a mouse hover (`pointerType === 'mouse'`) or keyboard focus (`:focus-visible`) opens one, so a tap opens it in one go (tests check this).
- **Dialogs:** every `role="dialog"` uses `hooks/useDialogA11y` (Escape, focus trap, focus restore; tests check this). Use `<Modal persistent>` for forms, so a tap outside can't discard typing.
- **Button colours:** `brick` (red) is only for destructive actions (tests check this); Complete is `moss`.
- **Tap targets:** `button.px-btn` and `.px-input` are at least 44px tall. Use `.px-hit` to enlarge a small control's tap area without moving anything.
- **Digits:** body text is `'Jersey 20', Handjet`. Jersey 20 is loaded as a digits-only subset (`index.html`) because Handjet's zero reads as an 8 and has no alternate glyph, so everything else falls through to Handjet.
- **XP and G:** only in tight numeric tags. In sentences use "kinh nghiệm" and "vàng". The Vietnamese level badge reads "Cấp".
- **Language:** Vietnamese is the default (`LanguageContext`); a choice made in Settings or with `ui/LanguageToggle` (top bar, sign-in and onboarding screens) is saved per device. Vietnamese terms: Mùa (Chronicle, capitalised), Quản lý (moderator), Loại (category) vs Mức việc (task size), Chơi thử (demo), cấp (level).
- **Yesterday's quests:** open while it's before noon, nothing has been logged today, and today isn't the chronicle's first day (`yesterdayOpen`). Yesterday's unfinished quests can then be completed **late**:
  - They're logged on yesterday's date with `late: true`, so streaks continue.
  - They pay 0 XP and floor(50% × (base + skill gold)), with no streak bonus (`lateRewardBreakdown`). Re-assigning keeps the late rules.
  - Late gold counts for the payout but is excluded from MVP (`questGoldOn`), so yesterday's settled MVP never changes.
  - The yesterday view lists **all** quests with yesterday's state, and Sort / Group / Show work as usual (they reset to defaults whenever you switch between Today and Yesterday). Yesterday's completed entries are locked (no fix button, no quest editing). Cards show "0XP" and half gold; unfinished ones use the desaturated `past` card tone.
- **Reset quests to defaults** (moderator): built-in quests go back to their default values and custom quests are kept, unless "Remove custom quests" is ticked (`resetQuestList`).
- **Copy rules:** write gold out (`common.goldAmount`: "{{gold}} gold" / "{{gold}} vàng"); "G" is allowed only where space is very tight (the reward breakdown table and the "Who did it?" tile totals); in Vietnamese write "kinh nghiệm" and keep "KN" only in tight micro-badges.
- **Theme modules** (`src/themes/<id>`): each provides `SceneBack` / `SceneFront` for the shared 120×54 cabin stage plus its own `theme.css`. Cozy Hearth is bundled; the others load on demand via `loadTheme` / `useThemeModule`, and `<html data-theme>` is only switched once the chunk has arrived.
- **Graphics quality** (`hooks/useQuality.ts`, `<html data-quality>`): Low stops only what keeps running and can lag weak phones:
  - the shared sprite clock;
  - looping CSS animations and confetti;
  - fixed backgrounds that repaint on scroll.

  The wheel spins for 2 seconds instead of 5–10. Short transitions and framer-motion's open/close animations stay, since they're brief and GPU-composited. The system reduced-motion setting still skips the spin entirely.

#### 8. Layout

- The top bar (sound, character) and the bottom navigation are fixed to the screen edges. On phones the bottom bar has Home, Quests, Skills and **More**, a drawer with History, Calendar and Settings.
- **Installed app (PWA) on touch screens:** scrollbars are hidden; scrolling works as before. `utils/pwaMode.ts` adds `pwa-mobile` to `<html>` when the app runs installed (`display-mode` standalone/fullscreen, or iOS `navigator.standalone`) on a coarse pointer; `.no-scrollbar` is the same rule as a utility class. The page scrollbar (`html`) and scroll areas inside cards and pop-ups (`.px-scroll`) use pixel scrollbars built from theme colours (Firefox gets the colours only).
- **Readable colours:** text tokens used on light surfaces (`wood-600/700`, `brick-600/700`, `moss-700`, `plum-600`, `ember-700`) reach WCAG 4.5:1 on parchment and ember panels in every theme; `ember-600` is for icons (3:1); `wood-500` is decoration only, not text. Theme stylesheets may restyle light page text (`.px-subtitle`, `.text-parchment-*`, `.px-title`) only outside panels (`:not(.px-panel *)`), never text inside panels or dialogs. Secondary text on tinted / past quest cards is 82% ink. New theme palettes should be checked the same way.
- **Dialog frame** (`ui/Modal.tsx`): the title plate hangs over the top-left border and the close X over the top-right corner, so neither takes space from the content or its scrollbar. Browsers and desktop keep their scrollbars.
- **Dialogs** share `backdropMotion` / `dialogMotion` / `celebrationMotion` (`ui/Modal.tsx`): opacity + scale/translate only (GPU), smooth ease-out curves; celebrations use a soft spring.
- **Render cost:** quest cards are a memoized `TaskCard` (stable handlers; streaks compared by value), the wheel face and slice labels are memoized, and components that only play sounds use `useSfx()` (stable) instead of `useAudio()`.
- **Settings layout:** three groups with page-level headings: **Preferences** (Sound & music; Display = graphics quality + language + notifications, until they're on), **Household** (members, Chronicle = end date + prize pool, Quest configuration in a dialog (`Modal wide`) with Reset inside it, New legend only once unlocked) **Account** (email, Sign out, Change password, sign-in methods; Delete account in a quiet footer) and **About** (version and What's New). Rarely used or destructive actions (Delete account, Leave household) are quiet text links (`ui/textAction.ts`), never big buttons.
- No sideways scrolling from 320px up. The wheel spins on its own GPU layer (`will-change-transform`) and the bars sit on their own layers, so spins never repaint them.
- Level-up cards only show for the player's own character, including level-ups caused by the spouse logging a quest (tracked per device against the last level celebrated).

#### 9. Wheel of Fortune

- **Tickets:** two kinds. **Normal Tickets** (`tickets`): 1 free per local day from the Home card (`ticketClaimedOn`), Fortune's Favor's tickets each chronicle and level-up, and Golden-miss refunds. **Golden Tickets** (`goldenTickets`): 1 per level-up and Hall of Fame. A spin **always uses a Golden Ticket first** (`nextTicket`): it pays **2× gold** on every prize (jackpot included), and a miss still adds +10 to the jackpot and refunds 1 Normal Ticket (`spinOnState`; spin events record `ticket` and `refunded`). The wheel shows both counts and a "Next spin: Golden / Normal Ticket" chip; character cards show gold, Golden Tickets (when any) and Normal Tickets in one inventory strip (one sunken bar with dividers, each part with a tooltip), and learned skills as a plain text line with icon and level (`SkillChip`, tap for the description) rather than bordered boxes. Unspent skill points show as a number on the Skills nav tab instead of on the card.
- **Prizes** (`WHEEL_PRIZES`): Small +5 gold (35%), Normal +10 (30%), Big +15 (15%), **Jackpot** +(500 + `jackpotBonus`) (2%), No prize (18%, "Good luck next time!"). Rolls use `crypto.getRandomValues`.
- **Jackpot scaling:** the household's `wheel.jackpotBonus` starts at 0, grows by +10 on every miss, and resets to 0 when anyone hits the jackpot, which triggers pixel confetti and a fanfare.
- **Spin lock:** from the tap until the result card shows, the wheel sets `useWheelBusy`; navigation and the demo character switch are disabled (and `App` ignores view changes), because leaving Home would unmount the wheel before its result shows.
- Wheel gold, like interest, is ordinary gold: it **counts for the payout** but **not for the day's MVP** (or the calendar's best day). Each spin is saved immediately as a `spin` event; the day log lists spins and adds wheel gold to the same bonus tooltip as interest. Players tap the wheel itself to spin (no separate button). The 8 drawn slices have weighted sizes (`WHEEL_SEGMENTS`, jackpot smallest) but are decorative; the odds come from the prize table; the wheel's info tooltip lists the prizes only (no odds). After each spin a result card pops up ("Congratulations! You have won X gold!", or "So close! Good luck next time!" for a miss); a jackpot gets the full celebration instead.

---

### 💻 Required Implementations Step-by-Step

1. **`src/config/firebase.ts`**: Set up modular SDK reading from `import.meta.env.VITE_FIREBASE_*`. Include a guard showing a clean UI error if env vars are missing.
2. **`src/types/index.ts`**: Build clean TypeScript interfaces for `Character`, `Task`, `TaskLog`, `Skill`, and `MonthlyPrize`.
3. **`src/utils/calculations.ts`**: Pure helper functions for level lookup from XP, next level progress percentage, split reward calculations, and Vietnamese Currency formatting (`Intl.NumberFormat`).
4. **`src/components/dashboard/`**: Character dashboard cards with animated XP bars, current gold counter, skill badges, and a month-end countdown widget.
5. **`src/components/tasks/`**: Interactive task checklist with multi-character selection toggle and instant reward trigger animation.
6. **`vercel.json`**: SPA fallback configuration:

```json
{
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 🧪 Tests

- `npm test` bundles the pure game logic (`tests/logic-entry.ts`, esbuild) and runs every `tests/*.test.mjs` suite in Node; `npm test -- v140` runs one. Suites are grouped by version (`core`, `streaks`, `v020` … `v140`).
- When a rule changes, update the affected expectations and add checks to that version's suite. Keep new logic in pure functions so it can be tested here.

### 🚀 Getting Started

Please write the primary setup files, TypeScript types, calculations utility, game context, and main Dashboard layout to get the prototype fully functional immediately.