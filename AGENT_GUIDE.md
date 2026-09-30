Act as a Principal Full-Stack Engineer specializing in React, TypeScript, and Firebase. You are building a production-ready, gamified household task web application named "ChoreQuest".

---

### 🛠️ Tech Stack & Constraints

- **Frontend:** React 18 + TypeScript (Vite)
- **Styling:** Tailwind CSS + Pixelarticons (pixel icon set) + Framer Motion (stepped, frame-by-frame animations)
- **State Management:** React Context API + Custom Hooks
- **Audio:** Optional chiptune BGM + SFX synthesized with the Web Audio API (`utils/chiptune.ts`, song data in `constants/chiptuneSong.ts`), controlled by `context/AudioContext.tsx` (`useAudio`). No audio files; sound is off until the player enables it (autoplay rules).
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
- Each character possesses:
    - `xp`: total experience accumulated.
    - `level`: calculated from XP array index (1 to 30).
    - `gold`: current monthly accumulated gold.
    - `skills`: array of unlocked skills with current level (Max 6 skills per character, Max level 4 per skill).
    - `skillPointsAvailable`: calculated as `(level - totalSkillLevelsAllocated)`. Unlocks 1 point at level 1.

#### 2. Leveling & Rewards

- **XP Curve Array:**
  `[230, 370, 480, 580, 600, 720, 750, 780, 810, 840, 870, 1000, 1000, 1000, 1000, 1000, 1000, 1500, 1590, 1600, 1850, 2100, 2350, 2600, 3500, 4500, 5500, 6500, 7500]`
- **Level Cap:** Max Level 30.
- **Level Up Gold Bonus:**
    - Levels 2 – 24: Standard bonus (e.g., +50 Gold/level).
    - Levels 25 – 30: High-tier bonus (e.g., +300 Gold/level).

#### 3. Tasks & Bounties

- Pre-populated configurable daily tasks (e.g., Dishwashing, Cooking, Grocery Shopping, Laundry).
- **Completion Rules:**
    - Tasks can be completed by **Husband**, **Wife**, or **Both**.
    - If completed by **Both**, the task's base XP and Gold bounty are split **50/50** between them.
- Tasks reset daily at 00:00 local time or can be marked done per date entry.

#### 4. Skills Pool (10 Configurable Skills)

- Shared pool of 10 household buff skills (e.g., _"Speed Cleaner"_, _"Master Chef"_, _"Gold Doubler"_).
- Each skill has 4 upgrade levels.
- Skill picker modal allows assigning available points upon leveling up.

#### 5. Monthly Calendar & Prize Pool

- Tracks the real-time active month.
- **Prize Pool Split:**
    - Configurable monthly cash/reward pool (Default: `1,000,000 VND`).
    - At the end of the month, calculates payout ratio based on gold earned:
      $$\text{Payout}_{\text{Husband}} = \text{PrizePool} \times \left( \frac{\text{Gold}_{\text{Husband}}}{\text{Gold}_{\text{Husband}} + \text{Gold}_{\text{Wife}}} \right)$$
- **Month Transition Rule:**
    - **Reset:** Gold resets to `0` at 00:00 on the 1st of every month.
    - **Persistent:** Character XP, Levels, and Skills are **NEVER** reset at month end.

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