export function ProgressBar({
  value,
  max = 100,
  className = '',
  color = 'amber',
  showShimmer = false,
}: {
  value: number;
  max?: number;
  className?: string;
  color?: 'amber' | 'iris' | 'sage';
  showShimmer?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colorClass =
    color === 'amber' ? 'bg-amber-500' : color === 'iris' ? 'bg-iris-500' : 'bg-sage-500';
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-ink-100 ${className}`}>
      <div
        className={`h-full rounded-full ${colorClass} transition-all duration-700 ease-out ${showShimmer ? 'shimmer-bg' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  className = '',
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width={size} height={size} className={className} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-ink-200"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        className="stroke-amber-500 transition-all duration-700"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
