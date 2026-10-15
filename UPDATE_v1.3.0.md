Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Implement the following skill rebalances and critical database concurrency/transaction fixes across our React + Firebase (Firestore) codebase.

---

### 1. ⚔️ Skill Balance & Rule Updates

- **Gold Interest:**
    - **Updated Rule & Text:** "At the start of each day (from Day 2 of a Chronicle), gain 2% / 4% / 6% / 8% of your current gold as daily interest (maximum 100 gold per day)."
    - **Logic Guard:** Ensure interest calculations apply only starting on Day 2 of the active Chronicle and enforce the hard cap of 100 interest Gold per day.
- **Steady Worker:**
    - **Updated Rule:** "Gain 10% / 15% / 20% / 25% more XP AND Gold from Moderate tasks."

---

### 2. ⚡ Concurrency & Database Race Condition Fix

#### Problem & Root Cause

When both spouse accounts perform database-mutating actions simultaneously (e.g., rolling the Wheel of Fortune, completing tasks, spending skill points, updating household state), one player's updates are frequently overwritten or lost due to blind `setDoc` calls or unhandled race conditions on shared document paths.

#### Required Technical Fix

- **Atomic Transactions & Field Transforms:**
    - Audit all Firestore mutation operations across `tasks`, `characters`, `household`, and `chronicles`.
    - Replace non-atomic document overwrites with Firestore `runTransaction()` or atomic updates using `FieldValue.increment()`, `FieldValue.arrayUnion()`, etc., for shared numeric counters (e.g., total gold, XP, ticket pools, jackpot bonus).
- **Isolated Per-User Fields:**
    - Ensure user-specific actions (like rolling the wheel or assigning skill points) mutate distinct document paths or nested character objects (`characters.husband` vs `characters.wife`) within atomic transactions to prevent write collisions.
- **Wheel of Fortune & Task Action Locking:**
    - Implement optimistic UI locking or disable action buttons during pending write transactions to prevent duplicate clicks and state divergence.

---

### 💻 Required Output Needed

Output the updated skill configuration definitions (`skillDefinitions.ts`) and modified Firestore helper services (`firestoreServices.ts`, `transactionUtils.ts`) demonstrating thread-safe, atomic updates for tasks, wheel spins, and skill upgrades.

---

### 3. 📱 Mobile PWA Scrollbar

- On the mobile PWA (installed app), hide the vertical scrollbar while keeping scrolling exactly as it works now (touch scrolling, momentum, scroll position).
