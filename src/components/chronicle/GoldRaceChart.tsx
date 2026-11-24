import { useId, useRef, useState, type PointerEvent } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { formatGold } from '../../utils/calculations';
import { CharacterName } from '../ui/CharacterName';
import { FloatingBubble } from '../ui/FloatingBubble';

const IDS: CharacterId[] = ['husband', 'wife'];
/**
 * Series colors per theme (`--chart-husband` / `--chart-wife` in each theme's CSS), each pair checked with the data-viz
 * palette validator against that theme's parchment-50: hearth and mushroom use their own brick and plum, cottage and
 * forest deeper shades of their hues (their pastel or brown brick/plum fail as chart lines).
 */
const COLOR: Record<CharacterId, string> = { husband: 'var(--chart-husband)', wife: 'var(--chart-wife)' };

const W = 320;
const H = 150;
const PAD = { left: 30, right: 54, top: 10, bottom: 18 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Short gold label for the axis: 386 / 1.4k / 12.3k. */
const short = (value: number) => (value >= 1_000 ? `${Math.round(value / 100) / 10}k` : formatGold(value));

/**
 * The gold race: each player's gold at the end of each day of a chronicle, as two stepped lines (gold changes once a
 * day). End values are labeled at the lines' ends; tapping or hovering shows a day's gold for both. A hidden table
 * carries the same numbers for screen readers.
 */
export function GoldRaceChart({ goldByDay }: { goldByDay: Record<CharacterId, number[]> }) {
  const { t } = useLanguage();
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  // The day's bubble hangs off an invisible marker that follows the crosshair.
  const anchor = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const days = Math.max(goldByDay.husband.length, goldByDay.wife.length);
  if (days === 0) return null;
  const max = Math.max(1, ...goldByDay.husband, ...goldByDay.wife);
  const x = (day: number) => PAD.left + (days === 1 ? PLOT_W : (day / (days - 1)) * PLOT_W);
  const y = (gold: number) => PAD.top + PLOT_H - (gold / max) * PLOT_H;
  const path = (values: number[]) =>
    values.map((value, day) => (day === 0 ? `M${x(0)},${y(value)}` : `H${x(day)}V${y(value)}`)).join('');

  // End labels: keep at least 12px apart so close finishes don't overlap.
  const endY = Object.fromEntries(IDS.map((id) => [id, y(goldByDay[id][days - 1] ?? 0)])) as Record<CharacterId, number>;
  if (Math.abs(endY.husband - endY.wife) < 12) {
    const mid = (endY.husband + endY.wife) / 2;
    const upper = (goldByDay.husband[days - 1] ?? 0) >= (goldByDay.wife[days - 1] ?? 0) ? 'husband' : 'wife';
    endY[upper] = mid - 6;
    endY[upper === 'husband' ? 'wife' : 'husband'] = mid + 6;
  }

  const pick = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    setHover(Math.min(days - 1, Math.max(0, Math.round(ratio * (days - 1)))));
  };

  return (
    <figure className="space-y-2" aria-labelledby={titleId}>
      <figcaption id={titleId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-extrabold uppercase text-brick-600">{t('summary.race')}</span>
        {/* Legend: identity is never color alone. */}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {IDS.map((id) => (
            <span key={id} className="inline-flex max-w-[8rem] items-center gap-1.5 text-sm font-bold text-wood-700">
              <span aria-hidden className="h-[3px] w-4 shrink-0" style={{ backgroundColor: COLOR[id] }} />
              <span className="truncate">
                <CharacterName id={id} />
              </span>
            </span>
          ))}
        </span>
      </figcaption>
      <div className="relative bg-parchment-50 shadow-[0_0_0_2px_rgb(var(--c-parchment-400))]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
          {/* Recessive grid: 0, half and the top. */}
          {[0, 0.5, 1].map((part) => (
            <g key={part}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(max * part)} y2={y(max * part)} stroke="rgb(var(--c-parchment-400))" strokeWidth={1} strokeDasharray={part === 0 ? undefined : '2 3'} />
              <text x={PAD.left - 4} y={y(max * part) + 3} textAnchor="end" className="fill-wood-600 font-arcade" fontSize={7}>
                {short(Math.round(max * part))}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={H - 5} className="fill-wood-600 font-arcade" fontSize={7}>
            {t('summary.raceDay', { day: 1 })}
          </text>
          <text x={W - PAD.right} y={H - 5} textAnchor="end" className="fill-wood-600 font-arcade" fontSize={7}>
            {t('summary.raceDay', { day: days })}
          </text>
          {IDS.map((id) => (
            <path key={id} d={path(goldByDay[id])} fill="none" style={{ stroke: COLOR[id] }} strokeWidth={2} strokeLinejoin="miter" />
          ))}
          {/* Direct end labels: a colored marker, the value in ink. */}
          {IDS.map((id) => (
            <g key={id}>
              <rect x={W - PAD.right + 4} y={endY[id] - 3} width={6} height={6} style={{ fill: COLOR[id] }} />
              <text x={W - PAD.right + 13} y={endY[id] + 3} className="fill-ink font-arcade" fontSize={7}>
                {formatGold(goldByDay[id][days - 1] ?? 0)}
              </text>
            </g>
          ))}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="rgb(var(--c-wood-700))" strokeWidth={1} />
              {IDS.map((id) => (
                <rect
                  key={id}
                  x={x(hover) - 4}
                  y={y(goldByDay[id][hover] ?? 0) - 4}
                  width={8}
                  height={8}
                  style={{ fill: COLOR[id], stroke: 'rgb(var(--c-parchment-50))' }}
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
          {/* Hit area bigger than the marks: the whole plot. */}
          <rect
            x={PAD.left}
            y={0}
            width={PLOT_W}
            height={H}
            fill="transparent"
            style={{ touchAction: 'pan-y' }}
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hover !== null && (
          <>
            <span ref={anchor} aria-hidden className="pointer-events-none absolute top-0 h-px w-px" style={{ left: `${(x(hover) / W) * 100}%` }} />
            <FloatingBubble
              role="tooltip"
              anchor={anchor}
              bubbleRef={bubble}
              align={x(hover) > W / 2 ? 'right' : 'left'}
              className="pointer-events-none px-2.5 py-1.5 text-left text-sm font-normal normal-case leading-snug text-ink"
            >
              <span className="block font-extrabold">{t('summary.raceDay', { day: hover + 1 })}</span>
              {IDS.map((id) => (
                <span key={id} className="flex items-center gap-1.5">
                  <span aria-hidden className="h-2 w-2 shrink-0" style={{ backgroundColor: COLOR[id] }} />
                  <span className="max-w-[6rem] truncate">
                    <CharacterName id={id} />
                  </span>
                  <span className="font-arcade text-[9px]">{formatGold(goldByDay[id][hover] ?? 0)}</span>
                </span>
              ))}
            </FloatingBubble>
          </>
        )}
      </div>
      {/* The same numbers for screen readers. */}
      <table className="sr-only">
        <caption>{t('summary.race')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('summary.raceDayHeader')}</th>
            {IDS.map((id) => (
              <th key={id} scope="col">
                <CharacterName id={id} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: days }, (_, day) => (
            <tr key={day}>
              <th scope="row">{day + 1}</th>
              {IDS.map((id) => (
                <td key={id}>{formatGold(goldByDay[id][day] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
