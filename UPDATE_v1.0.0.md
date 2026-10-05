Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Implement the following production domain settings, cosmetic unlock systems, balance rebalances, QoL search/stats features, and critical mobile layout/responsive bug fixes across our React + Firebase codebase.

---

### 1. ⚙️ Production Domain & Environment

- Configure CORS, Firebase Auth Authorized Domains, and environment settings to support the new production domain `cqvn.vercel.app` alongside the legacy domain `chore-quest-hieu-anh.vercel.app`.

---

### 2. 🎨 Cosmetics System: Themes & Avatars

#### Unlock Rules

- **Winner Reward:** On Day 1 of a new Chronicle, the winner of the previous Chronicle can choose **1 reward**: either a new **App Theme** or a new **Character Avatar**.
- **Scope & Scope Restrictions:**
    - **Themes:** Applied locally per user (client-side preference). Spouse sees their own selected theme.
    - **Avatars:** Household-wide (synced via Firestore). Spouse sees the player's updated avatar sprite.
    - **Household Reset:** All unlocked themes/avatars are bound to the specific `householdId`. Leaving or changing households resets cosmetics to default.

#### Theme Definitions (4 Distinct Themes)

1. **Cozy Hearth (Default):** Warm tavern/fireplace aesthetic with wooden borders, cream parchment backgrounds, and warm amber accents.
2. **8-Bit Mushroom Kingdom (Inspired by Super Mario Bros. 1-1):** Classic 8-bit NES platformer aesthetic featuring vibrant cobalt blue sky backgrounds (`#5C94FC`), pixelated brown brick and green pipe border accents, coin-yellow highlights, and crisp retro arcade typography.
3. **Cozy Whimsical Cottage (Inspired by Studio Ghibli):** Soft, hand-painted anime fantasy aesthetic featuring pastel moss greens, warm sunlight yellows, soft floral pinks, smooth rounded wood borders, and a peaceful cottagecore ambiance.
4. **Enchanted Forest:** Deep emerald green and earthy wood tones with mystical glowing runes, soft foliage textures, and bioluminescent accent colors.

#### Avatar Definitions

- **Default:** Classic 8-bit Knight (Husband) and Mage (Wife).
- **Additions:** 3 new locked Husband avatars and 3 new locked Wife avatars matching retro RPG/fantasy archetypes.
- **UI Switcher:** Clicking the Top Header Character Button opens the Cosmetic Picker Modal to swap active unlocked themes/avatars.

---

### 3. ⚖️ Game & Economy Rebalances

#### Skills Rebalance

- **Caps:** Increase `MAX_SKILLS_PER_CHARACTER` to **8** (Max Level remains 4; Max Points remain 24).
- **XP-Only Skill Buff:** Add a gold bonus equal to **50% of the XP bonus percentage** for all XP-only skills.
- **Skill Adjustments:**
    - _Master Chef:_ Gold bonus adjusted to `10% / 18% / 26% / 34%` on Cooking quests.
    - _Quick Hands & Team Player:_ Gold bonus adjusted to `5% / 10% / 15% / 20%`.
    - _Heavy Lifter:_ Gold bonus adjusted to `15% / 25% / 35% / 45%` on Heavy tasks.
- **New Skill — Synergistic Streak (Cộng Hưởng):**
    - "Earn `20% / 30% / 40% / 50%` more gold and `10% / 15% / 20% / 25%` more XP from tasks where your spouse currently has an active streak (3+ days)."
- **New Skill — Hall of Fame (Đỉnh Cao Phong Độ):**
    - "Earn `1 / 2 / 3 / 4` extra Wheel Tickets at every 5th MVP earned in this Chronicle."
    - _Logic Constraint:_ MVP is evaluated once at day-end (00:00) to prevent ticket farming. Non-retroactive.

#### Quests Rebalance

- _Cooking Quests:_ -5 XP, -5 Gold.
- _Dust Furniture:_ -5 XP, -10 Gold.
- _Dishwashing Quests:_ +5 XP, +5 Gold.
- _Take Out Trash:_ +5 Gold.
- _Clean Fridge:_ -5 Gold.
- _Auto-Categorization:_ Re-sort tasks into `Quick`, `Moderate`, and `Heavy` groups based on updated values.

---

### 4. 💡 Quality of Life (QoL) Enhancements

#### Fuzzy Quest Search

