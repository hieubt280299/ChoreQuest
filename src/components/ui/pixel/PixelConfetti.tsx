import type { CSSProperties } from 'react';

const CONFETTI_COLORS = ['#ffd166', '#f39a3d', '#cc6a4a', '#86b049', '#fff8e7', '#8a5a9c'];
// Fixed layout (no randomness) so renders stay stable: 36 pixels spread across the screen.
const CONFETTI = Array.from({ length: 36 }, (_, index) => ({
  left: (index * 37) % 100,
  size: 6 + ((index * 7) % 3) * 3,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  delay: -((index * 0.43) % 3.2),
  duration: 2.6 + ((index * 0.29) % 1.6),
}));

/** Full-cover shower of falling pixel confetti (stops under reduced motion, see index.css). */
export function PixelConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          className="px-confetti absolute top-0 block"
          style={
            {
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              boxShadow: '0 0 0 2px #2b1a12',
              '--delay': `${piece.delay}s`,
              '--dur': `${piece.duration}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
