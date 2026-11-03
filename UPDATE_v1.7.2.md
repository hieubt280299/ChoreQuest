Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Keep a list of future ideas, and make sure no tooltip is ever hidden by other parts of the app.

---

### 1. 🗺️ Future Plans

- Add a Markdown file that keeps the ideas for future versions, so they can be revised later.

### 2. 💬 Tooltips

- Review every tooltip in the game and make sure none is covered by any other part of the UI.
- On a phone, the Calendar day's bonus gold tooltip (interest and wheel) is covered by the calendar.

---

### ✅ Implementation Notes

- **Roadmap:** [ROADMAP.md](ROADMAP.md) lists the ideas by theme, each with a rough size and a status, plus a suggested first pick. Ideas move to an `UPDATE_vX.Y.Z.md` spec once chosen.
- **Why tooltips could be covered:**
  - Every bubble was drawn inside its own card. Whether it showed above the next card, the top bar or a dialog's scroll area depended on how the browser layered them. A workaround raised a card while its tooltip was open, but it relied on newer CSS (`:has()`) and didn't help at the top bar or inside scroll areas.
  - The exact overlap on the phone couldn't be reproduced in desktop browsers emulating phones (Chromium and WebKit). In those browsers, the audit found bubbles going under the top bar when their trigger was near the top of the screen. It also found that a tap opened and closed a bubble in one go (see below).
- **The fix:** every bubble is drawn at the top level of the page, above everything else (`ui/FloatingBubble`, via a React portal).
  - It goes above its trigger, or below it when there's no room under the top bar. It avoids the phone navigation too (both bars are marked `data-app-bar`), stays inside the screen and follows its trigger while the page or a dialog scrolls (`utils/placeBubble`).
  - It applies to every kind of tooltip: `Tooltip` (calendar bonus gold, inventory, streaks, wheel, Chronicle, Settings, skill-description tips), the skill tips on character cards (`SkillChip` now uses `Tooltip`) and icon-button labels (`IconButton`).
  - The old workaround (`.tooltip-host`) and `hooks/useViewportClamp` are removed.
- **First tap:** a phone reports hover and focus on a tap. Those opened the bubble just before the tap's click toggled it closed, so it took two taps. Now only a real mouse hover and keyboard focus open a bubble. A tap toggles it, and a mouse click keeps a hovered bubble open.
- **Icon-button labels** show on mouse hover (disabled buttons too) and keyboard focus, and hide once pressed, so a label never hangs over the dialog its button opens.
- **Checked:**
  - Every tooltip on every page (26), at phone and desktop widths, with its trigger near the top, middle and bottom of the screen.
  - The skill picker dialog's 11 tooltips at the same three positions.
  - Icon-button labels near the top bar.
  - Real taps in Chromium and WebKit.
  - No bubble is covered or off screen.
