import type { ButtonHTMLAttributes, ComponentProps } from 'react';
import { Icon } from './Icon';

const variants = {
  primary: 'px-btn-primary',
  secondary: '',
  brick: 'px-btn-brick',
  moss: 'px-btn-moss',
  ghost: 'px-btn-ghost',
};

const tipAlign = {
  center: 'left-1/2 -translate-x-1/2',
  left: 'left-0',
  right: 'right-0',
};

/**
 * Compact square icon button (44px touch target). The label is its accessible name and shows as a pixel
 * tooltip on hover (pointer devices only, so it never sticks after a tap) or keyboard focus.
 */
export function IconButton({
  icon,
  label,
  variant = 'secondary',
  align = 'center',
  className = '',
  type = 'button',
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ComponentProps<typeof Icon>['as'];
  label: string;
  variant?: keyof typeof variants;
  /** Where the tooltip sits relative to the button; use left/right near screen edges. */
  align?: keyof typeof tipAlign;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`px-btn group relative h-11 w-11 shrink-0 p-0 ${variants[variant]} ${className}`}
      {...props}
    >
      <Icon as={icon} size={24} />
      <span
        aria-hidden
        className={`px-panel pointer-events-none absolute bottom-full z-30 mb-3 hidden whitespace-nowrap px-2 py-1 text-sm font-bold normal-case tracking-normal text-ink [@media(hover:hover)]:group-hover:block group-focus-visible:block ${tipAlign[align]}`}
      >
        {label}
      </span>
    </button>
  );
}
