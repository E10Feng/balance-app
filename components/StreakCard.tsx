export default function StreakCard({ streak }: { streak: number }) {
  return (
    <div className="bg-dark rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary rounded-full opacity-15" />
      <span className="text-5xl">🔥</span>
      <div>
        <p className="font-heading text-5xl font-semibold text-white leading-none">{streak}</p>
        <p className="text-muted text-sm mt-1">
          {streak === 0 ? 'Start your streak today!' : streak === 1 ? 'Day streak — great start!' : 'Day streak — keep it up!'}
        </p>
      </div>
    </div>
  );
}
