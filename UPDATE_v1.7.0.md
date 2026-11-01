Act as a professional UI/UX designer and Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Fix the findings from the whole-app UX review. The main problem: the everyday routine takes too many taps and too much scrolling.

---

### 1. 🐞 Fix First

1. **Zeros look like 8s:** "0/230 XP" reads as "8/238". Handjet has no alternate zero, so load a different font for digits only.
2. **Logging a chore takes 3 taps:** make Complete instant and credit the player, then show a short notice with the reward, Undo and Change. Keep the dialog for effort levels and late quests, and keep the level-up card.
3. **The quest list is too long:** use compact rows with the action on the right. Fold search and the 3 dropdowns into one row, move finished quests into a collapsed "Done today (n)", show progress at the top, and move New quest and the pencils into an edit mode.
4. **Red means both "complete" and "delete":** make Complete green, keep red for destructive actions, and make done rows quiet.
5. **Dialogs:** Escape closes them, keyboard focus stays inside and returns afterwards, and a tap outside can't discard a form.
6. **Skill points spend instantly and can't be refunded:** confirm first, showing what the point buys.
7. **Tap targets:** at least 44px.
8. **Calendar:** month labels overflow or get cut off, day numbers are tiny, and the marks have no legend.

---

### 2. 🏠 Bigger Improvements

9. **Home:** add a Today card at the top (quests left, daily ticket, skill points, streaks at risk, each tappable). It doubles as a first-steps guide for new players. Stop repeating names and levels in the cabin scene on phones.
10. **Inviting a partner:** add a share link that fills in the code, and offer "I have a code" first on phones.
11. **Wardrobe:** add it to More and Settings.
12. **Skills:** show current → next instead of all four levels, and add category filters.
13. **Wheel:** collapse it when there are no tickets, and stop labels reading upside down at rest.
14. **Offline:** show a small "Offline, will sync" badge.

---

### 3. ✨ Polish

- Hide zero rows in reward screens.
- The Home subtitle should show today's gold, not the Chronicle total.
- The Group on a new quest suggests XP and gold.
- Add show/hide password, and make Play demo quieter.
- Remove the stray "·" before "Last done" in History.
- Labels: the English Calendar page title matches its tab; Vietnamese uses "Cấp" and keeps "XP" only in tight tags.
- Name the info buttons for screen readers.

---

### ✅ Implementation Notes

- **Digit font:** Jersey 20, chosen after comparing 10 pixel fonts at real sizes. It loads as a digits-only subset (`text=0123456789`), so other characters fall through to Handjet.
- **Search stays visible:** the review suggested putting search behind the Filter button. Search and Filter fit in one row, which takes the same height and keeps search one tap away.
- **Done rows:** finished quests used to be tinted by who did them. That colour stays as a bar on the row, so "who did it" is still visible at a glance.
- **Quest editor language:** the review said to show the Vietnamese field first for Vietnamese players. It already did; the review had been made in English. No change.
- **"XP" in Vietnamese:** kept only in tight numeric tags ("+13XP"), the same rule as "G" for gold. Sentences already say "kinh nghiệm".
- **Skill filters** sit above the unlearned list only, because learned skills are few.
- **Invite codes** are kept in localStorage until the player is in a household, so a link survives signing up, including Google's redirect.
