import { useEffect, useRef, useState, type ChangeEvent } from 'react';

const MAX_DIGITS = 15;

/**
 * Whole-number input that shows thousand separators for the locale as you type
 * (1000000 -> "1,000,000" / "1.000.000") while reporting the raw number.
 */
export function MoneyInput({
  value,
  onChange,
  locale,
  disabled,
  className = '',
  ...aria
}: {
  value: number;
  onChange: (value: number) => void;
  locale: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const format = (amount: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
  const [text, setText] = useState(() => format(value));

  // Follow outside changes (partner edits, language switch) unless the user is typing here.
  useEffect(() => {
    if (document.activeElement !== ref.current) setText(format(value));
  }, [value, locale]); // `format` derives from `locale`.

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const raw = input.value;
    const digitsBeforeCaret = raw.slice(0, input.selectionStart ?? raw.length).replace(/\D/g, '').length;
    const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS);
    const amount = digits ? Number(digits) : 0;
    const formatted = digits ? format(amount) : '';
    setText(formatted);
    onChange(amount);

    // Keep the caret after the same digit it followed before separators were added or removed.
    requestAnimationFrame(() => {
      let position = 0;
      let seen = 0;
      while (position < formatted.length && seen < digitsBeforeCaret) {
        if (/\d/.test(formatted[position])) seen += 1;
        position += 1;
      }
      input.setSelectionRange(position, position);
    });
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      disabled={disabled}
      onChange={handleChange}
      onBlur={() => setText(format(value))}
      className={`px-input font-arcade text-base ${className}`}
      {...aria}
    />
  );
}
