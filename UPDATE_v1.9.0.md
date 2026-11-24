# UPDATE v1.9.0 Specification

Minor version: a new button, a new skill, a skill and quest rebalance, simpler Fix entry rules, a Lucky Quest of the Day, richer Chronicle results, a steeper level curve, and XP for the daily ticket and hearts. No skill point refund (`SKILL_REFUND_VERSION` stays `1.8.0`).

---

### 1. 📲 "Get the App" Download Button

A **Download** button that installs ChoreQuest (a PWA) or explains how.

#### Where it shows

* **Sign-in screen** (`AuthScreen`): a big banner right under the title, so first-time visitors see it before signing in (`InstallButton variant="banner"`).
    * A light green card with a download icon that hops every 2 s (`.px-nudge`; off with reduced motion or low graphics), a title ("Play it like an app" / "Chơi như một ứng dụng"), one line on what installing gives, and a full-width green "Get the app" button.
    * The green button doesn't compete with the orange Log in button.
* **Logged in:** the top bar (`App.tsx`, phones only), the desktop side menu (`SideNav`) and the More drawer.
* The Settings card (`InstallAppCard`) uses the same logic. One shared component: `ui/InstallButton` (icon, menu and card styles).
* **Hidden** when running as the installed app (`display-mode: standalone` / `fullscreen`, or `navigator.standalone`) and after `appinstalled`.

#### Detection

* `isInstalledApp()`: the check already in `utils/pwaMode.ts`, exported.
* Pure helpers in `utils/installGuide.ts` (unit-tested): `detectPlatform`, `detectBrowser`, `isInAppBrowser`, `installGuideSteps`.
* `detectPlatform()` → `ios` | `android` | `windows` | `other`:
    * Use `navigator.userAgentData.platform` where available, else the user agent.
    * "Macintosh" with `navigator.maxTouchPoints > 1` is iPadOS, so it counts as `ios`.
* **In-app browsers** (`Zalo`, `FBAN` / `FBAV`, `Instagram` in the user agent) can't install: the guide starts with "Open in Safari / Chrome".

#### What the button does

| Platform | `beforeinstallprompt` fired | Otherwise: guide modal |
| --- | --- | --- |
| Android | `promptInstall()` | Browser menu (⋮) → **Install app** / **Add to Home screen**. If the browser can't install: open in Chrome. |
| Windows | `promptInstall()` | Edge **…** → **Apps** → **Install this site as an app**, or Chrome's install icon in the address bar. Firefox: open in Edge or Chrome. |
| iPhone / iPad | never fires | **Share** → **Add to Home Screen** → **Add**. Works in Safari, and in Chrome / Edge on iOS 16.4+. Notifications only work from the Home Screen app. |
| Other (macOS, Linux, ChromeOS) | `promptInstall()` | By browser: Safari (macOS 14+) **File** → **Add to Dock**; Chrome **⋮** → **Cast, save and share** → **Install page as app**; Edge **…** → **Apps** → **Install this site as an app**. Firefox / older Safari: open in Chrome or Edge. |

* **Guide modal:** 2–3 numbered steps, one short line each, pixel icons (no emoji), EN + VI.
* Shown in the demo too.

---

### 2. ⚖️ New Skill: Seesaw (Bập bênh)

On every quest, compare the player's Chronicle gold with the spouse's, **before** this quest's rewards:

* **Behind or tied:** more gold.
* **Leading:** more XP instead.

| Level | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Gold when behind or tied | +6% | +12% | +18% | +24% |
| XP when leading | +10% | +20% | +30% | +40% |

*Example (L4, Dinner Dishwashing, 28 XP / 28 gold):* behind → +7 gold; leading → +11 XP.

#### Rules

* Percentages are of the quest's base share, like other quest skills. Streak gold and Tag Team cover gold don't count.
* **Both:** each owner checks their own position, so one may get gold and the other XP.
* **Late quests:** usual late rules (0 XP, half gold), so a late quest done while leading gets nothing from Seesaw.
* **Both devices agree:** the side is decided inside `computeRewardBreakdown` from the stored gold, within the save transaction.
* **Undo** takes back exactly what was paid. **Re-assign** decides the side again at that time.

#### Implementation

