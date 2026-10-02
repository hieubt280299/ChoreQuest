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
- **Strict Rule:** Direct client-side SDK integration only. Do NOT generate Express/Node server files.

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
├── types/
│   └── index.ts        # Fully typed TypeScript interfaces
├── utils/
│   ├── calculations.ts # XP leveling logic, Gold split ratios, Date math
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
- **Level-up rewards:** each new level also pays **1 Wheel of Fortune ticket** and a skill point (skill points stop at 24). Tickets are paid once per level (`ticketLevel` marker), so undoing and redoing a quest around a level-up can't farm them; undo keeps tickets already paid. Level-ups get their own retro modal (badge animation, gold / ticket / skill point rows) after the "Quest complete!" card.
- **New legend (anti-inflation):** once any player reaches level 30, a moderator can reset both players to level 1 with no skills from Settings. Gold, the chronicle, quests and history are kept; quest entries logged before the reset (`levelResetAt`) can no longer be undone or re-assigned.

#### 3. Tasks & Bounties

- Pre-populated configurable daily tasks (e.g., Dishwashing, Cooking, Grocery Shopping, Laundry).
- **Completion Rules:**
    - Tasks can be completed by **Husband**, **Wife**, or **Both**.
    - If completed by **Both**, the task's base XP and Gold bounty are split **50/50** between them.
    - Either player may log a completion for **Husband**, **Wife** or **Both** (logging for the spouse is allowed); skill points are only spent on one's own character.
- Tasks reset daily at 00:00 local time or can be marked done per date entry.
- **Groups:** every task has a `group` alongside its `category`, shown as **Quick tasks** (`quick`: light, ~5–10 min), **Moderate tasks** (`main`: normal effort, ~10–60 min) and **Heavy tasks** (`heavy`: physically demanding). Groups describe effort, not reward tier. Older tasks get a group inferred from the built-in defaults or their category.
- **Default rewards:** XP ≈ 1 per minute × effort (0.75 pleasant, 1 normal, 1.3 physical/unpleasant, 1.5 heavy, 1.8 hardest; halved from 2/min so levelling feels earned, min 5); gold ≈ 1.2 per minute × effort, rounded to 5 (min 5). Paired lunch/dinner quests are equal. Default quests carry their own EN/VI names.
- **Streaks:** consecutive days a character completes the same task (alone or as "Both"); missing a day resets it to 0. From day 3 a completion pays bonus gold following Fibonacci: day 3–10 = `[1, 1, 2, 3, 5, 8, 13, 21]`, capped at +21/day. The streak bonus is **not** split for "Both": each streaking partner gets their full bonus on top of their 50% share. Streaks are derived from the quest log (`utils/streaks.ts`), so undo/re-assign keep them correct.
- **Reward:** `Base share + skill bonuses (on the share) + streak gold`, previewed per option in the "Who did it?" dialog (`computeRewardBreakdown`).
- **Quest board:** sort by your streak / XP / gold / name, group by none / group / category, show all / incomplete / completed (remembered per device). Defaults are the first option of each list: Your streak, None, All. Streak badges show on each task.
- **History tab:** per player, the quests completed in the current chronicle (ordered by count; top 5 with a "Show all quests" toggle) with completion count and current streak (from day 3); expanding one compares that player's XP and gold from it with the partner's.
- **Compact actions:** list cards use square icon buttons (`IconButton`, 44px touch target) whose label shows as a tooltip on hover/focus, e.g. "Fix entry" (undo icon) on completed quests, edit quest, unlock/upgrade skill, moderator role. Primary actions (Complete, Spin, Claim) stay text buttons.
- **Home:** learned-skill chips read "Name lv. x" and show the skill description (current level highlighted) on hover, focus or tap.
- **Audit:** completed entries in the current chronicle can be **undone** (XP, gold and any level-up bonus gold are revoked; refused if those levels' skill points were spent) or **re-assigned** (Husband / Wife / Both), by the logger, the affected character, or a moderator.

#### 4. Skills Pool (12 Configurable Skills)

- Shared pool of 12 household buff skills (e.g., _"Speed Cleaner"_, _"Master Chef"_, _"Golden Touch"_, _"Laundry Pro"_, _"Fast Learner"_). Bonuses key off task **category**, **group** (_"Quick Hands"_, _"Steady Worker"_, _"Heavy Lifter: +15% gold from Heavy tasks per level"_) or co-op, never time of day. Retired skills migrate to their replacements (`SKILL_MIGRATIONS`) so no points are lost.
- **Fortune's Favor** (_Kiếm vé may mắn_): start each new chronicle with 2 / 3 / 4 / 5 extra wheel tickets (granted at rollover).
- **Gold Interest** (_Tích tiểu thành đại_): at the start of each day gain 2 / 4 / 6 / 8% of the character's current gold (rounded; compounds, since paid interest is gold). Interest is ordinary gold, so it **counts for the payout**, but each payout is also logged as an `interest` event so it is **excluded from the day's MVP** and shown in the day log's bonus tooltip ("+X Interest Gold today"). A chronicle's first day never pays (gold has just reset). It starts the day after the skill is learned (`interestOn` marker).
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
- **Settling days:** interest and rollover are derived only from stored dates (`advanceDays`: interest up to the old `endDate`, rollover, then the new chronicle's days), so every device computes the same result whoever opens the app first; the first online load after a gap saves it.
- **Home banner:** one chronicle banner shows the chronicle number, countdown, prize pool and the live payout split.

#### 6. Wheel of Fortune

- **Tickets:** each player claims **1 free ticket per local day** from their Home card (`ticketClaimedOn`), plus 1 per level-up and Fortune's Favor tickets each chronicle. Each character card shows the count next to gold (equal-height badges; tooltip "x Wheel of Fortune tickets"). Unspent skill points show as a number on the Skills nav tab instead of on the card.
- **Prizes** (`WHEEL_PRIZES`): Small +3 Gold (35%), Normal +5 (30%), Big +10 (15%), **Jackpot** +(100 + `jackpotBonus`) (1%), No prize (19%, "Good luck next time!"). Rolls use `crypto.getRandomValues`.
- **Jackpot scaling:** the household's `wheel.jackpotBonus` starts at 0, grows by +10 on every miss, and resets to 0 when anyone hits the jackpot, which triggers pixel confetti and a fanfare.
- Wheel gold, like interest, is ordinary gold: it **counts for the payout** but **not for the day's MVP** (or the calendar's best day). Each spin is saved immediately as a `spin` event; the day log lists spins and adds wheel gold to the same bonus tooltip as interest. The 8 drawn slices are decorative and the odds come from the prize table; the wheel's info tooltip lists the prizes only (no odds). A win reads "Congratulations! You have won X gold!", a miss "Good luck next time!".

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

### 🚀 Getting Started

Please write the primary setup files, TypeScript types, calculations utility, game context, and main Dashboard layout to get the prototype fully functional immediately.