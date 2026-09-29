export function ProgressBar({
  percent,
  className = '',
}: {
  percent: number;
  className?: string;
}) {
  return (
    <div className={`h-3 overflow-hidden rounded-full bg-stone-200/80 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-emerald-400 transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
