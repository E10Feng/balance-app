'use client';
import { useEffect, useState } from 'react';
import WeekGrid from '@/components/WeekGrid';
import StreakCard from '@/components/StreakCard';
import type { ExerciseCategory } from '@/lib/schema';

type CategoryLevel = { category: ExerciseCategory; level: number };

type ProgressData = {
  completedDates: string[];
  streak: number;
  categoryLevels: CategoryLevel[];
  weeklyCount: number;
  weeklyGoal: number;
  monthlyCount: number;
  monthlyGoal: number;
};

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  lower_body_strength: 'Lower Body Strength',
  upper_body_strength: 'Upper Body Strength',
  lower_body_flexibility: 'Lower Body Flexibility',
  upper_body_flexibility: 'Upper Body Flexibility',
  agility_balance: 'Agility & Balance',
  aerobic_endurance: 'Aerobic Endurance',
  warm_up: 'Warm-Up',
  cool_down: 'Cool-Down',
};

const TIER_LABELS: Record<number, string> = { 1: 'Below Average', 2: 'Average', 3: 'Above Average' };
const TIER_COLORS: Record<number, string> = {
  1: 'bg-primary-light text-primary',
  2: 'bg-secondary-light text-secondary',
  3: 'bg-secondary text-white',
};

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetch('/api/progress').then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-6 text-mid text-xl">Loading...</div>;

  const ASSESSED_CATEGORIES: ExerciseCategory[] = [
    'lower_body_strength', 'upper_body_strength',
    'lower_body_flexibility', 'upper_body_flexibility',
    'agility_balance', 'aerobic_endurance',
  ];
  const categoryMap = Object.fromEntries(data.categoryLevels.map((r) => [r.category, r.level]));

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

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="font-heading text-xl text-dark">Completion</h2>
        <div>
          <div className="flex justify-between text-sm text-mid mb-1.5">
            <span>This week</span>
            <span>{data.weeklyCount} / {data.weeklyGoal} days</span>
          </div>
          <div className="h-2.5 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(1, data.weeklyCount / data.weeklyGoal) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm text-mid mb-1.5">
            <span>This month</span>
            <span>{data.monthlyCount} / {data.monthlyGoal} days</span>
          </div>
          <div className="h-2.5 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(1, data.monthlyCount / data.monthlyGoal) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="font-heading text-xl text-dark">Fitness Levels</h2>
        <p className="text-mid text-sm">Set by your most recent assessment. Retake the assessment to update.</p>
        <div className="flex flex-col gap-2">
          {ASSESSED_CATEGORIES.map((cat) => {
            const level = categoryMap[cat] ?? 2;
            return (
              <div key={cat} className="flex justify-between items-center">
                <span className="text-dark text-base">{CATEGORY_LABELS[cat]}</span>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${TIER_COLORS[level]}`}>
                  {TIER_LABELS[level]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <StreakCard streak={data.streak} />
    </div>
  );
}
