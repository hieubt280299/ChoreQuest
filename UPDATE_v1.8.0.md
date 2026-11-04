# UPDATE v1.8.0 Specification

### 1. 💌 Partner Interaction Features: "Send Hearts" & Reminders

#### A. Send Hearts (Loves)

* **Mechanic:** Allow a player to tap a Heart button directly on their partner's Home character card to send a heart. No text message or popup dialog is required—just the visual heart animation.

* **Rewards & Limits:**

  * Limit of **1 heart sent per day** per player.

  * The recipient immediately receives **1 Normal Ticket**.

  * The Chronicle summary page tracks and displays who was sent the most hearts.

#### B. Daily Reminders (Serverless Setup)

* Browser push notification handlers for mobile/web under three triggers:

  1. **9:00 PM** local time if 0 tasks completed today.

  2. Instantly when spouse sends a heart.

  3. **Day 1 of a new Chronicle**.

### 2. 🛡️ Streak Freezes & Rest Days

* **Allocation:** Each player is automatically assigned **3 Streak Freeze opportunities** at the start of every new Chronicle (does not stack across Chronicles).

* **Trigger Rule:** Auto-consumed at day-end (00:00) if zero tasks were completed, preserving all active streaks.

* **Late Completion:** Completing tasks late on that day still consumes a freeze if activity threshold wasn't met prior, but saves the streak.

### 3. ⚖️ Comprehensive Skill Rebalances & Point Refund

#### Skill Adjustments

* **Gold Interest:** 2% / 3% / 4% / 5% interest rate, with a **daily cap of 20 / 40 / 60 / 80 gold**.

* **Fortune's Favor:** Wheel spin gold bonus is **20% / 40% / 60% / 80%**.

* **Speed Cleaner:** XP and gold gain are **8% / 16% / 24% / 32%**.

* **Master Chef:** XP and gold gain are **9% / 18% / 27% / 36%**.

* **Laundry Pro:** XP and gold gain are **20% / 30% / 40% / 50%**.

* **Errand Runner (Việc vặt - formerly Shop Savvy):** Covers shopping and general quests; grants **15% / 30% / 45% / 60%** bonus gold and XP.

* **Quick Hands:** Gold gain is **10% / 20% / 30% / 40%** (XP unchanged).

* **Heavy Lifter:** Gold gain is **20% / 30% / 40% / 50%**, plus **10% / 20% / 30% / 40%** XP gain.

* **Team Player:** Gold and XP gain are **15% / 30% / 45% / 60%**.

* **Hall of Fame:** Triggers reward payout every **3rd MVP day** of a Chronicle.

* **Fast Learner:** XP gain is **30% / 45% / 60% / 75%** (+1% per character level kept).

* **Tag Team (formerly Synergistic Streak):**

  * Completing spouse's streak quest protects their streak. If done solo by you, spouse's streak remains unchanged (acts as a free freeze).

  * Grants **+15% / 30% / 45% / 60%** gold gain for that quest plus active streak bonus if completed solo. **0 XP gain**.

#### One-Time Skill Point Refund

* Trigger an automatic one-time skill point refund for all characters upon updating to v1.8.0, with an in-app informational modal.

#### Quest Rebalance Update

* **Mop House:** Base reward updated to **45 gold, 42 XP**.

### 4. 💡 Quality of Life (QoL) Enhancements

#### Tier Pip Tooltips

* Hovering over Tier Pips displays a tooltip showing values for all 4 levels:

  * *Description:* `Gain 20% → 30% more XP and 10% → 15% more gold from Quick tasks.`

  * *Tier Pip Tooltip:*

    * XP gain: `10% / 20% / 30% / 40%`

    * Gold gain: `5% / 10% / 15% / 20%`

---

### ✅ Implementation Notes

- **Decisions made with the user before building:**
    - **Reminders run on Vercel functions** (`api/`) with Web Push, so they reach phones even when the app is closed. Nothing runs on a server of our own, and it stays on Vercel's free plan.
    - **Tag Team's "active streak bonus"** is the spouse's current streak bonus gold, paid to the player who covers the quest alone.
    - **A Streak Freeze is only used when it saves a streak**, so idle days with nothing to protect don't use one up.
