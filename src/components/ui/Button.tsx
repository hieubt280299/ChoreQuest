import type { ButtonHTMLAttributes, ReactNode } from 'react';

const variants = {
  primary: 'px-btn-primary',
  secondary: '',
  ghost: 'px-btn-ghost',
  brick: 'px-btn-brick',
  moss: 'px-btn-moss',
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <button type={type} className={`px-btn ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