* New effect kind `gold_position` (`gold: levels(0.06, 0.12, 0.18, 0.24)`, `xp: levels(0.1, 0.2, 0.3, 0.4)`), handled in `applySkillBonuses` / `computeRewardBreakdown`.
* Under the **General** filter chip; icon key `seesaw` (pixelarticons `SortVertical`, up and down arrows).
* **Description:** "Behind or tied in gold: gain {{gold}} more gold. Leading: gain {{xp}} more XP instead." / "Ít vàng hơn hoặc bằng: thêm {{gold}} vàng. Dẫn trước: thêm {{xp}} kinh nghiệm."
* **Tier pip rows:** Gold when behind, XP when leading.
* **ROADMAP:** Seesaw → Done (v1.9.0); Underdog is covered by it.

---

### 3. ⚖️ Skill Rebalance

All values in `SKILL_POOL` (`constants/gameRules.ts`).

| Skill | v1.8 | v1.9.0 |
| --- | --- | --- |
| Gold Interest | 2 / 3 / 4 / 5% a day, cap 15 / 30 / 45 / 60 | **1 / 2 / 3 / 4%**, cap **12 / 20 / 28 / 36**, **active days only** (below) |
| Fortune's Favor | 1 / 2 / 3 / 4 Normal Tickets per new Chronicle and per level-up; spin bonus 20 / 40 / 60 / 80% | **2 Normal Tickets per level-up at every level, none per Chronicle**; spin bonus unchanged |
| Fast Learner | 30 / 45 / 60 / 75% XP, +1% per character level | **16 / 24 / 32 / 40%** XP, **+0.5 / 1 / 1.5 / 2%** per character level (by skill level) |
| Quick Hands | 10 / 20 / 30 / 40% XP and gold | **15 / 25 / 35 / 45%** |
| Errand Runner | 15 / 30 / 45 / 60% XP and gold | **25 / 40 / 55 / 70%** |
| Laundry Pro | XP 20 / 30 / 40 / 50%, gold 20 / 40 / 60 / 80% | **25 / 45 / 65 / 85%** XP and gold |
| Heavy Lifter | XP 10 / 20 / 30 / 40%, gold 20 / 30 / 40 / 50% | XP **15 / 30 / 45 / 60%**, gold **20 / 40 / 60 / 80%** |
| Master Chef | 9 / 18 / 27 / 36% XP and gold | **14 / 28 / 42 / 56%** |
| Team Player | 15 / 30 / 45 / 60% XP and gold | **20 / 40 / 60 / 80%** |
| Steady Worker | 10 / 15 / 20 / 25% XP and gold | **9 / 18 / 27 / 36%** |
| Golden Touch | 6 / 12 / 18 / 24% gold | **7 / 14 / 21 / 28%** |
| Tag Team | 15 / 30 / 45 / 60% gold | **25 / 50 / 75 / 100%** gold |

Unchanged: Speed Cleaner, Hall of Fame.

#### Gold Interest: active days only

* Day D pays only if the character has an **on-time** (`!late`) quest log dated D − 1 that involves them (alone or Both).
* Late quests don't count. A day kept by a Streak Freeze doesn't count either.
    * Why on time only: interest is settled when either phone first opens after midnight, possibly before a late quest is logged. On-time quests are all logged before midnight, so both phones always agree.
* A Chronicle's first day still never pays.
* **Description:** "Each day after a day you finished a quest (from Day 2 of a Chronicle), earn {{values}} of your gold as interest, up to {{cap}} gold." / "Mỗi ngày sau một ngày có làm nhiệm vụ (từ ngày 2 của Mùa), nhận lãi {{values}} số vàng đang có, tối đa {{cap}} vàng."

#### Fortune's Favor

* `values: levels(2, 2, 2, 2)`, paid at each level-up (`fortunesFavorTickets` in `grantRewards`).
* Remove the Chronicle-start grant in `applyChronicleRollover` (`gameState.ts`).
* **Description:** "Get {{values}} extra {{normalTickets}} each level-up, and {{gold}} more gold when you spin with one." (EN + VI)

#### Fast Learner

* `xpPerCharacterLevel` becomes per skill level: `levels(0.005, 0.01, 0.015, 0.02)`, read at the owned level in `applySkillBonuses`. Update the type.
* Update the `{{levelBonus}}` text, the tier pips and `FastLearnerTooltip` (e.g. character lv. 5, skill lv. 2 → 29%; skill lv. 1 → 18.5%). Show half percents with one decimal.

#### Laundry Pro

* XP now equals gold, so `skill.ironWill.desc` names the bonus once ("Gain {{xp}} more XP and gold from {{target}} quests."), EN + VI.

