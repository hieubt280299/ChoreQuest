export function LevelBadge({ level, className = '' }: { level: number; className?: string }) {
  return (
    <span className={`px-level ${className}`}>
      LV<span className="text-flame-300">{level}</span>
    </span>
  );
}
