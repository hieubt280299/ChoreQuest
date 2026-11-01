Act as a Principal Full-Stack Engineer working on our retro pixel RPG web application, ChoreQuest. Add Google sign-in that keeps every player's existing progress, and make the language easier to switch.

---

### 🔑 1. Google Sign-In & Account Linking

Players sign in with their email and a password today. Add Google as a second way in, without ever splitting one player into two accounts.

All game data is stored under the Firebase Auth `uid` (`users/{uid}`, `households/{id}.members[uid]`). Linking a sign-in method keeps the `uid`, so **no Firestore migration or email lookup is needed**. There is one rule to protect: every path must end on the same `uid`.

#### A. Continue with Google

- Add a **"Continue with Google"** button with the official Google logo to the sign-in screen, above the email form. It also creates accounts, so it doesn't say "Sign in".
- A new Google player lands on the existing onboarding screen (create or join a household).
- Their character starts with the name from their Google profile (the whole name if it's valid, otherwise as many leading words as fit in 16 characters; if nothing fits, the role is shown). They can rename it as usual.
- Show the Google account chooser every time (`prompt: select_account`), because a shared phone may hold both partners' accounts.
- The Google screens use the app's language.

#### B. Same email, same account

Firebase decides what happens, depending on the email:

| Existing account | What Firebase does | What the app does |
| --- | --- | --- |
| Password, Gmail address, **email not verified** | Signs in on the same `uid` and **removes the password** (Google is the trusted provider) | Nothing to resolve. Data is safe. See "Getting a password back" |
| Password, Gmail address, email verified | Signs in on the same `uid` and keeps both methods | Nothing to resolve |
| Password, other email provider | Fails with `auth/account-exists-with-different-credential` | Ask for the password once, then link (below) |

**Link screen** (for the third row):

- Explain that the email already has an account and that progress stays the same.
- Ask for the password. On success: `signInWithEmailAndPassword`, then `linkWithCredential` with the pending Google credential from `GoogleAuthProvider.credentialFromError`.
- Offer "Forgot password?" and a way to cancel. If the error has no `customData.email`, show an email field too.
- If the password sign-in works but linking fails, the player stays signed in, and can connect Google from Settings.

#### C. Sign-in methods in Settings

The Account card lists **Email and password** and **Google**, with quiet text links:

- **Connect Google:** `linkWithPopup`. This is the safe route for a Gmail player, because it keeps the password. It may use a Google account with another email address. A Google account already in use by another ChoreQuest account shows an error; merging two existing accounts is out of scope.
- **Disconnect:** `unlink`, only when a password exists, so nobody gets locked out. Ask to confirm first, and warn that signing in with Google later may start a new, empty account.
- **Set a password** (Google-only accounts): sends the existing reset email. The account keeps its `uid`.

#### D. Google-only accounts

- **Change password** is hidden, since there's no current password to ask for.
- **Delete account** confirms with Google (`reauthenticateWithPopup`) instead of a password. Choosing a different Google account shows a clear error (`auth/user-mismatch`).
- A wrong password on the sign-in screen also suggests trying Google, because a Gmail player's password may have been replaced as in section B.

#### Getting a password back

"Forgot password?" and "Set a password" both work on a Google-only account and keep the same `uid`.

#### E. Popup or redirect

- Use a popup by default: it needs no hosting changes.
- Use a redirect on an iPhone home-screen app, where popups are unreliable, and whenever the popup is blocked or unsupported.
- A redirect needs the auth pages on the app's own domain (Safari, Chrome and Firefox block the cross-site storage it would otherwise use):
    - Proxy `/__/auth/*` to `chorequest-32a06.firebaseapp.com` in `vercel.json`, ahead of the catch-all rewrite.
    - Keep the service worker's navigation fallback away from `/__/`.
    - Point `VITE_FIREBASE_AUTH_DOMAIN` at the app domain and add `https://<domain>/__/auth/handler` to the OAuth client's redirect URIs (console steps, done by the project owner).
- If a redirect returns with no result, show an error instead of the sign-in screen looking as if nothing happened.
- `getRedirectResult` runs only after a redirect the app started, so normal launches don't load Google's auth frame.

#### Why not `fetchSignInMethodsForEmail`?

The original plan was to look up the email first. Firebase's email enumeration protection (on by default) makes that call return an empty list, so the app relies on the sign-in result and the `auth/account-exists-with-different-credential` error instead. That error only appears while **One account per email address** is on in Firebase, so that setting must stay on.

---

### 💡 2. Quality of Life

- **Language toggle:** a compact button in the top bar switches between Vietnamese and English with one tap. It shows the current language.
- The sign-in and onboarding screens have it too. Vietnamese is the default, so an English speaker needs it before signing in.
- It must fit in the top bar at 320px.

---

### 🚀 Deliverables

1. `src/services/authService.ts`: the Google provider, the popup and redirect flows, the account-linking credential resolver and the error handlers.
2. The screens and Settings changes above, in English and Vietnamese, mobile first.
3. `tests/v160.test.mjs`, plus the usual release updates: `CHANGELOG.md`, version bump, What's New notes, `AGENT_GUIDE.md` and `README.md` (console setup).

---

### ✅ Implementation Notes

- **Checked against the Firebase Auth emulator** (with enumeration protection on and off): every path in section B and C ends on the same `uid`. Linking a password straight onto a Google account failed there with `auth/email-already-in-use`, so "Set a password" uses the reset email, which worked.
- **Not testable locally:** real Google popups and redirects, and production behaviour that the emulator only approximates. The emulator treated a verified non-Gmail Google sign-in like the Gmail case, while Firebase's docs describe the link error, so the app handles both.
- **Known limit:** Google refuses sign-in inside in-app browsers (Zalo, Messenger and similar). Those players can open the app in Safari or Chrome, or use their email and password.
