const CATEGORY_EMOJI: Record<string, string> = {
  static_balance: '🧍',
  dynamic_balance: '🚶',
  strength_support: '💪',
};

type Props = {
  name: string;
  category: string;
  level: number;
  durationSeconds: number | null;
  reps: number | null;
  completed: boolean;
  onClick?: () => void;
};

export default function ExerciseCard({ name, category, level, durationSeconds, reps, completed, onClick }: Props) {
  const meta = durationSeconds ? `${durationSeconds}s · Level ${level}` : reps ? `${reps} reps · Level ${level}` : `Level ${level}`;
  return (
    <button
      onClick={onClick}
      className={`w-full bg-surface rounded-2xl p-4 flex items-center gap-4 border-2 transition-all text-left ${completed ? 'border-secondary' : 'border-transparent'}`}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${completed ? 'bg-secondary-light' : 'bg-primary-light'}`}>
        {CATEGORY_EMOJI[category] ?? '🏃'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-semibold text-dark truncate">{name}</p>
        <p className="text-sm text-mid mt-0.5">{meta}</p>
      </div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${completed ? 'bg-secondary text-white' : 'border-2 border-muted'}`}>
        {completed ? '✓' : ''}
      </div>
    </button>
  );
}
