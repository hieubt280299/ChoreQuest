# Changelog

All notable changes to ChoreQuest are listed here, newest first. Each version matches an `UPDATE_vX.Y.Z.md` spec in the repository root.

## [1.8.0] - 2026-11-04

Spec: [UPDATE_v1.8.0.md](UPDATE_v1.8.0.md)

### Added

- **Hearts:**
  - A Send heart button on the partner's Home card, once a day per player, with no dialog: just a burst of pixel hearts.
  - The partner gets **1 Normal Ticket**, a toast and a Today card note (the toast waits while a dialog is open). The Calendar day log lists hearts.
  - All day, the card of a player who got a heart shows a beating heart with two small ones floating up on the avatar, for both players. Tap it to see who sent it.
  - The Chronicle summary shows each player's hearts and who got the most. The archive has a Hearts received row and a "Most hearts" award.
- **Streak Freezes:**
  - Each player gets 3 per Chronicle, not carried over.
  - At the end of a day with nothing done, one is used, but only if a streak of 3+ days would otherwise break. The frozen day keeps the streaks without adding to them. Quests done late the next morning don't count as doing something that day, though they keep their own streak.
  - Shown as a snowflake count on each character card, a Today card note the day after, and a tag on the Calendar day. Longest streaks in the archive count frozen days as bridges.
- **Notifications** (one row of Settings → Display, households only):
  - **Hearts:** your partner is notified when you send one (`api/heart`).
  - **Evening reminder:** at 9 PM local time, if you've done no quest today.
  - **New Chronicle:** at 8 AM on Day 1.
  - The reminders run hourly from Vercel Cron (`api/reminders`: one daily job per hour, within the free plan), and each device gets them at its own local time.
  - Web Push with VAPID. Subscriptions are kept on the player's `users/{uid}` document. iPhones need the Home Screen app.
  - The row only shows until notifications are on; the device's own settings turn them off. Signing out unsubscribes the device, and a device saved twice is notified once.
  - Setup steps are in the README under "Notifications".
- **Tier pip tooltips:** hovering or tapping a skill's level bars lists its values at all 4 levels, with the current one highlighted ("XP gain: 10% / 20% / 30% / 40%").
- **One-time skill point refund:** every learned skill is unlearned once per household, so players can choose again with the new values. A dialog after What's New tells each player who had skills, with a Pick skills button.

### Changed

- **Skill rebalance:**

  | Skill | Now |
  | --- | --- |
  | Gold Interest | 2/3/4/5%, capped at 20/40/60/80 gold a day (was 100 at every level) |
  | Fortune's Favor | +20/40/60/80% spin gold |
  | Speed Cleaner | 8/16/24/32% XP and gold |
  | Master Chef | 9/18/27/36% XP and gold |
  | Laundry Pro | 20/30/40/50% XP and gold |
  | Quick Hands | 10/20/30/40% gold (XP unchanged) |
  | Heavy Lifter | 20/30/40/50% gold, now with 10/20/30/40% XP |
  | Team Player | 15/30/45/60% XP and gold |
  | Fast Learner | 30/45/60/75% XP (+1% per character level kept) |
  | Hall of Fame | pays at every **3rd** MVP day (was every 5th) |

  Golden Touch and Steady Worker are unchanged.
- **Skill descriptions** name exactly what each skill boosts: Heavy Lifter now mentions its XP, and equal XP and gold bonuses are written once ("Gain 8% more XP and gold…"). Fortune's Favor, Gold Interest and Tag Team read shorter.
- **The Wardrobe button left Settings.** It's still in the top bar, the More drawer and the desktop menu.
- **Shop Savvy is now Errand Runner** (_Việc vặt_): 15/30/45/60% XP and gold on Shopping **and General** quests. Its filter chip stays Shopping.
- **Synergistic Streak is now Tag Team** (_Tiếp sức_): +15/30/45/60% gold, no XP, on quests the spouse has a 3+ day streak on. Done alone, it also pays the spouse's current streak bonus gold and keeps the spouse's streak going that day. A late completion keeps the streak but pays no streak gold. It no longer rewards breaking the spouse's streak.
- **Mop House:** 42 XP / 45 gold (was 45 / 50). Saved quests still on the old values move; edited ones are kept.
- `vercel.json`: the app fallback no longer catches `/api/*`, and the reminder crons were added. The service worker leaves `/api/*` to the network and loads `push-sw.js`, which shows notifications and opens the app when one is tapped.

## [1.7.2] - 2026-11-03

Spec: [UPDATE_v1.7.2.md](UPDATE_v1.7.2.md)

### Added

