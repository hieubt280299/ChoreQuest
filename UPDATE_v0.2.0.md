Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Implement the following Wheel of Fortune game mechanics, new passive skills, UI layout redesigns, and UX optimizations across our React + Firebase codebase.

---

### 1. 🎡 Gameplay Mechanic: Wheel of Fortune

- **Wheel Component & Location:** Add an interactive 8-bit animated spinning wheel section in the **Home** tab.
- **Ticket System:**
    - **Daily Claim:** Each player can click a "Claim Daily Ticket" button on their character card in the Home tab once per day (resets at midnight local time).
    - **Level Up:** Award **1 Ticket** automatically upon leveling up.
    - **Display:** Show total ticket count on each player's character card next to XP and Gold.
- **Prize Tiers & Probabilities:**
    - `Small Prize` (35% chance): +3 Gold
    - `Normal Prize` (30% chance): +5 Gold
    - `Big Prize` (15% chance): +10 Gold
    - `Jackpot` (1% chance): +(100 + `jackpotBonus`) Gold
    - `No Prize` (19% chance): "Good luck next time!"
- **Jackpot Scaling Logic:**
    - `jackpotBonus` starts at **0 Gold**.
    - Every time a player rolls "Good luck next time", increase `jackpotBonus` by **+10 Gold**.
    - When any player hits the `Jackpot`, award `100 + jackpotBonus` Gold and reset `jackpotBonus` back to **0 Gold**.
    - **Jackpot FX:** Trigger special pixel particle/confetti visual animation and a distinct victory audio fanfare on Jackpot hits.

---

### 2. 📜 New Character Skills

1. **Fortune's Favor (Kiểm Vé May Mắn):**
    - _Description:_ "Start each new Chronicle with 2 / 3 / 4 / 5 extra Wheel of Fortune tickets."
2. **Gold Interest / Investment (Tích Tiểu Thành Đại):**
    - _Description:_ "At day start (00:00), gain 2% / 4% / 6% / 8% of current gold as daily interest (rounded to nearest integer)."
    - _Constraint:_ Interest Gold is tracked separately in the database and **does NOT count towards the monthly MVP/payout decision**.
    - _UI Requirement:_ In the Chronicle Day Log, if interest Gold was earned, render a subtle info badge/tooltip next to Total Gold showing: `"+X Interest Gold today"`.

---

### 3. 🎨 UI & Layout Redesigns

#### A. Character Cards Redesign (Home Tab)

- Change layout structure so long player names auto-wrap/adjust cleanly without truncation overflow[cite: 5].
- Vertically align elements inside character cards to ensure consistent height across both Husband and Wife cards[cite: 5].
- Add **Wheel Tickets Badge** (`🎟️ X Tickets`) alongside XP and Gold metrics[cite: 5].

#### B. Dedicated Level-Up Congratulation Modal

- Decouple level-up notifications from the standard "Task Completed" toast/popup.
- Create a dedicated retro level-up modal displaying:
    - New level badge animation
    - Rewards earned (Gold bonus, +1 Wheel Ticket, +1 Skill Point)

#### C. Consolidated Chronicle Banner

- Merge the separate `"Until Chronicle Ends"` countdown and `"Prize Pool"` cards into a single unified header banner[cite: 7].
- Display: Current Chronicle #, Remaining Time, Total Prize Pool, and Live Payout Split projections[cite: 7].

#### D. Quest History Top-5 Truncation

- Default the Quest History view to display the **Top 5 most frequent tasks** per player[cite: 8].
- Add a `"Show All Quests"` collapsible toggle button to expand the full list[cite: 8].

#### E. Flexible Comparison Bar Text

- Update player names on comparison progress bars to display full text when container width permits[cite: 8]. Only truncate with ellipsis (`...`) on narrow mobile screens when horizontal space is constrained[cite: 8].

#### F. Household Join Code Visibility

- In Settings, **hide** the 6-character Household Join Code if both Husband and Wife slots are already filled. Only display the code when a slot is vacant (`members.length < 2`).

---

### 4. 🧹 UX & Component Refactoring

#### A. Task Card Action Buttons Refactoring

- Replace the standalone `"Edit Quest"` button on completed quest cards with an icon-based `"Fix Entry"` / `"Undo"` button (`RotateCcw` or `Pencil` icon) to conserve card space[cite: 6].
- **App-Wide Button Audit:** Scan all task/list cards and replace bulky text buttons with compact icon buttons + tooltips where appropriate.

#### B. Quests Tab Filtering & Sorting Defaults

- Add a `"Show By"` filter dropdown (`All`, `Incomplete`, `Completed`).
- Set standard defaults across the Quests tab:
    - **Sort By:** `Your Streak` (default)
    - **Group By:** `None` (default)
    - **Show By:** `All` (default)
- Ensure default options are listed as the first item in each respective dropdown menu.

#### C. Content & Copy Clean-up

- Remove obsolete helper text (e.g., _"Chiptune music and effects are synthesized live in your browser..."_).
- Conduct a text audit to eliminate verbose descriptions in favor of clean pixel icons, badge chips, and lightweight tooltips.

---

### 💻 Required Implementation Steps

Please generate/update the relevant components (`WheelOfFortune.tsx`, `CharacterCard.tsx`, `TaskCard.tsx`, `ChronicleHeader.tsx`), data schemas for Jackpot & Interest tracking, and updated game configuration files.
