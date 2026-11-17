Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Fix the issues found after v1.8.0.

---

### 1. 🔄 Stale Data in the Installed App

- Playing as an installed app on Android, the data is sometimes stale until the app is closed and reopened.
- Example: my wife spun the wheel and missed, so the jackpot grew by 10 on her screen. Then she sent me a heart. On my screen, the heart never arrived and the jackpot still showed the old value.

### 2. 🎡 Wheel Results Spoiled on the Spouse's Screen

- While one player's wheel is spinning, the spouse's screen shouldn't give the prize away before it stops.
- Example: if I'm about to win the jackpot, my spouse knows before my wheel stops, because the jackpot on their screen drops back to 500.

---

### ✅ Implementation Notes

- **Version:** a patch, both changes counted as fixes (decided with the user). It can ship 1 day after v1.8.0 (merged 2026-11-05) under the new release rule.
- **Why the data went stale:**
    - Phones freeze an installed app in the background, and Firestore's live connection can die there without the SDK noticing.
    - Coming back doesn't fire an `online` event, so the SDK never reconnected, and the household listener kept the last data it had.
    - Any of the player's own writes made meanwhile stayed pending too, and the listener skips snapshots while a write is pending.
- **Fix:** coming back to the app after 5+ seconds away (or from the back/forward cache) restarts the connection (`services/firestoreResume.ts`: `disableNetwork`, then `enableNetwork`), which fetches the latest household at once.
    - A save still in progress (a transaction needs the connection) finishes first.
    - Runs only for players in a household.
- **Why the wheel spoiled itself:**
    - A spin is saved before the spinner's wheel starts turning (so the prize is the server's).
    - The spouse's screen got it at once: the jackpot reset or grew, and the spinner's gold, tickets, payout share and day log changed, up to 10 seconds before the wheel stopped.
- **Fix:**
    - Each spin now records how long its wheel turns (`spinMs`, picked before saving; shorter with reduced motion or low graphics) and the jackpot before it (`jackpotBefore`).
    - The spouse's screen holds a fresh spin back until that time has passed, plus a second, by showing the game with it undone (`withoutSpins`). The real state is used for every action.
    - **What's held:** only spins that arrive while their wheel may still be turning, judged by when they were made and allowing 5 seconds of clock difference between the phones. A spin seen later (opening or coming back to the app) shows straight away.
    - **Older spins:** spins from v1.8.0 (no `spinMs`) wait for the longest spin (about 11 s).
    - **Demo:** nothing is held, since both players share one screen.
- **Release rule:** the semver and minimum-gap rule is now written down in AGENT_GUIDE ("Versioning & Release Cadence") and the README, and 1.8.0's date is now its merge date (2026-11-05).
