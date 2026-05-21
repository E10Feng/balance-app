type Props = { total: number; remaining: number };

export default function TimerRing({ total, remaining }: Props) {
  const r = 50;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - (total > 0 ? remaining / total : 0));

  return (
    <div className="relative w-32 h-32">
      <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--primary-light)" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-4xl font-semibold text-dark leading-none">{remaining}</span>
        <span className="text-mid text-sm">sec</span>
      </div>
    </div>
  );
}
