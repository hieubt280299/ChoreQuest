Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Implement the following Wheel of Fortune Golden Ticket mechanics, prize pool balance changes, skill updates, rendering optimizations, and mobile PWA styling fixes across our React + Firebase codebase.

---

### 1. 🎟️ Gameplay Mechanic: Golden Tickets & Wheel Overhaul

#### Golden Ticket Rules

- **Double Gold:** Spinning the Wheel of Fortune using a Golden Ticket doubles ($2\times$) all Gold rewards earned (Small, Normal, Big, and Jackpot prizes).
- **Miss Mercy Mechanism:** If a player hits "Miss" ("Good luck next time") with a Golden Ticket:
    1. Add **+10 Gold** to the global Jackpot pool as normal.
    2. Refund the player **1 Normal Ticket**.
- **Auto-Consumption Hierarchy:** The Wheel must **automatically consume Golden Tickets first** whenever `goldenTickets > 0`.
- **Level-Up Reward Update:** Leveling up now awards **1 Golden Ticket** (replaces the previous Normal Ticket reward).

#### Wheel Visual & Balance Updates

- **Ticket Indicator:** Update the Wheel UI to explicitly show which ticket type is queued for the next spin (e.g., `🎫 Normal Ticket` vs `✨ Golden Ticket`).
- **Updated Odds & Rewards:**
    - `Small Prize` (35% chance): **5 Gold** (was 3 Gold)
    - `Normal Prize` (30% chance): **10 Gold** (was 5 Gold)
    - `Big Prize` (15% chance): **15 Gold** (was 10 Gold)
    - `Jackpot` (2% chance, was 1%): **500 Base Gold** + `jackpotBonus` (was 100 Base Gold)
    - `Miss` (18% chance, was 19%): No prize + 10 Gold added to Jackpot

---

### 2. ⚔️ Skill Balance Updates

- **Fortune's Favor:**
    - Award `1 / 2 / 3 / 4` extra **Normal Tickets** at the start of each new Chronicle AND whenever leveling up.
    - Increase Gold rewards by `25% / 50% / 75% / 100%` when spinning with **Normal Tickets** (does not apply to Golden Tickets).
- **Hall of Fame:**
    - Award `1 / 2 / 3 / 4` **Golden Tickets** at every 5th MVP day of a Chronicle.
- **Team Player:**
    - Increase rewards to `12% / 24% / 36% / 48%` extra XP **AND** `10% / 20% / 30% / 40%` extra Gold on Co-op tasks ("Both").

---

### 3. ⚡ Rendering, Animation & PWA Scrollbar Optimizations

- **High-Impact Render Audit:**
    - Review component re-render triggers across state context providers (`GameContext`, `AudioContext`, `AuthContext`).
    - Apply `React.memo`, `useCallback`, and select React context selectors where appropriate to minimize unneeded DOM re-renders without reducing visual quality or degrading asset clarity.
- **Smoother Modal Transitions:**
    - Refactor all Modal dialog open/close animations using hardware-accelerated transitions (e.g., Framer Motion `AnimatePresence` with `scale` and `opacity` ease curves) for butter-smooth display.
- **Mobile PWA Scrollbar Removal:**
    - Hide native vertical scrollbars globally on mobile PWA views while preserving full touch/scroll functionality:
        ```css
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
        }
        ```

---

### 4. 📝 Copy & Text Adjustments

- Update skill header copy from _"Unlock up to 8 household buffs"_ to **"Unlock up to 8 household skills"** across both English and Vietnamese localization files.

---

### 💻 Required Output Needed

Output the updated TypeScript interfaces (`Character`, `WheelTicket`), modified Wheel component (`WheelOfFortune.tsx`), skill configuration file (`skillDefinitions.ts`), and global CSS scrollbar utilities.
