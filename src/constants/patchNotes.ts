import type { LanguageCode } from '../types';

export type PatchSection = 'features' | 'balance' | 'fixes' | 'performance';
export const PATCH_SECTIONS: PatchSection[] = ['features', 'balance', 'fixes', 'performance'];

/** One release's "What's New" notes, in plain language for players (empty sections aren't shown). */
export interface VersionConfig {
  version: string;
  /** Release date, `YYYY-MM-DD`. */
  date: string;
  notes: Partial<Record<PatchSection, Record<LanguageCode, string[]>>>;
}

/**
 * Release notes, newest first. The first entry is the current app version (kept equal to package.json's
 * `version`, which the tests check): players see it once after updating, and any time from Settings.
 */
export const PATCH_NOTES: VersionConfig[] = [
  {
    version: '1.5.0',
    date: '2026-10-26',
    notes: {
      features: {
        en: [
          'Chronicle summary: the first time you open the app in a new Chronicle, see who won the last one, both players’ gold and MVP days, and how the prize money was split.',
          'Rewards for both players: when a Chronicle ends, each of you unlocks a new avatar, and the winner also unlocks a new theme.',
          'Effort levels: a moderator can turn them on for Moderate quests in Quest configuration. When you complete one, pick Light (half XP and gold), Normal or Heavy (1.5× XP and gold).',
          'What’s New: notes like these show once after each update. Open them again any time from Settings.',
          'Ticket tips: tap “Normal Tickets” or “Golden Tickets” in a skill description to see what they do.',
        ],
        vi: [
          'Tổng kết Mùa: lần đầu mở ứng dụng trong Mùa mới, xem ai thắng Mùa trước, vàng và số ngày MVP của mỗi người, và tiền thưởng được chia thế nào.',
          'Phần thưởng cho cả hai: khi một Mùa kết thúc, mỗi người mở khóa một nhân vật mới, người thắng còn mở khóa thêm một chủ đề mới.',
          'Mức độ công sức: người quản lý có thể bật cho nhiệm vụ Vừa trong Cấu hình nhiệm vụ. Khi hoàn thành, chọn Nhẹ (nửa kinh nghiệm và vàng), Thường hoặc Nặng (x1,5 kinh nghiệm và vàng).',
          'Có gì mới: ghi chú như thế này hiện một lần sau mỗi bản cập nhật. Mở lại bất cứ lúc nào trong Cài đặt.',
          'Giải thích vé: chạm “vé thường” hoặc “vé vàng” trong mô tả kỹ năng để xem công dụng.',
        ],
      },
      balance: {
        en: [
          'Dishwashing (lunch and dinner): 28 XP and 30 gold.',
          'Cooking (lunch, dinner and pet food): 40 XP and 42 gold.',
          'Vacuuming: 42 XP and 42 gold.',
          'Master Chef now also gives 4 / 8 / 12 / 16% more XP on cooking quests.',
          'Laundry Pro now also gives 4 / 8 / 12 / 16% more XP on laundry quests.',
          'Golden Touch: 6 / 12 / 18 / 24% more gold on every quest.',
          'Gold Interest: 2 / 3 / 4 / 5% a day (still at most 100 gold a day, from Day 2).',
        ],
        vi: [
          'Rửa bát (trưa và tối): 28 kinh nghiệm và 30 vàng.',
          'Nấu ăn (trưa, tối và đồ ăn thú cưng): 40 kinh nghiệm và 42 vàng.',
          'Hút bụi: 42 kinh nghiệm và 42 vàng.',
          'Đầu bếp chính giờ còn cho thêm 4 / 8 / 12 / 16% kinh nghiệm khi nấu ăn.',
          'Chuyên gia giặt giũ giờ còn cho thêm 4 / 8 / 12 / 16% kinh nghiệm khi giặt giũ.',
          'Bàn tay vàng: thêm 6 / 12 / 18 / 24% vàng từ mọi nhiệm vụ.',
          'Tích tiểu thành đại: 2 / 3 / 4 / 5% mỗi ngày (vẫn tối đa 100 vàng mỗi ngày, từ ngày thứ 2).',
        ],
      },
      fixes: {
        en: ['Words are easier to read in every theme.', 'You always see your Wheel prize now, even if you tap away while it spins.'],
        vi: ['Chữ dễ đọc hơn ở mọi chủ đề.', 'Bạn luôn thấy phần thưởng Vòng quay, kể cả khi bấm sang chỗ khác lúc đang quay.'],
      },
    },
  },
];

export const APP_VERSION = PATCH_NOTES[0].version;
