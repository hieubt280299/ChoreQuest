Act as a Principal Full-Stack Engineer specializing in React, TypeScript, and Firebase. You are building a production-ready, gamified household task web application named "ChoreQuest".

---

### 🛠️ Tech Stack & Constraints

- **Frontend:** React 18 + TypeScript (Vite)
- **Styling:** Tailwind CSS + Lucide React Icons + Framer Motion (for playful animations)
- **State Management:** React Context API + Custom Hooks
- **Backend/Database/Auth:** Google Firebase (v10+ Modular SDK using Firestore and Auth)
- **Localization:** i18next or simple light React i18n Context supporting **English (EN)** and **Vietnamese (VI)** with hot-swapping in settings.
- **Hosting/Deployment:** Vercel (SPA fallback via `vercel.json`).
- **Strict Rule:** Direct client-side SDK integration only. Do NOT generate Express/Node server files.

---

### 🎨 Visual & UI Design System

- **Theme:** Warm, cozy, and inviting "Cozy RPG / Studio Ghibli" inspired aesthetic (Soft Rose `#FEE2E2`, Warm Amber `#FEF3C7`, Sage Green `#DCFCE7`, Soft Cream `#FAFAF9`).
- **Components:** Rounded cards (`rounded-2xl`), smooth progress bars, gold coin counters, level badge chips, and playful reward modals.
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