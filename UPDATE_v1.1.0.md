Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Implement the following account security updates, "Yesterday's Quests" grace period mechanics, theme-specific cabin scenes, Mushroom Kingdom theme guidelines, and mobile performance optimizations across our React + Firebase codebase.

---

### 1. 🔑 Account & Security Management

#### Settings Tab: Change Password Feature

- Add a **Change Password** section within the `Settings` tab.
- Require three inputs: `Current Password`, `New Password`, and `Confirm New Password`.
- Implement validation (min length, pattern matching, non-empty) and handle Firebase Authentication `reauthenticateWithCredential` prior to updating password.

#### Registration Form Update

- Update the **Sign Up / Registration** form to require a `Confirm Password` field.
- Validate that `Password === Confirm Password` before executing account creation.

---

### 2. ⏳ Gameplay Mechanic: "Yesterday's Quests" Grace Period

#### Visibility Rules

Render a **"Yesterday's Quests"** toggle button on the `Quests` tab **ONLY** when ALL of the following conditions are met:

1. Current local time is **before 12:00 PM (noon)**.
2. **Zero tasks** have been completed for the current day.
3. The current day is **NOT Day 1 of a new Chronicle** (since previous Chronicle stats are already finalized).

#### Interaction & Logic

- Clicking the button switches the `Quests` list view to display yesterday's uncompleted tasks.
- **Completion Rules & Penalties for Yesterday's Quests:**
    - **XP:** `0 XP` awarded (completely forfeited).
    - **Gold:** Earn **50% of total base + skill bonus gold** (rounded down). Valid toward Chronicle's overall prize payout pool.
    - **Streaks:** **0 streak bonus gold** awarded; however, completing the quest **preserves the streak** (prevents streak reset).
    - **MVP Tracking:** Gold earned is added to yesterday's Chronicle log for total earnings, but **does NOT retroactively recalculate or alter yesterday's MVP winner** (MVP is permanently locked at 00:00).

---

### 3. 🎨 Cosmetics & Cabin Scene Customization

#### Theme-Specific Cabin Scenes

- Decouple the background/cabin render logic so each theme provides its own dedicated `CabinScene` component styling and asset composition rather than sharing the default `Cozy Hearth` cabin.

#### Theme Specification: "Mushroom Kingdom" (fka 8-bit Mushroom Kingdom)

- **Visual Anchors & Emoji Icons:** Use retro game-themed emoji icons heavily as functional visual anchors across components:
    - 🍄 `Mushroom`: Power-ups, stats boosts, heavy processing
    - ⭐ `Super Star`: Major achievements, level ups, high records
    - 🧱 `Brick Block`: Task containers, steps, obstacles
    - ❓ `Question Block`: Tips, helper tooltips, secrets
    - 🪙 / 💰 `Coins`: Rewards, gold earned, prize pool
    - 🦖 / 🐢 `Koopa/Bowser`: System errors, tough challenges
    - 🏰 `Castle`: Chronicle end goals, long-term milestones
    - 🪠 / 🪵 `Warp Pipe`: Navigation links, tab redirects
- **Strict Color Mapping:** Map UI elements to these exact or approximate hex codes:
    - **Primary Canvas / Sky:** `#5C94FC` (Vibrant Sky Blue)
    - **Secondary / Greenery:** `#00A800` (Classic Pipe / Grass Green)
    - **Accent / Interactive:** `#F8B800` (Bright Gold / Coin Yellow)
    - **Borders / Structure:** `#C84C0C` (Brick Brown / Terracotta)
    - **Typography:** `#000000` (Pure Black) and `#FFFFFF` (Pure White)

---

### 4. ⚡ Mobile Performance & Lazy Loading Optimization

#### UI / Video Quality Selection Toggle

- Add a **UI / Video Quality** setting in the `Settings` tab with two modes: **High** (default) and **Low**.
- **High Quality:** Current full-featured visual experience (CSS animations, spinning canvas assets, particle FX, background shaders).
- **Low Quality:** Maximum performance mode for low-end mobile hardware.
    - Disables all dynamic moving components, background animations, spin/confetti effects, and heavy particle filters.
    - Replaces complex animations with static fallback images/CSS states.

#### Theme Asset Lazy Loading

- Refactor the cosmetics engine so locked/unselected themes and their associated heavy image/audio assets are **lazy-loaded on demand** rather than pre-bundled into the main app payload (applies to both High and Low quality settings).

---

### 💻 Required Output Needed

Generate/update core component files (`ChangePassword.tsx`, `YesterdaysQuestsBanner.tsx`, `MushroomKingdomTheme.tsx`, `SettingsQualityToggle.tsx`), along with updated theme configurations and lazy-loading routes.

---

### 🔁 Follow-up Changes (after review)

These changes came from review feedback after the first implementation and are part of v1.1.0.

- **No emoji anchors:** the Mushroom Kingdom emoji in titles and labels didn't fit the game's pixel style. They are removed, so the theme uses the same pixel icons as the other themes.
- **Readable brick boards (a11y):** in Mushroom Kingdom, the Chronicle header and other brick boards were hard to read.
    - They now use a deep brick background with large, faint bricks, with #C84C0C kept as the bevel highlight.
    - Text on them is white or yellow with a black outline.
- **Low graphics keeps cheap transitions:** Low quality removes only what can cause lag on weak devices: the sprite animation clock, looping CSS animations, confetti and fixed backgrounds.
    - Simple transitions are kept: framer-motion modal and card animations, and button and bar transitions.
    - The Wheel of Fortune spins briefly (2 s) instead of 5–10 s.
- **Concise copy:** the Low graphics description is just "Smoother on older phones". All other descriptive texts (hints, warnings, setting descriptions) are reviewed and shortened.
- **Readable tooltips:** tooltip text must be easy to read in every theme. The tooltip on the Mushroom Kingdom chronicle header was hard to read; all tooltip bubbles now use dark text on a light background, with no inherited board styling.