- Add a search input to the Quests tab using fuzzy search matching against both English (`nameEn`) and Vietnamese (`nameVi`) strings simultaneously, regardless of active locale settings.

#### Completion Color Coding

- Tint completed task card backgrounds according to who completed them (Husband Accent, Wife Accent, or Dual Co-op Color).

#### Past Chronicles Archive

- Add a **"Past Chronicles"** section in the History tab displaying stats: Prize pool payouts, Avg Daily Tasks/Gold, streaks, MVP counts, and fun awards (e.g., _"Dishwashing Champion"_).

#### Learned vs Unlearned Skills UI

- In the Skills tab, divide skills into **Learned Skills** and **Unlearned Skills**.
- Hide the "Unlearned Skills" section once `MAX_SKILLS_PER_CHARACTER` (8) is reached.

#### Localized Level-Up Popup

- Restrict the Level-Up celebration modal to trigger **only** for the currently logged-in user, not when the spouse levels up.

---

### 5. 📱 Responsive Layout & Mobile UI/UX Fixes

#### Eliminate Horizontal Scrolling & Overflow

- Fix CSS overflow layout bugs on narrow mobile viewports (e.g., Galaxy Z Flip 6 at $393 \times 960\text{px}$ and general $320\text{px}+$ screens). Ensure `max-w-full overflow-x-hidden` on main parent containers to eliminate horizontal scrollbars.

#### Floating Controls & Bottom Navigation Overhaul

- **Sticky Bars:** Lock the Top Header Bar (Sound/Character controls) and Bottom Navigation Bar to fixed viewport edges (`fixed top-0`, `fixed bottom-0`), independent of content scrolling.
- **Mobile 4-Tab Navigation ("More" Drawer):**
    - Replace the overflowing tab strip with 3 primary tabs (**Home**, **Quests**, **Skills**) + 1 **"More"** tab.
    - Tapping **"More"** opens a bottom drawer menu with remaining sections (**History**, **Calendar**, **Settings**).

#### Wheel Animation Performance Fix

- Fix layout reflow/flicker on the bottom navigation bar during Wheel of Fortune spin animations. Isolate wheel rotation using CSS `transform` on a hardware-accelerated layer (`will-change-transform`).

---

### 💻 Required Output Needed

Output the updated core files, including state managers for Cosmetics & Skills, fuzzy search utility, mobile navigation wrapper, and updated task configuration files.

---

### 🔁 Follow-up Changes (after review)

The changes below came from review feedback after the first implementation and are part of v1.0.0.

#### A. Avatars

- Replace the 3 suggested avatars per spouse with **16 new avatars per spouse**, drawn from the provided reference sheets (Knight and Mage stay as defaults):
    - **Husband:** Forester, Harvester, Wayfarer, Artificer, Spellsmith, Botanist, Troubadour, Dreamer, Scrapper, Voyager, Courier, Monk, Fisherman, Merchant, Ranger, Sailor.
    - **Wife:** Baker, Florist, Herbalist, Apothecary, Beastmaster, Ranger, Courier, Explorer, Dancer, Acrobat, Puppeteer, Storyteller, Mechanic, Tailor, Cartographer, Captain.

#### B. Further Quest Rebalances

- **Effort groups by XP:** Quick up to 10, Moderate 11–40, Heavy 41+ (used for defaults and new quests).
- _Dust Furniture:_ −5 XP, −5 Gold (on top of the first rebalance; final 20 XP / 20 Gold).
- _Mop House:_ −5 Gold.
- _Sweep House:_ −5 XP, −5 Gold.
- _Supermarket Shopping:_ −5 Gold.
- _All Cooking quests:_ a further −5 Gold each (final 40 XP / 45 Gold).
- _Vacuum House:_ +2 XP (42), moving it to Heavy.
- _Collect Dried Clothes_ and _Wash Clothes:_ +3 XP, +3 Gold each.

#### C. UI Improvements

- **Completion tints:** more vibrant colours; quests done by **Both** use a blend of the husband and wife tints (no third colour).
- **Theme previews:** the wardrobe shows a miniature screen rendered in each theme instead of a colour palette.
- **Wheel result popup:** after a spin, a card like "Quest complete!" shows the gold won or a good-luck message, instead of text under the wheel.
- **Narrow screens:** no component may be clipped on the right on small devices (e.g. the Skills page and the end-of-chronicle split on the Calendar page); check every page.
- **Household members (Settings):** names, roles and badges must not overlap on small screens.