---

### 4. 🧺 Quest and Streak Rebalance

#### Built-in quest values (XP / gold)

| Quest | v1.8 | v1.9.0 |
| --- | --- | --- |
| Wash Clothes | 8 / 8 | 8 / **10** |
| Collect Dried Clothes | 8 / 8 | 8 / **10** |
| Hang / Dry Clothes | 10 / 10 | 10 / **12** |
| Change Bed Sheets | 13 / 15 | 13 / **17** |
| Lunch Dishwashing | 28 / 30 | 28 / **28** |
| Dinner Dishwashing | 28 / 30 | 28 / **28** |
| Cook Lunch | 40 / 42 | 40 / **40** |
| Cook Dinner | 40 / 42 | 40 / **40** |
| Cook Pet's Food | 40 / 42 | 40 / **40** |
| Supermarket Shopping | 45 / 50 | 45 / **45** |
| Mop House | 42 / 45 | 42 / **42** |
| Clean Bathroom | 55 / 65 | 55 / **60** |

* **Rules behind the values:**
    * Laundry quests get +2 gold.
    * Quests with 30+ gold get −5 gold, but never below their XP. Vacuum House (42 / 42) is unchanged.
* Update `DEFAULT_TASKS`.
* Add a `V19_REBALANCE` step to `rebalanceTask`, after v1.8's: built-in quests still on the v1.8 values move to these; moderator-edited quests are left alone.
* Update the reward comment above `DEFAULT_TASKS`: big quests pay about 1 gold per XP.

#### Streak gold = streak length

* From day 3, a streak pays its length in gold, up to 10: days 3–10 pay `[3, 4, 5, 6, 7, 8, 9, 10]`, and longer streaks stay at 10 (was Fibonacci up to 21).
* `STREAK_BONUS_GOLD` in `utils/streaks.ts`; `STREAK_MIN_DAYS` (3) and `STREAK_MAX_DAYS` (10) are unchanged.
* Tag Team covering a 10-day streak until it ends now pays 10, 9, 8, 7, 6, 5, 4, 3.

---

### 5. 🛠️ Fix an Entry

#### Who can fix what (`canManageLog`)

* **Either player** can undo or change who did any entry, whoever did or logged it (no moderator, logger or completer check).
* **Today's entries** (on time) can be fixed.
* **During the late window** ("Yesterday's quests", until noon):
    * Yesterday's **late** entries can be fixed by either player. Fix shows on them in the Yesterday view (`TaskCard`).
    * Yesterday's **on-time** entries stay locked, as before.
    * The Yesterday view stays available while yesterday has late entries, even once every quest is done.
* Unchanged: entries from before the Chronicle start or a level reset can't be fixed.

#### Never refuse over spent skill points (`revokeRewards`)

* If taking back the XP would drop a level whose skill points are already spent, the player **keeps the level** and owes the missing XP:
    * New optional `Character.xpDebt`. `xp` stays at the start of the kept level (`xpAtLevelStart`).
    * *Example:* level 7 with 10 XP loses 20 XP → level 7 with −10 XP.
    * New XP pays the debt first (`grantRewards`).
    * No level-up gold is taken back, since the level stays.
* If the points are not all spent, the level drops as before and its level-up gold is taken back.
* `revokeRewards` always succeeds and returns the characters. Remove `tasks.error.skillsSpent`.
* `xpDebt` is saved and loaded (dropped when not a positive number) and cleared by a New Legend reset.

#### Display (`characterXpProgress`)

* Text shows the negative XP: "−10 / 780 XP".
* XP bars and level rings show it as 0 (empty).

---

### 6. 🍀 Lucky Quest of the Day

* **The pick** (`utils/lucky.ts`, `luckyQuestId`):
    * One enabled quest a day, the same for both players.
    * Chosen from the date with a stable hash over the enabled quest ids (sorted), so every device agrees and the list's order doesn't matter.
    * Any enabled quest can be picked.
* **The reward:**
    * Done **on time** that day, it pays double **base gold** (`luckyBase`, ×2 `LUCKY_GOLD_MULTIPLIER`). XP is unchanged.
    * The doubling happens after Effort levels and before skills, streaks and the "Both" split, so gold skills grow with it.
    * Late quests are never lucky.
