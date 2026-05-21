type Props = { completedDates: string[] };

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function WeekGrid({ completedDates }: Props) {
  const completed = new Set(completedDates);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(today.getDate() + mondayOffset + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((date, i) => {
        const isDone = completed.has(date);
        const isToday = date === todayStr;
        return (
          <div key={date} className="flex flex-col items-center gap-1.5" data-testid="day-cell">
            <span className="text-xs font-semibold text-muted uppercase">{DAY_LABELS[i]}</span>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-all ${isDone ? 'bg-primary border-primary text-white' : isToday ? 'border-primary bg-transparent' : 'border-primary-light bg-transparent'}`}>
              {isDone ? '✓' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
