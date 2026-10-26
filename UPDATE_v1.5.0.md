Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Implement the following new features (Chronicle Summary, Patch Notes), gameplay enhancements (Cosmetic Rewards, Task Intensity Levels), quest/skill rebalances, and QoL tooltip additions across our React + Firebase codebase.

---

### 1. ✨ New App Features

#### A. Chronicle Summary Modal

- **Trigger:** Displays automatically on **Day 1 of a new Chronicle** (starting from Chronicle 2 onwards) upon player login.
- **Content:** Highlights the previous Chronicle's final winner, final Gold tally, MVP count, and exact cash prize payout breakdown based on the final ratio.

#### B. "What's New" Patch Notes System

- **Automatic Display:** Triggers automatically once per update version when a player opens the app under a new app version string (compared against `localStorage`).
- **Manual Trigger:** Add a **"Patch Notes"** / **"What's New"** button inside the `Settings` tab so players can re-open and review current patch notes anytime.
- **Content Structure:** Uses a clean 8-bit modal displaying plain-language sections: _Major Features_, _Balance Adjustments_, _Bug Fixes_, and _Performance Updates_.

---

### 2. 🎮 Gameplay Mechanics & Task Customization

#### A. Chronicle End Cosmetic Rewards Update

- At the end of a Chronicle:
    - **Both Players:** Receive **1 Avatar Unlock** choice.
    - **Chronicle Winner:** Receives **1 Avatar Unlock AND 1 Theme Unlock** choice.

#### B. Task Intensity Levels (Moderate Tasks Group Only)

- **Moderator Configuration:**
    - In the `Quest Configuration` settings section, add an **"Enable Intensity Level"** toggle checkbox for items under the **Moderate Tasks** group (Moderator-only privilege, default value is OFF).
- **"Who Did It?" Modal Selection:**
    - When completing a task with intensity enabled, allow the completing player to select an effort level: **Light**, **Normal** (Default), or **Heavy**.
- **Reward Scaling Math:**
    - `Normal` (Default): $1.0\times$ Base Gold and Base XP.
    - `Light`: $0.5\times$ Base Gold and Base XP (rounded down).
    - `Heavy`: $1.5\times$ Base Gold and Base XP (rounded down).
    - **Skill Multipliers:** Calculate all passive skill multipliers (XP/Gold bonuses) dynamic off these scaled Base values.

---

### 3. ⚖️ Game & Economy Rebalances

#### Quest Rewards Adjustment

- _Dishwashing (Lunch / Dinner):_ Set to **28 XP, 30 Gold** each.
- _Cooking (Lunch / Dinner / Pet Food):_ Set to **40 XP, 42 Gold** each.
- _Vacuum House:_ Set to **42 XP, 42 Gold**.

#### Skill Rebalances

- **Master Chef:** Add `+4% / +8% / +12% / +16%` XP on Cooking quests (Gold bonus unchanged).
- **Golden Touch:** Increase bonus to `+6% / +12% / +18% / +24%` Gold on all quests.
- **Laundry Pro:** Add `+4% / +8% / +12% / +16%` XP on Laundry quests (Gold bonus unchanged).
- **Gold Interest:** Adjust daily interest rate to `2% / 3% / 4% / 5%` (Daily cap remains 100 Gold; active from Day 2).

---

### 4. 💡 Quality of Life (QoL) Enhancements

- **Ticket Tooltips in Skill Descriptions:**
    - Add interactive info tooltips for both **Golden Ticket** and **Normal Ticket** terms wherever they appear in skill description cards (e.g., inside _Fortune's Favor_ and _Hall of Fame_ skill descriptions).

---

### 💻 Required Output Needed

Output the updated TypeScript models (`Task`, `ChronicleSummary`, `VersionConfig`), modified UI components (`ChronicleSummaryModal.tsx`, `PatchNotesModal.tsx`, `WhoDidItModal.tsx`), skill definitions (`skillDefinitions.ts`), and task configuration defaults.

---

### 🔁 Follow-up Changes (after review)

These changes came from review feedback after the first implementation and are part of v1.5.0.

- **Chronicle Summary timing:** instead of only on Day 1, the summary shows on the **first launch any time during the new Chronicle** (from Chronicle 2 on), once per household on each device, so a player who doesn't open the app on Day 1 still sees it.
- **Readable text in all themes:** every text colour was checked against its background in all four themes (WCAG contrast). The fixes:
    - Mushroom Kingdom's white title style no longer applies inside panels and dialogs; it had made "So close!" white on white.
    - Text tokens were darkened to at least 4.5:1 on light surfaces (3:1 for icon gold).
    - Finished and past quest cards use strong ink for their secondary text.
    - Page text gets a black outline over Mushroom's clouds and is dark ink on Cottage's pale sky.
    - Cottage's brick buttons and boards are deeper.
- **Wheel spin:** the "Next spin: Normal / Golden Ticket" notice is hidden while the wheel spins (it keeps its space, so the wheel doesn't jump).
- **No tab switching mid-spin:** from the tap until the result shows, navigation (bottom bar, More drawer, side nav) and the demo's character switch are disabled (`useWheelBusy`), so leaving Home can't unmount the wheel and lose its result card.
