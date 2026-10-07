Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Implement the following skill rebalances, quest reset logic updates, language abbreviation guidelines, and "Yesterday's Quests" UI/UX refinements across our React + Firebase codebase.

---

### 1. ⚔️ Skill Balance & Tooltip Updates

#### Skill Tweaks

- **Speed Cleaner:** Update bonuses to `10% / 15% / 20% / 25%` extra XP **AND** `10% / 15% / 20% / 25%` extra Gold on Cleaning quests.
- **Shop Savvy:** Update bonuses to `10% / 20% / 30% / 40%` extra XP **AND** `5% / 10% / 15% / 20%` extra Gold on Shopping quests.
- **Fast Learner:**
    - Formula: `(40% / 60% / 80% / 100%) + (characterLevel * 1%)` extra XP on all quests.
    - **Dynamic Tooltip:** Render an interactive tooltip showing calculated real-time total XP bonus (e.g., Character Lv. 5 + Skill Lv. 2 $\rightarrow$ `"Current XP bonus: 65%"`).
- **Fortune's Favor:**
    - Add Gold Multiplier: `+25% / +50% / +75% / +100%` bonus Gold earned from Wheel of Fortune.
    - Ticket Multiplier: Start each new Chronicle with `3 / 4 / 5 / 6` extra Wheel Tickets.
- **Hall of Fame:**
    - Ticket Multiplier: Earn `3 / 4 / 5 / 6` extra Wheel Tickets at every 5th MVP day of a Chronicle.
    - **Hover Tooltip:** Move the explanatory disclaimer text inside a tooltip that appears when hovering over the `"MVP"` keyword.

---

### 2. 💡 Quest Reset Logic Enhancement

#### Default Reset Options

- In the `"Reset quests to defaults?"` modal/popup, add a checkbox: **`[ ] Remove custom quests`**.
- **Behavior:**
    - **Checked:** Perform full reset (resets default quests and purges user-created custom quests).
    - **Unchecked (Default):** Reset default system quests to base stats while **preserving all custom quests**.

---

### 3. 🌐 Copy, Typography & Abbreviation Standards

- **Gold Currency Labels:** **NEVER** abbreviate Gold as "G" in text UI (e.g., avoid `10 G`). Explicitly spell out `gold` (English) or `vàng` (Vietnamese).
- **Vietnamese XP Abbreviation:** Avoid abbreviating "Kinh nghiệm" as "KN" whenever container width permits full text. Reserve "KN" strictly for tightly constrained mobile micro-badges.
- **Contrast Fix:** Update the text color of the `"So close!"` label/badge to a higher-contrast hex value so it stands out against its container background.

---

### 4. ⏳ "Yesterday's Quests" Detailed UX Rules

#### List Display & Filter State

- **Full View:** Display **all tasks** (both completed and incomplete) in yesterday's view, allowing full sorting, grouping, and filtering (`All`, `Incomplete`, `Completed`).
- **Filter Reset on Toggle:** Automatically reset all `Sort By`, `Group By`, and `Show By` dropdown filters to their default values whenever toggling between Today's and Yesterday's view.
- **Locked Completed Tasks:** Completed task entries from yesterday **cannot be edited or "fixed"**. Disable the edit/undo action button for yesterday's completed entries.

#### Card Visuals & Rewards Display

- **XP Reward Badge:** Display `0 XP` directly on yesterday's task cards without strikethrough typography.
- **Past Event Styling:** Render yesterday's **incomplete** task cards and child components with a distinct, desaturated/duller background palette to visually signify a past event.

---

### 💻 Required Output Needed

Generate/update the relevant core files (`skillDefinitions.ts`, `FastLearnerTooltip.tsx`, `ResetQuestsModal.tsx`, `TaskCard.tsx`, `QuestsView.tsx`), including updated tooltip helpers and CSS/Tailwind color scheme adjustments.

---

### 🔁 Follow-up Changes (after review)

These changes came from review feedback after the first implementation and are part of v1.2.0.

- **Wheel result timing:** the "Congratulations!" card appeared before the wheel stopped spinning. The result card now waits for the spin's full duration.
- **Centred prize amount:** on the Wheel's result and jackpot cards, the coin and number are centred in their box.
- **Readable "Jackpot!" title:** the yellow title was too close to the orange card colour. It now has a dark pixel outline.
- **"G" allowed only where space is tight:** gold is written out everywhere except the reward breakdown table and the totals under the "Who did it?" tiles, which keep "G".
- **Pop-ups not cut off:** the "Who did it?" tiles were cut off at the top of the pop-up. Pop-up content now has inner padding, so borders and the raised, selected tile show in full.
