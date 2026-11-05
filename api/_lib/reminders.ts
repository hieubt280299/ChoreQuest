// Pure planning for push notifications: who gets what, and when. Server code only (Vercel functions), kept free of
// app imports so each function bundles on its own; tested in tests/v180.test.mjs.

export type CharacterId = 'husband' | 'wife';
export type Language = 'en' | 'vi';

/** The parts of `households/{id}` the notifications read. */
export interface HouseholdData {
  members: Record<string, { uid: string; characterId: CharacterId }>;
  chronicle: { id: number; startDate: string; endDate: string };
  game: {
    characters: Record<CharacterId, { customName?: string }>;
    logs?: { date: string; completedBy: CharacterId | 'both' }[];
    hearts?: { id: string; from: CharacterId; to: CharacterId; date: string; timestamp: number }[];
  };
}

/** One subscribed device, as saved by the app under `users/{uid}.push.devices.{deviceId}` (src/utils/push.ts). */
export interface PushDevice {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  timeZone: string;
  language: Language;
  /** What was last sent to this device: the local date of the evening reminder, the chronicle id of its Day 1. */
  sent?: { evening?: string; newChronicle?: string };
}

/**
 * A player's devices with each push subscription once: if the app's data was cleared, the same browser can be saved
 * again under a new device id, and it should still get one notification, not two.
 */
export function distinctDevices(devices: Record<string, PushDevice>): Record<string, PushDevice> {
  const seen = new Set<string>();
  return Object.fromEntries(
    Object.entries(devices).filter(([, device]) => {
      if (!device?.endpoint || seen.has(device.endpoint)) return false;
      seen.add(device.endpoint);
      return true;
    }),
  );
}

export type ReminderKind = 'evening' | 'newChronicle';

/** Local hours the reminders go out: the new Chronicle in the morning, quests at 9 PM. */
export const MORNING_HOUR = 8;
export const EVENING_HOUR = 21;
/** A heart is only announced while it's fresh (the app asks right after sending it). */
export const HEART_FRESH_MS = 10 * 60 * 1000;

const FALLBACK_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** Local date (`YYYY-MM-DD`) and hour (0-23) at `now` in a time zone (Vietnam's when it's unknown). */
export function localClock(now: Date, timeZone: string): { date: string; hour: number } {
  const format = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = format(timeZone);
  } catch {
    formatter = format(FALLBACK_TIME_ZONE);
  }
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/** The id of the chronicle that starts on `date`, or null if none does (the next one starts the day after the end). */
export function chronicleStartingOn(chronicle: HouseholdData['chronicle'], date: string): number | null {
  if (date === chronicle.startDate) return chronicle.id;
  if (date === addDays(chronicle.endDate, 1)) return chronicle.id + 1;
  return null;
}

/** Whether the character completed (alone or together) any quest on `date`. */
export function didQuestOn(household: HouseholdData, characterId: CharacterId, date: string): boolean {
  return (household.game.logs ?? []).some((log) => log.date === date && (log.completedBy === characterId || log.completedBy === 'both'));
}

/**
 * The reminder due for a player's device at this local time, with the key that marks it sent: the new Chronicle on
 * its Day 1 (morning), or quests at 9 PM when they've done none today. Null when nothing is due or it was sent.
 */
export function dueReminder(
  household: HouseholdData,
  characterId: CharacterId,
  device: Pick<PushDevice, 'sent'>,
  clock: { date: string; hour: number },
): { kind: ReminderKind; key: string } | null {
  if (clock.hour === MORNING_HOUR) {
    const id = chronicleStartingOn(household.chronicle, clock.date);
    const key = id === null ? null : String(id);
    if (key && device.sent?.newChronicle !== key) return { kind: 'newChronicle', key };
  }
  if (clock.hour === EVENING_HOUR && device.sent?.evening !== clock.date && !didQuestOn(household, characterId, clock.date)) {
    return { kind: 'evening', key: clock.date };
  }
  return null;
}

/** The heart this player just sent, if it's still fresh enough to announce. */
export function freshHeart(household: HouseholdData, from: CharacterId, now: number) {
  const latest = (household.game.hearts ?? [])
    .filter((heart) => heart.from === from)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  return latest && now - latest.timestamp <= HEART_FRESH_MS ? latest : null;
}

const TEXT = {
  en: {
    husband: 'Husband',
    wife: 'Wife',
    heartTitle: '{name} sent you a heart',
    heartBody: 'You got 1 Normal Ticket. Send one back?',
    eveningTitle: 'No quests done today yet',
    eveningBody: 'There’s still time to keep your streaks going.',
    newChronicleTitle: 'A new Chronicle begins!',
    newChronicleBody: 'Gold is back to 0, and you have 3 new Streak Freezes.',
  },
  vi: {
    husband: 'Chồng',
    wife: 'Vợ',
    heartTitle: '{name} gửi bạn một trái tim',
    heartBody: 'Bạn được 1 vé thường. Gửi lại một trái tim nhé?',
    eveningTitle: 'Hôm nay bạn chưa làm nhiệm vụ nào',
    eveningBody: 'Vẫn còn kịp giữ chuỗi của bạn.',
    newChronicleTitle: 'Mùa mới bắt đầu!',
    newChronicleBody: 'Vàng về 0, và bạn có lại 3 lần đóng băng chuỗi.',
  },
} as const;

export interface PushMessage {
  title: string;
  body: string;
  /** Replaces an older notification of the same kind instead of stacking. */
  tag: string;
  url: string;
}

const lang = (language: string): Language => (language === 'en' ? 'en' : 'vi');

export function heartMessage(language: string, household: HouseholdData, from: CharacterId): PushMessage {
  const text = TEXT[lang(language)];
  const name = household.game.characters[from]?.customName || text[from];
  return { title: text.heartTitle.replace('{name}', name), body: text.heartBody, tag: 'heart', url: '/' };
}

export function reminderMessage(language: string, kind: ReminderKind): PushMessage {
  const text = TEXT[lang(language)];
  return kind === 'evening'
    ? { title: text.eveningTitle, body: text.eveningBody, tag: 'evening', url: '/' }
    : { title: text.newChronicleTitle, body: text.newChronicleBody, tag: 'new-chronicle', url: '/' };
}
