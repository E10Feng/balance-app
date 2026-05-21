'use client';
import { useEffect, useState } from 'react';
import WeekGrid from '@/components/WeekGrid';
import StreakCard from '@/components/StreakCard';

type ProgressData = {
  completedDates: string[];
  plan: Array<{ exerciseId: string; level: number; exercise: { name: string } }>;
  streak: number;
};

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetch('/api/progress').then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-6 text-mid text-xl">Loading...</div>;

  return (
    <div className="p-6 pt-10 flex flex-col gap-6">
      <div>
        <p className="text-mid text-sm font-medium uppercase tracking-widest">Your journey</p>
        <h1 className="font-heading text-4xl font-semibold text-dark mt-1">Progress</h1>
      </div>

      <div>
        <h2 className="font-heading text-xl text-dark mb-4">This week</h2>
        <WeekGrid completedDates={data.completedDates} />
      </div>

      <div className="bg-surface rounded-2xl p-5">
        <h2 className="font-heading text-xl text-dark mb-4">Exercise Levels</h2>
        <div className="flex flex-col gap-4">
          {data.plan.map((item) => (
            <div key={item.exerciseId}>
              <div className="flex justify-between text-sm text-mid mb-1.5">
                <span>{item.exercise.name}</span>
                <span>Level {item.level} / 5</span>
              </div>
              <div className="h-2.5 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${(item.level / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <StreakCard streak={data.streak} />
    </div>
  );
}
