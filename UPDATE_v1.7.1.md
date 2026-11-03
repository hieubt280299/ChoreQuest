Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Fix the follow-ups found after v1.7.0.

---

### 1. 🎡 Wheel Labels

- The numbers turn upside down as they pass the wheel's pointer.
- Every number and icon should have its top facing the rim and its bottom facing the centre, as before.

### 2. 🔄 Updating the Installed App

- In the installed app on a phone, a new version doesn't load right away. It can take force-quitting and reopening the app.
- Add logic to force a reload or update when the running version isn't the latest.

### 3. 🧩 Skill Filters

- If a filter has no unlearned skills, don't show it.

### 4. 💬 Skill Descriptions

- The skill tip on the Home page shouldn't show the next level: skills can't be upgraded from there, and two values are confusing.
- The same goes for the spouse's skills, which are view only.

### 5. ⚙️ Settings

- The ChoreQuest version and "What's New" belong in their own section, not under Account.

---

### ✅ Implementation Notes

- **Wheel:** 1.7.0 had flipped labels on the lower half so they read upright while the wheel rests, but they then turned upside down as they passed the pointer. That flip is removed.
- **Why updates were late:**
  - A downloaded version **waited** until every window of the app was closed. The generated worker only takes over when the page sends it a "skip waiting" message, and nothing ever sent one. An installed app on a phone is rarely fully closed.
  - Phones resume a home-screen app without reloading it, so the browser rarely checked for a new version at all.
- **How updates work now** (`utils/appUpdate.ts`):
  - The app registers the worker itself. It checks for updates on launch, when brought back to the screen, when back online and every 30 minutes.
  - Once a new version has downloaded and nothing is in progress (no dialog open, nothing being typed, wheel not spinning), the app tells it to take over and reloads into it. In the background this happens at once.
  - The worker claims open pages (`clientsClaim`), so this also works in a session that started before the first install.
  - **Fallback:** each build publishes `version.json`, fetched without caching. If it differs from the running version and the worker hasn't taken over within 20 seconds, the app reloads anyway, at most once per version per tab, so it can never loop.
  - **Players already on 1.7.0** still need one restart to get 1.7.1, because their old code doesn't have this logic. Every version after that arrives on its own.
- **Skill filters:** a filter that empties after learning its last skill falls back to All. With only All left, the chips are hidden.
- **Skill descriptions:** "current → next" stays on your own Skills page, where you can upgrade. Home tips and your partner's skills show only the current level.
- **Settings:** a new **About** section (Thông tin) holds the version and What's New. Delete account stays as a quiet link at the bottom of Account.

---

### 🔁 Follow-up Changes (after review)

- **"Group" renamed:** Quick tasks, Moderate tasks and Heavy tasks were a "Group". Of the two proposed names, "Complexity" and "Task size", **Task size** (Vietnamese: **Mức việc**) was picked:
    - These sizes describe how much work a chore is (a quick chore, a heavy one), not how hard it is to work out. Mopping is heavy, not complex.
    - "Task size" doesn't clash with effort levels (Light / Normal / Heavy).
    - It's shown in the quest editor, the Filter dialog ("Group by: Task size"), Quest configuration and the skill filter chips. The chip that said "By effort" is now "Task size" (its id changed from `effort` to `size`).
    - "Group by" stays, because it's the verb for arranging the list. Code names (`group`, `TaskGroup`) are unchanged.
- **Code review fixes:**
    - **A reload could lose an action:** the update reload checked dialogs, typing and the wheel, but not a quest still saving to the server. Saves now count as in flight until they settle (`utils/savesInFlight.ts`), and an update waits for them, even in the background. Offline saves are already safe, since they're queued in Firestore's local cache.
    - **Other tabs:** when one idle tab let a new version take over, other tabs reloaded at once, even mid-dialog. They now wait until they're idle too.
