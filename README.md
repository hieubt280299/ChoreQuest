# ChoreQuest

A cozy, retro pixel-art RPG for couples that turns household chores into quests. Each partner plays a character (a knight and a mage), earns XP and gold for real chores, levels up and learns skills. When each monthly "chronicle" ends, a real prize pool is split by the gold each partner earned.

Built with React, TypeScript and Firebase. It installs as a PWA on phones and has an offline demo mode, so you can try it without an account.

## How it works

- **Quests:** log a chore when you finish it, as done by you, your partner or both of you (a "both" quest splits its reward 50/50). Each quest can be completed once a day. Quests are grouped by effort (Quick / Moderate / Heavy) and by category (cleaning, cooking, laundry, …).
- **XP and levels:** quests give XP, up to level 30. Each level-up pays bonus gold, a skill point and a Wheel of Fortune ticket. Reaching level 30 unlocks a "New legend" reset of levels and skills.
- **Skills:** choose up to 8 of 14 household buffs, each with 4 levels, such as more gold from cooking quests, a bonus for quests done together, extra wheel tickets, or daily interest on your gold.
- **Streaks:** completing the same quest on consecutive days pays Fibonacci bonus gold from day 3.
- **Wheel of Fortune:** claim one free ticket a day, then spin for gold. Every miss grows a shared jackpot.
- **Chronicles:** a season, one month by default. Gold resets when it ends, while XP, levels and skills stay. The prize pool (in VND) is split by each partner's share of the gold.
- **Households:** each household holds two accounts and is joined with a 6-character code. Moderators manage quests, the prize pool and the chronicle end date. Logged quests can be undone or re-assigned, and the calendar shows a day-by-day log.
- **Cosmetics:** four app themes (Cozy Hearth, 8-Bit Mushroom Kingdom, Whimsical Cottage, Enchanted Forest) and 32 unlockable character avatars (16 per character). Each chronicle's winner unlocks one.
- **Polish:** English and Vietnamese, chiptune music and sound effects (generated live in the browser), and a mobile-first pixel UI.

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## Tech stack

| Area | Tools |
| --- | --- |
| UI | React 18, TypeScript, Vite, Tailwind CSS, framer-motion, [pixelarticons](https://pixelarticons.com) |
| Data and auth | Firebase v10 (Firestore with an offline cache, Email/Password Auth, optional Analytics) |
| App | `vite-plugin-pwa` (installable, works offline) |
| Audio | Web Audio API chiptune engine (no audio files) |
| Hosting | Vercel (single-page-app rewrites in `vercel.json`) |

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the printed URL and choose **Play demo (offline)**. The demo needs no setup and saves progress in your browser.

### Connecting Firebase (for real households)

1. Create a Firebase project and add a **Web app**.
2. **Authentication:** enable the **Email/Password** sign-in method.
3. **Firestore:** create a database, then publish the security rules in [`firestore.rules`](firestore.rules), either in the console or with `firebase deploy --only firestore:rules`.
4. Copy `.env.example` to `.env` and fill in the `VITE_FIREBASE_*` values from your web app's config. `VITE_FIREBASE_MEASUREMENT_ID` is optional and turns on Analytics.
5. When you deploy, add every domain the app is served from under **Authentication → Settings → Authorized domains**. The live app uses `cqvn.vercel.app` (production) and `chore-quest-hieu-anh.vercel.app` (legacy), plus `localhost` for development.

Without these variables the app still runs, in demo mode only.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (add `-- --host` to test on a phone on the same network) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run generate-pwa-assets` | Regenerate the PWA icons |

## Deploying

The repository is set up for **Vercel**: import the repo, set the same `VITE_FIREBASE_*` environment variables, and deploy. `vercel.json` handles routing and caching for the service worker.

Production runs at **https://cqvn.vercel.app**, with the older **https://chore-quest-hieu-anh.vercel.app** still served. To add a domain:

1. In Vercel, add it under **Project → Settings → Domains**.
2. In Firebase, add it under **Authentication → Settings → Authorized domains**, or sign-in fails there.

No CORS setup is needed: the app talks to Firebase directly from the browser, and Firebase only checks the authorized domains. The code has no hard-coded domain, so `VITE_FIREBASE_AUTH_DOMAIN` stays your project's `<project>.firebaseapp.com`.

If an update to the security rules ships with a release, republish `firestore.rules` too.

## Project structure

```
src/
  components/   UI by screen: auth, dashboard (Home), tasks (Quests), skills, history, calendar, settings, ui
  context/      Auth, household, game state, language and audio providers
  constants/    Game rules: XP curve, default quests, skills, wheel prizes
  utils/        Pure game logic: rewards, streaks, chronicles and interest, wheel, i18n, chiptune
  hooks/        Small shared hooks
  types/        Game and Firestore types
firestore.rules     Firestore security rules (household membership, roles, chronicle rollover)
AGENT_GUIDE.md      Detailed product spec and game mechanics
UPDATE_vX.Y.Z.md    Feature specs for each version
CHANGELOG.md        Release notes
```

All game rules live in `src/constants/gameRules.ts` and `src/utils/` as pure functions, so they're easy to read and test separately from the UI.

### Data model

- **`households/{id}`:** members and roles, plus three sections:
  - `settings` (quests, prize pool), which only moderators can change.
  - `chronicle`, the current season.
  - `game` (characters, quest logs, wheel and events, past chronicles), shared by both players.
- **`householdCodes/{code}`:** looks up a household from its join code.
- **`users/{uid}`:** links an account to its household.

Days that pass while the app is closed (interest, chronicle rollover) are settled from stored dates, so both partners' devices always agree.

## Contributing

1. Branch from `main`, for example `feat/my-change`.
2. Keep game logic in pure functions under `src/utils/` and text in `src/utils/i18n.ts`. Every string needs both English and Vietnamese.
3. Check that `npm run build` passes, and look at your change at phone width (about 375px).
4. Open a pull request against `main`.

For new versions, the feature spec goes in `UPDATE_vX.Y.Z.md`. When the work is done, add the matching section to `CHANGELOG.md` and bump the version in `package.json`.
