import { useRef, useState, type ButtonHTMLAttributes, type ComponentProps } from 'react';
import { FloatingBubble } from './FloatingBubble';
import { Icon } from './Icon';
import { focusedByKeyboard } from './Tooltip';

const variants = {
  primary: 'px-btn-primary',
  secondary: '',
  brick: 'px-btn-brick',
  moss: 'px-btn-moss',
  ghost: 'px-btn-ghost',
};

/**
 * Compact square icon button (44px touch target). The label is its accessible name and shows as a pixel
 * tooltip on mouse hover (never after a tap, so it can't stick) or keyboard focus, and hides once pressed.
 */
export function IconButton({
  icon,
  label,
  variant = 'secondary',
  align = 'center',
  className = '',
  type = 'button',
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  onBlur,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ComponentProps<typeof Icon>['as'];
  label: string;
  variant?: keyof typeof variants;
  /** Where the tooltip lines up with the button; use left/right near screen edges. */
  align?: 'center' | 'left' | 'right';
}) {
  const [tip, setTip] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  return (
    <button
      ref={button}
      type={type}
      aria-label={label}
      className={`px-btn relative h-11 w-11 shrink-0 p-0 ${variants[variant]} ${className}`}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setTip(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setTip(false);
        onPointerLeave?.(event);
      }}
      onPointerDown={(event) => {
        setTip(false);
        onPointerDown?.(event);
      }}
      onFocus={(event) => {
        if (focusedByKeyboard(event.currentTarget)) setTip(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setTip(false);
        onBlur?.(event);
      }}
      {...props}
    >
      <Icon as={icon} size={24} />
      {tip && (
        <FloatingBubble
          aria-hidden
          anchor={button}
          bubbleRef={bubble}
          align={align}
          className="pointer-events-none whitespace-nowrap px-2 py-1 text-sm font-bold normal-case tracking-normal text-ink"
        >
          {label}
        </FloatingBubble>
      )}
    </button>
  );
}
