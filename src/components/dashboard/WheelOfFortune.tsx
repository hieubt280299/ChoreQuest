import { AnimatePresence, motion } from 'framer-motion';
import { CircleInfo, Close, Crown, Sparkles } from 'pixelarticons/react';
import { useEffect, useRef, useState } from 'react';
import { COIN } from '../../assets/sprites';
import { JACKPOT_BASE_GOLD, JACKPOT_MISS_BONUS, WHEEL_PRIZES, WHEEL_SEGMENTS } from '../../constants/gameRules';
import { useAudio } from '../../context/AudioContext';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { CharacterId, WheelPrize, WheelSpinEvent } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { secureRandom } from '../../utils/wheel';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { pixelEase } from '../ui/Modal';
import { PixelConfetti } from '../ui/pixel/PixelConfetti';
import { PixelSprite } from '../ui/pixel/PixelSprite';
import { Ticket } from '../ui/pixel/TicketIcon';
import { Tooltip } from '../ui/Tooltip';

// Slice angles (degrees, clockwise from the top) from the relative sizes.
const TOTAL_SIZE = WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.size, 0);
const SLICES = WHEEL_SEGMENTS.reduce<{ prize: WheelPrize; start: number; end: number }[]>((list, segment) => {
  const start = list.length ? list[list.length - 1].end : 0;
  return [...list, { prize: segment.prize, start, end: start + (segment.size / TOTAL_SIZE) * 360 }];
}, []);
/** Index of the slice under an angle of the face. */
const sliceAt = (angle: number) => {
  const a = ((angle % 360) + 360) % 360;
  return Math.max(0, SLICES.findIndex((slice) => a < slice.end));
};
// At rest the pointer sits on the middle of the jackpot slice.
const JACKPOT_SLICE = SLICES.find((slice) => slice.prize === 'jackpot')!;
const REST_ROTATION = -(JACKPOT_SLICE.start + JACKPOT_SLICE.end) / 2;
// Each spin lasts a random 5-10 seconds.
const SPIN_MIN_SECONDS = 5;
const SPIN_MAX_SECONDS = 10;
const FACE_SIZE = 72;

const SLICE_STYLE: Record<WheelPrize, { fill: string; shade: string; text: string }> = {
  small: { fill: '#ecd6a4', shade: '#dcbc80', text: 'text-ink' },
  normal: { fill: '#86b049', shade: '#638c3c', text: 'text-ink' },
  big: { fill: '#f39a3d', shade: '#c85f1f', text: 'text-ink' },
  jackpot: { fill: '#b04a34', shade: '#8f3a2c', text: 'text-flame-300' },
  none: { fill: '#5a3621', shade: '#3d2518', text: 'text-parchment-300' },
};

const rgb = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

/**
 * The wheel face, drawn pixel by pixel on a 72x72 canvas and scaled up with crisp pixels: rim with gold
 * studs at the slice borders, dithered shading towards the edge, and a gold hub.
 */
function WheelFace() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(FACE_SIZE, FACE_SIZE);
    const center = FACE_SIZE / 2;
    for (let y = 0; y < FACE_SIZE; y += 1) {
      for (let x = 0; x < FACE_SIZE; x += 1) {
        const dx = x + 0.5 - center;
        const dy = y + 0.5 - center;
        const r = Math.hypot(dx, dy);
        if (r > 35.5) continue;
        const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
        const slice = SLICES[sliceAt(angle)];
        const fromBorder = Math.min(angle - slice.start, slice.end - angle) * (Math.PI / 180) * r;
        let color: string;
        if (r > 34.5 || (r > 31 && r <= 32)) color = '#2b1a12';
        else if (r > 32) color = fromBorder < 1.3 ? '#ffd166' : r > 33.5 ? '#9c6337' : '#7a4a2a';
        else if (r < 3.5) color = '#ffd166';
        else if (r < 5) color = '#2b1a12';
        else if (fromBorder < 0.6) color = '#2b1a12';
        else {
          const style = SLICE_STYLE[slice.prize];
          // Solid shade near the rim, a one-pixel dither band, then the flat slice colour.
          color = r > 28 || (r > 26.5 && (x + y) % 2 === 0) ? style.shade : style.fill;
        }
        const [red, green, blue] = rgb(color);
        const index = (y * FACE_SIZE + x) * 4;
        image.data[index] = red;
        image.data[index + 1] = green;
        image.data[index + 2] = blue;
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, []);
  return <canvas ref={ref} width={FACE_SIZE} height={FACE_SIZE} className="absolute inset-0 h-full w-full [image-rendering:pixelated]" aria-hidden />;
}

