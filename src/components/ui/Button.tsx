import type { ButtonHTMLAttributes, ReactNode } from 'react';

const variants = {
  primary:
    'bg-amber-700 text-amber-50 hover:bg-amber-800 shadow-md shadow-amber-900/10',
  secondary: 'bg-white/80 text-stone-700 hover:bg-white border border-stone-200',
  ghost: 'bg-transparent text-stone-600 hover:bg-white/60',
  rose: 'bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-300/40',
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
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
