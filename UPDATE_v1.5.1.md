Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Simplify the Settings tab on mobile and review the UI of the whole app for UX improvements.

---

### 1. ⚙️ Settings Tab Simplification (Mobile First)

- The buttons at the bottom of the Settings tab feel too clustered on mobile. Simplify this area.
- **Delete account** is very rarely used, so it should not be so big and obvious.

---

### 2. 🔍 Whole-App UI Review

- Review the UI of every screen and optimize / improve the UX where it helps.

---

### ✅ Implementation Notes

- **Settings** is organised into three labelled groups:
    - **Preferences** (this device): Sound & music; **Display** (graphics quality and language in one card).
    - **Household**: household members; **Chronicle** (end date and prize pool in one card); **Quest configuration** (collapsed; "Reset quests to defaults" moved inside the expanded list); **New legend** (shown only once a player reaches the level cap; the mastery celebration points to it).
    - **Account**: email, Sign out and Change password; a quiet footer holds the version, a small "What's New" link and a small "Delete account" text link (its password-confirm dialog is unchanged).
- "Leave household" is a quiet text link too (it still asks to confirm).
- The page title is now "Settings" (it holds personal preferences as well as household ones).
- **Review of the other screens** (Home, Quests, Skills, History, Calendar, dialogs) at 393px: no clutter or readability problems found beyond Settings (contrast across themes was fixed in v1.5.0); their main actions are already large, clear touch targets.

---

### 🔁 Follow-up Changes (after review)

- **Quest configuration in a dialog:** on PC, expanding the quest list made the Chronicle card next to it stretch too. "Edit quests (21)" now opens the list in a dialog (wider on large screens; full width on phones) with "Reset quests to defaults" inside it.
- **Fewer boxes on character cards:** gold, Golden Tickets and Normal Tickets sit in one inventory strip with dividers (each still has its tooltip), and skills are a plain line of text with icons and levels ("Master Chef 1 · Fast Learner 1"), tap for the description, instead of bordered chips.
- **Tooltip hidden behind the next card:** a tooltip opened on a Home character card was painted under the other card (each animated card is its own stacking layer). A card (or `.tooltip-host`) with an open tooltip is now raised above its neighbours.
- **Wardrobe tabs:** the Wardrobe dialog is split into **Themes** and **Avatars** tabs to avoid long scrolling. It opens on Avatars when an avatar is the only reward left; a trophy marks a tab with a reward to claim.
- **Forgot password:** a "Forgot password?" link on the sign-in screen opens a reset screen that uses Firebase's `sendPasswordResetEmail`.
    - The email is sent in the app's language (`auth.languageCode`) with a link back to the app (`url: window.location.origin`), falling back to the plain email if the domain isn't authorized.
    - The confirmation is the same for unknown emails (no account enumeration) and mentions Spam.
    - Resending has a 60-second cooldown. The email is pre-filled from the sign-in form.
- **Vietnamese by default:** devices without a saved choice start in Vietnamese (`index.html` and the PWA manifest `lang` are `vi`). All Vietnamese text was reviewed: clashing terms fixed (Loại vs Nhóm, Quản lý, Rửa bát), English calques rewritten, "Mùa" capitalised, the demo called "Chơi thử", and the skill level written "cấp".