function SliceLabel({ prize }: { prize: WheelPrize }) {
  if (prize === 'none') return <Icon as={Close} size={24} />;
  // The jackpot slice is narrow, so its crown is small.
  if (prize === 'jackpot') return <Icon as={Crown} size={12} />;
  const gold = WHEEL_PRIZES.find((entry) => entry.prize === prize)?.gold ?? 0;
  return <span className="font-arcade text-[11px] leading-none">{gold}</span>;
}

/** Full-screen confetti and fanfare panel for a jackpot. */
function JackpotCelebration({ spin, onClose }: { spin: WheelSpinEvent; onClose: () => void }) {
  const { t } = useLanguage();
  const { name } = useCharacterName();
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-wood-950/85 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: pixelEase(3) }}
      role="dialog"
      aria-modal="true"
      aria-label={t('wheel.jackpotTitle')}
    >
      <PixelConfetti />
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
        animate={{ scale: [0.4, 1.15, 1], opacity: 1, rotate: 0 }}
        transition={{ duration: 0.5, ease: pixelEase(6) }}
        className="px-panel px-panel-ember relative w-full max-w-sm p-6 text-center"
      >
        <Icon as={Crown} size={48} className="px-blink mx-auto text-brick-700" />
        <h2
          className="px-title mt-2 text-5xl uppercase text-flame-300"
          style={{ textShadow: '3px 3px 0 #b04a34, 5px 5px 0 #2b1a12' }}
        >
          {t('wheel.jackpotTitle')}
        </h2>
        <div className="mx-auto my-4 flex w-fit items-end gap-3">
          <span className="bob">
            <CharacterAvatar id={spin.characterId} scale={4} framed={false} />
          </span>
        </div>
        <p className="mb-4 text-lg font-bold">{t('wheel.jackpotWon', { name: name(spin.characterId) })}</p>
        <div className="px-slot mx-auto mb-5 w-fit px-4 py-2">
          <GoldCounter amount={spin.gold} spin size="lg" />
        </div>
        <Button className="w-full" variant="brick" onClick={onClose}>
          {t('mastery.continue')}
        </Button>
      </motion.div>
    </motion.div>
  );
}

/** Result card after a spin (like "Quest complete!"): the gold won, or a good-luck wish for a miss. */
function SpinResultCard({ spin, onClose }: { spin: WheelSpinEvent; onClose: () => void }) {
  const { t } = useLanguage();
  const won = spin.gold > 0;
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-wood-950/75 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: pixelEase(3) }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={won ? t('wheel.wonTitle') : t('wheel.missTitle')}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.25, ease: pixelEase(5) }}
        className="px-panel w-full max-w-sm p-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-center gap-3 text-ember-500">
          {won ? (
            <>
              <Icon as={Sparkles} size={24} />
              <PixelSprite frames={COIN} fps={8} scale={6} />
              <Icon as={Sparkles} size={24} className="-scale-x-100" />
            </>
          ) : (
            <span className="text-wood-600">
              <Icon as={Ticket} size={48} />
            </span>
          )}
        </div>
        <h2
          className={`px-title text-4xl uppercase ${won ? 'text-flame-300' : 'text-parchment-50'}`}
          style={{ textShadow: won ? '3px 3px 0 #b04a34, 5px 5px 0 #2b1a12' : '3px 3px 0 #7a4a2a, 5px 5px 0 #2b1a12' }}
        >
          {won ? t('wheel.wonTitle') : t('wheel.missTitle')}
        </h2>
        <p className="mb-5 mt-2 text-xl font-bold text-wood-700">{won ? t('wheel.won', { gold: spin.gold }) : t('wheel.miss')}</p>
        {won ? (
          <div className="px-slot mx-auto mb-5 w-fit px-4 py-2">
            <GoldCounter amount={spin.gold} spin size="lg" />
          </div>
        ) : (
          <p className="mb-5 text-base font-bold text-brick-600">{t('wheel.jackpotGrows', { gold: JACKPOT_MISS_BONUS })}</p>
        )}
        <Button className="w-full" onClick={onClose}>
          {t('common.close')}
        </Button>
      </motion.div>
    </motion.div>
  );
}