- **Roadmap:** [ROADMAP.md](ROADMAP.md) keeps ideas for future versions, to revise and pick from.

### Fixed

- **Tooltips are never covered or cut off.** Bubbles used to be drawn inside their card, so whether they showed on top depended on how the browser layered neighbouring cards. On a phone, the Calendar day's bonus gold tip (interest and wheel) could end up under the calendar. A bubble near the top of the screen also went under the top bar, and one in a dialog could be cut off by its scroll area.
  - Every bubble is now drawn at the top level of the page, above everything (`ui/FloatingBubble`). It sits above its trigger, or below when there's no room above (clear of the top bar and the phone navigation), stays inside the screen and follows its trigger while scrolling (`utils/placeBubble`).
  - This covers the `Tooltip` component, the skill tips on character cards (`SkillChip` now uses `Tooltip`) and icon-button labels (`IconButton`).
  - The old layering workaround (`.tooltip-host`, raising a card with an open tooltip) and `hooks/useViewportClamp` are gone.
- **Tooltips open on the first tap.** A phone reports hover and focus on a tap, which opened the bubble just before the tap's click closed it again, so it took two taps. Only a real mouse hover and keyboard focus open a bubble now. A tap toggles it, and a mouse click no longer closes a bubble you're hovering.
- **Icon-button labels** hide once the button is pressed, so a label can't hang over the dialog the button opens.

## [1.7.1] - 2026-11-03

Spec: [UPDATE_v1.7.1.md](UPDATE_v1.7.1.md)

### Added

- **Automatic updates:** an installed app now switches to a new version by itself, without being closed and reopened.
  - **The cause:** a downloaded version waited for every window to close, because nothing told the service worker to take over.
  - It looks for updates on launch, when brought back to the screen, when back online and every 30 minutes.
  - Once nothing is in progress (no action still saving, no dialog open, no field being typed in, wheel not spinning), the app tells the new version to take over and reloads into it. In the background, only a save in progress holds it back. Other open tabs of the app wait for the same.
  - The build publishes `version.json`, which the app fetches without caching. If its version differs and the service worker hasn't taken over within 20 seconds, the app reloads once for that version (`utils/appUpdate.ts`).
- **About section in Settings:** the app version and What's New moved out of Account into their own section.

### Changed

- **"Group" is now "Task size"** (Vietnamese: "Mức việc") for Quick, Moderate and Heavy tasks, in the quest editor, the Filter dialog's "Group by" options, Quest configuration and the skill filter chips. "Complexity" was considered, but these sizes are about how much work a chore is, not how hard it is to work out. The skill filter that said "By effort" now says "Task size" too, so it no longer clashes with effort levels (Light / Normal / Heavy). Code names (`group`, `TaskGroup`) are unchanged.

### Fixed

- **Wheel labels** face their slice again, top towards the rim and bottom towards the hub, as before 1.7.0. 1.7.0 had flipped the lower half to read upright while resting, but labels then turned upside down as they passed the pointer.
- **Skill filters** with nothing left to learn are hidden; one that empties falls back to All. With only All left, there are no chips.
- **Skill descriptions** that can't be upgraded where they appear (the Home skill tips and your partner's skills) show only the current level, not "current → next".

## [1.7.0] - 2026-11-01

Spec: [UPDATE_v1.7.0.md](UPDATE_v1.7.0.md)

### Added

- **Today card on Home:** quests done, streaks at risk, the daily ticket, tickets to spin and skill points, each one tap away. New players see a short First steps checklist there instead.
- **Invite links:** "Share link" uses the phone's share sheet, or copies the link. Opening it fills in the code on the join screen, even after signing up first.
- **Skill filters:** chips for Cleaning, Cooking, Laundry, Shopping, By effort and General.
- **Calendar legend:** explains the player dots, quest count, crown and flag.
- **Offline badge:** shows when you're offline in a household, so you know your actions will sync later.
- **Show/hide password** on every password field.
- **Wardrobe** is now in the More drawer, the desktop menu and Settings, and the avatar shortcut has a shirt icon.
- **Suggested rewards:** picking a Group on a new quest fills in its usual XP and gold, until you type your own.

### Changed

