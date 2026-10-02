Act as a Principal Full-Stack Engineer working on our retro pixel RPG app, ChoreQuest. Implement the following feature updates, data model restructuring, game mechanics, QoL improvements, audio enhancements and UI fixes across our React + Firebase codebase.

---

### 1. 🏠 Household & Account Structure Overhaul

#### Data Model & Authentication Rules

- **Household Limits:** A `Household` document contains a maximum of **2 accounts** (1 Husband, 1 Wife).
- **Onboarding Flow:**
    - Authenticated users without a `householdId` must be directed to an **Onboarding Screen** with two choices:
        1. **Create Household**: Generates a new household, sets the user as `Moderator`, generates a unique 6-character alphanumeric `householdCode` (e.g., `A7K9X2`), and creates a default active Chronicle.
        2. **Join Household**: Prompts for a 6-character code. Validates if the household exists and has `< 2` members before linking.
- **Access Guard:** Online game modes require a valid `householdId`. Bypassed **ONLY** in `Offline Demo Mode`.
- **Household Operating State:** The household is considered active once both Husband and Wife accounts are joined.
- **Roles & Permissions:**
    - Track the creator on the Household entity (`createdById`, stored as `createdBy`).
    - Household Creator is assigned `Moderator` by default.
    - Only the **Original Household Creator** can grant or **revoke** the `Moderator` role for the spouse account.
    - Only `Moderators` can edit household settings (Tasks, Rewards, Chronicle End Dates, etc.).
- **Leave Household Action:** Any member can choose "Leave Household" in settings. This detaches their `householdId` and redirects them back to the Onboarding Screen.

#### Chronicle (Season) System

- **Configurable End Date:** Replace the strict "end of calendar month" rule with a custom `chronicleEndDate` configurable by any Moderator.
- **Automatic Rollover:** When the current Chronicle expires, auto-trigger a new Chronicle starting the next calendar day with a default duration of **1 month**.
- **Reset Logic:** Gold resets to `0` at Chronicle end; XP, Levels, and Unlocked Skills remain persistent.

---

### 2. ⚔️ Gameplay Mechanics & Action Authorization

#### A. Character Binding

- Users can only spend skill points (unlock skills, assign skill points) for **their own assigned character** (Husband or Wife).
- Either user may log a quest completion for **Husband**, **Wife**, or **Both** (logging for the spouse is allowed).
- Users can **view** the spouse's stats (Skills, Level, Gold, XP, Payout split) in read-only mode.

#### B. Task Audit & Undo (Who Did It)

- Completed task entries must support **Undo** (revert XP/Gold awarded) and **Edit "Who Did It"** (reassign to Husband, Wife, or Both) to fix accidental logs.

#### C. Consecutive Daily Task Streaks

- **Streak Logic:** Track consecutive daily completions for each character per task.
    - **Activation:** Streak bonuses unlock starting at a **3-day streak** ($3^{\text{rd}}$ consecutive day).
    - **Reset/Break:** Missing a single day resets the streak counter for that task back to `0`.
- **Bonus Scaling (Fibonacci Curve):**
    - Days 3 to 10 follow Fibonacci values: `[1, 1, 2, 3, 5, 8, 13, 21]` Gold.
        - _3-day:_ +1 Gold
        - _4-day:_ +1 Gold
        - _5-day:_ +2 Gold
        - _6-day:_ +3 Gold
        - _7-day:_ +5 Gold
        - _8-day:_ +8 Gold
        - _9-day:_ +13 Gold
        - _10-day (and max cap):_ +21 Gold (Streaks $>10$ days cap at +21 Gold/day).
- **Co-op Sharing Rule:**
    - If a task is completed as **"Both"**, players on a streak maintain/extend their streak.
    - Streak bonus is **NOT** split: The streaking player receives **100% of their streak gold bonus** on top of their 50% split of the base task reward.
- **UI Streak Indicators:**
    - Display active streak icons/badges (e.g., 🔥 `3-Day Streak! (+1 G)`) next to tasks in the quest list for eligible players.

#### D. Task "Group" System

- Introduce a `group` attribute to `Task` entities alongside `category`.
- **Default Groups & Distribute Tasks:**
    1. `Quick Dailies` (Light effort: e.g., Feed Pet, Make Bed, Take Out Trash)
    2. `Main Chores` (Standard effort: e.g., Cook Lunch, Cook Dinner, Sweep House, Wash Clothes)
    3. `Heavy Raids` (High effort/Weekly: e.g., Mop House, Vacuum, Clean Bathroom, Change Sheets)
- **Skill Synergies:** Update passive skill tree definitions to grant multipliers/bonuses based on **Task Group** (e.g., _"Raid Master: +15% Gold from Heavy Raids"_) instead of time-of-day mechanics.

---

### 3. 🎨 Quality of Life (QoL) Enhancements

#### A. Dynamic Skill Descriptions (Dota 2 Style)

- Enhance skill tooltips/descriptions to show full level scaling values instead of generic text.
    - _Example:_ Instead of `"More XP from cleaning quests"`, render `"Gain 3 / 6 / 9 / 12 extra XP from cleaning quests."`
- **Highlight Active Level:** Bold/highlight the current numerical value corresponding to the character's active skill level.
    - _Example (Level 3 Active):_ `Gain 3 / 6 / `**`9`**` / 12 extra XP from cleaning quests.`

#### B. Dynamic Reward Projection in "Who Did It?" Modal

- When opening the "Who Did It?" completion popup, display a live reward preview for each selection option (**Husband**, **Wife**, or **Both**).
- **Calculation Breakdown:** Render `Base Reward + Active Skill Bonuses + Active Streak Bonuses` so players see the exact XP and Gold breakdown before confirming.

#### C. Quests Tab Sorting & Grouping Controls

- Add responsive filter/sort controls at the top of the Quests view:
    - **Sort By:** `Your Streak` (highest personal streak first), `XP`, `Gold`, or `Name`.
    - **Group By:** `Group` (Quick Dailies / Main Chores / Heavy Raids), `Category`, or `None`.

#### D. Input Accessibility (A11y)

- **Formatted Currency Input:** For fields like "Monthly Prize Pool (VND)", auto-format user input with thousand separators (e.g., typing `1000000` formats live as `1,000,000` or `1.000.000` based on locale) while keeping the raw numeric value in state.

---

### 4. 🎵 Audio Assets Update

- Replace the default background track with a **playful, lively, and adventurous 8-bit chiptune BGM** (reminiscent of classic SNES JRPG world maps or action-adventure games).
- Ensure seamless loop points and visibility-change pause logic.

---

### 5. 🐛 UI Bug Fixes

- **Modal Close Button Alignment:** Fix the top-right `"X"` close button position in the `"Who Did It?"` popup modal. Ensure it is properly aligned with padding relative to the card container frame instead of touching or overlapping the top corner border.

---

### 💻 Implementation Output Needed

Please output:

- The updated Firestore schemas/types (`Task`, `Streak`, `Household`, etc.).
- Modified Context/State management files, including the state/calculation functions for Fibonacci streaks.
- Updated UI components for the Onboarding flow, Settings, the Task List and "Who Did It?" modal, and Skill cards.
- Updated default skill tree data.