/** Wheel of Fortune: spend a ticket to spin for gold; misses grow a shared jackpot. */
export function WheelOfFortune() {
  const { t } = useLanguage();
  const { state, activeCharacter, canActAs, spinWheel } = useGame();
  const { playWheelTickSFX, playWheelWinSFX, playWheelMissSFX, playJackpotSFX } = useAudio();
  const [rotation, setRotation] = useState(REST_ROTATION);
  const [duration, setDuration] = useState(SPIN_MIN_SECONDS);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelSpinEvent | null>(null);
  const [celebrate, setCelebrate] = useState<WheelSpinEvent | null>(null);
  // The pot shown while the wheel turns, so the outcome isn't given away before it stops.
  const [shownBonus, setShownBonus] = useState<number | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const pending = useRef<WheelSpinEvent | null>(null);
  const lastSlice = useRef(0);

  const characterId: CharacterId = activeCharacter;
  const tickets = state.characters[characterId].tickets;
  const canSpin = canActAs(characterId) && tickets > 0 && !spinning;
  const jackpot = JACKPOT_BASE_GOLD + (shownBonus ?? state.wheel.jackpotBonus);
  const ticketLabel =
    tickets === 0 ? t('wheel.noTicketsHint') : tickets === 1 ? t('wheel.ticketTooltipOne') : t('wheel.ticketTooltip', { count: tickets });

  const spin = () => {
    const outcome = spinWheel(characterId);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setError(null);
    setResult(null);
    setShownBonus(outcome.jackpotBefore);
    pending.current = outcome.spin;
    // Land somewhere inside a slice showing that prize (not dead centre, so it feels less staged).
    const matches = SLICES.filter((slice) => slice.prize === outcome.spin.prize);
    const slice = matches[Math.floor(secureRandom() * matches.length)];
    const landing = (slice.start + slice.end) / 2 + (secureRandom() - 0.5) * (slice.end - slice.start) * 0.6;
    // The pointer is at the top, so the wheel turns until that point of the face is under it.
    // Longer spins turn more, so the wheel keeps a lively speed (about one turn per second).
    const seconds = SPIN_MIN_SECONDS + secureRandom() * (SPIN_MAX_SECONDS - SPIN_MIN_SECONDS);
    const turns = Math.round(seconds) * 360;
    const offset = (((360 - landing - rotation) % 360) + 360) % 360;
    setDuration(seconds);
    setRotation(rotation + turns + offset);
    setSpinning(true);
  };

  const finish = () => {
    const spin = pending.current;
    if (!spin) return;
    pending.current = null;
    setSpinning(false);
    setShownBonus(null);
    // Jackpots get the full celebration; other results a card like "Quest complete!".
    if (spin.prize === 'jackpot') {
      playJackpotSFX();
      setCelebrate(spin);
      return;
    }
    setResult(spin);
    if (spin.prize === 'none') playWheelMissSFX();
    else playWheelWinSFX(spin.prize === 'small' ? 0 : spin.prize === 'normal' ? 1 : 2);
  };

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex flex-1 items-center gap-2 text-2xl font-extrabold uppercase leading-none text-brick-600">
          <Icon as={Ticket} size={24} />
          {t('wheel.title')}
        </h2>
        <Tooltip
          align="right"
          label={<Icon as={CircleInfo} size={24} className="text-wood-600" />}
          content={
            <>
              <span className="mb-1 block font-extrabold">{t('wheel.prizes')}</span>
              {WHEEL_PRIZES.filter((entry) => entry.prize !== 'none').map((entry) => (
                <span key={entry.prize} className="flex justify-between gap-3">
                  <span>{t(`wheel.prize.${entry.prize}` as TranslationKey)}</span>
                  <span className="font-extrabold">{entry.prize === 'jackpot' ? `${JACKPOT_BASE_GOLD}+` : entry.gold} G</span>
                </span>
              ))}
              <span className="mt-1 block text-wood-700">{t('wheel.jackpotGrows', { gold: JACKPOT_MISS_BONUS })}</span>
            </>
          }
        />
      </div>

      {/* Jackpot pot on the left, your tickets on the right. */}
      <div className="px-slot-dark mb-4 flex items-center justify-between gap-3 px-3 py-2">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-lg font-extrabold uppercase text-flame-300">
          <Icon as={Crown} size={24} className={spinning ? '' : 'px-blink'} />
          {t('wheel.prize.jackpot')}
          <GoldCounter amount={jackpot} color="text-flame-300" size="lg" />
        </span>
        <Tooltip
          align="right"
          label={
            <>
              <Icon as={Ticket} size={24} />
              <span className="font-arcade text-sm">{tickets}</span>
              <span className="sr-only">{ticketLabel}</span>
            </>
          }
          content={ticketLabel}
          triggerClassName={`inline-flex shrink-0 items-center gap-1.5 border-l-[3px] border-wood-700 pl-3 ${
            tickets > 0 ? 'text-parchment-100' : 'text-brick-400'
          }`}
        />
      </div>

      {/* The wheel itself is the spin button. */}
      <button
        type="button"
        onClick={spin}
        disabled={!canSpin}
        aria-label={t('wheel.spin')}
        className={`px-focus group relative mx-auto block aspect-square w-full max-w-[17rem] rounded-full ${
          canSpin ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {/* Fixed pointer at the top; it ends at the rim, and slice labels sit below it so it never hides them. */}
        <svg
          viewBox="0 0 12 10"
          className="absolute -top-3 left-1/2 z-10 h-6 w-8 -translate-x-1/2 drop-shadow-[0_3px_0_rgba(20,10,5,0.5)]"
          shapeRendering="crispEdges"
          aria-hidden
        >
          <path d="M0 0h12v2h-1v2h-1v2h-1v2h-1v2h-4v-2h-1v-2h-1v-2h-1v-2h-1z" fill="#2b1a12" />
          <path d="M2 1h8v1h-1v2h-1v2h-1v2h-2v-2h-1v-2h-1v-2h-1z" fill="#ffd166" />
        </svg>
        {/* Rotation runs on its own GPU layer inside a round clip, so neither the spin nor the rotated square's
            corners ever affect the page layout. */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
        <motion.div
          className="absolute inset-0 will-change-transform [backface-visibility:hidden]"
          animate={{ rotate: rotation }}
          transition={{ duration: reduceMotion ? 0.6 : duration, ease: [0.12, 0.75, 0.2, 1] }}
          onUpdate={(latest) => {
            // Tick each time a slice border passes the pointer.
            // The pointer reads the face at -rotation; count crossings of slice borders (and full turns).
            const angle = Number(latest.rotate ?? 0);
            const slice = Math.floor(angle / 360) * SLICES.length + sliceAt(-angle);
            if (spinning && slice !== lastSlice.current) playWheelTickSFX();
            lastSlice.current = slice;
          }}
          onAnimationComplete={finish}
        >
          <WheelFace />
          {SLICES.map((slice, index) => (
            // A zero-width spoke from the top edge to the centre, rotated about the centre: its box never pokes out of the wheel.
            <div
              key={index}
              className="absolute left-1/2 top-0 h-full w-0"
              style={{ transform: `rotate(${(slice.start + slice.end) / 2}deg)`, transformOrigin: '50% 50%' }}
              aria-hidden
            >
              <span
                className={`absolute left-1/2 -translate-x-1/2 top-[15%] ${SLICE_STYLE[slice.prize].text}`}
              >
                <SliceLabel prize={slice.prize} />
              </span>
            </div>
          ))}
        </motion.div>
        </div>
        {/* Idle hint on the hub: press to spin. */}
        {canSpin && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="px-btn px-btn-primary px-blink px-2.5 py-1 text-lg group-hover:brightness-110 group-active:translate-y-[3px]">
              {t('wheel.spin')}
            </span>
          </span>
        )}
      </button>

      {/* One status line that always has something to say, so its height never jumps during a spin. */}
      <div className="mt-3 min-h-[1.75rem]" aria-live="polite">
        {spinning ? (
          <p className="text-center text-xl font-extrabold uppercase text-wood-600">{t('wheel.spinning')}</p>
        ) : (
          <p className="text-center text-base font-bold text-wood-600">{canSpin ? t('wheel.tapHint') : t('wheel.noTicketsHint')}</p>
        )}
      </div>
      {error && (
        <p className="mt-3 text-base font-bold text-brick-600" role="alert">
          {t(error)}
        </p>
      )}

      <AnimatePresence>
        {celebrate && <JackpotCelebration key="jackpot" spin={celebrate} onClose={() => setCelebrate(null)} />}
        {result && <SpinResultCard key={result.id} spin={result} onClose={() => setResult(null)} />}
      </AnimatePresence>
    </Card>
  );
}