- **One-tap quests:** the check button completes a quest for you straight away, and a short notice shows the reward with **Undo** and **Change** (who did it). Quests with effort levels and late quests still open the dialog, and level-ups still get their card.
- **Shorter quest list:** compact rows with the action on the right, about half the old height. Finished quests collapse into "Done today (n)", and the page shows "3/21 done today".
- **Filter button:** sort, group and show moved into a dialog next to the search box. A dot marks non-default filters.
- **Edit mode:** a pencil at the top reveals New quest and each quest's editor, so the list stays clean.
- **Colours:** Complete is green, and red is kept for destructive actions. Done rows are quiet, with a bar in the colour of who did the quest.
- **Home on phones:** Today comes first, your own card comes before your partner's, and the cabin scene no longer repeats names and levels. The subtitle now shows today's quests and gold (it used to show the Chronicle's gold total).
- **Skills:** cards show level 1's value, or current → next, instead of all four levels.
- **Wheel:** with no tickets it folds to a small row, and it can still be opened. Labels on the lower half turn over, so 15 no longer reads "ST".
- **Spending a skill point** now shows what it buys and asks first, because points can't be taken back.
- **Onboarding on phones:** "I have a code" and "Create new" show one card at a time. An invite link opens on joining.
- **Quieter Play demo** on the sign-in screen.
- **Vietnamese level badge** reads "Cấp". "XP" stays only in tight numeric tags, like "G" for gold.
- The Calendar page is titled "Calendar" in English, matching its tab.

### Fixed

- **Numbers:** Handjet's zero looked like an 8. Digits now use Jersey 20, loaded as a digits-only subset.
- **Dialogs:** Escape now closes them, keyboard focus stays inside and returns afterwards, and tapping outside no longer discards the quest, rename or delete forms.
- **Tap targets:** buttons and fields are at least 44px tall, and small icons have a 44px tap area.
- **Calendar:** month labels no longer overflow or get cut off, day numbers are larger, and today's label is readable.
- **Contrast in every theme:** green buttons are darker (they were too pale in Whimsical Cottage and Enchanted Forest), and tab labels, count badges, the calendar's quest counts, streak text and the empty ticket count are easier to read.
- **Zero rows** are gone from the reward preview.
- The stray "·" before "Last done" in History, and missing screen-reader names on the info buttons.
- "Every quest is done" now appears with no grouping too.

## [1.6.0] - 2026-11-01

Spec: [UPDATE_v1.6.0.md](UPDATE_v1.6.0.md)

### Added

- **Continue with Google:** a button on the sign-in screen signs you in or creates your account. New players go to the usual create-or-join screen, and their character starts with the name from their Google profile (they can rename it).
- **Your account stays yours:** Google opens your existing account when the email matches, so progress is never split. If Firebase needs proof, a short screen asks for your password once to link the two.
- **Sign-in methods in Settings:** the Account card shows Email and password and Google.
  - **Connect** adds Google and keeps your password. This is the safest route for Gmail players (see Changed).
  - **Disconnect** removes Google. It needs a password on the account and asks you to confirm.
  - **Set a password** emails a link to a Google-only account.
- **Language button:** a compact VI / EN button in the top bar, also on the sign-in and onboarding screens, switches language in one tap.
- Google uses a popup, or a redirect on iPhone home-screen apps and when popups are blocked. `vercel.json` proxies `/__/auth/*` for the redirect, and the service worker leaves those pages to the network.

### Changed

- **Gmail accounts with an unverified email:** the first direct Google sign-in replaces the password with Google (Firebase's rule for trusted providers). The account and its data stay the same. "Forgot password?" or "Set a password" adds one again, and a wrong password on the sign-in screen now suggests Google.
- **Google-only accounts:** Change password is hidden, and Delete account confirms with Google instead of a password.
- Clearer messages: a wrong password in the Delete account dialog now says so, the "email in use" message says "account" rather than "household", and the "sign-in method is off" message covers every method.
- `tests/run.mjs` keeps Firebase out of the test bundle, so suites can run `authService.ts` against the real SDK.

## [1.5.1] - 2026-10-27

Spec: [UPDATE_v1.5.1.md](UPDATE_v1.5.1.md)

### Added

- **Forgot password:** a "Forgot password?" link on the sign-in screen opens a reset screen.
  - Enter your email (pre-filled from the sign-in form) and Firebase sends a reset link in your language.
  - The confirmation reads the same whether or not the email has an account, so it never reveals who's registered. It reminds you to check Spam.
  - "Send again" is allowed after 60 seconds.

### Changed

- **Vietnamese is the default language.** A language you already picked in Settings is kept.
- **Vietnamese text reviewed.** Clashing words are fixed: "Category" is now "Loại" (it shared "Nhóm" with Group), moderator is "Quản lý" everywhere, and "Rửa bát" is used throughout. English-style phrasing is gone (e.g. "{{who}} đã làm" instead of "Làm bởi…"). "Mùa" is capitalised consistently, and the demo is called "Chơi thử".
- The weak-password message now matches the real rule (8+ characters with a letter and a number).
- **Settings is simpler on phones.** It's now three labelled groups instead of nine separate cards:
  - **Preferences:** Sound & music, and Display (graphics quality and language together).
  - **Household:** members, Chronicle (end date and prize pool together) and Quest configuration. The quest list opens in a dialog (wider on computers), so it no longer stretches the page, and "Reset quests to defaults" sits inside it. New legend appears only once a player reaches level 30.
  - **Account:** your email, Sign out and Change password.
- **Rarely used actions are quieter:** "Delete account" and "Leave household" are now small text links instead of big buttons. Both still ask you to confirm. The app version and "What's New" sit in a small footer under Account.
- The Settings page title is now just "Settings".
- **Cleaner character cards on Home:**
  - Gold, Golden Tickets and Normal Tickets now sit together in one bar. Each still explains itself when tapped.
  - Skills are a plain line of text ("Master Chef 1 · Fast Learner 1") instead of separate boxes. Tap a name for its description.
- **Wardrobe tabs:** Themes and Avatars are now two tabs, so the Wardrobe no longer scrolls through both. It opens on Avatars when an avatar is the only reward left to pick, and a trophy marks the tab with a reward to claim.

### Fixed

- Tips opened on a Home character card (skills, gold, tickets) are no longer hidden behind the other player's card.

## [1.5.0] - 2026-10-26

Spec: [UPDATE_v1.5.0.md](UPDATE_v1.5.0.md)

### Added

- **Chronicle summary:** the first time you open the app in a new Chronicle (from Chronicle 2, any day), a dialog shows the one that just ended: the winner, both players' gold and MVP days, and each player's prize and share. If you have rewards to claim, a button takes you to the Wardrobe.
- **What's New:** after each update, a dialog explains the changes in plain language (Major features, Balance adjustments, Bug fixes, Performance). It shows once per device and can be reopened from Settings → About, which also shows the app version.
- **Effort levels:** a moderator can turn on effort levels for any Moderate quest in Quest configuration (or in the quest editor). Completing that quest then asks for **Light** (half XP and gold), **Normal** or **Heavy** (1.5×), rounded down, before skills and streaks are added. The quest card shows the effort when it wasn't Normal.
- **Ticket tips:** "Normal Tickets" and "Golden Tickets" in skill descriptions (Fortune's Favor, Hall of Fame) show what each ticket does when tapped.

### Changed

- **Chronicle rewards:** both players now unlock 1 new avatar when a Chronicle ends, and the winner also unlocks 1 new theme. Previously only the winner picked one theme or avatar.
- **Quests:** Dishwashing (lunch and dinner) 28 XP and 30 gold. Cooking (lunch, dinner and pet food) 40 XP and 42 gold. Vacuuming 42 XP and 42 gold. Built-in quests still on their old values are updated automatically; quests a moderator edited are kept.
- **Skills:**
  - **Master Chef:** now also 4 / 8 / 12 / 16% more XP on cooking quests.
  - **Laundry Pro:** now also 4 / 8 / 12 / 16% more XP on laundry quests.
  - **Golden Touch:** 6 / 12 / 18 / 24% more gold on every quest.
  - **Gold Interest:** 2 / 3 / 4 / 5% a day (still at most 100 gold a day, from Day 2).
- **Wheel of Fortune:** the "Next spin" ticket notice is hidden while the wheel spins.

### Fixed

- **Wheel result always shows:** switching tabs while the wheel was spinning could lose the result card. While it spins, the other tabs (and the demo's character switch) are now locked until the result appears.
- **Readable text in every theme** (checked against WCAG contrast in all four themes):
  - Mushroom Kingdom made every title white for the sky, so "So close!" and other pop-up titles were white on white. Titles inside pop-ups and panels now keep their own colours.
  - Text colours used on light panels (wood, brick, moss, gold and plum tones) were darkened slightly where needed, so they reach 4.5:1 on every light surface. Icon gold reaches 3:1.
  - Secondary text on finished (tinted) and yesterday's (faded) quest cards is now a strong ink colour.
  - Light text straight on the page: it gets a black outline over Mushroom Kingdom's clouds, and is dark ink on Whimsical Cottage's pale sky.
  - Whimsical Cottage's brick buttons and boards are deeper, so their light text reads. Quest group labels and the Golden Ticket count use darker tones.

## [1.4.0] - 2026-10-22

Spec: [UPDATE_v1.4.0.md](UPDATE_v1.4.0.md)

### Added

- **Golden Tickets:**
  - Leveling up now gives 1 Golden Ticket (instead of a Normal Ticket).
  - The wheel always uses a Golden Ticket first, and it doubles the gold of every prize, jackpot included.
  - If a Golden Ticket misses, the jackpot still grows by 10 gold and you get 1 Normal Ticket back.
- **Tests in the repo:** `npm test` runs all the game-logic test suites (`tests/`). They were kept outside the repo before.
- **Wheel ticket display:** the wheel shows both ticket counts and which ticket the next spin will use ("Next spin: Golden Ticket · 2× gold" or "Normal Ticket"). Results won with a Golden Ticket are tagged, and a refunded miss says so. Character cards show a Golden Ticket badge when you have any.

### Changed

- **Wheel prizes:**
  - Small: 5 gold
  - Normal: 10 gold
  - Big: 15 gold
  - Jackpot: 500 gold + the pot, now a 2% chance
  - Miss: 18% chance
- **Fortune's Favor:** 1 / 2 / 3 / 4 Normal Tickets at the start of each Chronicle **and** at every level-up, plus 25 / 50 / 75 / 100% more gold when spinning with a Normal Ticket (not with a Golden Ticket).
- **Hall of Fame:** 1 / 2 / 3 / 4 Golden Tickets at every 5th MVP day.
- **Team Player:** 12 / 24 / 36 / 48% more XP and 10 / 20 / 30 / 40% more gold on quests done together.
- **Smoother pop-ups:** every dialog opens and closes with a smooth fade and scale (the step-by-step pixel motion looked jerky on phones), and celebrations pop in with a soft bounce.
- **Faster screens:**
  - Completing or fixing a quest now redraws only the quest cards that changed, not the whole list.
  - The wheel's artwork no longer redraws on every update.
  - Moving the volume sliders no longer redraws the wheel or the reward pop-ups.
- **Installed app on phones:** scrollbars are now also hidden on iPhone home-screen apps, which the previous check missed.
- **Pixel scrollbars:** the page, the Wardrobe and other pop-ups, the skill picker and the day log now have scrollbars in the game's style (a bevelled wood bar in a sunken track) that follow each theme's colours.
- **Pop-up close button:** the X now hangs over each pop-up's top-right corner, level with the title, clear of the content and its scrollbar.
- **Copy:** "Unlock up to 8 household skills" (was "buffs"), in English and Vietnamese.

## [1.3.0] - 2026-10-15

Spec: [UPDATE_v1.3.0.md](UPDATE_v1.3.0.md)

### Changed

- **Gold Interest:** at most 100 gold a day. It still starts on Day 2 of a Chronicle, and the description says both.
- **Steady Worker:** 10 / 15 / 20 / 25% more XP and gold from Moderate quests.
- **Installed app on phones:** scrollbars are hidden. Scrolling works exactly as before.

### Fixed

- **Both players acting at the same time no longer lose updates.**
  - Before, each action saved a full copy of the game from that phone, so a spin, quest or skill point from one spouse could wipe out what the other had just done.
  - Now each action is saved in a Firestore transaction: it's re-applied on the latest saved data, and only the fields it changed are written. If both spouses save at the same moment, Firestore retries the second one with the first one's changes included.
  - Each action is applied only once, even when it's retried.
  - If an action no longer makes sense (for example, your spouse logged the same quest a moment earlier), it's undone on screen and a short message explains why.
  - Offline, actions are still saved as soon as you're back online, as before.
- **Wheel of Fortune:** the wheel starts turning once the spin is saved, and the Spin button is locked until then, so a double tap can't spend two tickets.
- **Leaving a household and deleting an account** now work from the latest saved data, so a quest your spouse logs at that moment isn't lost.

## [1.2.0] - 2026-10-07

Spec: [UPDATE_v1.2.0.md](UPDATE_v1.2.0.md)

### Added

- **Reset quests to defaults** has a **Remove custom quests** checkbox:
  - Unchecked (the default): built-in quests go back to their default values, and your custom quests are kept.
  - Checked: full reset, so custom quests are removed too.
- **Fast Learner tooltip:** "+1% per character level" in the description shows your live XP bonus (for example, character level 5 with the skill at level 2: "Current XP bonus: 65%").
- **MVP tooltip:** in Hall of Fame's description, "MVP" explains who the day's MVP is, in place of the old note in brackets.

### Changed

- **Skill balance:**
  - **Speed Cleaner:** 10 / 15 / 20 / 25% more XP and gold from Cleaning quests.
  - **Shop Savvy:** 10 / 20 / 30 / 40% more XP and 5 / 10 / 15 / 20% more gold from Shopping quests.
  - **Fast Learner:** 40 / 60 / 80 / 100% more XP from every quest, plus 1% per character level. It no longer gives gold.
  - **Fortune's Favor:** 3 / 4 / 5 / 6 extra tickets each new Chronicle, and 25 / 50 / 75 / 100% more gold from the Wheel of Fortune (jackpot included).
  - **Hall of Fame:** 3 / 4 / 5 / 6 extra tickets at every 5th MVP day.
- **Yesterday's quests:**
  - The view now lists all quests, done and not done, and Sort, Group and Show work there too.
  - Sort, Group and Show reset to their defaults when you switch between Today and Yesterday.
  - Quests done yesterday are locked: they can't be fixed or edited.
  - Cards show "0XP" (no strikethrough), and unfinished ones have a duller, faded look.
- **Wording:** gold is written out ("10 gold" / "10 vàng") everywhere except the tight reward breakdown, which keeps "G", and Vietnamese uses "kinh nghiệm" instead of "KN" except in the smallest badges.
- **"So close!"** on the Wheel of Fortune's miss card is now dark text, which is easier to read.

### Fixed

- The Wheel of Fortune's result card no longer pops up before the wheel has stopped spinning.
- The gold amount on the Wheel's result and jackpot cards is centred in its box.
- The "Jackpot!" title has a dark outline, so it stands out from the orange card.
- The "Who did it?" tiles (and other pop-up content) are no longer cut off at the top.

## [1.1.1] - 2026-10-07

### Changed

- **Past chronicles keep their stats:**
  - When a chronicle ends, its archive stats (quests done, best streaks, MVP days and awards) are saved with its payout record. They stay for the last 24 chronicles (about 2 years) instead of disappearing after about 4 months, when the quest log is trimmed.
  - Chronicles that ended in the last ~4 months get their stats filled in automatically.
- **Quest configuration** in Settings is collapsed by default; "Show quests" opens the full list.
- **Change password** is now part of the **Account** section: a "Change password" button opens the form there, and a confirmation appears after the update.
- **Settings layout:** on wide screens, related settings sit side by side: Graphics quality with Language, and Chronicle end date with Prize pool.

## [1.1.0] - 2026-10-06

Spec: [UPDATE_v1.1.0.md](UPDATE_v1.1.0.md)

### Added

- **Change password** in Settings: current password, new password and confirmation, checked against your current password before the change.
- **Confirm password** on the sign-up form. New passwords need at least 8 characters with a letter and a number.
- **Yesterday's quests:** until noon, if nothing has been logged today (and it isn't a chronicle's first day), the Quests tab offers yesterday's unfinished quests.
  - They pay no XP and half of base + skill gold (rounded down), and no streak bonus.
  - They still keep the streak going.
  - The gold counts for the payout but never changes yesterday's MVP, which is settled at midnight. Late entries are tagged in the day log.
- **Theme scenes:** each theme has its own cabin scene: a Mushroom Kingdom level, a meadow cottage, and an enchanted forest clearing with a rune stone.
- **Graphics quality** in Settings:
  - **High** is the full experience.
  - **Low** stops what can lag older phones: sprite and scene animation, looping effects, confetti and fixed backgrounds. The wheel spins for only 2 seconds.
  - Both settings keep the quick open, close and press transitions. The choice is saved per device.

### Changed

- "8-Bit Mushroom Kingdom" is now **Mushroom Kingdom**, using the exact palette: #5C94FC sky, #00A800 greens, #F8B800 gold accents, #C84C0C brick structure, black and white type.
- **Mushroom Kingdom boards:** the top bar and chronicle banner use deep brick with large, faint bricks and outlined text, so they're easy to read.
- **Shorter texts:** hints, warnings and setting descriptions are shorter and to the point (for example, Low graphics now reads just "Smoother on older phones.").

### Fixed

- **Tooltips:** every tooltip is now dark text on a light bubble in every theme. On Mushroom Kingdom's brick boards they used to pick up the board's text outline and were hard to read.
- **Lazy-loaded themes:** each non-default theme's scene and styles are now a separate download, fetched only when the theme is used or previewed. Cozy Hearth stays built in.

## [1.0.0] - 2026-10-05

Spec: [UPDATE_v1.0.0.md](UPDATE_v1.0.0.md)

### Added

- **Cosmetics:**
  - Four app themes: Cozy Hearth (default), 8-Bit Mushroom Kingdom, Whimsical Cottage and Enchanted Forest.
  - 16 new avatars for each character, on top of the Knight and Mage.
    - Husband: Forester, Harvester, Wayfarer, Artificer, Spellsmith, Botanist, Troubadour, Dreamer, Scrapper, Voyager, Courier, Monk, Fisherman, Merchant, Ranger, Sailor.
    - Wife: Baker, Florist, Herbalist, Apothecary, Beastmaster, Ranger, Courier, Explorer, Dancer, Acrobat, Puppeteer, Storyteller, Mechanic, Tailor, Cartographer, Captain.
- **Winner's reward:** from Day 1 of a new chronicle, the last chronicle's winner unlocks one theme or one of their own avatars for the household.
- **Wardrobe:** tap your character in the top bar to switch themes (just for you, on your device) and avatars (seen by your spouse too).
- **New skills:**
  - **Synergistic Streak** (_Cộng hưởng_): more gold and XP on quests your spouse has an active streak on.
  - **Hall of Fame** (_Đỉnh cao phong độ_): extra wheel tickets at every 5th MVP day of a chronicle, settled at midnight.
- **Quest search:** a fuzzy search on the Quests tab matches English and Vietnamese names at once, with or without accents.
- **Past chronicles** in the History tab: payouts, quests and gold per day, best streaks, MVP days and awards such as "Dishwashing Champion".
- **Mobile navigation:** Home, Quests, Skills and a **More** drawer with History, Calendar and Settings.
- **Theme previews** in the wardrobe: a miniature screen drawn in each theme.
- **Wheel result card:** after a spin, a popup shows the gold won or a good-luck wish, like "Quest complete!".

### Changed

- **Skills:**
  - Up to **8** skills per character; points still cap at 24.
  - XP-only skills now also pay gold at half their XP bonus.
  - Master Chef 10/18/26/34% gold, Quick Hands and Team Player 5/10/15/20% gold, Heavy Lifter 15/25/35/45% gold.
  - The Skills tab is split into **Learned** and **Unlearned** skills, and the Unlearned list hides when all slots are full.
- **Quest rebalance:**
  - Cooking quests −5 XP and −10 gold (40 XP, 45 gold).
  - Supermarket Shopping −5 gold.
  - Dust Furniture −10 XP and −15 gold.
  - Sweep House −5 XP and −5 gold.
  - Mop House −5 gold.
  - Vacuum House +2 XP (now Heavy).
  - Wash Clothes and Collect Dried Clothes +3 XP and +3 gold.
  - Dishwashing quests +5 XP and +5 gold.
  - Take Out Trash +5 gold.
  - Clean Fridge −5 gold.
  - Groups now follow XP: Quick up to 10, Moderate 11–40, Heavy 41+. Supermarket Shopping and Vacuum House are Heavy.
  - Existing households get the new values on unedited built-in quests.
- **Completed quest cards** are tinted by who did them: red for the husband, purple for the wife, and a blend of both for quests done together.
- **Level-up cards** only show for your own character, including level-ups caused by your spouse logging a quest.
- **Top bar:** fixed to the top of the screen, like the bottom bar.
- **Production domain:** `cqvn.vercel.app`, alongside the legacy `chore-quest-hieu-anh.vercel.app`.

### Fixed

- No more sideways scrolling or clipped cards on narrow phones, from 320px wide (e.g. Galaxy Z Flip 6), including the Skills page and the end-of-chronicle split.
- Household member names, roles and badges no longer overlap on small screens.
- The bottom bar no longer flickers during Wheel of Fortune spins.

## [0.2.1] - 2026-10-03

### Changed

- **Wheel of Fortune:** tap the wheel itself to spin; the separate Spin button is gone, and a blinking "Spin" label on the hub shows when you can.
- **Wheel face:** slices now have different sizes, with the jackpot slice the smallest to reflect its rarity, and run X, Jackpot, X, 3, 5, 10, 5, 3. At rest the pointer sits on the jackpot slice, and a shorter pointer never covers slice icons or values. Each spin lasts a random 5–10 seconds. The odds are unchanged.
- **Wheel layout:** your ticket count moved into the jackpot bar, with a tooltip showing how many tickets you have (or how to get more), and the empty gap under the wheel is gone.
- **Settings:** the quest configuration list shows the first 5 quests, with a "Show all" toggle for the rest.

## [0.2.0] - 2026-10-02

Spec: [UPDATE_v0.2.0.md](UPDATE_v0.2.0.md)

### Added

- **Wheel of Fortune** on the Home tab: spend a ticket to spin an 8-bit pixel wheel.
  - Prizes: +3, +5 or +10 gold, a jackpot of 100 gold plus the bonus pot, or no prize ("Good luck next time!").
  - Every miss adds 10 gold to the shared jackpot, and a jackpot win resets it. Jackpot wins get pixel confetti and a fanfare.
  - Wheel gold counts for the chronicle payout but not for the day's MVP.
- **Wheel tickets:**
  - Claim one free ticket per day from your character card.
  - Earn one ticket per new level. Undoing and redoing a quest can't earn the same level's ticket twice.
  - The ticket count shows next to gold on each card.
- **New skills:**
  - **Fortune's Favor** (_Kiếm vé may mắn_): 2 / 3 / 4 / 5 extra tickets at the start of each chronicle.
  - **Gold Interest** (_Tích tiểu thành đại_): gain 2 / 4 / 6 / 8% of your current gold each day, from day 2 of a chronicle. Interest counts for the payout but not for the day's MVP.
- **Level-up modal:** each level-up gets its own retro card with a badge animation and the gold bonus, wheel ticket and skill point it paid. It appears after the "Quest complete!" card.
- **Chronicle banner** on Home: chronicle number, countdown, prize pool and the live payout split in one place.
- **Calendar day log:**
  - Tap any day to read its page of the chronicle: quests and wheel spins with times, each player's gold and XP, and the day's MVP.
  - Tags mark today, the best day, the payout day, rest days and upcoming days.
  - Interest and wheel gold appear in a bonus tooltip.
- **Character names:** rename your own character (up to 16 letters, numbers or spaces). The name replaces the role label across the app and keeps the exact case you typed.
- **Quests tab "Show" filter** (All / Incomplete / Completed). The defaults are now Your streak / None / All, each listed first.
- **History:** shows the top 5 quests per player, with a "Show all quests" toggle.
- **Unspent skill points** appear as a number on the Skills tab.
- **Save button** for the chronicle end date, so a date isn't applied while you're still choosing it.

### Changed

- **Home tab:**
  - The header is now **Party status**, with a "quests completed today · gold earned" summary.
  - The cabin scene sits above the chronicle banner.
  - Character cards wrap long names, line up evenly, and show equal-height gold and ticket badges.
- **Compact actions:** completed quests use an icon "Fix entry" button. Edit quest, skill unlock and upgrade, and moderator roles are also icon buttons with tooltips.
- **Quest cards:**
  - Cards are tighter.
  - Streak badges are compact chips ("🔥 3") on the quest's name line, with a "3-day streak" tooltip.
  - Streaks show only from day 3, when they start counting.
- **Tooltips** fit their content and always stay on screen.
- **Comparison bars** in History show full names when there's room.
- **Settings:** the household join code is hidden once both players have joined.
- **Vietnamese dates** read `01/10/2026` instead of `1 thg 10, 2026`.
- **Copy cleanup:** long helper texts became info tooltips or were removed.

### Fixed

- Quest cards no longer overflow narrow phone screens.
- Skill tooltips no longer make the page scroll sideways.
- Character name input is capped at 16 characters, and each Vietnamese letter counts once.
- Pull-to-refresh no longer reloads the installed Android app.

## [0.1.0] - 2026-10-01

Spec: [UPDATE_v0.1.0.md](UPDATE_v0.1.0.md)

### Added

- **Households** for two players (husband and wife): create one or join with a 6-character code.
  - Onboarding and an offline demo mode.
  - Moderator and member roles; only the founder can change roles.
  - Leaving a household and deleting your account.
- **Chronicles (seasons):**
  - Moderators set the end date.
  - A chronicle rolls over automatically into a new one-month chronicle.
  - Gold resets at rollover while XP, levels and skills persist. The prize pool is split by gold earned.
- **Quest audit:** undo a completion or change who did it, by the person who logged it, the affected player or a moderator.
- **Streaks:** completing a quest on consecutive days pays Fibonacci bonus gold from day 3.
- **Quest groups** (Quick / Moderate / Heavy) and skills that boost a group instead of a time of day.
- **Skills:**
  - Descriptions show every level's value (Dota-style) with the current level highlighted.
  - Highlighted quest categories and groups show which quests they apply to.
- **"Who did it?" reward preview** with the full base, skills and streak breakdown.
- **Quests tab** sorting and grouping.
- **History tab:** each player's quests this chronicle, compared with their partner.
- **Level 30 mastery** celebration and Master badge, and a moderator "New legend" reset of levels and skills.
- **Quests:**
  - Bilingual quest names.
  - A rebalanced default quest list, with XP halved so levelling feels earned.
  - A "Reset quests to defaults" action.
- **Formatted prize pool input** with thousand separators.
- **NES-style chiptune** background music and sound effects.
- **Retro pixel theme, PWA and Firebase** (from the earlier groundwork):
  - A retro 16-bit pixel cabin theme and a Dota-style level ring.
  - An installable PWA.
  - Optional Firebase Analytics.

### Fixed

- The modal close button is aligned inside its frame.
- Creating a household no longer hits a permission error from a listener race.
