import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as m from './.build/logic.mjs';
import { GoogleAuthProvider } from 'firebase/auth';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const error = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });
// Quiet the service's console.warn while checking error handling.
console.warn = () => {};

// --- Character name from the Google profile --------------------------------
check('a valid profile name is used whole', () => {
  assert.equal(m.nameFromProfile('Hieu Bui'), 'Hieu Bui');
  assert.equal(m.nameFromProfile('  Nguyễn   Văn Anh '), 'Nguyễn Văn Anh');
});

check('a long name keeps the leading words that fit in 16 characters', () => {
  assert.equal(m.nameFromProfile('Nguyễn Thị Minh Khai Phương'), 'Nguyễn Thị Minh');
  assert.equal(m.nameFromProfile('Wolfeschlegelsteinhausen'), null, 'one word that is too long');
});

check('a name with disallowed characters falls back to the role', () => {
  assert.equal(m.nameFromProfile('Anne-Marie'), null);
  assert.equal(m.nameFromProfile(''), null);
  assert.equal(m.nameFromProfile(null), null);
  assert.equal(m.nameFromProfile(undefined), null);
});

check('seeding fills an empty name and never replaces one', () => {
  const state = m.createInitialState(m.localDateKey());
  assert.equal(m.seedCharacterName(state, 'wife', 'Hieu Bui').characters.wife.customName, 'Hieu Bui');
  assert.equal(m.seedCharacterName(state, 'wife', 'Hieu Bui').characters.husband.customName, undefined, 'only the chosen character');
  assert.equal(m.seedCharacterName(state, 'wife', null), state, 'password accounts have no profile name');
  const named = m.seedCharacterName(state, 'wife', 'Hieu Bui');
  assert.equal(m.seedCharacterName(named, 'wife', 'Other Name'), named);
});

check('a seeded name survives saving and loading', () => {
  const today = m.localDateKey();
  const seeded = m.seedCharacterName(m.createInitialState(today), 'husband', 'Hieu Bui');
  assert.equal(m.parseGameState(seeded, today).characters.husband.customName, 'Hieu Bui');
});

// --- Google errors ---------------------------------------------------------
check('closing the Google window is not an error', () => {
  for (const code of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']) {
    assert.deepEqual(m.resolveGoogleError(error(code)), { kind: 'cancelled' }, code);
  }
});

check('an email owned by a password account asks to link, keeping the Google credential and email', () => {
  const credential = GoogleAuthProvider.credential('id-token');
  const original = GoogleAuthProvider.credentialFromError;
  GoogleAuthProvider.credentialFromError = () => credential;
  try {
    const code = 'auth/account-exists-with-different-credential';
    assert.deepEqual(m.resolveGoogleError(error(code, { customData: { email: 'a@company.com' } })), {
      kind: 'link-required',
      link: { email: 'a@company.com', credential },
    });
    const noEmail = m.resolveGoogleError(error(code));
    assert.equal(noEmail.link.email, null, 'the link screen then asks for the email');
  } finally {
    GoogleAuthProvider.credentialFromError = original;
  }
});

check('the link error without a usable credential is a plain error', () => {
  assert.deepEqual(m.resolveGoogleError(error('auth/account-exists-with-different-credential')), { kind: 'error', error: 'auth.google.error.generic' });
});

check('Google failures map to clear messages', () => {
  const key = (code) => m.resolveGoogleError(error(code)).error;
  assert.equal(key('auth/credential-already-in-use'), 'auth.google.error.inUse');
  assert.equal(key('auth/email-already-in-use'), 'auth.google.error.inUse');
  assert.equal(key('auth/unauthorized-domain'), 'auth.google.error.domain');
  assert.equal(key('auth/user-mismatch'), 'auth.google.error.mismatch');
  assert.equal(key('auth/popup-blocked'), 'auth.google.error.popup');
  assert.equal(key('auth/network-request-failed'), 'auth.error.network');
  assert.equal(key('auth/operation-not-allowed'), 'auth.error.notEnabled');
  assert.equal(key('auth/some-new-code'), 'auth.google.error.generic');
});

check('password errors still map as before', () => {
  assert.equal(m.authErrorKey(error('auth/invalid-credential')), 'auth.error.invalidCredential');
  assert.equal(m.authErrorKey(error('auth/requires-recent-login')), 'auth.error.recentLogin');
  assert.equal(m.authErrorKey(new Error('no code')), 'auth.error');
});

// --- Hosting ---------------------------------------------------------------
check('the auth proxy comes before the catch-all rewrite', () => {
  const { rewrites } = JSON.parse(source('vercel.json'));
  assert.equal(rewrites.length, 2);
  assert.equal(rewrites[0].source, '/__/auth/:path*');
  assert.equal(rewrites[0].destination, 'https://chorequest-32a06.firebaseapp.com/__/auth/:path*');
  assert.equal(rewrites[1].destination, '/index.html');
});

check('the service worker leaves the auth pages to the network', () => {
  assert.match(source('vite.config.ts'), /navigateFallbackDenylist: \[\/\^\\\/__\\\/\/\]/);
});

// --- Language --------------------------------------------------------------
check('every new string exists in English and Vietnamese', () => {
  const i18n = source('src/utils/i18n.ts');
  const keys = [...i18n.matchAll(/^\s+'((?:auth\.google|auth\.link|auth\.methods|account\.confirmGoogle|account\.googleCancelled|auth\.error\.recentLogin|language\.switch)[^']*)':/gm)].map((match) => match[1]);
  assert.ok(keys.length >= 50, `found ${keys.length}`);
  for (const key of new Set(keys)) assert.equal(keys.filter((other) => other === key).length, 2, key);
});

check('the language button names the language it switches to, in that language', () => {
  const i18n = source('src/utils/i18n.ts');
  const [en, vi] = [...i18n.matchAll(/'language\.switch': '([^']+)'/g)].map((match) => match[1]);
  assert.equal(en, 'Chuyển sang tiếng Việt');
  assert.equal(vi, 'Switch to English');
});

// --- Release ---------------------------------------------------------------
check('What\'s New has 1.6.0 notes in both languages', () => {
  const { notes } = m.PATCH_NOTES.find((entry) => entry.version === '1.6.0');
  assert.ok(notes.features.en.length > 0);
  assert.equal(notes.features.en.length, notes.features.vi.length);
});

console.log(`\n${passed} checks passed`);