* **The log** stores `lucky: true` and the doubled `baseGold`, so re-assigning keeps it and undo takes back what was paid.
* **Shown:**
    * A "★ x2" chip on the quest's card, with a tooltip, and its gold shown doubled. Not in the Yesterday view.
    * A Today card row: "Lucky Quest: {quest} pays double gold today", struck through once done. New players see it below their First steps too.
    * The "Who did it?" preview includes it (`previewReward`).
* **ROADMAP:** Lucky Quest → Done (v1.9.0).

---

### 7. 🏆 Chronicle Results

#### Results pop-up (`ChronicleSummaryModal`)

* **Awards** from the archive (quest champions, Streak Master, most MVP days, most hearts) in the pop-up (shared `ChronicleAwards`).
* **The story:**
    * The winning margin: "Won by 183 gold".
    * Quests done together: "Together you finished 220 quests" ("Both" counted once).
    * Each player's gold change since the Chronicle before: "+12%".
    * Each player's Lucky Quests.
* **Gold race chart** (`GoldRaceChart`): each player's gold at the end of each day, as two stepped lines.
    * Legend, direct end labels, a tap/hover crosshair with the day's gold (`FloatingBubble`), and a hidden table for screen readers.
    * Series colors per theme (`--chart-husband` / `--chart-wife` in each theme's CSS), each pair checked with the data-viz palette validator against that theme's parchment-50:

      | Theme | Husband | Wife |
      | --- | --- | --- |
      | Hearth | #B04A34 (brick) | #8A5A9C (plum) |
      | Mushroom | #D82800 (brick) | #6844FC (plum) |
      | Cottage | #A8435F (berry rose) | #7A5CB8 (violet) |
      | Forest | #B0552C (autumn rust) | #8A6AD0 (plum) |

      Cottage and forest get deeper shades of their hues: their own pastel or brown brick/plum fail as chart lines.
* **Reopen it:** History → Past Chronicles → "See results" (`reopened`: a Close button, no rewards shortcut).
* **Try it in the demo:** Settings → Chronicle → "Finish this Chronicle" (demo only, `finishDemoChronicle`). The sample month is the whole Chronicle, starting from 0 gold, and replaces anything dated on its days (an earlier run used the same days), so it can be run again and again.
* **The race must match the results:** it's saved and shown only when each line ends at that player's final gold (`raceMatchesGold`, within rounding); otherwise the pop-up leaves the chart out.
    * It fills the last 30 days with seeded sample quests for both players (normal rewards, Lucky Quests included).
    * Then it ends the Chronicle through the usual rollover, which opens the results pop-up and gives the crown, wins and rewards.

#### Saved data

* The Chronicle snapshot (`ChronicleStatsSnapshot`, saved at rollover) adds `totalQuests`, per-player `lucky` and `goldByDay`.
* `goldByDay` (`goldRace`) is rebuilt from the quest log, wheel and interest events and level-up gold. The XP at the start is worked back from today's XP. It matches the payout gold exactly (checked against a real Chronicle).
* Chronicles archived before v1.9 get their race rebuilt from the log while it's kept.

#### Winning matters more (no change to the money)

* **Reigning champion** (`reigningChampions`): a crown chip on the winner's character card for the whole next Chronicle. A tie crowns both.
* **Chronicle wins** (`Character.chronicleWins`): a lasting trophy count on the card. It's counted at rollover, kept through a New Legend, and back-filled from the kept results for older saves.
* **The winner's reward** (`rewardOffer`, `claimRewardOnState`): a new theme **or** 2 Golden Tickets (`WINNER_GOLDEN_TICKETS`), from Day 1 of the next Chronicle. Only the tickets are offered once every theme is unlocked.
    * Rewards are picked in their own dialog (`RewardPickerModal`), apart from the Wardrobe, and it shows only what can be taken:
        * **Winner's prize: pick one:** the locked themes, then "OR", then a "2 Golden Tickets" card. Claiming a theme reads "Take {theme} as your prize". With every theme unlocked, only the tickets card is left.
        * **Unlock 1 new avatar:** the locked avatars only (everyone, the loser too).
        * It closes once nothing is left to take.
    * It opens from the reward banner and the results pop-up. The Wardrobe (`CosmeticPicker`) only switches themes and avatars; a reward still to pick shows a "Choose reward" shortcut there.
    * Saved as a `tickets` reward.

---

### 8. 📈 Level Curve

XP needed to reach each level (`XP_CURVE`; the old one stays as `XP_CURVE_V18`). Every level from 2 to 30 needs more:

| Level | Before | Now | | Level | Before | Now |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 230 | 250 | | 17 | 1,000 | 1,750 |
| 3 | 370 | 400 | | 18 | 1,000 | 1,825 |
| 4 | 480 | 550 | | 19 | 1,500 | 1,900 |
| 5 | 580 | 800 | | 20 | 1,590 | 2,000 |
| 6 | 600 | 850 | | 21 | 1,600 | 2,200 |
| 7 | 720 | 925 | | 22 | 1,850 | 2,400 |
| 8 | 750 | 1,050 | | 23 | 2,100 | 2,600 |
| 9 | 780 | 1,150 | | 24 | 2,350 | 2,800 |
| 10 | 810 | 1,225 | | 25 | 2,600 | 3,000 |
| 11 | 840 | 1,300 | | 26 | 3,500 | 4,000 |
| 12 | 870 | 1,375 | | 27 | 4,500 | 5,000 |
| 13 | 1,000 | 1,450 | | 28 | 5,500 | 6,000 |
| 14 | 1,000 | 1,525 | | 29 | 6,500 | 7,000 |
| 15 | 1,000 | 1,600 | | 30 | 7,500 | 8,000 |
| 16 | 1,000 | 1,675 | | | | |

* **Totals:** level 10 now takes 7,200 XP (was 5,320), level 24 (the last new skill point) 33,600 (was 24,020), level 30 66,600 (was 54,120).
* **Nobody loses a level** (`rescaleXp`, once per household, first step after the skill refund in `advanceDays`): saved XP moves to the new curve keeping the level and the share of it done (`convertXp`; 40% through level 9 stays 40% through level 9). XP past level 30 is kept as it is, and XP owed after a fixed entry stays owed. No level-ups, level-up gold or tickets come from the move.
    * On the household's real data: husband level 8 (3,886 → 5,056 XP), wife level 11 (6,467 → 8,985 XP).
* **Gold races still add up:** the move is recorded (`GameState.xpRescale`: time and each player's XP gain). A race across it follows the old curve before the move, and the gain counts as neither quest XP nor a level-up. On the real Chronicle 2 the race still ends at each player's gold (without the record it would be 50 and 100 gold off, and the chart hidden).
* New games start on the new curve (`xpRescale.at` = 0).

#### XP for daily actions

* **+3 XP** for claiming the daily Normal Ticket (`DAILY_TICKET_XP`, `claimDailyTicketOnState`) and **+3 XP** to the sender of the daily heart (`HEART_SENT_XP`, `sendHeartOnState`; the receiver still gets the Normal Ticket, no XP).
* Given like quest XP (`grantBonusXp` → `grantRewards`): owed XP is paid back first, and a level-up pays its gold, tickets and skill point.
* Recorded as an `xp` event (`BonusXpEvent`: source `ticket` / `heart`, gold 0), so the gold race replays it with the quests in time order and its level-ups land on the right day.
* The Today card's ticket row reads "Claim your daily ticket (+3 XP)".

---

### 9. ✅ Release Checklist

* **Tests:** `v100`, `v120`, `v180` and `streaks` pin v1.8 values. Update them to check behaviour only, and put the new values in `tests/v190.test.mjs`. That suite also covers:
    * Seesaw: behind, tied, leading, Both, late, undo.
    * Interest active days: no quest, only a late quest, a Both quest.
    * Fortune's Favor tickets: per level-up only.
    * The quest rebalance step.
    * The streak table.
    * Fix an entry: keeping a level with negative XP, paying it back, the unchanged level drop, save and load, and who can fix what.
    * Lucky Quest: the pick (stable, order-independent, enabled only) and the doubled base gold.
    * Chronicle results: the rebuilt race, the snapshot, wins, the theme-or-tickets reward, the reigning champion and the summary story.
    * Level curve: the new values, the one-time move (level and progress kept, once, saved, on load) and a gold race across it.
    * Daily XP: the ticket and heart XP, once a day, debt and level-ups, saved, and replayed by the race.
* **Docs:** AGENT_GUIDE (skill values, Seesaw, streak rule, Fast Learner example) and README (Fibonacci streaks).
* **Release:** CHANGELOG, `package.json` version, a What's New entry in `patchNotes.ts` (EN + VI, short and simple), and ROADMAP statuses.
* **Release** planned for 2026-11-25 (allowed from 2026-11-19, two weeks after v1.8.0).