- **Hearts:**
    - A Send heart button on the partner's Home card: one a day per player, with no dialog, just a burst of pixel hearts. It's always on the card that isn't the active player's, including in the demo.
    - The partner gets 1 Normal Ticket at once (`utils/hearts.ts`), plus a toast and a Today card note. The toast waits while a dialog is open, so it never covers one.
    - Hearts are stored in `game.hearts` and pruned with the logs. The Calendar day log lists them.
    - The Chronicle summary shows each player's hearts and who got the most. The archive keeps them in its snapshot (`hearts` per player and a "Most hearts" award).
- **Notifications** (Settings → Notifications, households only):
    - Each device subscribes with Web Push (`utils/push.ts`) and saves the subscription, with its time zone and language, under the player's own `users/{uid}` document. No security rule changes were needed.
    - `api/heart` is called right after a heart is saved. It checks the player's Firebase ID token and announces only a fresh heart actually stored in the household, once per heart.
    - `api/reminders` is called every hour by Vercel Cron. The free plan allows daily jobs only, so `vercel.json` has one daily job per hour.
        - Each device gets what's due at its local time: **9 PM** if that player has done no quest today, and **8 AM on Day 1** of a Chronicle (even before anyone opens the app).
        - On the free plan a job runs within its hour, so 9 PM means 9:00 to 9:59.
        - It only accepts Vercel's calls (`CRON_SECRET`).
    - The service worker shows the notifications and opens the app when one is tapped (`public/push-sw.js`).
    - **Setup** (README, "Notifications"): `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `FIREBASE_SERVICE_ACCOUNT` and `CRON_SECRET` on Vercel. Until they're set, the settings card stays hidden and everything else works.
    - **Limits:** iPhones and iPads (iOS 16.4+) only allow notifications in the app added to the Home Screen; the card says so. Real delivery can only be checked once deployed, on real devices.
    - The server code only imports from `api/_lib`, with `.js` extensions. Vercel bundles each function on its own, and imports from outside `api/` or without extensions fail at runtime in this ES-module project.
- **Streak Freezes:**
    - 3 per player per Chronicle, counted from `game.freezes` and not carried over.
    - At each day's end, a player who did nothing that day uses one if a streak of 3+ days (the ones the app shows) would otherwise break.
    - "Doing something" means a quest done that day, alone or together. A quest done late the next morning doesn't count, as the spec says, though it keeps its own streak as before.
    - Days are settled once, never retroactively (`freezesSettledOn`), and from stored data only, so both devices agree.
    - A frozen day bridges every streak of that player without adding a day, just like a Tag Team cover bridges one quest (`StreakIndex`).
    - Shown as a snowflake count on each character card, a Today card note the next morning and a tag on the Calendar day.
- **Skill rebalance:** the spec's values. Steady Worker and Golden Touch weren't in the spec, so they're unchanged.
    - Gold Interest's cap is now per level (`dailyInterestCap`), and its description shows the current cap.
    - **Errand Runner** keeps Shop Savvy's id, so learned levels and saves carry over. It covers Shopping and General quests and stays under the Shopping filter chip, since every skill sits under exactly one chip.
    - **Tag Team** keeps Synergistic Streak's id. With the skill, doing alone a quest your spouse has a 3+ day streak on:
        - pays +15/30/45/60% gold, no XP;
        - pays the spouse's current streak bonus gold;
        - keeps the spouse's streak going that day (`coveredFor` on the log).

      Done together, only the gold bonus applies, since the spouse's own streak goes on anyway. A late completion keeps the streak but pays no streak gold.
- **One-time refund** (`refundSkills`):
    - Runs once per household when the first device on 1.8.0 settles the days. It's marked with `skillsRefundedIn`, so it never repeats, even if a partner still on 1.7.x writes in between.
    - Every learned skill is unlearned, and Gold Interest's start date is cleared, so a re-learned Interest starts the next day.
    - Each player who had skills sees a dialog once, after What's New, with a Pick skills button.
- **Mop House:** 42 XP / 45 gold. Saved quests still on 45 / 50 move to it; edited ones are kept.
- **Tier pips:** hovering or tapping a skill's level bars shows every stat at all 4 levels, with the current level highlighted. This works on the Skills page, the partner's skills and the skill picker. For Gold Interest the rows are rate and daily cap; for Fortune's Favor, tickets and spin gold.
