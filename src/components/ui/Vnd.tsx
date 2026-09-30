const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

/** VND amount with arcade digits; the ₫ sign uses Handjet because Press Start 2P has no glyph for it. */
export function Vnd({ amount, className = '' }: { amount: number; className?: string }) {
  const parts = formatter.formatToParts(Math.round(amount));
  const digits = parts
    .filter((part) => part.type !== 'currency' && part.type !== 'literal')
    .map((part) => part.value)
    .join('');
  return (
    <span className={`whitespace-nowrap ${className}`}>
      <span className="font-arcade">{digits}</span>
      <span className="ml-1 font-sans text-[1.5em] font-extrabold leading-none">₫</span>
    </span>
  );
}
